using Cove.Core.Auth;
using Cove.Core.DTOs;
using Cove.Core.Entities;
using Cove.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Cove.Api.Controllers;

[ApiController]
[Route("api/engagement")]
[AllowWithoutPermission]
public class EntityEngagementController(IUserEngagementService engagementService, ICurrentPrincipalAccessor principalAccessor) : ControllerBase
{
    [HttpGet("{hostType}/{hostId:int}")]
    public async Task<ActionResult<EntityEngagementDto>> Get(AffinityHostType hostType, int hostId, CancellationToken cancellationToken)
    {
        if (!HasPermission(hostType))
            return Forbid();

        var snapshot = await engagementService.GetSnapshotAsync(hostType, hostId, cancellationToken);
        return snapshot is null ? NotFound() : Ok(ToDto(hostId, snapshot));
    }

    [HttpGet("{hostType}/{hostId:int}/ratings")]
    public async Task<ActionResult<EntityRatingsDto>> GetRatings(AffinityHostType hostType, int hostId, CancellationToken cancellationToken)
    {
        if (!HasPermission(hostType))
            return Forbid();

        var ratings = await engagementService.GetRatingsByAspectAsync(hostType, hostId, cancellationToken);
        return ratings is null ? NotFound() : Ok(new EntityRatingsDto(hostId, ratings));
    }

    [HttpPost("batch")]
    public async Task<ActionResult<IReadOnlyList<EntityEngagementDto>>> Batch([FromBody] EntityEngagementBatchRequestDto dto, CancellationToken cancellationToken)
    {
        if (!HasPermission(dto.HostType))
            return Forbid();

        var snapshots = await engagementService.GetSnapshotsAsync(dto.HostType, dto.HostIds, cancellationToken);
        return Ok(dto.HostIds.Distinct().Select(hostId => ToDto(hostId, snapshots.GetValueOrDefault(hostId))).ToList());
    }

    [HttpPost("interactions")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("interactions")]
    public async Task<IActionResult> RecordInteraction([FromBody] EngagementInteractionWriteDto dto, CancellationToken cancellationToken)
    {
        if (principalAccessor.Current?.UserId is null)
            return Forbid();
        if (!InteractionValueMapper.TryParseHostType(dto.HostType, out var hostType))
            return BadRequest("Unsupported interaction host type.");
        if (!InteractionValueMapper.TryParseKind(dto.Kind, out var kind))
            return BadRequest("Unsupported interaction kind.");
        if (kind == InteractionKind.LikeCount)
            return BadRequest("Like count interactions must use a dedicated media like endpoint.");
        if (InteractionValueMapper.RequiresConcreteHost(hostType) && (!dto.HostId.HasValue || dto.HostId.Value <= 0))
            return BadRequest("This interaction host type requires a host id.");
        if (!HasInteractionPermission(hostType, principalAccessor.Current))
            return Forbid();

        var recorded = await engagementService.RecordInteractionAsync(
            hostType,
            dto.HostId ?? 0,
            kind,
            dto.Meta,
            cancellationToken);

        return recorded ? NoContent() : NotFound();
    }

    [HttpGet("interactions")]
    public async Task<ActionResult<IReadOnlyList<EngagementInteractionDto>>> GetInteractions([FromQuery] string? hostType, [FromQuery] int? hostId, [FromQuery] int limit = 100, CancellationToken cancellationToken = default)
    {
        if (principalAccessor.Current?.UserId is null)
            return Forbid();

        InteractionHostType? parsedHostType = null;
        if (!string.IsNullOrWhiteSpace(hostType))
        {
            if (!InteractionValueMapper.TryParseHostType(hostType, out var concreteHostType))
                return BadRequest("Unsupported interaction host type.");
            if (InteractionValueMapper.RequiresConcreteHost(concreteHostType) && hostId.GetValueOrDefault() <= 0)
                return BadRequest("This interaction host type requires a host id.");
            if (!HasInteractionPermission(concreteHostType, principalAccessor.Current))
                return Forbid();
            parsedHostType = concreteHostType;
        }

        return Ok(await engagementService.GetInteractionsAsync(parsedHostType, hostId, limit, cancellationToken));
    }

    [HttpPut("{hostType}/{hostId:int}/favorite")]
    public async Task<ActionResult<EntityEngagementDto>> SetFavorite(AffinityHostType hostType, int hostId, [FromBody] EntityFavoriteDto dto, CancellationToken cancellationToken)
    {
        if (principalAccessor.Current?.UserId is null)
            return Forbid();
        if (!HasPermission(hostType))
            return Forbid();

        var snapshot = await engagementService.SetFavoriteAsync(hostType, hostId, dto.IsFavorite, cancellationToken);
        return snapshot is null ? NotFound() : Ok(ToDto(hostId, snapshot));
    }

    [HttpPut("{hostType}/{hostId:int}/rating")]
    public async Task<ActionResult<EntityEngagementDto>> SetRating(AffinityHostType hostType, int hostId, [FromBody] VideoRatingDto dto, CancellationToken cancellationToken)
    {
        if (principalAccessor.Current?.UserId is null)
            return Forbid();
        if (!HasPermission(hostType))
            return Forbid();

        var snapshot = await engagementService.SetRatingAsync(hostType, hostId, dto.Value, dto.Aspect, cancellationToken);
        return snapshot is null ? NotFound() : Ok(ToDto(hostId, snapshot));
    }

    [HttpPost("activity/reset-all")]
    public async Task<ActionResult<object>> ResetAllActivity(CancellationToken cancellationToken)
    {
        if (principalAccessor.Current?.UserId is null)
            return Forbid();

        var count = await engagementService.ResetAllActivityAsync(cancellationToken);
        return Ok(new { reset = count });
    }

    [HttpPost("wipe-all")]
    public async Task<ActionResult<object>> WipeAllEngagement(CancellationToken cancellationToken)
    {
        if (principalAccessor.Current?.UserId is null)
            return Forbid();

        var count = await engagementService.WipeAllEngagementAsync(cancellationToken);
        return Ok(new { wiped = count });
    }

    // Engagement writes (favorite, rating) are authorized by the entity kind's read permission, not its write
    // permission: they change only the caller's own personal state, never the library record.
    private bool HasPermission(AffinityHostType hostType)
    {
        var permission = hostType switch
        {
            AffinityHostType.Video => Permissions.VideosRead,
            AffinityHostType.Audio => Permissions.AudiosRead,
            AffinityHostType.Text => Permissions.TextsRead,
            AffinityHostType.Image => Permissions.ImagesRead,
            AffinityHostType.Performer => Permissions.PerformersRead,
            AffinityHostType.Face => Permissions.FacesRead,
            AffinityHostType.Tag => Permissions.TagsRead,
            AffinityHostType.Studio => Permissions.StudiosRead,
            AffinityHostType.Gallery => Permissions.GalleriesRead,
            AffinityHostType.Group => Permissions.GroupsRead,
            AffinityHostType.Segment => Permissions.SegmentsRead,
            _ => null,
        };

        return permission is not null && principalAccessor.Current?.Has(permission) == true;
    }

    internal static bool HasInteractionPermission(InteractionHostType hostType, CovePrincipal? principal)
    {
        // Search and Collection name no concrete entity, so there is no entity permission to check. Every other
        // host type must map to one below; an unmapped type is denied, so a new enum member fails closed.
        if (hostType is InteractionHostType.Search or InteractionHostType.Collection)
            return true;

        var permission = hostType switch
        {
            InteractionHostType.Video => Permissions.VideosRead,
            InteractionHostType.Image => Permissions.ImagesRead,
            InteractionHostType.Audio => Permissions.AudiosRead,
            InteractionHostType.Text => Permissions.TextsRead,
            InteractionHostType.Performer => Permissions.PerformersRead,
            InteractionHostType.Face => Permissions.FacesRead,
            InteractionHostType.Tag => Permissions.TagsRead,
            InteractionHostType.Segment => Permissions.SegmentsRead,
            InteractionHostType.Studio => Permissions.StudiosRead,
            InteractionHostType.Gallery => Permissions.GalleriesRead,
            InteractionHostType.Group => Permissions.GroupsRead,
            _ => null,
        };

        return permission is not null && principal?.Has(permission) == true;
    }

    private static EntityEngagementDto ToDto(int hostId, UserEngagementSnapshot? snapshot)
    {
        snapshot ??= new UserEngagementSnapshot(false, null, 0d, 0d, 0, null, 0, 0, 0, 0);
        return new EntityEngagementDto(
            hostId,
            snapshot.IsFavorite,
            snapshot.Rating,
            snapshot.ResumeTime,
            snapshot.PlayDuration,
            snapshot.PlayCount,
            snapshot.LastPlayedAt?.ToString("o"),
            snapshot.LikeCount,
            snapshot.DerivedLikeCount,
            snapshot.PageVisitCount,
            snapshot.CompleteCount,
            snapshot.LastLikedAt?.ToString("o"));
    }
}
