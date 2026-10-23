using System.Diagnostics;
using System.Text;

namespace Cove.Api.Updates;

/// <summary>Starts and stops the processes involved in an update. All arguments go through ArgumentList.</summary>
internal static class UpdateProcessLauncher
{
    /// <summary>
    /// Starts a process that outlives this one and returns its PID. On Unix it runs in its own session
    /// (<c>setsid</c> where available, else <c>nohup</c>) so a terminal closing or Ctrl+C aimed at the
    /// old process does not reach it, with output appended to <paramref name="outputLog"/>.
    /// </summary>
    public static int StartDetached(
        string fileName,
        IEnumerable<string> arguments,
        string workingDirectory,
        string outputLog,
        bool visibleWindow)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(outputLog)!);
        if (OperatingSystem.IsWindows())
        {
            // A new console (shell execute) for Cove itself, as if the user had started it; the
            // relauncher gets a hidden console of its own so closing the old window cannot end it.
            var startInfo = new ProcessStartInfo(fileName)
            {
                UseShellExecute = visibleWindow,
                CreateNoWindow = !visibleWindow,
                WorkingDirectory = workingDirectory,
            };
            foreach (var argument in arguments)
                startInfo.ArgumentList.Add(argument);
            using var process = Process.Start(startInfo) ?? throw new InvalidOperationException($"Could not start {fileName}.");
            return process.Id;
        }

        const string script = """
            log="$COVE_UPDATE_OUTPUT_LOG"
            if command -v setsid >/dev/null 2>&1; then
              setsid "$@" >>"$log" 2>&1 </dev/null &
            else
              nohup "$@" >>"$log" 2>&1 </dev/null &
            fi
            echo $!
            """;
        var shell = new ProcessStartInfo("/bin/sh")
        {
            UseShellExecute = false,
            RedirectStandardOutput = true,
            WorkingDirectory = workingDirectory,
        };
        shell.ArgumentList.Add("-c");
        shell.ArgumentList.Add(script);
        shell.ArgumentList.Add("cove-update-launch");
        shell.ArgumentList.Add(fileName);
        foreach (var argument in arguments)
            shell.ArgumentList.Add(argument);
        shell.Environment["COVE_UPDATE_OUTPUT_LOG"] = outputLog;

        using var launcher = Process.Start(shell) ?? throw new InvalidOperationException("Could not start /bin/sh.");
        var output = launcher.StandardOutput.ReadToEnd();
        launcher.WaitForExit(15000);
        return int.TryParse(output.Trim(), out var pid) && pid > 0
            ? pid
            : throw new InvalidOperationException($"Starting {fileName} did not report a process id.");
    }

    /// <summary>
    /// Re-runs an Instance Manager start script (it exports the instance's environment and writes
    /// <c>.manager/cove.pid</c>) and returns the PID it records.
    /// </summary>
    public static int RunStartScript(string scriptPath)
    {
        var pidFile = Path.Combine(Path.GetDirectoryName(scriptPath)!, "cove.pid");
        if (File.Exists(pidFile))
            File.Delete(pidFile);

        ProcessStartInfo startInfo;
        if (OperatingSystem.IsWindows())
        {
            startInfo = new ProcessStartInfo("powershell.exe") { UseShellExecute = false, CreateNoWindow = true };
            foreach (var argument in new[] { "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath })
                startInfo.ArgumentList.Add(argument);
        }
        else
        {
            startInfo = new ProcessStartInfo("/bin/sh") { UseShellExecute = false };
            startInfo.ArgumentList.Add(scriptPath);
        }
        startInfo.WorkingDirectory = Path.GetDirectoryName(scriptPath)!;

        using (var process = Process.Start(startInfo) ?? throw new InvalidOperationException($"Could not run {scriptPath}."))
        {
            if (!process.WaitForExit(30000))
                throw new InvalidOperationException($"{scriptPath} did not finish.");
            if (process.ExitCode != 0)
                throw new InvalidOperationException($"{scriptPath} exited with code {process.ExitCode}.");
        }

        for (var attempt = 0; attempt < 100; attempt++)
        {
            if (File.Exists(pidFile) && int.TryParse(File.ReadAllText(pidFile).Trim(), out var pid))
                return pid;
            Thread.Sleep(100);
        }
        throw new InvalidOperationException($"{scriptPath} did not write {pidFile}.");
    }

    public static bool IsAlive(int pid)
    {
        try
        {
            using var process = Process.GetProcessById(pid);
            return !process.HasExited;
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return false;
        }
    }

    /// <summary>Asks a process to stop (SIGTERM on Unix, so managed PostgreSQL shuts down cleanly), then kills it.</summary>
    public static void Stop(int pid, TimeSpan grace)
    {
        if (!IsAlive(pid))
            return;

        if (!OperatingSystem.IsWindows())
        {
            try
            {
                var kill = new ProcessStartInfo("kill") { UseShellExecute = false };
                kill.ArgumentList.Add("-TERM");
                kill.ArgumentList.Add(pid.ToString(System.Globalization.CultureInfo.InvariantCulture));
                using var killProcess = Process.Start(kill);
                killProcess?.WaitForExit(5000);
            }
            catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or InvalidOperationException)
            {
            }

            var deadline = DateTime.UtcNow + grace;
            while (DateTime.UtcNow < deadline && IsAlive(pid))
                Thread.Sleep(250);
        }

        try
        {
            using var process = Process.GetProcessById(pid);
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
                process.WaitForExit(10000);
            }
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException or System.ComponentModel.Win32Exception)
        {
        }
    }

    /// <summary>Runs <paramref name="fileName"/> to completion and returns its exit code and output.</summary>
    public static async Task<(int ExitCode, string Output)> RunAsync(
        string fileName,
        IEnumerable<string> arguments,
        TimeSpan timeout,
        CancellationToken ct)
    {
        var startInfo = new ProcessStartInfo(fileName)
        {
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            WorkingDirectory = Path.GetDirectoryName(fileName)!,
        };
        foreach (var argument in arguments)
            startInfo.ArgumentList.Add(argument);

        using var process = Process.Start(startInfo) ?? throw new InvalidOperationException($"Could not start {fileName}.");
        var output = new StringBuilder();
        var stdout = process.StandardOutput.ReadToEndAsync(ct);
        var stderr = process.StandardError.ReadToEndAsync(ct);
        using var timeoutSource = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutSource.CancelAfter(timeout);
        try
        {
            await process.WaitForExitAsync(timeoutSource.Token);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            try { process.Kill(entireProcessTree: true); } catch (InvalidOperationException) { }
            throw new TimeoutException($"{Path.GetFileName(fileName)} did not exit within {timeout.TotalSeconds:0} seconds.");
        }
        output.Append(await stdout).Append(await stderr);
        return (process.ExitCode, output.ToString());
    }
}
