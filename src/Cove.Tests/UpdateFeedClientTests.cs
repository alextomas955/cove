using System.Net;
using System.Text;
using Cove.Api.Updates;

namespace Cove.Tests;

public class UpdateFeedClientTests
{
    private const string Feed = "https://feed.test/yourcove/cove/";
    private const string Api = "https://api.test/repos/yourcove/cove/";
    private static readonly string Sha = new('a', 64);

    private const string StableManifest = """
        {
          "schemaVersion": 1,
          "version": "1.5.0",
          "channel": "stable",
          "publishedAt": "2026-10-01T12:00:00Z",
          "notesUrl": "https://github.com/yourcove/cove/releases/tag/v1.5.0",
          "notesMarkdown": "## [1.5.0]\n- Native updates",
          "assets": [
            { "rid": "linux-x64", "name": "cove-linux-x64.tar.gz", "size": 1234, "sha256": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
            { "rid": "win-x64", "name": "cove-win-x64.zip", "size": 2345, "sha256": "not-a-hash" },
            { "rid": "osx-arm64", "name": "../evil.tar.gz", "size": 1, "sha256": null }
          ],
          "migrations": ["20260516223910_V1_0", "20261001000000_Next"]
        }
        """;

    // Shape of GET /repos/{owner}/{repo}/releases/latest for a release published before manifests existed.
    private const string LatestReleaseApi = """
        {
          "tag_name": "v1.4.1",
          "draft": false,
          "prerelease": false,
          "html_url": "https://github.com/yourcove/cove/releases/tag/v1.4.1",
          "published_at": "2026-09-01T08:00:00Z",
          "body": "## [1.4.1]\n- Fixes",
          "assets": [
            { "name": "cove-linux-x64.tar.gz", "size": 111, "browser_download_url": "https://github.com/yourcove/cove/releases/download/v1.4.1/cove-linux-x64.tar.gz" },
            { "name": "cove-linux-x64.tar.gz.sha256", "size": 90, "browser_download_url": "https://github.com/yourcove/cove/releases/download/v1.4.1/cove-linux-x64.tar.gz.sha256" },
            { "name": "cove-win-x64.zip", "size": 222, "browser_download_url": "https://github.com/yourcove/cove/releases/download/v1.4.1/cove-win-x64.zip" },
            { "name": "cove-cli-linux-x64.tar.gz", "size": 5, "browser_download_url": "https://github.com/yourcove/cove/releases/download/v1.4.1/cove-cli-linux-x64.tar.gz" },
            { "name": "checksums.txt", "size": 5, "browser_download_url": "https://github.com/yourcove/cove/releases/download/v1.4.1/checksums.txt" }
          ]
        }
        """;

    private const string NightlyReleaseApi = """
        {
          "tag_name": "nightly",
          "prerelease": true,
          "html_url": "https://github.com/yourcove/cove/releases/tag/nightly",
          "published_at": "2026-10-20T03:30:00Z",
          "body": "> **Development build:** Back up Cove before upgrading.\n\n**Version:** `1.4.2-dev.12`  \n**Commit:** [`abc`](https://github.com/yourcove/cove/commit/abc)\n",
          "assets": [
            { "name": "cove-osx-arm64.tar.gz", "size": 333, "browser_download_url": "https://github.com/yourcove/cove/releases/download/nightly/cove-osx-arm64.tar.gz" }
          ]
        }
        """;

    private const string ReleasesListApi = """
        [
          { "tag_name": "nightly", "draft": false, "body": "**Version:** `9.9.9-dev.1`", "assets": [] },
          { "tag_name": "v1.6.0-rc.1", "draft": true, "assets": [] },
          { "tag_name": "v1.5.0-rc.2", "draft": false, "prerelease": true, "assets": [
            { "name": "cove-linux-x64.tar.gz", "size": 10, "browser_download_url": "https://github.com/yourcove/cove/releases/download/v1.5.0-rc.2/cove-linux-x64.tar.gz" }
          ] },
          { "tag_name": "v1.5.0-rc.1", "draft": false, "prerelease": true, "assets": [] },
          { "tag_name": "v1.4.1", "draft": false, "prerelease": false, "assets": [] }
        ]
        """;

    [Fact]
    public async Task Stable_release_is_read_from_the_manifest()
    {
        var client = CreateClient(new()
        {
            [Feed + "releases/latest/download/cove-release.json"] = StableManifest,
        });

        var release = await client.GetStableAsync(CancellationToken.None);

        Assert.NotNull(release);
        Assert.Equal("1.5.0", release.Version);
        Assert.Equal("manifest", release.Source);
        Assert.Equal(["20260516223910_V1_0", "20261001000000_Next"], release.Migrations);
        Assert.Equal("## [1.5.0]\n- Native updates", release.NotesMarkdown);

        var linux = release.FindAsset("linux-x64");
        Assert.NotNull(linux);
        Assert.Equal(Sha, linux.Sha256);
        Assert.Equal(1234, linux.Size);
        Assert.Equal(Feed + "releases/download/v1.5.0/cove-linux-x64.tar.gz", linux.DownloadUrl);
        // An invalid hash is dropped (the published .sha256 is used instead) and a path-like name is rejected.
        Assert.Null(release.FindAsset("win-x64")!.Sha256);
        Assert.Null(release.FindAsset("osx-arm64"));
    }

    [Fact]
    public async Task Stable_release_falls_back_to_the_github_api_without_a_manifest()
    {
        var client = CreateClient(new()
        {
            [Api + "releases/latest"] = LatestReleaseApi,
        });

        var release = await client.GetStableAsync(CancellationToken.None);

        Assert.NotNull(release);
        Assert.Equal("1.4.1", release.Version);
        Assert.Equal("github-api", release.Source);
        Assert.Null(release.Migrations);
        Assert.Equal(["linux-x64", "win-x64"], release.Assets.Select(asset => asset.Rid).Order().ToArray());
        var linux = release.FindAsset("linux-x64")!;
        Assert.Null(linux.Sha256);
        Assert.Equal("https://github.com/yourcove/cove/releases/download/v1.4.1/cove-linux-x64.tar.gz.sha256", linux.Sha256Url);
        Assert.Null(release.FindAsset("win-x64")!.Sha256Url);
    }

    [Fact]
    public async Task Published_sha256_file_is_parsed_from_sha256sum_format()
    {
        var client = CreateClient(new()
        {
            [Api + "releases/latest"] = LatestReleaseApi,
            ["https://github.com/yourcove/cove/releases/download/v1.4.1/cove-linux-x64.tar.gz.sha256"] = $"{new string('B', 64)}  cove-linux-x64.tar.gz\n",
        });
        var release = await client.GetStableAsync(CancellationToken.None);

        var sha = await client.GetPublishedSha256Async(release!.FindAsset("linux-x64")!, CancellationToken.None);

        Assert.Equal(new string('b', 64), sha);
    }

    [Fact]
    public async Task Nightly_version_is_read_from_the_release_notes_without_a_manifest()
    {
        var client = CreateClient(new()
        {
            [Api + "releases/tags/nightly"] = NightlyReleaseApi,
        });

        var release = await client.GetNightlyAsync(CancellationToken.None);

        Assert.Equal("1.4.2-dev.12", release?.Version);
        Assert.Equal("osx-arm64", Assert.Single(release!.Assets).Rid);
    }

    [Fact]
    public async Task Nightly_manifest_assets_download_from_the_nightly_tag()
    {
        var client = CreateClient(new()
        {
            [Feed + "releases/download/nightly/cove-release.json"] = StableManifest.Replace("\"1.5.0\"", "\"1.5.1-dev.3\""),
        });

        var release = await client.GetNightlyAsync(CancellationToken.None);

        Assert.Equal(Feed + "releases/download/nightly/cove-linux-x64.tar.gz", release!.FindAsset("linux-x64")!.DownloadUrl);
    }

    [Fact]
    public async Task Prerelease_list_skips_drafts_and_nightly_and_hydrates_the_best_from_its_manifest()
    {
        var client = CreateClient(new()
        {
            [Api + "releases?per_page=20"] = ReleasesListApi,
            [Feed + "releases/download/v1.5.0-rc.2/cove-release.json"] = StableManifest.Replace("\"1.5.0\"", "\"1.5.0-rc.2\""),
        });

        var releases = await client.GetPrereleasesAsync(CancellationToken.None);

        Assert.Equal(["1.4.1", "1.5.0-rc.1", "1.5.0-rc.2"], releases.Select(release => release.Version).Order().ToArray());
        var best = releases.Single(release => release.Version == "1.5.0-rc.2");
        Assert.Equal("manifest", best.Source);
        Assert.NotNull(best.Migrations);
    }

    [Fact]
    public async Task Missing_releases_return_null_and_server_errors_surface()
    {
        var empty = CreateClient([]);
        Assert.Null(await empty.GetStableAsync(CancellationToken.None));

        var failing = CreateClient([], HttpStatusCode.Forbidden);
        var error = await Assert.ThrowsAsync<UpdateFeedException>(() => failing.GetStableAsync(CancellationToken.None));
        Assert.Contains("rate limit", error.Message);
    }

    [Theory]
    [InlineData("http://example.com", false)]
    [InlineData("ftp://example.com", false)]
    [InlineData("https://example.com", true)]
    [InlineData("http://127.0.0.1:5999", true)]
    [InlineData("http://localhost:5999", true)]
    public void Feed_base_url_must_be_https_except_loopback(string url, bool allowed)
    {
        if (allowed)
            Assert.NotNull(UpdateFeedOptions.FromConfiguration(url, null));
        else
            Assert.Throws<ArgumentException>(() => UpdateFeedOptions.FromConfiguration(url, null));
    }

    private static UpdateFeedClient CreateClient(Dictionary<string, string> responses, HttpStatusCode missing = HttpStatusCode.NotFound)
        => new(new HttpClient(new FixtureHandler(responses, missing)), new UpdateFeedOptions
        {
            FeedBaseUri = new Uri(Feed),
            ApiBaseUri = new Uri(Api),
        });

    private sealed class FixtureHandler(Dictionary<string, string> responses, HttpStatusCode missing) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => Task.FromResult(responses.TryGetValue(request.RequestUri!.AbsoluteUri, out var body)
                ? new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body, Encoding.UTF8, "application/json") }
                : new HttpResponseMessage(missing));
    }
}
