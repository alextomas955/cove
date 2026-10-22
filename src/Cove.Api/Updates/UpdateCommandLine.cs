using System.Globalization;
using Cove.Core.Common;
using Cove.Core.Interfaces;

namespace Cove.Api.Updates;

/// <summary>
/// Handles the update-related command lines before the web host is built: <c>--version</c> (the
/// smoke test run against a downloaded binary), <c>--cove-relaunch</c>, and the boot-attempt check
/// that rolls back an update whose new version keeps failing under systemd.
/// </summary>
internal static class UpdateCommandLine
{
    /// <summary>Exit code that asks systemd (<c>Restart=on-failure</c>) to start Cove again.</summary>
    public const int RestartExitCode = 75;
    internal const int MaxUnsupervisedBootAttempts = 3;

    /// <summary>Returns an exit code when the process should stop here, or null to start Cove normally.</summary>
    public static int? Run(string[] args)
    {
        if (args is ["--version"])
        {
            Console.WriteLine(CoveVersion.Display);
            return 0;
        }

        if (args.Length > 0 && args[0] == UpdateRelauncher.Argument)
            return RunRelauncher(args);

        try
        {
            return CheckUnsupervisedBoot(new UpdatePaths(CoveDefaultPaths.GetDataRoot()), CoveVersion.Display);
        }
        catch (Exception ex)
        {
            // Never let update bookkeeping stop Cove from starting.
            Console.Error.WriteLine($"Update journal check failed: {ex.Message}");
            return null;
        }
    }

    /// <summary>
    /// For an update that systemd or the user restarts (no relauncher watches it), counts boots of the
    /// new version. After repeated boots without reaching "started", the previous binary is restored
    /// and Cove exits with <see cref="RestartExitCode"/> so the service manager starts the old version.
    /// </summary>
    internal static int? CheckUnsupervisedBoot(UpdatePaths paths, string runningVersion)
    {
        var journal = UpdateJson.Read<UpdateJournal>(paths.JournalPath);
        if (journal is null
            || journal.Supervised
            || journal.State is not (UpdateJournalStates.Restarting or UpdateJournalStates.Staged)
            || !string.Equals(journal.ToVersion, runningVersion, StringComparison.Ordinal))
        {
            return null;
        }

        var attempts = journal.BootAttempts + 1;
        if (attempts <= MaxUnsupervisedBootAttempts)
        {
            UpdateJson.Write(paths.JournalPath, journal with { BootAttempts = attempts, UpdatedAt = DateTimeOffset.UtcNow });
            return null;
        }

        var swapper = new UpdateFileSwapper(journal.AppDirectory, journal.CoveFileName, journal.ManagerFileName);
        if (journal.Kind == UpdateJournalKinds.Revert)
            swapper.UndoRevert();
        else
            swapper.RollBack();

        var reason = $"Cove {journal.ToVersion} failed to start {MaxUnsupervisedBootAttempts} times; Cove {journal.FromVersion} was restored.";
        UpdateJson.Write(paths.JournalPath, journal with
        {
            State = UpdateJournalStates.RolledBack,
            Error = reason,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        Console.Error.WriteLine(reason);
        return RestartExitCode;
    }

    private static int RunRelauncher(string[] args)
    {
        var journalPath = GetOption(args, "--journal");
        var waitPid = int.TryParse(GetOption(args, "--wait-pid"), NumberStyles.None, CultureInfo.InvariantCulture, out var pid) ? pid : 0;
        if (journalPath is null)
        {
            Console.Error.WriteLine("--cove-relaunch requires --journal <path>.");
            return 2;
        }

        var paths = new UpdatePaths(Path.GetDirectoryName(Path.GetDirectoryName(Path.GetFullPath(journalPath)))!);
        var host = UpdateRelaunchHost.CreateDefault(Path.Combine(paths.LogDirectory, "update-relaunch.log"));
        try
        {
            return new UpdateRelauncher(host).RunAsync(journalPath, waitPid).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            host.Log($"Relauncher failed: {ex}");
            return 4;
        }
    }

    private static string? GetOption(string[] args, string name)
    {
        var index = Array.IndexOf(args, name);
        return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
    }
}

/// <summary>Set when an update asks the process to exit with a specific code after the host stops.</summary>
internal static class UpdateRestart
{
    private static int _requestedExitCode;

    public static int? RequestedExitCode => _requestedExitCode == 0 ? null : _requestedExitCode;

    public static void RequestExitCode(int code) => Interlocked.Exchange(ref _requestedExitCode, code);
}
