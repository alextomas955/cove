using Cove.Api.Services;
using Cove.Core.DTOs;
using Cove.Core.Interfaces;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cove.Tests;

public sealed class DownloaderSiteLoginTests
{
    [Theory]
    [InlineData("https://www.pornhub.com/view_video.php?viewkey=abc")]
    [InlineData("https://pornhub.com/view_video.php?viewkey=abc")]
    [InlineData("https://de.pornhub.com/view_video.php?viewkey=abc")]
    public void FindForUrl_MatchesSiteAndItsSubdomains(string url)
    {
        var provider = new DownloaderSiteLoginProvider(ConfigWith(Credential("www.pornhub.com", "user", "secret")));

        var login = provider.FindForUrl(url);

        Assert.NotNull(login);
        Assert.Equal("pornhub.com", login.Site);
        Assert.Equal("user", login.Username);
        Assert.Equal("secret", login.Password);
    }

    [Theory]
    [InlineData("https://notpornhub.com/video")]
    [InlineData("https://pornhub.com.evil.invalid/video")]
    [InlineData("not a url")]
    public void FindForUrl_DoesNotMatchOtherHosts(string url)
    {
        var provider = new DownloaderSiteLoginProvider(ConfigWith(Credential("pornhub.com", "user", "secret")));

        Assert.Null(provider.FindForUrl(url));
    }

    [Fact]
    public void FindForUrl_PrefersTheMostSpecificSite()
    {
        var provider = new DownloaderSiteLoginProvider(ConfigWith(
            Credential("example.com", "general", "one"),
            Credential("https://videos.example.com/", "specific", "two")));

        Assert.Equal("specific", provider.FindForUrl("https://videos.example.com/watch/1")?.Username);
        Assert.Equal("general", provider.FindForUrl("https://www.example.com/watch/1")?.Username);
    }

    [Fact]
    public void FindForUrl_IgnoresLoginsWithoutAPassword()
    {
        var provider = new DownloaderSiteLoginProvider(ConfigWith(Credential("example.com", "user", "")));

        Assert.Null(provider.FindForUrl("https://example.com/watch/1"));
    }

    [Fact]
    public void SavingTheSettingsAgainAdvancesTheLoginsSavedTimeEvenWhenNothingChanged()
    {
        var config = ConfigWith(Credential("example.com", "user", "stored", id: "login-1"));
        var service = new ConfigService(config, NullLogger<ConfigService>.Instance);
        var provider = new DownloaderSiteLoginProvider(config);

        service.ApplyToLive(service.GetConfig());
        var first = provider.FindForUrl("https://example.com/video")?.SavedAt;
        Thread.Sleep(5);
        service.ApplyToLive(service.GetConfig());
        var second = provider.FindForUrl("https://example.com/video")?.SavedAt;

        Assert.NotNull(first);
        Assert.NotNull(second);
        Assert.True(second > first);
        Assert.Equal("stored", Assert.Single(config.DownloaderSiteCredentials).Password);
    }

    [Fact]
    public void ApplyToLive_KeepsTheStoredPasswordWhenASaveOmitsIt()
    {
        var config = ConfigWith(Credential("example.com", "user", "stored", id: "login-1"));
        var service = new ConfigService(config, NullLogger<ConfigService>.Instance);
        var dto = service.GetConfig();

        service.ApplyToLive(dto with
        {
            DownloaderSiteCredentials = [dto.DownloaderSiteCredentials.Single() with { Username = "renamed", Password = null }],
        });

        var saved = Assert.Single(config.DownloaderSiteCredentials);
        Assert.Equal("login-1", saved.Id);
        Assert.Equal("renamed", saved.Username);
        Assert.Equal("stored", saved.Password);
    }

    [Fact]
    public void ApplyToLive_ReplacesThePasswordWhenASaveProvidesOne()
    {
        var config = ConfigWith(Credential("example.com", "user", "stored", id: "login-1"));
        var service = new ConfigService(config, NullLogger<ConfigService>.Instance);
        var dto = service.GetConfig();

        service.ApplyToLive(dto with
        {
            DownloaderSiteCredentials = [dto.DownloaderSiteCredentials.Single() with { Password = "changed" }],
        });

        Assert.Equal("changed", Assert.Single(config.DownloaderSiteCredentials).Password);
    }

    [Fact]
    public void ApplyToLive_DoesNotGiveANewLoginAnotherLoginsPassword()
    {
        var config = ConfigWith(Credential("example.com", "user", "stored", id: "login-1"));
        var service = new ConfigService(config, NullLogger<ConfigService>.Instance);

        service.ApplyToLive(service.GetConfig() with
        {
            DownloaderSiteCredentials = [new DownloaderSiteCredentialDto { Site = "example.com", Username = "user" }],
        });

        var saved = Assert.Single(config.DownloaderSiteCredentials);
        Assert.NotEqual("login-1", saved.Id);
        Assert.False(string.IsNullOrWhiteSpace(saved.Id));
        Assert.Equal(string.Empty, saved.Password);
    }

    [Fact]
    public void ApplyToLive_DropsLoginsWithoutASiteOrUsername()
    {
        var config = new CoveConfiguration();
        var service = new ConfigService(config, NullLogger<ConfigService>.Instance);

        service.ApplyToLive(service.GetConfig() with
        {
            DownloaderSiteCredentials =
            [
                new DownloaderSiteCredentialDto { Site = " example.com ", Username = " user ", Password = " pw " },
                new DownloaderSiteCredentialDto { Site = "", Username = "nobody", Password = "pw" },
                new DownloaderSiteCredentialDto { Site = "example.org", Username = " ", Password = "pw" },
            ],
        });

        var saved = Assert.Single(config.DownloaderSiteCredentials);
        Assert.Equal("example.com", saved.Site);
        Assert.Equal("user", saved.Username);
        Assert.Equal(" pw ", saved.Password);
    }

    private static CoveConfiguration ConfigWith(params DownloaderSiteCredential[] credentials)
        => new() { DownloaderSiteCredentials = [.. credentials] };

    private static DownloaderSiteCredential Credential(string site, string username, string password, string? id = null)
        => new() { Id = id ?? Guid.NewGuid().ToString("n"), Site = site, Username = username, Password = password };
}
