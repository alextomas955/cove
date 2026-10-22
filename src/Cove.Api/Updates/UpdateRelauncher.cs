using System.Globalization;
using System.Net.Sockets;
using System.Text.Json;

namespace Cove.Api.Updates;

/// <summary>
/// The processes and probes the relauncher uses. The default talks to real processes and to Cove's
/// HTTP status endpoint; tests substitute fakes.
/// </summary>
internal sealed record UpdateRelaunchHost
{
    public required Func<int, bool> IsAlive { get; init; }
    public required Func<UpdateJournal, int> Start { get; init; }
    public required Func<UpdateJournal, CancellationToken, Task<string?>> GetRunningVersion { get; init; }
    public required Action<int> Stop { get; init; }
    public required Func<UpdateJournal, CancellationToken, Task> WaitForPortFree { get; init; }
    public required Func<UpdateJournal, string?> ReadLogTail { get; init; }
    public required Action<string> Log { get; init; }
    public TimeSpan ExitWaitTimeout { get; init; } = TimeSpan.FromMinutes(2);
    public TimeSpan HealthTimeout { get; init; } = TimeSpan.FromMinutes(5);
    public TimeSpan PollInterval { get; init; } = TimeSpan.FromSeconds(2);

    public static UpdateRelaunchHost CreateDefault(string logPath)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
        var http = new HttpClient(new SocketsHttpHandler { UseProxy = false }) { Timeout = TimeSpan.FromSeconds(5) };
        var healthTimeout = int.TryParse(
            Environment.GetEnvironmentVariable("COVE_UPDATE_HEALTH_TIMEOUT_SECONDS"),
            NumberStyles.None,
            CultureInfo.InvariantCulture,
            out var seconds) && seconds > 0
                ? TimeSpan.FromSeconds(seconds)
                : TimeSpan.FromMinutes(5);

        return new UpdateRelaunchHost
        {
            IsAlive = UpdateProcessLauncher.IsAlive,
            Stop = pid => UpdateProcessLauncher.Stop(pid, TimeSpan.FromSeconds(30)),
            Start = journal => StartCove(journal),
            GetRunningVersion = (journal, ct) => GetVersionAsync(http, journal, ct),
            WaitForPortFree = WaitForPortFreeAsync,
            ReadLogTail = ReadLogTailDefault,
            Log = message => File.AppendAllText(logPath, $"[{DateTimeOffset.Now:u}] {message}{Environment.NewLine}"),
            HealthTimeout = healthTimeout,
        };
    }

    /// <summary>Starts the Cove in the app folder the way it was started before.</summary>
    internal static int StartCove(UpdateJournal journal)
    {
        if (journal.LaunchMode == LaunchModes.InstanceManager && journal.StartScript is { } script && File.Exists(script))
            return UpdateProcessLauncher.RunStartScript(script);

        return UpdateProcessLauncher.StartDetached(
            Path.Combine(journal.AppDirectory, journal.CoveFileName),
            journal.Launch.Arguments,
            journal.Launch.WorkingDirectory is { } cwd && Directory.Exists(cwd) ? cwd : journal.AppDirectory,
            OutputLogPath(journal),
            visibleWindow: true);
    }

    internal static string OutputLogPath(UpdateJournal journal)
    {
        var dataRoot = Cove.Core.Interfaces.CoveDefaultPaths.GetDataRoot();
        return Path.Combine(new UpdatePaths(dataRoot).LogDirectory, "cove-update-output.log");
    }

    private static async Task<string?> GetVersionAsync(HttpClient http, UpdateJournal journal, CancellationToken ct)
    {
        if (journal.HealthUrl is null)
            return null;
        try
        {
            using var response = await http.GetAsync(new Uri(new Uri(journal.HealthUrl.TrimEnd('/') + "/"), "api/system/status"), ct);
            if (!response.IsSuccessStatusCode)
                return null;
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            return document.RootElement.TryGetProperty("version", out var version) ? version.GetString() : null;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            return null;
        }
    }

    private static async Task WaitForPortFreeAsync(UpdateJournal journal, CancellationToken ct)
    {
        if (journal.HealthUrl is null || !Uri.TryCreate(journal.HealthUrl, UriKind.Absolute, out var uri))
            return;
        var deadline = DateTime.UtcNow.AddSeconds(60);
        while (DateTime.UtcNow < deadline)
        {
            try
            {
                using var listener = new TcpListener(System.Net.IPAddress.Any, uri.Port);
                listener.Start();
                listener.Stop();
                return;
            }
            catch (SocketException)
            {
                await Task.Delay(500, ct);
            }
        }
    }

    private static string? ReadLogTailDefault(UpdateJournal journal)
    {
        var candidates = new List<string> { OutputLogPath(journal) };
        var logDirectory = Path.GetDirectoryName(OutputLogPath(journal))!;
        if (Directory.Exists(logDirectory))
        {
            candidates.AddRange(new DirectoryInfo(logDirectory).GetFiles("cove-*.log")
                .OrderByDescending(file => file.LastWriteTimeUtc)
                .Take(1)
                .Select(file => file.FullName));
        }

        foreach (var path in candidates.Where(File.Exists))
        {
            try
            {
                using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
                using var reader = new StreamReader(stream);
                var lines = reader.ReadToEnd().Split('\n');
                return string.Join('\n', lines.TakeLast(40)).Trim();
            }
            catch (IOException)
            {
            }
        }
        return null;
    }
}

/// <summary>
/// Runs as <c>Cove --cove-relaunch</c> from the previous binary (the one being replaced) so the code
/// that decides on rollback is the version already known to work. It waits for the old process to
/// exit, starts the new one the same way, and rolls back if the new version does not report itself
/// healthy in time.
/// </summary>
internal sealed class UpdateRelauncher(UpdateRelaunchHost host)
{
    public const string Argument = "--cove-relaunch";

    public async Task<int> RunAsync(string journalPath, int waitPid, CancellationToken ct = default)
    {
        var journal = UpdateJson.Read<UpdateJournal>(journalPath);
        if (journal is null)
        {
            host.Log($"No update journal at {journalPath}; nothing to do.");
            return 2;
        }

        host.Log($"{journal.Kind} {journal.FromVersion} -> {journal.ToVersion}: waiting for process {waitPid} to exit");
        await WaitForExitAsync(waitPid, ct);
        await host.WaitForPortFree(journal, ct);

        int pid;
        try
        {
            pid = host.Start(journal);
            host.Log($"Started Cove {journal.ToVersion} as process {pid}");
        }
        catch (Exception ex)
        {
            return await RollBackAsync(journalPath, journal, $"Cove {journal.ToVersion} could not be started: {ex.Message}", null, ct);
        }

        var deadline = DateTime.UtcNow + host.HealthTimeout;
        while (DateTime.UtcNow < deadline)
        {
            var version = await host.GetRunningVersion(journal, ct);
            if (string.Equals(version, journal.ToVersion, StringComparison.Ordinal))
            {
                var succeeded = journal with { State = UpdateJournalStates.Succeeded, UpdatedAt = DateTimeOffset.UtcNow };
                UpdateJson.Write(journalPath, succeeded);
                host.Log($"Cove {journal.ToVersion} is running; the {journal.Kind} succeeded.");
                new UpdateFileSwapper(journal.AppDirectory, journal.CoveFileName, journal.ManagerFileName, host.Log)
                    .CleanUp(keepPrevious: journal.Kind == UpdateJournalKinds.Update);
                return 0;
            }

            if (!host.IsAlive(pid))
                return await RollBackAsync(journalPath, journal, $"Cove {journal.ToVersion} exited during startup.", null, ct);

            await Task.Delay(host.PollInterval, ct);
        }

        return await RollBackAsync(
            journalPath,
            journal,
            $"Cove {journal.ToVersion} did not report itself running within {host.HealthTimeout.TotalMinutes:0.#} minutes.",
            pid,
            ct);
    }

    private async Task WaitForExitAsync(int pid, CancellationToken ct)
    {
        var deadline = DateTime.UtcNow + host.ExitWaitTimeout;
        while (host.IsAlive(pid))
        {
            if (DateTime.UtcNow >= deadline)
            {
                host.Log($"Process {pid} did not exit in time; stopping it");
                host.Stop(pid);
                return;
            }
            await Task.Delay(TimeSpan.FromMilliseconds(250), ct);
        }
    }

    private async Task<int> RollBackAsync(string journalPath, UpdateJournal journal, string reason, int? runningPid, CancellationToken ct)
    {
        host.Log($"Rolling back: {reason}");
        if (runningPid is { } pid)
            host.Stop(pid);

        var logTail = host.ReadLogTail(journal);
        var swapper = new UpdateFileSwapper(journal.AppDirectory, journal.CoveFileName, journal.ManagerFileName, host.Log);
        try
        {
            if (journal.Kind == UpdateJournalKinds.Revert)
                swapper.UndoRevert();
            else
                swapper.RollBack();
        }
        catch (Exception ex)
        {
            host.Log($"Restoring the previous binary failed: {ex}");
            UpdateJson.Write(journalPath, journal with
            {
                State = UpdateJournalStates.Failed,
                Error = $"{reason} Restoring Cove {journal.FromVersion} also failed: {ex.Message}",
                LogTail = logTail,
                UpdatedAt = DateTimeOffset.UtcNow,
            });
            return 3;
        }

        var rolledBack = journal with
        {
            State = UpdateJournalStates.RolledBack,
            Error = reason,
            LogTail = logTail,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        UpdateJson.Write(journalPath, rolledBack);

        await host.WaitForPortFree(journal, ct);
        try
        {
            var restored = host.Start(rolledBack);
            host.Log($"Restarted Cove {journal.FromVersion} as process {restored}");
            var deadline = DateTime.UtcNow + host.HealthTimeout;
            while (DateTime.UtcNow < deadline && host.IsAlive(restored))
            {
                if (string.Equals(await host.GetRunningVersion(journal, ct), journal.FromVersion, StringComparison.Ordinal))
                {
                    host.Log($"Cove {journal.FromVersion} is running again.");
                    break;
                }
                await Task.Delay(host.PollInterval, ct);
            }
        }
        catch (Exception ex)
        {
            host.Log($"Restarting Cove {journal.FromVersion} failed: {ex.Message}. Start Cove manually.");
        }

        return 1;
    }
}
