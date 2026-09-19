using Cove.Core.DTOs;
using Microsoft.Extensions.Logging;

namespace Cove.Plugins;

public sealed class ExtensionPermissionManifest
{
    public List<string> Network { get; set; } = [];
    public List<string> ScraperRuntime { get; set; } = [];
    public List<string> DownloaderRuntime { get; set; } = [];
}

[Flags]
public enum ScraperCapabilities
{
    None = 0,
    ByUrl = 1 << 0,
    ByName = 1 << 1,
    ByFragment = 1 << 2,
    ByQueryFragment = 1 << 3,
}

public enum ScraperRiskLevel
{
    None,
    NetworkOnly,
    RemoteCode,
}

public enum ScraperEntity
{
    Video,
    Performer,
    Gallery,
    Image,
    Group,
    Audio,
    Text,
}

public sealed record ScraperPermissions(
    IReadOnlyList<string>? AllowNetworkHosts = null,
    bool AllowJavaScript = false,
    bool AllowCdp = false);

public sealed record ScraperDescriptor(
    string Id,
    string Name,
    ScraperEntity Entity,
    ScraperCapabilities Capabilities,
    IReadOnlyList<string> SupportedUrls,
    ScraperRiskLevel Risk,
    IReadOnlyList<string>? PreferenceSites)
{
    public ScraperDescriptor(
        string Id,
        string Name,
        ScraperEntity Entity,
        ScraperCapabilities Capabilities,
        IReadOnlyList<string> SupportedUrls)
        : this(Id, Name, Entity, Capabilities, SupportedUrls, ScraperRiskLevel.NetworkOnly, null)
    {
    }

    public ScraperDescriptor(
        string Id,
        string Name,
        ScraperEntity Entity,
        ScraperCapabilities Capabilities,
        IReadOnlyList<string> SupportedUrls,
        ScraperRiskLevel Risk)
        : this(Id, Name, Entity, Capabilities, SupportedUrls, Risk, null)
    {
    }
}

public sealed record ScraperRequest<TInput>(
    string ScraperId,
    TInput Input,
    ScraperPermissions Permissions);

public interface IScraperHost
{
    IHttpClientFactory HttpClients { get; }
    ILogger CreateLogger(string categoryName);
    Task<VideoScrapeInput?> GetVideoAsync(int videoId, CancellationToken ct = default);
    Task<PerformerScrapeInput?> GetPerformerAsync(int performerId, CancellationToken ct = default);
    Task<GalleryScrapeInput?> GetGalleryAsync(int galleryId, CancellationToken ct = default);
    Task<ImageScrapeInput?> GetImageAsync(int imageId, CancellationToken ct = default);
    Task<GroupScrapeInput?> GetGroupAsync(int groupId, CancellationToken ct = default);
    Task<AudioScrapeInput?> GetAudioAsync(int audioId, CancellationToken ct = default)
        => Task.FromResult<AudioScrapeInput?>(null);
    Task<TextScrapeInput?> GetTextAsync(int textId, CancellationToken ct = default)
        => Task.FromResult<TextScrapeInput?>(null);
}

public interface IScraperProvider : IExtension
{
    IReadOnlyList<ScraperDescriptor> GetScrapers();

    Task<ScrapedVideoDto?> ScrapeVideoAsync(ScraperRequest<VideoScrapeInput> request, CancellationToken ct)
        => Task.FromResult<ScrapedVideoDto?>(null);

    Task<IReadOnlyList<ScrapedVideoDto>> SearchVideosAsync(ScraperRequest<string> request, CancellationToken ct)
        => Task.FromResult<IReadOnlyList<ScrapedVideoDto>>([]);

    Task<ScrapedPerformerDto?> ScrapePerformerAsync(ScraperRequest<PerformerScrapeInput> request, CancellationToken ct)
        => Task.FromResult<ScrapedPerformerDto?>(null);

    Task<IReadOnlyList<ScrapedPerformerDto>> SearchPerformersAsync(ScraperRequest<string> request, CancellationToken ct)
        => Task.FromResult<IReadOnlyList<ScrapedPerformerDto>>([]);

    Task<ScrapedGalleryDto?> ScrapeGalleryAsync(ScraperRequest<GalleryScrapeInput> request, CancellationToken ct)
        => Task.FromResult<ScrapedGalleryDto?>(null);

    Task<IReadOnlyList<ScrapedGalleryDto>> SearchGalleriesAsync(ScraperRequest<string> request, CancellationToken ct)
        => Task.FromResult<IReadOnlyList<ScrapedGalleryDto>>([]);

    Task<ScrapedImageDto?> ScrapeImageAsync(ScraperRequest<ImageScrapeInput> request, CancellationToken ct)
        => Task.FromResult<ScrapedImageDto?>(null);

    Task<IReadOnlyList<ScrapedImageDto>> SearchImagesAsync(ScraperRequest<string> request, CancellationToken ct)
        => Task.FromResult<IReadOnlyList<ScrapedImageDto>>([]);

    Task<ScrapedGroupDto?> ScrapeGroupAsync(ScraperRequest<GroupScrapeInput> request, CancellationToken ct)
        => Task.FromResult<ScrapedGroupDto?>(null);

    Task<IReadOnlyList<ScrapedGroupDto>> SearchGroupsAsync(ScraperRequest<string> request, CancellationToken ct)
        => Task.FromResult<IReadOnlyList<ScrapedGroupDto>>([]);

    Task<ScrapedAudioDto?> ScrapeAudioAsync(ScraperRequest<AudioScrapeInput> request, CancellationToken ct)
        => Task.FromResult<ScrapedAudioDto?>(null);

    Task<IReadOnlyList<ScrapedAudioDto>> SearchAudiosAsync(ScraperRequest<string> request, CancellationToken ct)
        => Task.FromResult<IReadOnlyList<ScrapedAudioDto>>([]);

    Task<ScrapedTextDto?> ScrapeTextAsync(ScraperRequest<TextScrapeInput> request, CancellationToken ct)
        => Task.FromResult<ScrapedTextDto?>(null);

    Task<IReadOnlyList<ScrapedTextDto>> SearchTextsAsync(ScraperRequest<string> request, CancellationToken ct)
        => Task.FromResult<IReadOnlyList<ScrapedTextDto>>([]);
}

[Flags]
public enum DownloaderCapabilities
{
    None = 0,
    ResumeSupported = 1 << 0,
    RangeRequests = 1 << 1,
    MultiQuality = 1 << 2,
    InlineMetadata = 1 << 3,
}

public enum DownloaderEntity
{
    Video,
    Image,
    Gallery,
    Audio,
    Text,
}

public sealed record DownloaderPermissions(IReadOnlyList<string>? AllowNetworkHosts = null);

public sealed record DownloaderDescriptor(
    string Id,
    string Name,
    DownloaderEntity SupportedEntity,
    IReadOnlyList<string> SupportedUrlPatterns,
    DownloaderCapabilities Capabilities = DownloaderCapabilities.None);

public sealed record DownloaderQualityOption(string Id, string Label, string? Description = null)
{
    // Init properties rather than positional parameters so extensions compiled against the original
    // record keep the same constructor and deconstructor ABI.

    /// <summary>Frame width of the stream this option downloads, when the downloader knows it.</summary>
    public int? Width { get; init; }

    /// <summary>Frame height of the stream this option downloads, when the downloader knows it.</summary>
    public int? Height { get; init; }
}

/// <summary>A request to download a URL with a specific downloader and import the file into the library.</summary>
public sealed record DownloaderImportRequest(
    string DownloaderId,
    string Url,
    DownloaderEntity Entity,
    int? EntityId = null,
    string? QualityId = null,
    string? SourceUrl = null)
{
    /// <summary>
    /// Download even when <see cref="EntityId"/> already has files or the URL is already in the library,
    /// e.g. to add a higher-quality file to an existing entity.
    /// </summary>
    public bool AllowDuplicateDownload { get; init; }
}

/// <param name="LibraryPath">Where the downloaded file was placed in the library.</param>
/// <param name="EntityId">The entity the file was imported into, when the import produced one.</param>
public sealed record DownloaderImportResult(string LibraryPath, int? EntityId);

/// <summary>
/// Cove's downloader pipeline, resolvable from the extension service provider. These calls do not
/// authorize anything: endpoints must check the caller's permissions for the target entity first.
/// </summary>
public interface IDownloaderService
{
    /// <summary>Every enabled downloader's match for the URL, including its quality options.</summary>
    Task<IReadOnlyList<DownloaderMatchDto>> MatchUrlAsync(string url, CancellationToken ct);

    /// <summary>Download the URL and import the file, attaching it to <see cref="DownloaderImportRequest.EntityId"/> when set.</summary>
    Task<DownloaderImportResult?> DownloadAndImportAsync(
        DownloaderImportRequest request,
        Cove.Core.Interfaces.IJobProgress? progress,
        CancellationToken ct);
}

/// <summary>A login configured for a site in Cove's downloader settings.</summary>
public sealed record DownloaderSiteLogin(string Site, string Username, string Password)
{
    /// <summary>
    /// When the downloader settings holding this login were last saved, or null when unknown. A downloader that
    /// pauses a login after a failed sign-in should resume once this moves forward: saving the settings again,
    /// changed or not, is how a person says they fixed the problem.
    /// </summary>
    public DateTime? SavedAt { get; init; }
}

/// <summary>
/// Resolves the site login configured in Cove's downloader settings for a URL. Resolve it from the
/// extension service provider. It reads the live settings, so look it up per request instead of caching
/// the result.
/// </summary>
public interface IDownloaderSiteLoginProvider
{
    /// <summary>The login whose site matches the URL's host (most specific site wins), or null.</summary>
    DownloaderSiteLogin? FindForUrl(string url);
}

public sealed record DownloaderUrlMatch(
    string DownloaderId,
    string NormalizedUrl,
    IReadOnlyList<DownloaderQualityOption>? QualityOptions = null,
    string? Label = null,
    string? SourceUrl = null,
    bool Divert = false);

public sealed record DownloaderRequest(
    string DownloaderId,
    string Url,
    DownloaderEntity Entity,
    DownloaderPermissions Permissions,
    string? QualityId = null,
    string? SourceUrl = null);

public sealed record DownloaderResult(
    string LocalPath,
    string? OriginalFilename = null,
    IReadOnlyDictionary<string, string>? Headers = null,
    ScrapedVideoDto? InlineVideoMetadata = null,
    ScrapedGalleryDto? InlineGalleryMetadata = null,
    ScrapedImageDto? InlineImageMetadata = null);

public interface IDownloaderHost
{
    string TempDirectory { get; }
    IHttpClientFactory HttpClients { get; }
    ILogger CreateLogger(string categoryName);
    void ReportProgress(double progress, string? message = null);
}

public interface IDownloaderProvider : IExtension
{
    IReadOnlyList<DownloaderDescriptor> GetDownloaders();

    Task<DownloaderUrlMatch?> MatchAsync(string url, CancellationToken ct)
        => Task.FromResult<DownloaderUrlMatch?>(null);

    async Task<IReadOnlyList<DownloaderUrlMatch>> MatchAllAsync(string url, CancellationToken ct)
    {
        var match = await MatchAsync(url, ct);
        return match == null ? [] : [match];
    }

    Task<DownloaderResult?> DownloadAsync(DownloaderRequest request, IDownloaderHost host, CancellationToken ct)
        => Task.FromResult<DownloaderResult?>(null);
}


/// <summary>Outcome of a file maintenance call that may decline to act.</summary>
/// <param name="Applied">Whether the change was made.</param>
/// <param name="Reason">Why it was declined, for showing to the user.</param>
public sealed record VideoFileOperationResult(bool Applied, string? Reason);

/// <summary>
/// Video file maintenance Cove performs on an extension's behalf, for work that has to finish without a
/// user present (an unattended batch, for example). These calls authorize nothing: the endpoint that
/// queues the work must check the caller's permissions for the video and its files first. Resolve it from
/// an extension service scope.
/// </summary>
public interface IVideoFileMaintenanceService
{
    /// <summary>
    /// Makes <paramref name="fileId"/> the video's primary file, but only when it holds the same footage as
    /// the current primary (same length and appearance), so markers, clips and generated assets stay valid.
    /// Declines without changing anything when the two files differ.
    /// </summary>
    Task<VideoFileOperationResult> MakePrimaryWhenSameContentAsync(int videoId, int fileId, CancellationToken ct);

    /// <summary>
    /// Removes a file from the library, optionally deleting it from disk. Declines for a file that is still
    /// a video's primary file.
    /// </summary>
    Task<VideoFileOperationResult> DeleteFileAsync(int fileId, bool deleteFromDisk, CancellationToken ct);
}
