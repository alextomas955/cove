using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Cove.ApiTests.Infrastructure;

/// <summary>
/// A loopback release feed that always offers <see cref="OfferedVersion"/> through
/// <c>cove-release.json</c>. It is read-only and identical for every server, so one instance is
/// shared by the whole test run. There is no nightly manifest and no API, which also exercises the
/// fallback paths returning "not found".
/// </summary>
public sealed class UpdateFeedSimulator
{
    public const string OfferedVersion = "999.0.0";
    public const string NotesMarkdown = "## [999.0.0]\n- Deterministic API-test release";

    private static readonly SemaphoreSlim StartGate = new(1, 1);
    private static UpdateFeedSimulator? _shared;

    private UpdateFeedSimulator(Uri endpoint) => Endpoint = endpoint;

    public Uri Endpoint { get; }

    internal static async Task<UpdateFeedSimulator> GetSharedAsync(CancellationToken cancellationToken)
    {
        if (_shared is not null)
            return _shared;

        await StartGate.WaitAsync(cancellationToken);
        try
        {
            if (_shared is not null)
                return _shared;

            var builder = WebApplication.CreateSlimBuilder(new WebApplicationOptions { EnvironmentName = Environments.Development });
            builder.Logging.ClearProviders();
            builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, 0));
            var application = builder.Build();
            application.MapGet("/releases/latest/download/cove-release.json", () => Results.Json(new
            {
                schemaVersion = 1,
                version = OfferedVersion,
                channel = "stable",
                publishedAt = new DateTimeOffset(2026, 10, 1, 12, 0, 0, TimeSpan.Zero),
                notesUrl = "https://example.invalid/releases/v999.0.0",
                notesMarkdown = NotesMarkdown,
                assets = new[] { "linux-x64", "osx-arm64" }
                    .Select(rid => new { rid, name = $"cove-{rid}.tar.gz", size = 1024, sha256 = new string('a', 64) })
                    .Append(new { rid = "win-x64", name = "cove-win-x64.zip", size = 1024, sha256 = new string('a', 64) }),
                migrations = Array.Empty<string>(),
            }, ApiJson.Options));

            await application.StartAsync(cancellationToken);
            var address = application.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()?.Addresses.SingleOrDefault()
                ?? throw new InvalidOperationException("The update feed simulator did not publish a listening address.");
            _shared = new UpdateFeedSimulator(new Uri(address.TrimEnd('/') + "/"));
            return _shared;
        }
        finally
        {
            StartGate.Release();
        }
    }
}
