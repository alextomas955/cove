using System.Diagnostics;

namespace Cove.Api.Services;

internal readonly record struct FfmpegProcessResult(int ExitCode, string StandardError, bool TimedOut);

internal static class FfmpegProcessRunner
{
    private static readonly TimeSpan CleanupTimeout = TimeSpan.FromSeconds(5);

    public static async Task<FfmpegProcessResult> RunAsync(
        string ffmpegPath,
        string arguments,
        TimeSpan timeout,
        CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        var startInfo = new ProcessStartInfo
        {
            FileName = ffmpegPath,
            Arguments = arguments,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
        };
        FfmpegProcessEnvironment.Apply(startInfo, ffmpegPath);
        using var process = new Process { StartInfo = startInfo };

        process.Start();
        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(timeout);

        try
        {
            await process.WaitForExitAsync(timeoutCts.Token);
        }
        catch (OperationCanceledException)
        {
            KillProcessTree(process);
            await ObserveExitAsync(process);
            await ObserveOutputAsync(stdoutTask, stderrTask);

            ct.ThrowIfCancellationRequested();
            return new FfmpegProcessResult(-1, CompletedOutput(stderrTask), TimedOut: true);
        }

        await Task.WhenAll(stdoutTask, stderrTask);
        return new FfmpegProcessResult(process.ExitCode, stderrTask.Result, TimedOut: false);
    }

    /// <summary>
    /// Runs a long ffmpeg job (a full-file encode or decode) that writes <c>-progress pipe:1</c> key=value
    /// lines to stdout, handing each line to <paramref name="onProgressLine"/>. There is no overall timeout,
    /// because a large encode legitimately runs for hours; instead the process is killed when stdout goes
    /// quiet for <paramref name="stallTimeout"/>, which ffmpeg only does when it is hung. Only the tail of
    /// stderr is kept, since a long run with warnings can produce a lot of it.
    /// </summary>
    public static async Task<FfmpegProcessResult> RunWithProgressAsync(
        string ffmpegPath,
        string arguments,
        Action<string> onProgressLine,
        TimeSpan stallTimeout,
        CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        var startInfo = new ProcessStartInfo
        {
            FileName = ffmpegPath,
            Arguments = arguments,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
        };
        FfmpegProcessEnvironment.Apply(startInfo, ffmpegPath);
        using var process = new Process { StartInfo = startInfo };

        process.Start();
        var lastOutput = Environment.TickCount64;
        var stderrTask = ReadTailAsync(process.StandardError, maxChars: 4000);
        var stdoutTask = Task.Run(async () =>
        {
            while (await process.StandardOutput.ReadLineAsync() is { } line)
            {
                Interlocked.Exchange(ref lastOutput, Environment.TickCount64);
                onProgressLine(line);
            }
        });

        using var stallCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        var stalled = false;
        var watchdog = Task.Run(async () =>
        {
            try
            {
                while (!process.HasExited)
                {
                    await Task.Delay(TimeSpan.FromSeconds(5), stallCts.Token);
                    if (Environment.TickCount64 - Interlocked.Read(ref lastOutput) > stallTimeout.TotalMilliseconds)
                    {
                        stalled = true;
                        stallCts.Cancel();
                        return;
                    }
                }
            }
            catch (OperationCanceledException)
            {
            }
        });

        try
        {
            await process.WaitForExitAsync(stallCts.Token);
        }
        catch (OperationCanceledException)
        {
            KillProcessTree(process);
            await ObserveExitAsync(process);
            await ObserveOutputAsync(stdoutTask, stderrTask);

            ct.ThrowIfCancellationRequested();
            return new FfmpegProcessResult(-1, CompletedOutput(stderrTask), TimedOut: stalled);
        }
        finally
        {
            stallCts.Cancel();
            await watchdog;
        }

        await Task.WhenAll(stdoutTask, stderrTask);
        return new FfmpegProcessResult(process.ExitCode, stderrTask.Result, TimedOut: false);
    }

    private static async Task<string> ReadTailAsync(StreamReader reader, int maxChars)
    {
        var tail = new System.Text.StringBuilder();
        var buffer = new char[4096];
        int read;
        while ((read = await reader.ReadAsync(buffer, 0, buffer.Length)) > 0)
        {
            tail.Append(buffer, 0, read);
            if (tail.Length > maxChars * 2)
                tail.Remove(0, tail.Length - maxChars);
        }

        return tail.Length > maxChars ? tail.ToString(tail.Length - maxChars, maxChars) : tail.ToString();
    }

    private static void KillProcessTree(Process process)
    {
        try
        {
            if (!process.HasExited)
                process.Kill(entireProcessTree: true);
        }
        catch (Exception ex) when (ex is InvalidOperationException or System.ComponentModel.Win32Exception)
        {
            // The process either exited concurrently or could not be killed. Cleanup below remains bounded.
        }
    }

    private static async Task ObserveExitAsync(Process process)
    {
        try
        {
            await process.WaitForExitAsync().WaitAsync(CleanupTimeout);
        }
        catch (Exception ex) when (ex is InvalidOperationException or TimeoutException)
        {
            // Cleanup is best effort and must not delay cancellation indefinitely.
        }
    }

    private static async Task ObserveOutputAsync(Task stdoutTask, Task stderrTask)
    {
        try
        {
            await Task.WhenAll(stdoutTask, stderrTask).WaitAsync(CleanupTimeout);
        }
        catch (Exception ex) when (ex is IOException or ObjectDisposedException or TimeoutException)
        {
            // Killing the process can close redirected pipes while their readers are completing.
        }
    }

    private static string CompletedOutput(Task<string> outputTask)
        => outputTask.IsCompletedSuccessfully ? outputTask.Result : string.Empty;
}
