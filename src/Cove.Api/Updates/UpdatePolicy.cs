using System.Globalization;
using Cove.Core.Common;

namespace Cove.Api.Updates;

/// <summary>Release channels a Cove install can follow.</summary>
internal static class UpdateChannels
{
    public const string Auto = "auto";
    public const string Stable = "stable";
    public const string Prerelease = "prerelease";
    public const string Nightly = "nightly";
}

internal static class AutoUpdateModes
{
    public const string Off = "off";
    public const string Safe = "safe";
    public const string All = "all";
}

/// <summary>
/// Pure decisions about which release to offer and whether an automatic update may run. Kept free of
/// I/O so the whole policy table is unit-testable.
/// </summary>
internal static class UpdatePolicy
{
    /// <summary>
    /// Resolves "auto" from the running build: no prerelease suffix follows stable, a <c>-dev.N</c>
    /// development build follows nightly, and any other prerelease (rc, beta) follows prerelease.
    /// </summary>
    public static string ResolveChannel(string? configured, string currentVersion)
    {
        var channel = configured?.Trim().ToLowerInvariant();
        if (channel is UpdateChannels.Stable or UpdateChannels.Prerelease or UpdateChannels.Nightly)
            return channel;

        var prerelease = GetPrerelease(currentVersion);
        if (prerelease is null)
            return UpdateChannels.Stable;
        return prerelease == "dev" || prerelease.StartsWith("dev.", StringComparison.Ordinal)
            ? UpdateChannels.Nightly
            : UpdateChannels.Prerelease;
    }

    public static bool IsNewer(string candidate, string current)
        => CoveVersionCompatibility.TryParse(candidate, out var candidateVersion)
            && CoveVersionCompatibility.TryParse(current, out var currentVersion)
            && candidateVersion.CompareTo(currentVersion) > 0;

    /// <summary>
    /// Picks the release to offer, or null. Nightly also offers a newer stable; prerelease offers the
    /// newest stable or prerelease. Nothing at or below the running version is ever offered.
    /// </summary>
    public static UpdateRelease? SelectOffer(
        string channel,
        string currentVersion,
        UpdateRelease? stable,
        UpdateRelease? nightly,
        IReadOnlyList<UpdateRelease> prereleases)
    {
        IEnumerable<UpdateRelease?> candidates = channel switch
        {
            UpdateChannels.Nightly => [stable, nightly],
            UpdateChannels.Prerelease => [stable, .. prereleases],
            _ => [stable],
        };

        UpdateRelease? best = null;
        foreach (var candidate in candidates)
        {
            if (candidate is null || !IsAcceptableForChannel(candidate, channel) || !IsNewer(candidate.Version, currentVersion))
                continue;
            if (best is null || IsNewer(candidate.Version, best.Version))
                best = candidate;
        }

        return best;
    }

    /// <summary>
    /// A stable feed must not hand a prerelease to stable users, and only the nightly channel takes
    /// development builds.
    /// </summary>
    public static bool IsAcceptableForChannel(UpdateRelease release, string channel)
    {
        if (!CoveVersionCompatibility.TryParse(release.Version, out _))
            return false;

        var prerelease = GetPrerelease(release.Version);
        if (prerelease is null)
            return true;

        var isDev = prerelease == "dev" || prerelease.StartsWith("dev.", StringComparison.Ordinal);
        return channel switch
        {
            UpdateChannels.Nightly => isDev,
            UpdateChannels.Prerelease => !isDev,
            _ => false,
        };
    }

    /// <summary>
    /// Whether an automatic update may install <paramref name="offer"/>. "safe" requires the same major
    /// version and that every migration the release ships is already known to this build, so the
    /// update never leaves the database waiting for a manual migration.
    /// </summary>
    public static (bool Allowed, string Reason) EvaluateAutoUpdate(
        string? mode,
        string currentVersion,
        UpdateRelease offer,
        IReadOnlyCollection<string> knownMigrations)
    {
        switch (mode?.Trim().ToLowerInvariant())
        {
            case AutoUpdateModes.All:
                return (true, "Automatic updates install every release.");
            case AutoUpdateModes.Safe:
                if (GetMajor(offer.Version) is not { } offerMajor || GetMajor(currentVersion) is not { } currentMajor || offerMajor != currentMajor)
                    return (false, "The release changes the major version.");
                if (offer.Migrations is null)
                    return (false, "The release does not list its database migrations.");
                var known = knownMigrations.ToHashSet(StringComparer.Ordinal);
                var added = offer.Migrations.Where(migration => !known.Contains(migration)).ToList();
                return added.Count == 0
                    ? (true, "Same major version and no new database migrations.")
                    : (false, $"The release adds {added.Count} database migration(s).");
            default:
                return (false, "Automatic updates are off.");
        }
    }

    public static bool? RequiresMigration(UpdateRelease offer, IReadOnlyCollection<string> knownMigrations)
    {
        if (offer.Migrations is null)
            return null;
        var known = knownMigrations.ToHashSet(StringComparer.Ordinal);
        return offer.Migrations.Any(migration => !known.Contains(migration));
    }

    public static bool TryParseWindow(string? window, out TimeOnly start, out TimeOnly end)
    {
        start = default;
        end = default;
        if (string.IsNullOrWhiteSpace(window))
            return false;

        var parts = window.Trim().Split('-', StringSplitOptions.TrimEntries);
        return parts.Length == 2
            && TimeOnly.TryParseExact(parts[0], "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out start)
            && TimeOnly.TryParseExact(parts[1], "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out end)
            && start != end;
    }

    /// <summary>True when <paramref name="now"/> falls in the window; a window may wrap past midnight.</summary>
    public static bool IsInWindow(string? window, TimeOnly now)
    {
        if (!TryParseWindow(window, out var start, out var end))
            return false;
        return start < end
            ? now >= start && now < end
            : now >= start || now < end;
    }

    private static string? GetPrerelease(string version)
    {
        var normalized = version.Trim();
        var plus = normalized.IndexOf('+');
        if (plus >= 0)
            normalized = normalized[..plus];
        var dash = normalized.IndexOf('-');
        return dash >= 0 ? normalized[(dash + 1)..] : null;
    }

    private static int? GetMajor(string version)
    {
        var normalized = version.Trim().TrimStart('v');
        var dot = normalized.IndexOf('.');
        return dot > 0 && int.TryParse(normalized[..dot], NumberStyles.None, CultureInfo.InvariantCulture, out var major)
            ? major
            : null;
    }
}
