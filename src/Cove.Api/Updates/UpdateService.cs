using System.Text.Json;
using Cove.Core.Auth;
using Cove.Core.Common;
using Cove.Core.DTOs;
using Cove.Core.Interfaces;
using Cove.Api.Services;
using Cove.Data;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;

namespace Cove.Api.Updates;

internal sealed record UpdateActionOutcome(int StatusCode, string Message, string? JobId = null);

/// <summary>
/// Coordinates Cove's own updates: release checks for every install kind, and for native installs the
/// download, verification, backup, swap, and restart. Cove is the coordinator; the Instance Manager is
/// only used, when present, to restart the instance the way it normally starts it.
/// </summary>
public sealed class UpdateService
{
    internal static readonly TimeSpan ForcedCheckCooldown = TimeSpan.FromSeconds(60);
    private const string JobType = "system-update";

    private readonly CoveConfiguration _config;
    private readonly ConfigService _configService;
    private readonly JobService _jobs;
    private readonly IAuditService _audit;
    private readonly IServiceScopeFactory _scopes;
    private readonly IHostApplicationLifetime _lifetime;
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _configuration;
    private readonly IServer? _server;
    private readonly ILogger<UpdateService> _logger;
    private readonly TimeProvider _time;
    private readonly Func<InstallEnvironment> _detectEnvironment;
    private readonly SemaphoreSlim _checkGate = new(1, 1);
    private readonly Lock _applyLock = new();
    private string _applyState = UpdateApplyStates.Idle;
    private string? _applyMessage;
    private string? _applyJobId;
    private string? _failedVersion;
    private DateTimeOffset? _lastForcedCheck;
    private IReadOnlyCollection<string>? _knownMigrations;

    public UpdateService(
        CoveConfiguration config,
        ConfigService configService,
        JobService jobs,
        IAuditService audit,
        IServiceScopeFactory scopes,
        IHostApplicationLifetime lifetime,
        IHttpClientFactory httpFactory,
        IConfiguration configuration,
        IServer server,
        ILogger<UpdateService> logger,
        TimeProvider time)
        : this(config, configService, jobs, audit, scopes, lifetime, httpFactory, configuration, server, logger, time,
            InstallEnvironment.DetectCurrent, CoveDefaultPaths.GetDataRoot())
    {
    }

    /// <summary>For tests: a fixed install environment and data root.</summary>
    internal UpdateService(
        CoveConfiguration config,
        ConfigService configService,
        JobService jobs,
        IAuditService audit,
        IServiceScopeFactory scopes,
        IHostApplicationLifetime lifetime,
        IHttpClientFactory httpFactory,
        IConfiguration configuration,
        IServer? server,
        ILogger<UpdateService> logger,
        TimeProvider time,
        Func<InstallEnvironment> detectEnvironment,
        string dataRoot)
    {
        _config = config;
        _configService = configService;
        _jobs = jobs;
        _audit = audit;
        _scopes = scopes;
        _lifetime = lifetime;
        _httpFactory = httpFactory;
        _configuration = configuration;
        _server = server;
        _logger = logger;
        _time = time;
        _detectEnvironment = detectEnvironment;
        Paths = new UpdatePaths(dataRoot);
    }

    internal UpdatePaths Paths { get; }

    public static string CurrentVersion => CoveVersion.Display;

    internal InstallEnvironment DetectEnvironment() => _detectEnvironment();

    public async Task<UpdateStatusDto> GetStatusAsync(CancellationToken ct)
    {
        var environment = DetectEnvironment();
        var current = CurrentVersion;
        var settings = _configService.GetUpdatesConfig();
        var channel = UpdatePolicy.ResolveChannel(settings.Channel, current);
        var state = UpdateJson.Read<UpdateCheckState>(Paths.StatePath);
        var offer = GetValidOffer(state, channel, current);
        var known = await GetKnownMigrationsAsync(ct);
        var journal = UpdateJson.Read<UpdateJournal>(Paths.JournalPath);
        var (applyState, applyMessage, failedVersion, logTail) = ComposeApplyState(journal, current);
        var revert = await EvaluateRevertAsync(environment, journal, current, ct);
        var asset = offer?.FindAsset(environment.Rid);

        var cannotApply = environment.CannotApplyReason
            ?? (offer is not null && asset is null ? $"The release has no download for {environment.Rid}." : null);

        return new UpdateStatusDto
        {
            CurrentVersion = current,
            Channel = settings.Channel,
            EffectiveChannel = channel,
            InstallKind = environment.Kind,
            LaunchMode = environment.LaunchMode,
            Rid = environment.Rid,
            CanApply = cannotApply is null,
            CannotApplyReason = cannotApply,
            UpdateAvailable = offer is not null,
            Latest = offer is null ? null : new UpdateLatestDto
            {
                Version = offer.Version,
                PublishedAt = offer.PublishedAt,
                NotesMarkdown = offer.NotesMarkdown,
                NotesUrl = offer.NotesUrl,
                AssetName = asset?.Name,
                AssetSize = asset?.Size,
                RequiresMigration = UpdatePolicy.RequiresMigration(offer, known),
                PreviousOutcome = UpdateFailureMemory.Find(state, offer.Version)?.Outcome,
            },
            LastCheckedAt = state?.LastCheckedAt,
            LastError = state?.LastError,
            ApplyState = applyState,
            ApplyMessage = applyMessage,
            ApplyJobId = _applyJobId,
            FailedVersion = failedVersion,
            LogTail = logTail,
            PreviousVersionAvailable = revert.Available,
            PreviousVersion = revert.PreviousVersion,
            RevertUnavailableReason = revert.Reason,
            OtherInstancesSharingBinary = GetOtherInstances(environment),
            ManualRestart = environment.Kind == InstallKinds.Native && DecideRestart(environment) == RestartPlan.Manual,
            ShowBanner = settings.ShowBanner,
            ReleasesUrl = ReleasesPageUrl(),
            Settings = settings,
        };
    }

    /// <summary>Starts the forced-check cooldown; false (with the remaining wait) while it is running.</summary>
    internal bool TryBeginForcedCheck(out TimeSpan retryAfter)
    {
        lock (_applyLock)
        {
            var now = _time.GetUtcNow();
            if (_lastForcedCheck is { } last && now - last < ForcedCheckCooldown)
            {
                retryAfter = ForcedCheckCooldown - (now - last);
                return false;
            }
            _lastForcedCheck = now;
            retryAfter = TimeSpan.Zero;
            return true;
        }
    }

    /// <summary>Fetches the feed for the configured channel and persists the result.</summary>
    public Task CheckAsync(CancellationToken ct) => RefreshAsync(ct);

    /// <summary>
    /// Fetches the feed and persists the result. Returns the current offer and, when the feed could not
    /// be read, the error (the offer is then the previous check's).
    /// </summary>
    private async Task<(UpdateRelease? Offer, string? Error)> RefreshAsync(CancellationToken ct)
    {
        await _checkGate.WaitAsync(ct);
        try
        {
            var current = CurrentVersion;
            var channel = UpdatePolicy.ResolveChannel(_config.Updates.Channel, current);
            var previous = UpdateJson.Read<UpdateCheckState>(Paths.StatePath);
            UpdateRelease? offer;
            string? error = null;
            try
            {
                var feed = CreateFeedClient();
                var stable = await feed.GetStableAsync(ct);
                var nightly = channel == UpdateChannels.Nightly ? await feed.GetNightlyAsync(ct) : null;
                var prereleases = channel == UpdateChannels.Prerelease ? await feed.GetPrereleasesAsync(ct) : [];
                offer = UpdatePolicy.SelectOffer(channel, current, stable, nightly, prereleases);
                _logger.LogInformation(
                    "Update check ({Channel}): running {Current}, {Result}",
                    channel,
                    current,
                    offer is null ? "up to date" : $"{offer.Version} available");
            }
            catch (Exception ex) when (ex is UpdateFeedException or HttpRequestException or ArgumentException or TaskCanceledException && !ct.IsCancellationRequested)
            {
                error = ex.Message;
                offer = GetValidOffer(previous, channel, current);
                _logger.LogWarning("Update check failed: {Error}", ex.Message);
            }

            UpdateJson.Write(Paths.StatePath, new UpdateCheckState
            {
                LastCheckedAt = _time.GetUtcNow(),
                CheckedVersion = current,
                CheckedChannel = channel,
                Latest = offer,
                LastError = error,
                FailedVersions = previous?.FailedVersions ?? [],
            });
            return (offer, error);
        }
        finally
        {
            _checkGate.Release();
        }
    }

    public bool IsCheckDue()
    {
        var state = UpdateJson.Read<UpdateCheckState>(Paths.StatePath);
        var current = CurrentVersion;
        if (state?.LastCheckedAt is not { } lastChecked
            || state.CheckedVersion != current
            || state.CheckedChannel != UpdatePolicy.ResolveChannel(_config.Updates.Channel, current))
        {
            return true;
        }
        var hours = Math.Clamp(_config.Updates.CheckIntervalHours, 1, 168);
        var jitter = 0.9 + Random.Shared.NextDouble() * 0.2;
        return _time.GetUtcNow() - lastChecked >= TimeSpan.FromHours(hours * jitter);
    }

    /// <summary>
    /// Starts installing the offered update. The release is fetched again first, so a re-published
    /// release or changed checksums are used rather than the last check's copy.
    /// </summary>
    /// <param name="expectedVersion">The version the person confirmed; defaults to the last check's offer.</param>
    internal async Task<UpdateActionOutcome> StartApplyAsync(
        CovePrincipal? actor,
        bool force,
        bool automatic,
        string? expectedVersion,
        CancellationToken ct)
    {
        var environment = DetectEnvironment();
        if (environment.CannotApplyReason is { } reason)
            return new(StatusCodes.Status400BadRequest, reason);

        var current = CurrentVersion;
        var channel = UpdatePolicy.ResolveChannel(_config.Updates.Channel, current);
        var cached = GetValidOffer(UpdateJson.Read<UpdateCheckState>(Paths.StatePath), channel, current);
        if (cached is null)
            return new(StatusCodes.Status409Conflict, "No update is available. Check for updates first.");
        var version = string.IsNullOrWhiteSpace(expectedVersion) ? cached.Version : expectedVersion.Trim();

        if (!force && HasActiveJobs())
            return new(StatusCodes.Status409Conflict, "Jobs are running. Wait for them to finish, or confirm that the restart may interrupt them.");

        lock (_applyLock)
        {
            if (_applyState is UpdateApplyStates.Downloading or UpdateApplyStates.Applying)
                return new(StatusCodes.Status409Conflict, "An update is already in progress.");
            _applyState = UpdateApplyStates.Downloading;
            _applyMessage = $"Checking the release of Cove {version}";
            _failedVersion = null;
        }

        var (offer, refreshError) = await RefreshAsync(ct);
        string? refused = null;
        int refusedStatus = StatusCodes.Status409Conflict;
        if (refreshError is not null)
        {
            refused = $"Could not confirm Cove {version} with the release feed: {refreshError}";
            refusedStatus = StatusCodes.Status502BadGateway;
        }
        else if (offer is null)
            refused = $"Cove {version} is no longer offered. The update status has been refreshed.";
        else if (!string.Equals(offer.Version, version, StringComparison.Ordinal))
            refused = $"The release feed now offers Cove {offer.Version} instead of {version}. Review it and install again.";

        var asset = offer?.FindAsset(environment.Rid);
        if (refused is null && asset is null)
        {
            refused = $"Cove {version} has no download for {environment.Rid}.";
            refusedStatus = StatusCodes.Status400BadRequest;
        }

        if (refused is null)
        {
            try
            {
                var free = new DriveInfo(environment.AppDirectory).AvailableFreeSpace;
                var needed = Math.Max(asset!.Size, 1) * 4 + 64L * 1024 * 1024;
                if (free < needed)
                {
                    refused = $"Not enough free disk space in {environment.AppDirectory}: {needed / (1024 * 1024)} MB needed.";
                    refusedStatus = StatusCodes.Status400BadRequest;
                }
            }
            catch (Exception ex) when (ex is ArgumentException or IOException or UnauthorizedAccessException)
            {
                _logger.LogDebug(ex, "Could not determine free disk space for {Directory}", environment.AppDirectory);
            }
        }

        if (refused is not null)
        {
            lock (_applyLock)
            {
                _applyState = UpdateApplyStates.Idle;
                _applyMessage = null;
            }
            _logger.LogWarning("Not installing Cove {Version}: {Reason}", version, refused);
            return new(refusedStatus, refused);
        }

        string? jobId = null;
        jobId = _jobs.EnqueueWithoutRetry(
            JobType,
            $"Update Cove to {offer!.Version}",
            (progress, jobCt) => ApplyAsync(environment, offer, asset!, actor, automatic, () => jobId, progress, jobCt),
            exclusive: false);
        lock (_applyLock)
            _applyJobId = jobId;
        return new(StatusCodes.Status202Accepted, $"Updating Cove to {offer.Version}.", jobId);
    }

    internal async Task<UpdateActionOutcome> RevertAsync(CovePrincipal? actor, CancellationToken ct)
    {
        var environment = DetectEnvironment();
        var current = CurrentVersion;
        var journal = UpdateJson.Read<UpdateJournal>(Paths.JournalPath);
        var revert = await EvaluateRevertAsync(environment, journal, current, ct);
        if (!revert.Available || journal is null)
            return new(StatusCodes.Status409Conflict, revert.Reason ?? "There is no previous version to revert to.");

        lock (_applyLock)
        {
            if (_applyState is UpdateApplyStates.Downloading or UpdateApplyStates.Applying)
                return new(StatusCodes.Status409Conflict, "An update is already in progress.");
            _applyState = UpdateApplyStates.Applying;
            _applyMessage = $"Reverting to Cove {journal.FromVersion}";
        }

        var swapper = CreateSwapper(environment);
        try
        {
            await SmokeTestAsync(swapper.CoveOldPath, journal.FromVersion, ct);
            var plan = DecideRestart(environment);
            var revertJournal = CreateJournal(environment, UpdateJournalKinds.Revert, current, journal.FromVersion, journal.AppliedMigrations, automatic: false) with
            {
                Supervised = plan == RestartPlan.Relauncher,
            };
            UpdateJson.Write(Paths.JournalPath, revertJournal);
            swapper.Revert();
            UpdateJson.Write(Paths.JournalPath, revertJournal with
            {
                State = plan == RestartPlan.Manual ? UpdateJournalStates.Staged : UpdateJournalStates.Restarting,
                UpdatedAt = DateTimeOffset.UtcNow,
            });

            // Someone went back from this version on purpose: automatic updates must not reinstall it.
            RememberFailure(current, UpdateFailureOutcomes.Reverted, $"Reverted to Cove {journal.FromVersion}.");
            await _audit.LogAsync(AuditActions.SystemUpdateRevert, AuditOutcomes.Success, actor, "system", "cove",
                new { from = current, to = journal.FromVersion }, ct);
            lock (_applyLock)
            {
                _applyState = plan == RestartPlan.Manual ? UpdateApplyStates.Staged : UpdateApplyStates.Applying;
                _applyMessage = plan == RestartPlan.Manual
                    ? $"Restart Cove to finish reverting to {journal.FromVersion}."
                    : $"Restarting into Cove {journal.FromVersion}";
            }
            ScheduleRestart(environment, plan, swapper.CoveRevertedPath, revertJournal);
            return new(StatusCodes.Status202Accepted, _applyMessage!);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reverting to Cove {Version} failed", journal.FromVersion);
            lock (_applyLock)
            {
                _applyState = UpdateApplyStates.Failed;
                _applyMessage = $"Reverting failed: {ex.Message}";
            }
            UpdateJson.Write(Paths.JournalPath, journal);
            await _audit.LogAsync(AuditActions.SystemUpdateRevert, AuditOutcomes.Error, actor, "system", "cove",
                new { from = current, to = journal.FromVersion, error = ex.Message }, ct);
            return new(StatusCodes.Status500InternalServerError, _applyMessage!);
        }
    }

    public async Task<UpdatesConfigDto> SaveSettingsAsync(UpdatesConfigDto settings)
    {
        var saved = await _configService.UpdateUpdatesConfigAsync(_ => settings);
        return saved;
    }

    /// <summary>
    /// Runs once the new process has fully started: completes unsupervised updates, records a rollback
    /// in the audit log, and removes binaries that are no longer needed.
    /// </summary>
    public async Task OnStartupCompletedAsync(CancellationToken ct)
    {
        var current = CurrentVersion;
        var journal = UpdateJson.Read<UpdateJournal>(Paths.JournalPath);
        if (journal is not null)
        {
            if (!journal.Supervised
                && journal.State is UpdateJournalStates.Restarting or UpdateJournalStates.Staged
                && journal.ToVersion == current)
            {
                journal = journal with { State = UpdateJournalStates.Succeeded, UpdatedAt = DateTimeOffset.UtcNow };
                UpdateJson.Write(Paths.JournalPath, journal);
                _logger.LogInformation("Cove {Version} started; the {Kind} from {From} is complete", current, journal.Kind, journal.FromVersion);
            }

            if (journal.State is UpdateJournalStates.RolledBack or UpdateJournalStates.Failed
                && journal.FromVersion == current
                && !journal.RollbackAudited)
            {
                var rolledBack = journal.State == UpdateJournalStates.RolledBack;
                if (journal.Kind == UpdateJournalKinds.Update)
                {
                    // The relauncher records this too; a rollback after repeated unsupervised boots does not.
                    RememberFailure(journal.ToVersion, rolledBack ? UpdateFailureOutcomes.RolledBack : UpdateFailureOutcomes.Failed, journal.Error);
                }
                // The job finished before the restart and reported success; correct it now.
                if (journal.JobId is { } jobId)
                    _jobs.RecordLateFailure(jobId, journal.Error ?? $"Cove {journal.ToVersion} did not start and Cove {journal.FromVersion} was restored.");
                if (rolledBack)
                {
                    await _audit.LogAsync(AuditActions.SystemUpdateRollback, AuditOutcomes.Fail, null, "system", "cove",
                        new { from = journal.FromVersion, to = journal.ToVersion, reason = journal.Error }, ct);
                    _logger.LogWarning("The update to Cove {Version} was rolled back: {Reason}", journal.ToVersion, journal.Error);
                }
                journal = journal with { RollbackAudited = true };
                UpdateJson.Write(Paths.JournalPath, journal);
            }
        }

        var environment = DetectEnvironment();
        if (environment.Kind != InstallKinds.Native || !environment.AppDirectoryWritable)
            return;
        if (journal?.State != UpdateJournalStates.Restarting)
        {
            var keepPrevious = journal is { Kind: UpdateJournalKinds.Update, State: UpdateJournalStates.Succeeded } && journal.ToVersion == current;
            await Task.Run(() => CreateSwapper(environment).CleanUp(keepPrevious), ct);
        }
        else if (journal is { Supervised: true, Kind: UpdateJournalKinds.Revert } && journal.ToVersion == current)
        {
            // The relauncher of a revert runs from Cove.reverted, so it cannot delete that file itself.
            // Once it has marked the revert done and exited, remove it rather than wait for the next start.
            _ = Task.Run(() => CleanUpAfterRelauncherAsync(environment, journal.Id));
        }
    }

    private async Task CleanUpAfterRelauncherAsync(InstallEnvironment environment, string journalId)
    {
        try
        {
            var deadline = _time.GetUtcNow() + TimeSpan.FromMinutes(10);
            while (_time.GetUtcNow() < deadline && !_lifetime.ApplicationStopping.IsCancellationRequested)
            {
                var journal = UpdateJson.Read<UpdateJournal>(Paths.JournalPath);
                if (journal?.Id != journalId || journal.State is not (UpdateJournalStates.Restarting or UpdateJournalStates.Succeeded))
                    return;
                if (journal.State == UpdateJournalStates.Succeeded)
                {
                    // Give the relauncher a moment to exit; the deletes retry while the file is still locked.
                    await Task.Delay(TimeSpan.FromSeconds(3), _lifetime.ApplicationStopping);
                    CreateSwapper(environment).CleanUp(keepPrevious: false);
                    return;
                }
                await Task.Delay(TimeSpan.FromSeconds(2), _lifetime.ApplicationStopping);
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Removing the reverted binary failed; it is removed on the next start");
        }
    }

    /// <summary>Starts an automatic update when the settings, window, and policy all allow it.</summary>
    public async Task<bool> TryAutoUpdateAsync(CancellationToken ct)
    {
        var settings = _config.Updates;
        if (settings.AutoUpdate == AutoUpdateModes.Off
            || !UpdatePolicy.IsInWindow(settings.AutoUpdateWindow, TimeOnly.FromDateTime(_time.GetLocalNow().DateTime)))
        {
            return false;
        }

        var environment = DetectEnvironment();
        var current = CurrentVersion;
        var offer = GetValidOffer(UpdateJson.Read<UpdateCheckState>(Paths.StatePath), UpdatePolicy.ResolveChannel(settings.Channel, current), current);
        if (offer is null || environment.CannotApplyReason is not null || HasActiveJobs())
            return false;

        var journal = UpdateJson.Read<UpdateJournal>(Paths.JournalPath);
        if (UpdateFailureMemory.Find(UpdateJson.Read<UpdateCheckState>(Paths.StatePath), offer.Version) is { } failed)
        {
            _logger.LogDebug("Not installing Cove {Version} automatically: it {Outcome} before", offer.Version, failed.Outcome);
            return false;
        }
        if ((journal?.ToVersion == offer.Version && journal.State is UpdateJournalStates.RolledBack or UpdateJournalStates.Failed)
            || _failedVersion == offer.Version)
        {
            return false;
        }

        var (allowed, reason) = UpdatePolicy.EvaluateAutoUpdate(settings.AutoUpdate, current, offer, await GetKnownMigrationsAsync(ct));
        if (!allowed)
        {
            _logger.LogInformation("Not installing Cove {Version} automatically: {Reason}", offer.Version, reason);
            return false;
        }

        _logger.LogInformation("Installing Cove {Version} automatically ({Reason})", offer.Version, reason);
        return (await StartApplyAsync(null, force: false, automatic: true, offer.Version, ct)).StatusCode == StatusCodes.Status202Accepted;
    }

    internal void ResetForTests()
    {
        lock (_applyLock)
        {
            _applyState = UpdateApplyStates.Idle;
            _applyMessage = null;
            _applyJobId = null;
            _failedVersion = null;
            _lastForcedCheck = null;
        }
        foreach (var path in new[] { Paths.StatePath, Paths.JournalPath })
        {
            if (File.Exists(path))
                File.Delete(path);
        }
    }

    private async Task ApplyAsync(
        InstallEnvironment environment,
        UpdateRelease offer,
        UpdateReleaseAsset asset,
        CovePrincipal? actor,
        bool automatic,
        Func<string?> jobId,
        IJobProgress progress,
        CancellationToken ct)
    {
        var current = CurrentVersion;
        var swapper = CreateSwapper(environment);
        var swapped = false;
        // Failures from here on are about the release itself (it would not start, or would not install),
        // not the network, so automatic updates stop trying it.
        var releaseTried = false;
        UpdateJournal? journal = null;
        try
        {
            progress.Report(0.02, "Resolving checksum");
            var feed = CreateFeedClient();
            var sha256 = asset.Sha256 ?? await feed.GetPublishedSha256Async(asset, ct);

            if (Directory.Exists(swapper.StagingDirectory))
                Directory.Delete(swapper.StagingDirectory, recursive: true);
            Directory.CreateDirectory(swapper.StagingDirectory);
            var archive = Path.Combine(swapper.StagingDirectory, asset.Name);
            await UpdateArchive.DownloadAsync(
                CreateHttpClient(TimeSpan.FromMinutes(30)),
                new Uri(asset.DownloadUrl),
                archive,
                asset.Size,
                fraction => progress.Report(0.05 + 0.45 * fraction, $"Downloading {asset.Name}"),
                ct);

            progress.Report(0.52, "Verifying checksum");
            UpdateArchive.VerifySha256(archive, sha256);
            progress.Report(0.56, "Extracting");
            var extracted = UpdateArchive.ExtractAndValidate(archive, environment.IsWindows, swapper.StagingDirectory);
            File.Delete(archive);

            progress.Report(0.6, "Checking the new version starts");
            releaseTried = true;
            await SmokeTestAsync(extracted.CovePath, offer.Version, ct);

            lock (_applyLock)
            {
                _applyState = UpdateApplyStates.Applying;
                _applyMessage = $"Backing up before installing Cove {offer.Version}";
            }
            progress.Report(0.65, "Backing up the database");
            IReadOnlyList<string> applied;
            string backupPath;
            await using (var scope = _scopes.CreateAsyncScope())
            {
                var backups = scope.ServiceProvider.GetRequiredService<IBackupService>();
                backupPath = (await backups.CreateBackupAsync("pre_update", ct)).BackupPath;
                progress.Report(0.8, "Backing up the configuration");
                await backups.CreateConfigBackupAsync("pre_update", ct);
                applied = (await scope.ServiceProvider.GetRequiredService<CoveContext>().Database.GetAppliedMigrationsAsync(ct)).ToList();
            }

            progress.Report(0.9, "Installing");
            var plan = DecideRestart(environment);
            journal = CreateJournal(environment, UpdateJournalKinds.Update, current, offer.Version, applied, automatic) with
            {
                Supervised = plan == RestartPlan.Relauncher,
                BackupPath = backupPath,
                JobId = jobId(),
            };
            UpdateJson.Write(Paths.JournalPath, journal);
            swapper.PrepareForInstall();
            swapper.Install(extracted);
            swapped = true;
            journal = journal with
            {
                State = plan == RestartPlan.Manual ? UpdateJournalStates.Staged : UpdateJournalStates.Restarting,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            UpdateJson.Write(Paths.JournalPath, journal);

            await _audit.LogAsync(AuditActions.SystemUpdateApply, AuditOutcomes.Success, actor, "system", "cove",
                new { from = current, to = offer.Version, automatic, backup = Path.GetFileName(backupPath) }, ct);

            lock (_applyLock)
            {
                _applyState = plan == RestartPlan.Manual ? UpdateApplyStates.Staged : UpdateApplyStates.Applying;
                _applyMessage = plan == RestartPlan.Manual
                    ? $"Cove {offer.Version} is installed. Restart Cove to finish."
                    : $"Restarting into Cove {offer.Version}";
            }
            progress.SetSummary(_applyMessage!);
            ScheduleRestart(environment, plan, swapper.CoveOldPath, journal);
        }
        catch (Exception ex)
        {
            var cancelled = ex is OperationCanceledException && ct.IsCancellationRequested;
            _logger.LogError(ex, "Updating to Cove {Version} failed", offer.Version);
            if (swapped)
            {
                // Not reached in practice (nothing after the swap throws), but never leave a half update.
                try { swapper.RollBack(); } catch (Exception rollbackError) { _logger.LogError(rollbackError, "Restoring the previous binary failed"); }
            }
            if (journal is not null)
                UpdateJson.Write(Paths.JournalPath, journal with { State = UpdateJournalStates.Failed, Error = ex.Message, UpdatedAt = DateTimeOffset.UtcNow });
            try
            {
                if (Directory.Exists(swapper.StagingDirectory))
                    Directory.Delete(swapper.StagingDirectory, recursive: true);
            }
            catch (Exception cleanupError) when (cleanupError is IOException or UnauthorizedAccessException)
            {
                _logger.LogWarning("Could not remove {Directory}: {Error}", swapper.StagingDirectory, cleanupError.Message);
            }

            lock (_applyLock)
            {
                _applyState = UpdateApplyStates.Failed;
                _applyMessage = cancelled ? "The update was cancelled." : $"The update to {offer.Version} failed: {ex.Message}";
                _failedVersion = offer.Version;
            }
            if (releaseTried && !cancelled)
                RememberFailure(offer.Version, UpdateFailureOutcomes.Failed, ex.Message);
            await _audit.LogAsync(AuditActions.SystemUpdateApply, cancelled ? AuditOutcomes.Fail : AuditOutcomes.Error, actor, "system", "cove",
                new { from = current, to = offer.Version, automatic, error = ex.Message }, CancellationToken.None);
            throw;
        }
    }

    private enum RestartPlan
    {
        Relauncher,
        Systemd,
        Manual,
    }

    private RestartPlan DecideRestart(InstallEnvironment environment) => environment.LaunchMode switch
    {
        LaunchModes.Systemd => RestartPlan.Systemd,
        LaunchModes.InstanceManager => File.Exists(StartScriptPath(environment)) ? RestartPlan.Relauncher : RestartPlan.Manual,
        _ => RestartPlan.Relauncher,
    };

    private void ScheduleRestart(InstallEnvironment environment, RestartPlan plan, string relauncherPath, UpdateJournal journal)
    {
        if (plan == RestartPlan.Manual)
            return;

        _ = Task.Run(async () =>
        {
            // Let the job finish and the HTTP response go out first.
            await Task.Delay(TimeSpan.FromSeconds(2));
            if (plan == RestartPlan.Systemd)
            {
                _logger.LogInformation("Exiting with code {Code} so systemd restarts Cove {Version}", UpdateCommandLine.RestartExitCode, journal.ToVersion);
                UpdateRestart.RequestExitCode(UpdateCommandLine.RestartExitCode);
                _lifetime.StopApplication();
                return;
            }

            try
            {
                var pid = UpdateProcessLauncher.StartDetached(
                    relauncherPath,
                    [UpdateRelauncher.Argument, "--journal", Paths.JournalPath, "--wait-pid", Environment.ProcessId.ToString(System.Globalization.CultureInfo.InvariantCulture)],
                    environment.AppDirectory,
                    Path.Combine(Paths.LogDirectory, "update-relaunch.log"),
                    visibleWindow: false);
                _logger.LogInformation("Restarting into Cove {Version}; relauncher is process {Pid}", journal.ToVersion, pid);
                _lifetime.StopApplication();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Could not start the relauncher; restoring Cove {Version}", journal.FromVersion);
                var swapper = CreateSwapper(environment);
                try
                {
                    if (journal.Kind == UpdateJournalKinds.Revert)
                        swapper.UndoRevert();
                    else
                        swapper.RollBack();
                    UpdateJson.Write(Paths.JournalPath, journal with
                    {
                        State = UpdateJournalStates.Failed,
                        Error = $"Cove could not restart itself: {ex.Message}",
                        UpdatedAt = DateTimeOffset.UtcNow,
                        RollbackAudited = true,
                    });
                }
                catch (Exception rollbackError)
                {
                    _logger.LogError(rollbackError, "Restoring Cove {Version} failed", journal.FromVersion);
                }
                var message = $"Cove could not restart itself: {ex.Message}";
                lock (_applyLock)
                {
                    _applyState = UpdateApplyStates.Failed;
                    _applyMessage = message;
                    _failedVersion = journal.ToVersion;
                }
                if (journal.Kind == UpdateJournalKinds.Update)
                    RememberFailure(journal.ToVersion, UpdateFailureOutcomes.Failed, message);
                if (journal.JobId is { } jobId)
                    _jobs.RecordLateFailure(jobId, message);
            }
        });
    }

    private UpdateJournal CreateJournal(
        InstallEnvironment environment,
        string kind,
        string from,
        string to,
        IEnumerable<string> appliedMigrations,
        bool automatic) => new()
        {
            Kind = kind,
            FromVersion = from,
            ToVersion = to,
            AppDirectory = environment.AppDirectory,
            CoveFileName = environment.CoveFileName,
            ManagerFileName = environment.ManagerFileName,
            LaunchMode = environment.LaunchMode,
            ManagerInstanceId = environment.ManagerInstanceId,
            StartScript = environment.LaunchMode == LaunchModes.InstanceManager ? StartScriptPath(environment) : null,
            Launch = new UpdateLaunchInfo
            {
                ProcessPath = Environment.ProcessPath,
                Arguments = [.. Environment.GetCommandLineArgs().Skip(1)],
                WorkingDirectory = Environment.CurrentDirectory,
                Environment = CaptureEnvironment(),
            },
            HealthUrl = ResolveHealthUrl(),
            AppliedMigrations = [.. appliedMigrations],
            AutoUpdate = automatic,
        };

    private string StartScriptPath(InstallEnvironment environment)
        => Path.Combine(Paths.DataRoot, ".manager", environment.IsWindows ? "start-cove.ps1" : "start-cove.sh");

    /// <summary>A loopback URL for this process's HTTP listener, for the relauncher's health checks.</summary>
    private string? ResolveHealthUrl()
    {
        var addresses = _server?.Features.Get<IServerAddressesFeature>()?.Addresses ?? [];
        foreach (var address in addresses)
        {
            var normalized = address.Replace("://+", "://127.0.0.1", StringComparison.Ordinal)
                .Replace("://*", "://127.0.0.1", StringComparison.Ordinal)
                .Replace("://0.0.0.0", "://127.0.0.1", StringComparison.Ordinal)
                .Replace("://[::]", "://127.0.0.1", StringComparison.Ordinal)
                .Replace("://localhost", "://127.0.0.1", StringComparison.OrdinalIgnoreCase);
            if (normalized.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && Uri.TryCreate(normalized, UriKind.Absolute, out var uri))
                return uri.GetLeftPart(UriPartial.Authority);
        }
        return null;
    }

    private static Dictionary<string, string> CaptureEnvironment()
    {
        var captured = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (System.Collections.DictionaryEntry entry in Environment.GetEnvironmentVariables())
        {
            var key = entry.Key.ToString() ?? string.Empty;
            if (!(key.StartsWith("COVE", StringComparison.OrdinalIgnoreCase)
                || key.StartsWith("ASPNETCORE_", StringComparison.OrdinalIgnoreCase)
                || key.StartsWith("DOTNET_", StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }
            var sensitive = new[] { "password", "secret", "key", "token", "connectionstring" }
                .Any(word => key.Contains(word, StringComparison.OrdinalIgnoreCase));
            captured[key] = sensitive ? "[redacted]" : entry.Value?.ToString() ?? string.Empty;
        }
        return captured;
    }

    private async Task SmokeTestAsync(string executable, string expectedVersion, CancellationToken ct)
    {
        var (exitCode, output) = await UpdateProcessLauncher.RunAsync(executable, ["--version"], TimeSpan.FromSeconds(90), ct);
        var reported = output.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).LastOrDefault();
        if (exitCode != 0 || !string.Equals(reported, expectedVersion, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"The downloaded Cove did not pass its start check (exit code {exitCode}, reported '{reported}', expected '{expectedVersion}').");
        }
    }

    private (string State, string? Message, string? FailedVersion, string? LogTail) ComposeApplyState(UpdateJournal? journal, string current)
    {
        lock (_applyLock)
        {
            if (_applyState is UpdateApplyStates.Downloading or UpdateApplyStates.Applying or UpdateApplyStates.Staged)
                return (_applyState, _applyMessage, null, null);
            if (_applyState == UpdateApplyStates.Failed)
                return (_applyState, _applyMessage, _failedVersion, journal?.LogTail);
        }

        if (journal is null)
            return (UpdateApplyStates.Idle, null, null, null);
        if (journal.State == UpdateJournalStates.Staged && journal.FromVersion == current)
            return (UpdateApplyStates.Staged, $"Cove {journal.ToVersion} is installed. Restart Cove to finish.", null, null);
        if (journal.State == UpdateJournalStates.RolledBack && journal.FromVersion == current)
            return (UpdateApplyStates.RolledBack, journal.Error, journal.ToVersion, journal.LogTail);
        if (journal.State == UpdateJournalStates.Failed && journal.FromVersion == current)
            return (UpdateApplyStates.Failed, journal.Error, journal.ToVersion, journal.LogTail);
        return (UpdateApplyStates.Idle, null, null, null);
    }

    private async Task<(bool Available, string? PreviousVersion, string? Reason)> EvaluateRevertAsync(
        InstallEnvironment environment,
        UpdateJournal? journal,
        string current,
        CancellationToken ct)
    {
        if (journal is not { Kind: UpdateJournalKinds.Update, State: UpdateJournalStates.Succeeded } || journal.ToVersion != current)
            return (false, null, null);
        if (environment.CannotApplyReason is { } reason)
            return (false, journal.FromVersion, reason);
        if (!CreateSwapper(environment).HasPreviousVersion)
            return (false, journal.FromVersion, $"The Cove {journal.FromVersion} executable is no longer next to Cove.");

        try
        {
            await using var scope = _scopes.CreateAsyncScope();
            var applied = (await scope.ServiceProvider.GetRequiredService<CoveContext>().Database.GetAppliedMigrationsAsync(ct)).ToHashSet(StringComparer.Ordinal);
            if (!applied.SetEquals(journal.AppliedMigrations))
                return (false, journal.FromVersion, $"A database migration has run since the update, so Cove {journal.FromVersion} can no longer use this database. Restore the pre_update backup to go back.");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return (false, journal.FromVersion, $"The database could not be checked: {ex.Message}");
        }

        return (true, journal.FromVersion, null);
    }

    private static UpdateRelease? GetValidOffer(UpdateCheckState? state, string channel, string current)
        => state?.Latest is { } latest
            && state.CheckedChannel == channel
            && UpdatePolicy.IsAcceptableForChannel(latest, channel)
            && UpdatePolicy.IsNewer(latest.Version, current)
                ? latest
                : null;

    private async Task<IReadOnlyCollection<string>> GetKnownMigrationsAsync(CancellationToken ct)
    {
        if (_knownMigrations is not null)
            return _knownMigrations;
        await using var scope = _scopes.CreateAsyncScope();
        _knownMigrations = scope.ServiceProvider.GetRequiredService<CoveContext>().Database.GetMigrations().ToList();
        return _knownMigrations;
    }

    private bool HasActiveJobs()
        => _jobs.GetAllJobs().Any(job => job.Type != JobType && job.Status is JobStatus.Running or JobStatus.Pending);

    private IReadOnlyList<string> GetOtherInstances(InstallEnvironment environment)
    {
        if (environment.Kind != InstallKinds.Native
            || environment.ExecutablePath is null
            || (!environment.InstanceManagerPresent && environment.LaunchMode != LaunchModes.InstanceManager))
        {
            return [];
        }

        var registry = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "cove", "cove-instances.json");
        try
        {
            return File.Exists(registry)
                ? InstanceRegistry.FindInstancesLaunching(File.ReadAllText(registry), Paths.DataRoot, environment.ExecutablePath, environment.IsWindows)
                : [];
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return [];
        }
    }

    private void RememberFailure(string version, string outcome, string? reason)
    {
        try
        {
            UpdateFailureMemory.Remember(Paths.StatePath, version, outcome, reason);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning("Could not record that Cove {Version} {Outcome}: {Error}", version, outcome, ex.Message);
        }
    }

    private UpdateFileSwapper CreateSwapper(InstallEnvironment environment)
        => new(environment.AppDirectory, environment.CoveFileName, environment.ManagerFileName, message => _logger.LogInformation("{Message}", message));

    private UpdateFeedClient CreateFeedClient()
        => new(CreateHttpClient(TimeSpan.FromSeconds(30)), UpdateFeedOptions.FromConfiguration(
            _configuration["Cove:Updates:FeedBaseUrl"],
            _configuration["Cove:Updates:ApiBaseUrl"]));

    private HttpClient CreateHttpClient(TimeSpan timeout)
    {
        var http = _httpFactory.CreateClient("CoveUpdates");
        http.Timeout = timeout;
        http.DefaultRequestHeaders.UserAgent.ParseAdd($"Cove/{CoveVersion.Numeric}");
        return http;
    }

    private string? ReleasesPageUrl()
    {
        try
        {
            var feed = UpdateFeedOptions.FromConfiguration(_configuration["Cove:Updates:FeedBaseUrl"], _configuration["Cove:Updates:ApiBaseUrl"]);
            return new Uri(feed.FeedBaseUri, "releases").AbsoluteUri;
        }
        catch (ArgumentException)
        {
            return null;
        }
    }
}
