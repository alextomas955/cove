using Cove.Core.DTOs;
using Cove.Core.Entities;
using Cove.Data;

namespace Cove.Api.Controllers;

internal static class TagDtoMapping
{
    public static string EffectiveSortName(Tag tag) => tag.SortName ?? tag.Name;

    public static IOrderedEnumerable<TagDto> OrderForDisplay(this IEnumerable<TagDto> tags)
        => tags
            .OrderBy(tag => tag.TagGroupId.HasValue ? 0 : 1)
            .ThenBy(tag => tag.TagGroupSortOrder ?? int.MaxValue)
            .ThenBy(tag => tag.TagGroupName, NaturalStringComparer.Instance)
            .ThenBy(tag => tag.SortName ?? tag.Name, NaturalStringComparer.Instance)
            .ThenBy(tag => tag.Id);

    public static TagDto MapTagDto(Tag tag, List<TagProvenanceDto>? provenance = null)
        => new(
            tag.Id,
            tag.Name,
            tag.Description,
            tag.Favorite,
            tag.Aliases.Select(alias => alias.Alias).ToList(),
            tag.ShowAsSegment,
            tag.SegmentColorOverride,
            tag.SegmentLaneOverride,
            provenance,
            tag.Color,
            tag.TagGroupId,
            tag.TagGroup?.Name,
            tag.TagGroup?.Color,
            tag.MinOccurrenceSec,
            tag.MinOccurrencePercent,
            HasImage: tag.ImageOverrideBlobId != null || tag.ImageBlobId != null)
        {
            TagGroupSortOrder = tag.TagGroup?.SortOrder,
            SortName = tag.SortName,
        };
}
