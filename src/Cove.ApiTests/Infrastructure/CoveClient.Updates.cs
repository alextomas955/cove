using Cove.Api.Updates;
using Cove.Core.DTOs;

namespace Cove.ApiTests.Infrastructure;

public sealed partial class CoveClient
{
    public Task<UpdateStatusDto> GetUpdateStatusAsync(CancellationToken cancellationToken = default)
        => SendAsync<UpdateStatusDto>(HttpMethod.Get, WithCacheNonce("/api/updates/status"), null, cancellationToken);

    public Task<UpdateStatusDto> CheckForUpdatesAsync(CancellationToken cancellationToken = default)
        => SendAsync<UpdateStatusDto>(HttpMethod.Post, "/api/updates/check", new { }, cancellationToken);

    public Task<UpdateStatusDto> SaveUpdateSettingsAsync(UpdatesConfigDto settings, CancellationToken cancellationToken = default)
        => SendAsync<UpdateStatusDto>(HttpMethod.Put, "/api/updates/settings", settings, cancellationToken);
}
