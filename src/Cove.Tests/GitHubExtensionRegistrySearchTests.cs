using System.Net;
using System.Text;
using System.Text.Json;
using Cove.Plugins;

namespace Cove.Tests;

public class GitHubExtensionRegistrySearchTests
{
    private const string BaseUrl = "https://registry.test/";
    private static readonly string Checksum = new('a', 64);

    // Index order is deliberately neither alphabetical nor by date, and mixes name casing so an ordinal
    // comparison ("Beta" < "Mid" < "Zeta" < "alpha") would be distinguishable from a case-insensitive one.
    private static readonly (string Id, string Name, string ReleasedAt, string Category)[] Fixture =
    [
        ("zeta", "Zeta Tools", "2026-01-01T00:00:00Z", "metadata"),
        ("alpha", "alpha helper", "2026-06-01T00:00:00Z", "ui"),
        ("beta", "Beta", "2025-03-01T00:00:00Z", "metadata"),
        ("mid", "Mid", "2026-09-01T00:00:00Z", "metadata"),
    ];

    [Fact]
    public async Task Default_sort_keeps_registry_index_order()
    {
        var result = await CreateRegistry().SearchAsync(new RegistrySearchRequest { SortBy = "relevance", PageSize = 20 }, TestContext.Current.CancellationToken);

        Assert.Equal(["zeta", "alpha", "beta", "mid"], result.Items.Select(i => i.Id));
    }

    [Fact]
    public async Task Name_sort_is_case_insensitive_alphabetical()
    {
        var result = await CreateRegistry().SearchAsync(new RegistrySearchRequest { SortBy = "name", PageSize = 20 }, TestContext.Current.CancellationToken);

        Assert.Equal(["alpha", "beta", "mid", "zeta"], result.Items.Select(i => i.Id));
    }

    [Fact]
    public async Task Updated_sort_puts_most_recent_release_first()
    {
        var result = await CreateRegistry().SearchAsync(new RegistrySearchRequest { SortBy = "updated", PageSize = 20 }, TestContext.Current.CancellationToken);

        Assert.Equal(["mid", "alpha", "zeta", "beta"], result.Items.Select(i => i.Id));
    }

    [Theory]
    [InlineData("name", 1, new[] { "beta", "mid" })]
    [InlineData("name", 2, new[] { "zeta" })]
    [InlineData("updated", 1, new[] { "mid", "zeta" })]
    [InlineData("updated", 2, new[] { "beta" })]
    public async Task Sort_applies_after_category_filter_and_before_paging(string sort, int page, string[] expected)
    {
        var result = await CreateRegistry().SearchAsync(new RegistrySearchRequest
        {
            Categories = ["metadata"],
            SortBy = sort,
            Page = page,
            PageSize = 2,
        }, TestContext.Current.CancellationToken);

        Assert.Equal(3, result.TotalCount);
        Assert.Equal(expected, result.Items.Select(i => i.Id));
    }

    [Fact]
    public async Task Sort_composes_with_text_search()
    {
        // "e" matches every name except "Mid"; sorted by name across the filtered set.
        var result = await CreateRegistry().SearchAsync(new RegistrySearchRequest { Query = "e", SortBy = "name", PageSize = 20 }, TestContext.Current.CancellationToken);

        Assert.Equal(["alpha", "beta", "zeta"], result.Items.Select(i => i.Id));
    }

    private static GitHubExtensionRegistry CreateRegistry()
    {
        var responses = new Dictionary<string, string>
        {
            [BaseUrl + "index.json"] = JsonSerializer.Serialize(new { extensions = Fixture.Select(f => new { id = f.Id }) }),
        };
        foreach (var f in Fixture)
        {
            responses[$"{BaseUrl}extensions/{f.Id}.json"] = JsonSerializer.Serialize(new
            {
                id = f.Id,
                name = f.Name,
                categories = new[] { f.Category },
                versions = new[]
                {
                    new { version = "1.0.0", releasedAt = f.ReleasedAt, checksum = Checksum, downloadUrl = $"https://example.test/{f.Id}.zip" },
                },
            });
        }

        return new GitHubExtensionRegistry(new HttpClient(new FixtureHandler(responses)), registryBaseUrl: BaseUrl);
    }

    private sealed class FixtureHandler(IReadOnlyDictionary<string, string> responses) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(responses.TryGetValue(request.RequestUri!.AbsoluteUri, out var body)
                ? new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body, Encoding.UTF8, "application/json") }
                : new HttpResponseMessage(HttpStatusCode.NotFound));
    }
}
