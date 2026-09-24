using Cove.Api.Controllers;
using Cove.Api.Services;

namespace Cove.ApiTests.Infrastructure;

public sealed partial class CoveClient
{
    public Task<IReadOnlyList<VideoConversionEncoderInfo>> GetVideoConversionEncodersAsync(
        CancellationToken cancellationToken = default)
        => SendAsync<IReadOnlyList<VideoConversionEncoderInfo>>(
            HttpMethod.Get,
            WithCacheNonce("/api/video-conversion/encoders"),
            payload: null,
            cancellationToken);

    public Task<VideoConversionJobStart> StartVideoConversionAsync(
        VideoConversionRequestDto request,
        CancellationToken cancellationToken = default)
        => SendAsync<VideoConversionJobStart>(
            HttpMethod.Post,
            "/api/video-conversion",
            request,
            cancellationToken);
}
