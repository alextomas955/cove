using Cove.Core.Auth;
using Cove.Core.DTOs;
using Cove.Core.Entities;
using Cove.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Cove.Api.Controllers;

[ApiController]
[Route("api/playback")]
[AllowWithoutPermission]
public class PlaybackController(IUserEngagementService engagementService, ICurrentPrincipalAccessor principalAccessor) : ControllerBase
{
    [HttpPost("intervals")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("interactions")]
    public async Task<IActionResult> RecordIntervals([FromBody] PlaybackIntervalsRequestDto dto, CancellationToken ct)
    {
        if (principalAccessor.Current?.UserId is null)
            return Forbid();
        if (!InteractionValueMapper.TryParseHostType(dto.HostType, out var hostType)
            || GetPlaybackReadPermission(hostType) is not { } permission)
            return BadRequest("Unsupported host type.");
        if (principalAccessor.Current?.Has(permission) != true)
            return Forbid();

        var recorded = await engagementService.RecordPlaybackIntervalsAsync(dto, ct);
        return recorded ? NoContent() : NotFound();
    }

    // Only hosts that can actually be played are accepted; anything else, including a host type added to the
    // enum later without a mapping here, is rejected as unsupported before any lookup by id. Group is the
    // compilation player's session host.
    private static string? GetPlaybackReadPermission(InteractionHostType hostType) => hostType switch
    {
        InteractionHostType.Video => Permissions.VideosRead,
        InteractionHostType.Image => Permissions.ImagesRead,
        InteractionHostType.Audio => Permissions.AudiosRead,
        InteractionHostType.Text => Permissions.TextsRead,
        InteractionHostType.Segment => Permissions.SegmentsRead,
        InteractionHostType.Group => Permissions.GroupsRead,
        _ => null,
    };
}
