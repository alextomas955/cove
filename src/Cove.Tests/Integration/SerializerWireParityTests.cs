using System.Text.Json;
using Cove.Core.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Cove.Tests.Integration;

public sealed class SerializerWireParityTests
{
    // An enum-carrying payload deliberately NOT reachable from any [JsonSerializable] root in
    // CoveJsonContext, mirroring a per-extension AssemblyLoadContext type. Serializing it forces
    // the reflection-fallback resolver + the global string-enum converter — the exact path that
    // minimal-API return values and extension MapEndpoints responses take. A registered DTO would
    // let this pass on the source-gen fast path while the extension path stayed broken.
    private sealed record UnregisteredWireProbe(JobStatus Status);

    [Fact]
    public async Task MvcSignalRAndHttpJson_SerializeEnum_ToIdenticalCamelCaseString()
    {
        using var factory = new CoveWebApplicationFactory("IntegrationSerializerParity");
        await factory.ResetDatabaseAsync();

        var services = factory.Services;
        var mvc = services
            .GetRequiredService<IOptions<Microsoft.AspNetCore.Mvc.JsonOptions>>()
            .Value.JsonSerializerOptions;
        var httpJson = services
            .GetRequiredService<IOptions<Microsoft.AspNetCore.Http.Json.JsonOptions>>()
            .Value.SerializerOptions;
        var signalr = services
            .GetRequiredService<IOptions<Microsoft.AspNetCore.SignalR.JsonHubProtocolOptions>>()
            .Value.PayloadSerializerOptions;

        var mvcJson = JsonSerializer.Serialize(JobStatus.Running, mvc);
        var httpJsonJson = JsonSerializer.Serialize(JobStatus.Running, httpJson);
        var signalrJson = JsonSerializer.Serialize(JobStatus.Running, signalr);

        Assert.Equal("\"running\"", mvcJson);
        Assert.Equal("\"running\"", httpJsonJson);
        Assert.Equal("\"running\"", signalrJson);
        Assert.Equal(mvcJson, httpJsonJson);
        Assert.Equal(mvcJson, signalrJson);
    }

    [Fact]
    public async Task HttpJsonOptions_SerializeUnregisteredDtoEnum_AsCamelCaseString()
    {
        using var factory = new CoveWebApplicationFactory("IntegrationSerializerExtension");
        await factory.ResetDatabaseAsync();

        // The exact options object every minimal-API return value, Results.Json call, and extension
        // MapEndpoints / HttpContext.Response.WriteAsJsonAsync response uses at runtime — wired only
        // by ConfigureHttpJsonOptions. Without it, this path emits enums as integers.
        var httpJson = factory.Services
            .GetRequiredService<IOptions<Microsoft.AspNetCore.Http.Json.JsonOptions>>()
            .Value.SerializerOptions;

        var json = JsonSerializer.Serialize(new UnregisteredWireProbe(JobStatus.Pending), httpJson);

        Assert.Contains("\"status\":\"pending\"", json);
        Assert.DoesNotContain("\"status\":0", json);
    }

    [Fact]
    public async Task SystemConfigEndpoint_EnumField_IsCamelCaseString()
    {
        using var factory = new CoveWebApplicationFactory("IntegrationSerializerRegression");
        await factory.ResetDatabaseAsync();

        using var client = factory.CreateAuthenticatedClient();
        var response = await client.GetAsync("/api/system/config");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadAsStringAsync();

        // RatingSystemOptions.Type is a RatingSystemType enum; controllers already emitted it as a
        // camelCase string, so this asserts the existing wire output is preserved, not changed.
        Assert.Contains("\"type\":\"stars\"", body);
        Assert.DoesNotContain("\"type\":0", body);
    }
}
