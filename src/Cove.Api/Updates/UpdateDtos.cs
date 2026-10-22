using Cove.Core.DTOs;

namespace Cove.Api.Updates;

internal static class UpdateApplyStates
{
    public const string Idle = "idle";
    public const string Downloading = "downloading";
    public const string Staged = "staged";
    public const string Applying = "applying";
    public const string Failed = "failed";
    public const string RolledBack = "rolledBack";
}

public sealed record UpdateStatusDto
{
    public required string CurrentVersion { get; init; }
    /// <summary>The configured channel ("auto", "stable", ...).</summary>
    public required string Channel { get; init; }
    /// <summary>The channel actually followed once "auto" is resolved.</summary>
    public required string EffectiveChannel { get; init; }
    public required string InstallKind { get; init; }
    public required string LaunchMode { get; init; }
    public string? Rid { get; init; }
    public bool CanApply { get; init; }
    public string? CannotApplyReason { get; init; }
    public bool UpdateAvailable { get; init; }
    public UpdateLatestDto? Latest { get; init; }
    public DateTimeOffset? LastCheckedAt { get; init; }
    public string? LastError { get; init; }
    public required string ApplyState { get; init; }
    public string? ApplyMessage { get; init; }
    public string? ApplyJobId { get; init; }
    /// <summary>The version an update tried to install before it failed or was rolled back.</summary>
    public string? FailedVersion { get; init; }
    public string? LogTail { get; init; }
    public bool PreviousVersionAvailable { get; init; }
    public string? PreviousVersion { get; init; }
    public string? RevertUnavailableReason { get; init; }
    /// <summary>Other Instance Manager instances whose start script runs this same executable.</summary>
    public IReadOnlyList<string> OtherInstancesSharingBinary { get; init; } = [];
    /// <summary>True when Cove cannot restart itself after installing, so the person has to.</summary>
    public bool ManualRestart { get; init; }
    public bool ShowBanner { get; init; }
    public string? ReleasesUrl { get; init; }
    public required UpdatesConfigDto Settings { get; init; }
}

public sealed record UpdateLatestDto
{
    public required string Version { get; init; }
    public DateTimeOffset? PublishedAt { get; init; }
    public string? NotesMarkdown { get; init; }
    public string? NotesUrl { get; init; }
    public string? AssetName { get; init; }
    public long? AssetSize { get; init; }
    /// <summary>Null when the release does not list its migrations (no manifest).</summary>
    public bool? RequiresMigration { get; init; }
    /// <summary>
    /// "failed", "rolledBack" or "reverted" when this version was tried before; automatic updates skip
    /// it, but it can still be installed by hand.
    /// </summary>
    public string? PreviousOutcome { get; init; }
}

public sealed record UpdateApplyRequest
{
    /// <summary>Confirms that running jobs may be interrupted by the restart.</summary>
    public bool Force { get; init; }
    /// <summary>The version the person confirmed; the install is refused if the feed now offers another.</summary>
    public string? Version { get; init; }
}

public sealed record UpdateActionResultDto(string? JobId, string Message);
