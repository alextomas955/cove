namespace Cove.Api.Updates;

/// <summary>
/// Moves the Cove and Instance Manager executables between their live, <c>.old</c>, <c>.failed</c>, and
/// <c>.reverted</c> names. Every change is a rename on the same volume and never an overwrite: a running
/// executable can be renamed on Windows, and overwriting a signed Mach-O in place can get the running
/// process killed on macOS.
/// </summary>
internal sealed class UpdateFileSwapper
{
    public const string OldSuffix = ".old";
    public const string FailedSuffix = ".failed";
    public const string RevertedSuffix = ".reverted";
    public const string StagingDirectoryName = ".cove-update";

    private readonly string[] _fileNames;
    private readonly Action<string>? _log;
    private readonly int _attempts;
    private readonly TimeSpan _initialDelay;

    public UpdateFileSwapper(
        string appDirectory,
        string coveFileName,
        string managerFileName,
        Action<string>? log = null,
        int attempts = 0,
        TimeSpan? initialDelay = null)
    {
        AppDirectory = appDirectory;
        CoveFileName = coveFileName;
        ManagerFileName = managerFileName;
        _fileNames = [coveFileName, managerFileName];
        _log = log;
        // Antivirus scanners briefly lock freshly written executables on Windows.
        _attempts = attempts > 0 ? attempts : OperatingSystem.IsWindows() ? 8 : 3;
        _initialDelay = initialDelay ?? TimeSpan.FromMilliseconds(250);
    }

    public string AppDirectory { get; }
    public string CoveFileName { get; }
    public string ManagerFileName { get; }
    public string StagingDirectory => Path.Combine(AppDirectory, StagingDirectoryName);
    public string CovePath => Path.Combine(AppDirectory, CoveFileName);
    public string CoveOldPath => CovePath + OldSuffix;
    public string CoveRevertedPath => CovePath + RevertedSuffix;
    public bool HasPreviousVersion => File.Exists(CoveOldPath);

    /// <summary>Removes the previous update's leftovers so <c>.old</c> can hold the version being replaced.</summary>
    public void PrepareForInstall()
    {
        foreach (var name in _fileNames)
        {
            foreach (var suffix in new[] { OldSuffix, FailedSuffix, RevertedSuffix })
                DeleteOrSetAside(Path.Combine(AppDirectory, name + suffix));
        }
    }

    /// <summary>
    /// <c>X</c> → <c>X.old</c> and the staged file → <c>X</c>, for Cove and then the Instance Manager. A
    /// failure part way undoes the renames already made.
    /// </summary>
    public void Install(ExtractedUpdate update)
    {
        var done = new List<(string From, string To)>();
        try
        {
            foreach (var (name, staged) in new[] { (CoveFileName, update.CovePath), (ManagerFileName, update.ManagerPath) })
            {
                var live = Path.Combine(AppDirectory, name);
                if (File.Exists(live))
                {
                    Rename(live, live + OldSuffix);
                    done.Add((live, live + OldSuffix));
                }
                Rename(staged, live);
                done.Add((staged, live));
            }
        }
        catch
        {
            Undo(done);
            throw;
        }
    }

    /// <summary>A failed update: <c>X</c> → <c>X.failed</c> and <c>X.old</c> → <c>X</c>.</summary>
    public void RollBack() => Exchange(OldSuffix, FailedSuffix);

    /// <summary>Revert a successful update: <c>X</c> → <c>X.reverted</c> and <c>X.old</c> → <c>X</c>.</summary>
    public void Revert() => Exchange(OldSuffix, RevertedSuffix);

    /// <summary>A failed revert: <c>X</c> → <c>X.old</c> and <c>X.reverted</c> → <c>X</c>.</summary>
    public void UndoRevert() => Exchange(RevertedSuffix, OldSuffix);

    /// <summary>
    /// Deletes files that are no longer needed: failed and reverted binaries, the staging folder, and
    /// <c>.old</c> unless it is kept for Revert. Locked files (an exiting process on Windows) are retried
    /// and otherwise left for the next start.
    /// </summary>
    public void CleanUp(bool keepPrevious)
    {
        foreach (var name in _fileNames)
        {
            TryDeleteWithRetry(Path.Combine(AppDirectory, name + FailedSuffix));
            TryDeleteWithRetry(Path.Combine(AppDirectory, name + RevertedSuffix));
            if (!keepPrevious)
                TryDeleteWithRetry(Path.Combine(AppDirectory, name + OldSuffix));
            if (Directory.Exists(AppDirectory))
            {
                foreach (var stale in Directory.EnumerateFiles(AppDirectory, name + ".*.stale"))
                    TryDeleteWithRetry(stale);
            }
        }

        try
        {
            if (Directory.Exists(StagingDirectory))
                Directory.Delete(StagingDirectory, recursive: true);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            _log?.Invoke($"Could not remove {StagingDirectory}: {ex.Message}");
        }
    }

    /// <summary>
    /// The live file moves to <paramref name="liveTo"/> and the file named <paramref name="restoreFrom"/>
    /// becomes live. Files with nothing to restore are left untouched.
    /// </summary>
    private void Exchange(string restoreFrom, string liveTo)
    {
        var done = new List<(string From, string To)>();
        try
        {
            foreach (var name in _fileNames)
            {
                var live = Path.Combine(AppDirectory, name);
                var restore = live + restoreFrom;
                if (!File.Exists(restore))
                {
                    if (name == CoveFileName)
                        throw new FileNotFoundException($"{restore} is missing, so the previous version cannot be restored.", restore);
                    continue;
                }

                var aside = live + liveTo;
                DeleteOrSetAside(aside);
                if (File.Exists(live))
                {
                    Rename(live, aside);
                    done.Add((live, aside));
                }
                Rename(restore, live);
                done.Add((restore, live));
            }
        }
        catch
        {
            Undo(done);
            throw;
        }
    }

    private void Undo(List<(string From, string To)> done)
    {
        for (var index = done.Count - 1; index >= 0; index--)
        {
            try
            {
                Rename(done[index].To, done[index].From);
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                _log?.Invoke($"Could not undo rename {done[index].From} -> {done[index].To}: {ex.Message}");
            }
        }
    }

    internal void Rename(string from, string to)
    {
        var delay = _initialDelay;
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                File.Move(from, to, overwrite: false);
                _log?.Invoke($"Renamed {Path.GetFileName(from)} -> {Path.GetFileName(to)}");
                return;
            }
            catch (Exception ex) when ((ex is IOException or UnauthorizedAccessException) && ex is not FileNotFoundException && attempt < _attempts && !File.Exists(to))
            {
                _log?.Invoke($"Rename {Path.GetFileName(from)} -> {Path.GetFileName(to)} failed ({ex.Message}); retrying");
                Thread.Sleep(delay);
                delay *= 2;
            }
        }
    }

    /// <summary>Deletes a file; a file that cannot be deleted (still running on Windows) is renamed out of the way.</summary>
    private void DeleteOrSetAside(string path)
    {
        if (!File.Exists(path))
            return;
        if (TryDeleteWithRetry(path))
            return;
        Rename(path, $"{path}.{DateTime.UtcNow:yyyyMMddHHmmss}.stale");
    }

    private bool TryDeleteWithRetry(string path)
    {
        var delay = _initialDelay;
        for (var attempt = 1; attempt <= _attempts; attempt++)
        {
            try
            {
                if (File.Exists(path))
                    File.Delete(path);
                return true;
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                if (attempt == _attempts)
                {
                    _log?.Invoke($"Could not delete {path}: {ex.Message}");
                    return false;
                }
                Thread.Sleep(delay);
                delay *= 2;
            }
        }
        return false;
    }
}
