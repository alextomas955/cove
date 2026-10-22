using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Cove.ApiTests.Infrastructure;
using Cove.ApiTests.Tests.Harness;

namespace Cove.ApiTests.Tests.System;

[Collection(SelfHostedApiTestCollection.Name)]
public sealed class DockerUpdatesApiTests
{
    [Fact]
    public async Task GivenDockerImageMarker_WhenOwnerChecks_ThenTheUpdateIsShownButNeverApplied()
    {
        await using var server = await CoveApiServer.StartAsync(
            new Dictionary<string, string> { ["COVE_INSTALL_KIND"] = "docker" },
            TestContext.Current.CancellationToken);
        using var browser = new HttpClient { BaseAddress = server.BaseAddress };
        using var bootstrap = await browser.PostAsJsonAsync(
            "/api/auth/bootstrap-owner",
            new { username = $"docker-owner-{Guid.NewGuid():N}", password = ApiTestUsers.Password },
            ApiJson.Options,
            TestContext.Current.CancellationToken);
        bootstrap.StatusCode.Should().Be(HttpStatusCode.OK);
        var token = (await bootstrap.Content.ReadFromJsonAsync<JsonElement>(ApiJson.Options, TestContext.Current.CancellationToken))
            .GetProperty("token").GetString();
        browser.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var check = await browser.PostAsync("/api/updates/check", content: null, TestContext.Current.CancellationToken);
        check.StatusCode.Should().Be(HttpStatusCode.OK);
        var status = await check.Content.ReadFromJsonAsync<JsonElement>(ApiJson.Options, TestContext.Current.CancellationToken);
        status.GetProperty("installKind").GetString().Should().Be("docker");
        status.GetProperty("updateAvailable").GetBoolean().Should().BeTrue();
        status.GetProperty("canApply").GetBoolean().Should().BeFalse();
        status.GetProperty("cannotApplyReason").GetString().Should().Contain("container");

        using var apply = await browser.PostAsJsonAsync("/api/updates/apply", new { force = true }, ApiJson.Options, TestContext.Current.CancellationToken);
        apply.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
