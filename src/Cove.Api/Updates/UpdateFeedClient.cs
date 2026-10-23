using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Cove.Api.Updates;

/// <summary>
/// Where releases are read from. The manifest comes from release download URLs (CDN, not rate
/// limited); the GitHub API is the fallback for releases without a manifest and for the prerelease
/// channel.
/// </summary>
internal sealed record UpdateFeedOptions
{
    public const string DefaultFeedBaseUrl = "https://github.com/yourcove/cove";
    public const string DefaultApiBaseUrl = "https://api.github.com/repos/yourcove/cove";
    public const string ManifestFileName = "cove-release.json";

    public Uri FeedBaseUri { get; init; } = new(DefaultFeedBaseUrl + "/");
    public Uri ApiBaseUri { get; init; } = new(DefaultApiBaseUrl + "/");

    public static UpdateFeedOptions FromConfiguration(string? feedBaseUrl, string? apiBaseUrl) => new()
    {
        FeedBaseUri = ParseBase(feedBaseUrl, DefaultFeedBaseUrl, "Cove:Updates:FeedBaseUrl"),
        ApiBaseUri = ParseBase(apiBaseUrl, DefaultApiBaseUrl, "Cove:Updates:ApiBaseUrl"),
    };

    /// <summary>HTTPS only, except plain HTTP to a loopback address for tests and local simulation.</summary>
    internal static Uri ParseBase(string? value, string fallback, string settingName)
    {
        var text = string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        if (!Uri.TryCreate(text.TrimEnd('/') + "/", UriKind.Absolute, out var uri) || !IsAllowed(uri))
            throw new ArgumentException($"{settingName} must use HTTPS, except for loopback HTTP test servers.", settingName);
        return uri;
    }

    internal static bool IsAllowed(Uri uri)
        => string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || (string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase) && uri.IsLoopback);
}

internal sealed class UpdateFeedException(string message, Exception? inner = null) : Exception(message, inner);

internal sealed partial class UpdateFeedClient(HttpClient http, UpdateFeedOptions options)
{
    private const int MaxManifestBytes = 4 * 1024 * 1024;

    public UpdateFeedOptions Options => options;

    /// <summary>Latest stable release: the manifest at releases/latest, else the releases API.</summary>
    public async Task<UpdateRelease?> GetStableAsync(CancellationToken ct)
    {
        var manifestUri = new Uri(options.FeedBaseUri, $"releases/latest/download/{UpdateFeedOptions.ManifestFileName}");
        var manifest = await TryGetManifestAsync(manifestUri, ct);
        if (manifest is not null)
            return FromManifest(manifest, UpdateChannels.Stable, tag: "v" + manifest.Version.TrimStart('v'));

        using var release = await GetApiJsonAsync("releases/latest", ct);
        return release is null ? null : FromApiRelease(release.RootElement, UpdateChannels.Stable);
    }

    /// <summary>The rolling nightly prerelease.</summary>
    public async Task<UpdateRelease?> GetNightlyAsync(CancellationToken ct)
    {
        var manifestUri = new Uri(options.FeedBaseUri, $"releases/download/nightly/{UpdateFeedOptions.ManifestFileName}");
        var manifest = await TryGetManifestAsync(manifestUri, ct);
        if (manifest is not null)
            return FromManifest(manifest, UpdateChannels.Nightly, tag: "nightly");

        using var release = await GetApiJsonAsync("releases/tags/nightly", ct);
        return release is null ? null : FromApiRelease(release.RootElement, UpdateChannels.Nightly);
    }

    /// <summary>
    /// Published stable and prerelease releases from the API (excluding nightly), newest first. A
    /// release that carries a manifest asset is read from that manifest.
    /// </summary>
    public async Task<IReadOnlyList<UpdateRelease>> GetPrereleasesAsync(CancellationToken ct)
    {
        using var document = await GetApiJsonAsync("releases?per_page=20", ct);
        if (document is null || document.RootElement.ValueKind != JsonValueKind.Array)
            return [];

        var releases = new List<UpdateRelease>();
        foreach (var element in document.RootElement.EnumerateArray())
        {
            if (element.TryGetProperty("draft", out var draft) && draft.ValueKind == JsonValueKind.True)
                continue;
            if (string.Equals(GetString(element, "tag_name"), "nightly", StringComparison.Ordinal))
                continue;
            var release = FromApiRelease(element, UpdateChannels.Prerelease);
            if (release is not null)
                releases.Add(release);
        }

        var best = releases
            .Where(release => Cove.Core.Common.CoveVersionCompatibility.TryParse(release.Version, out _))
            .OrderByDescending(release => release.Version, Comparer<string>.Create(CompareVersions))
            .FirstOrDefault();
        if (best is null)
            return releases;

        // Only the best candidate is hydrated from its manifest, to learn its migrations.
        if (best.Assets.Count > 0)
        {
            var manifestUri = new Uri(options.FeedBaseUri, $"releases/download/v{best.Version}/{UpdateFeedOptions.ManifestFileName}");
            var manifest = await TryGetManifestAsync(manifestUri, ct);
            if (manifest is not null && string.Equals(manifest.Version.TrimStart('v'), best.Version, StringComparison.Ordinal))
            {
                var fromManifest = FromManifest(manifest, UpdateChannels.Prerelease, "v" + best.Version);
                releases[releases.IndexOf(best)] = fromManifest with { NotesUrl = fromManifest.NotesUrl ?? best.NotesUrl };
            }
        }

        return releases;
    }

    /// <summary>Reads the published "<c>hash  filename</c>" checksum for a release without a manifest.</summary>
    public async Task<string> GetPublishedSha256Async(UpdateReleaseAsset asset, CancellationToken ct)
    {
        if (asset.Sha256Url is null || !Uri.TryCreate(asset.Sha256Url, UriKind.Absolute, out var uri) || !UpdateFeedOptions.IsAllowed(uri))
            throw new UpdateFeedException($"No checksum is published for {asset.Name}.");

        using var response = await http.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
            throw new UpdateFeedException($"Downloading the checksum for {asset.Name} failed with HTTP {(int)response.StatusCode}.");
        var text = await response.Content.ReadAsStringAsync(ct);
        var hash = text.Split((char[]?)null, 2, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        if (hash is null || !Sha256Regex().IsMatch(hash))
            throw new UpdateFeedException($"The published checksum for {asset.Name} is not a SHA-256 hash.");
        return hash.ToLowerInvariant();
    }

    internal UpdateRelease FromManifest(ReleaseManifest manifest, string channel, string tag)
    {
        var version = manifest.Version.Trim().TrimStart('v');
        return new UpdateRelease
        {
            Version = version,
            Channel = channel,
            PublishedAt = manifest.PublishedAt,
            NotesUrl = SafeHttpUrl(manifest.NotesUrl),
            NotesMarkdown = manifest.NotesMarkdown,
            Migrations = manifest.Migrations?.Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id.Trim()).ToList(),
            Source = "manifest",
            Assets = manifest.Assets
                .Where(asset => !string.IsNullOrWhiteSpace(asset.Rid) && IsPlainFileName(asset.Name))
                .Select(asset => new UpdateReleaseAsset
                {
                    Rid = asset.Rid.Trim(),
                    Name = asset.Name.Trim(),
                    Size = asset.Size,
                    Sha256 = asset.Sha256 is { } sha && Sha256Regex().IsMatch(sha.Trim()) ? sha.Trim().ToLowerInvariant() : null,
                    DownloadUrl = new Uri(options.FeedBaseUri, $"releases/download/{Uri.EscapeDataString(tag)}/{Uri.EscapeDataString(asset.Name.Trim())}").AbsoluteUri,
                    Sha256Url = new Uri(options.FeedBaseUri, $"releases/download/{Uri.EscapeDataString(tag)}/{Uri.EscapeDataString(asset.Name.Trim())}.sha256").AbsoluteUri,
                })
                .ToList(),
        };
    }

    internal static UpdateRelease? FromApiRelease(JsonElement release, string channel)
    {
        var tag = GetString(release, "tag_name");
        if (string.IsNullOrWhiteSpace(tag))
            return null;

        var body = GetString(release, "body");
        string? version;
        if (string.Equals(tag, "nightly", StringComparison.Ordinal))
        {
            // The rolling nightly carries its version only in the release notes.
            var match = body is null ? null : NightlyVersionRegex().Match(body);
            version = match is { Success: true } ? match.Groups["version"].Value : null;
        }
        else
        {
            version = tag.TrimStart('v');
        }

        if (version is null || !Cove.Core.Common.CoveVersionCompatibility.TryParse(version, out _))
            return null;

        var files = new Dictionary<string, (long Size, string Url)>(StringComparer.Ordinal);
        if (release.TryGetProperty("assets", out var assets) && assets.ValueKind == JsonValueKind.Array)
        {
            foreach (var asset in assets.EnumerateArray())
            {
                var name = GetString(asset, "name");
                var url = GetString(asset, "browser_download_url");
                if (name is null || url is null || !Uri.TryCreate(url, UriKind.Absolute, out var uri) || !UpdateFeedOptions.IsAllowed(uri))
                    continue;
                var size = asset.TryGetProperty("size", out var sizeElement) && sizeElement.TryGetInt64(out var value) ? value : 0;
                files[name] = (size, uri.AbsoluteUri);
            }
        }

        var releaseAssets = new List<UpdateReleaseAsset>();
        foreach (var (name, file) in files)
        {
            var match = ArchiveNameRegex().Match(name);
            if (!match.Success)
                continue;
            releaseAssets.Add(new UpdateReleaseAsset
            {
                Rid = match.Groups["rid"].Value,
                Name = name,
                Size = file.Size,
                DownloadUrl = file.Url,
                Sha256Url = files.TryGetValue(name + ".sha256", out var checksum) ? checksum.Url : null,
            });
        }

        return new UpdateRelease
        {
            Version = version,
            Channel = channel,
            PublishedAt = release.TryGetProperty("published_at", out var published) && published.TryGetDateTimeOffset(out var publishedAt)
                ? publishedAt
                : null,
            NotesUrl = SafeHttpUrl(GetString(release, "html_url")),
            NotesMarkdown = body,
            Assets = releaseAssets,
            Migrations = null,
            Source = "github-api",
        };
    }

    private async Task<ReleaseManifest?> TryGetManifestAsync(Uri uri, CancellationToken ct)
    {
        try
        {
            using var response = await http.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, ct);
            if (!response.IsSuccessStatusCode)
                return null;
            if (response.Content.Headers.ContentLength is > MaxManifestBytes)
                return null;
            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            var manifest = await JsonSerializer.DeserializeAsync<ReleaseManifest>(stream, UpdateJson.Options, ct);
            return manifest is not null && Cove.Core.Common.CoveVersionCompatibility.TryParse(manifest.Version, out _)
                ? manifest
                : null;
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            return null;
        }
    }

    private async Task<JsonDocument?> GetApiJsonAsync(string relative, CancellationToken ct)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(options.ApiBaseUri, relative));
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        try
        {
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
            if (response.StatusCode == HttpStatusCode.NotFound)
                return null;
            if (!response.IsSuccessStatusCode)
            {
                var hint = response.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.TooManyRequests
                    ? " (GitHub API rate limit; try again later)"
                    : string.Empty;
                throw new UpdateFeedException($"The release feed returned HTTP {(int)response.StatusCode}{hint}.");
            }
            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            return await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        }
        catch (HttpRequestException ex)
        {
            throw new UpdateFeedException($"The release feed could not be reached: {ex.Message}", ex);
        }
        catch (JsonException ex)
        {
            throw new UpdateFeedException("The release feed returned invalid JSON.", ex);
        }
    }

    private static int CompareVersions(string left, string right)
    {
        Cove.Core.Common.CoveVersionCompatibility.TryParse(left, out var leftVersion);
        Cove.Core.Common.CoveVersionCompatibility.TryParse(right, out var rightVersion);
        return leftVersion.CompareTo(rightVersion);
    }

    private static string? GetString(JsonElement element, string property)
        => element.ValueKind == JsonValueKind.Object
            && element.TryGetProperty(property, out var value)
            && value.ValueKind == JsonValueKind.String
                ? value.GetString()
                : null;

    private static string? SafeHttpUrl(string? value)
        => value is not null
            && Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
                ? uri.AbsoluteUri
                : null;

    private static bool IsPlainFileName(string? name)
        => !string.IsNullOrWhiteSpace(name)
            && name.IndexOfAny(['/', '\\']) < 0
            && name.Trim() is not ("." or "..");

    [GeneratedRegex("^[0-9a-fA-F]{64}$")]
    private static partial Regex Sha256Regex();

    [GeneratedRegex(@"\*\*Version:\*\*\s*`(?<version>[^`\s]+)`")]
    private static partial Regex NightlyVersionRegex();

    [GeneratedRegex(@"^cove-(?<rid>(?:win|linux|osx|linux-musl)-(?:x64|arm64|x86|arm))\.(?:zip|tar\.gz)$")]
    private static partial Regex ArchiveNameRegex();
}
