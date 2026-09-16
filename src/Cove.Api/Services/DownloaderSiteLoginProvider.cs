using Cove.Core.Interfaces;
using Cove.Plugins;

namespace Cove.Api.Services;

/// <summary>Resolves downloader site logins from the live downloader settings.</summary>
public sealed class DownloaderSiteLoginProvider(CoveConfiguration config) : IDownloaderSiteLoginProvider
{
    public DownloaderSiteLogin? FindForUrl(string url)
    {
        if (!Uri.TryCreate(url?.Trim(), UriKind.Absolute, out var uri) || string.IsNullOrWhiteSpace(uri.Host))
            return null;

        var host = uri.Host.ToLowerInvariant();
        // Saving settings replaces the list rather than mutating it, so enumerating this snapshot is safe.
        var credentials = config.DownloaderSiteCredentials;
        return credentials
            .Where(credential => !string.IsNullOrWhiteSpace(credential.Username) && !string.IsNullOrEmpty(credential.Password))
            .Select(credential => (Credential: credential, Site: NormalizeSite(credential.Site)))
            .Where(entry => entry.Site != null && MatchesHost(host, entry.Site))
            .OrderByDescending(entry => entry.Site!.Length)
            .Select(entry => new DownloaderSiteLogin(entry.Site!, entry.Credential.Username.Trim(), entry.Credential.Password))
            .FirstOrDefault();
    }

    internal static string? NormalizeSite(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = value.Trim();
        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var absoluteUri))
            trimmed = absoluteUri.Host;

        trimmed = trimmed.Trim('/').ToLowerInvariant();
        if (trimmed.StartsWith("www.", StringComparison.Ordinal))
            trimmed = trimmed[4..];

        return trimmed.Length == 0 ? null : trimmed;
    }

    private static bool MatchesHost(string host, string site)
        => host == site || host.EndsWith("." + site, StringComparison.Ordinal);
}
