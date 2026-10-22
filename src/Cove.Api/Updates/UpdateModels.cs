using System.Text.Json;
using System.Text.Json.Serialization;

namespace Cove.Api.Updates;

/// <summary>
/// <c>cove-release.json</c>, published next to the native archives of every release and nightly.
/// </summary>
internal sealed record ReleaseManifest
{
    public int SchemaVersion { get; init; } = 1;
    public string Version { get; init; } = string.Empty;
    public string? Channel { get; init; }
    public DateTimeOffset? PublishedAt { get; init; }
    public string? NotesUrl { get; init; }
    public string? NotesMarkdown { get; init; }
    public List<ReleaseManifestAsset> Assets { get; init; } = [];
    /// <summary>EF migration IDs contained in the build; null when the producer did not list them.</summary>
    public List<string>? Migrations { get; init; }
}

internal sealed record ReleaseManifestAsset
{
    public string Rid { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public long Size { get; init; }
    public string? Sha256 { get; init; }
}

/// <summary>A release normalized from either the manifest or the GitHub releases API.</summary>
internal sealed record UpdateRelease
{
    public required string Version { get; init; }
    public required string Channel { get; init; }
    public DateTimeOffset? PublishedAt { get; init; }
    public string? NotesUrl { get; init; }
    public string? NotesMarkdown { get; init; }
    public List<UpdateReleaseAsset> Assets { get; init; } = [];
    public List<string>? Migrations { get; init; }
    /// <summary>"manifest" or "github-api".</summary>
    public string Source { get; init; } = "manifest";

    public UpdateReleaseAsset? FindAsset(string? rid)
        => rid is null ? null : Assets.FirstOrDefault(asset => string.Equals(asset.Rid, rid, StringComparison.OrdinalIgnoreCase));
}

internal sealed record UpdateReleaseAsset
{
    public required string Rid { get; init; }
    public required string Name { get; init; }
    public long Size { get; init; }
    public string? Sha256 { get; init; }
    public required string DownloadUrl { get; init; }
    /// <summary>The published <c>.sha256</c> file, used when the release has no manifest.</summary>
    public string? Sha256Url { get; init; }
}

/// <summary>Persisted to <c>&lt;data root&gt;/updates/state.json</c> so a restart does not refetch.</summary>
internal sealed record UpdateCheckState
{
    public DateTimeOffset? LastCheckedAt { get; init; }
    public string? CheckedVersion { get; init; }
    public string? CheckedChannel { get; init; }
    public UpdateRelease? Latest { get; init; }
    public string? LastError { get; init; }
}

internal static class UpdateJournalStates
{
    /// <summary>Backup and swap are in progress.</summary>
    public const string Applying = "applying";
    /// <summary>Swapped; the new binary is being started by the relauncher, systemd, or the user.</summary>
    public const string Restarting = "restarting";
    /// <summary>Swapped, but this launch mode cannot restart Cove; the user must restart it.</summary>
    public const string Staged = "staged";
    public const string Succeeded = "succeeded";
    public const string RolledBack = "rolledBack";
    public const string Failed = "failed";
}

internal static class UpdateJournalKinds
{
    public const string Update = "update";
    public const string Revert = "revert";
}

/// <summary>
/// <c>&lt;data root&gt;/updates/pending.json</c>. Written before the binaries are swapped, so the
/// relauncher, the new version, and a rolled-back old version all agree on what happened.
/// </summary>
internal sealed record UpdateJournal
{
    public int SchemaVersion { get; init; } = 1;
    public string Id { get; init; } = Guid.NewGuid().ToString("N");
    public string Kind { get; init; } = UpdateJournalKinds.Update;
    public string State { get; init; } = UpdateJournalStates.Applying;
    public required string FromVersion { get; init; }
    public required string ToVersion { get; init; }
    public required string AppDirectory { get; init; }
    public required string CoveFileName { get; init; }
    public required string ManagerFileName { get; init; }
    public required string LaunchMode { get; init; }
    /// <summary>True when a relauncher process watches the restart and decides success or rollback.</summary>
    public bool Supervised { get; init; }
    public string? ManagerInstanceId { get; init; }
    public string? StartScript { get; init; }
    public UpdateLaunchInfo Launch { get; init; } = new();
    public string? HealthUrl { get; init; }
    public List<string> AppliedMigrations { get; init; } = [];
    public bool AutoUpdate { get; init; }
    public string? BackupPath { get; init; }
    public int BootAttempts { get; init; }
    public string? Error { get; init; }
    public string? LogTail { get; init; }
    public bool RollbackAudited { get; init; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; init; } = DateTimeOffset.UtcNow;
}

internal sealed record UpdateLaunchInfo
{
    public string? ProcessPath { get; init; }
    public List<string> Arguments { get; init; } = [];
    public string? WorkingDirectory { get; init; }
    /// <summary>Diagnostic copy of the Cove-relevant environment; the relauncher inherits the real one.</summary>
    public Dictionary<string, string> Environment { get; init; } = [];
}

internal static class UpdateJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static T? Read<T>(string path) where T : class
    {
        try
        {
            if (!File.Exists(path))
                return null;
            using var stream = File.OpenRead(path);
            return JsonSerializer.Deserialize<T>(stream, Options);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            return null;
        }
    }

    /// <summary>Writes through a temporary file and a rename so readers never see a torn file.</summary>
    public static void Write<T>(string path, T value)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temp = path + "." + Guid.NewGuid().ToString("N")[..8] + ".tmp";
        File.WriteAllText(temp, JsonSerializer.Serialize(value, Options));
        File.Move(temp, path, overwrite: true);
    }
}

/// <summary>Where update state lives in the data root.</summary>
internal sealed record UpdatePaths(string DataRoot)
{
    public string Directory => Path.Combine(DataRoot, "updates");
    public string StatePath => Path.Combine(Directory, "state.json");
    public string JournalPath => Path.Combine(Directory, "pending.json");
    public string LogDirectory => Path.Combine(DataRoot, "logs");
}
