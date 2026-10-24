using Cove.Api.Controllers;
using Cove.Core.Common;
using Cove.Core.DTOs;
using Cove.Core.Entities;
using Cove.Data;
using Cove.Data.Repositories;
using Cove.Data.Services;

using Microsoft.EntityFrameworkCore;

namespace Cove.Api.Services;

internal static class EffectiveTagDtoLoader
{
    /// <summary>The ids of each host's effective tags, for list entries; clients resolve them through the tag lookup.</summary>
    public static async Task<IReadOnlyDictionary<int, List<int>>> LoadIdsAsync(
        CoveContext db,
        AffinityHostType hostType,
        IEnumerable<int> hostIds,
        CancellationToken cancellationToken)
    {
        var ids = hostIds.Where(id => id > 0).Distinct().ToArray();
        var result = ids.ToDictionary(id => id, _ => new List<int>());
        if (ids.Length == 0)
            return result;

        var rows = await EffectiveHostTagQuery.ForHostType(db, hostType)
            .AsNoTracking()
            .Where(row => ids.Contains(row.HostId))
            .Select(row => new { row.HostId, row.TagId })
            .Distinct()
            .ToListAsync(cancellationToken);
        foreach (var row in rows)
            result[row.HostId].Add(row.TagId);
        foreach (var list in result.Values)
            list.Sort();
        return result;
    }

    public static async Task<IReadOnlyDictionary<int, List<TagDto>>> LoadAsync(
        CoveContext db,
        AffinityHostType hostType,
        IEnumerable<int> hostIds,
        CancellationToken cancellationToken,
        bool includeProvenance = true)
    {
        var ids = hostIds.Where(id => id > 0).Distinct().ToArray();
        if (ids.Length == 0)
        {
            return new Dictionary<int, List<TagDto>>();
        }

        var rows = await EffectiveHostTagQuery.ForHostType(db, hostType)
            .AsNoTracking()
            .Where(row => ids.Contains(row.HostId))
            .ToListAsync(cancellationToken);
        if (rows.Count == 0)
        {
            return ids.ToDictionary(id => id, _ => new List<TagDto>());
        }

        var tagIds = rows.Select(row => row.TagId).Where(tagId => tagId > 0).Distinct().ToArray();
        var tags = await db.Tags
            .AsNoTracking()
            .Include(tag => tag.Aliases)
            .Include(tag => tag.TagGroup)
            .Where(tag => tagIds.Contains(tag.Id))
            .ToDictionaryAsync(tag => tag.Id, cancellationToken);
        var favoriteTagIds = await EngagementQueryHelpers.GetFavoriteHostIdsAsync(db, AffinityHostType.Tag, tagIds, cancellationToken);
        var favorites = CatalogFavorites.None with { TagIds = favoriteTagIds };

        // Where each tag came from, how long it runs, and whether it can be removed here are detail data
        // derived from every application's provenance; lists show tags and read none of them.
        var provenanceLookup = includeProvenance
            ? await LoadProvenanceAsync(db, hostType, ids, tagIds, cancellationToken)
            : null;

        var result = ids.ToDictionary(id => id, _ => new List<TagDto>());
        foreach (var hostGroup in rows.GroupBy(row => row.HostId))
        {
            var tagDtos = hostGroup
                .GroupBy(row => row.TagId)
                .Select(group =>
                {
                    if (!tags.TryGetValue(group.Key, out var tag))
                    {
                        return null;
                    }

                    if (provenanceLookup is null)
                        return ForList(TagDtoMapping.MapTagDto(tag, favorites));

                    var isManual = group.Any(row => row.IsManual);
                    var isDerived = group.Any(row => row.IsDerived);
                    var provenance = provenanceLookup.GetValueOrDefault((hostGroup.Key, group.Key)) ?? [];
                    var canRemove = isManual && HasEditableDirectSource(provenance);
                    var durationSec = provenance
                        .Where(row => row.TotalDurationSec.HasValue)
                        .Select(row => row.TotalDurationSec!.Value)
                        .DefaultIfEmpty()
                        .Max();
                    var durationPercent = provenance
                        .Where(row => row.TotalDurationSec.HasValue && row.HostDurationSec.HasValue && row.HostDurationSec.Value > 0d)
                        .Select(row => row.TotalDurationSec!.Value * 100d / row.HostDurationSec!.Value)
                        .DefaultIfEmpty()
                        .Max();

                    return TagDtoMapping.MapTagDto(tag, favorites, provenance) with
                    {
                        IsDerived = isDerived && !canRemove,
                        CanRemove = canRemove,
                        // A locked, AI-derived chip is the only thing a user can "report as wrong":
                        // it has no editable manual source, so the global threshold is their only
                        // other lever. This flag tells the UI to surface the per-video correction.
                        CanReportIncorrect = isDerived && !canRemove,
                        EffectiveDurationSec = durationSec > 0d ? durationSec : null,
                        EffectiveDurationPercent = durationPercent > 0d ? durationPercent : null,
                    };
                })
                .Where(tag => tag != null)
                .Select(tag => tag!)
                .OrderForDisplay()
                .ToList();

            result[hostGroup.Key] = tagDtos;
        }

        return result;
    }

    // A list card shows a tag's name, colors, group and description; the tag's own display settings
    // (player bar, occurrence thresholds) and sort keys belong to the tag's pages and are left out of
    // every tag of every listed item. Unset fields are not serialized.
    private static TagDto ForList(TagDto tag)
        => tag with
        {
            ShowAsSegment = null,
            SegmentColorOverride = null,
            SegmentLaneOverride = null,
            MinOccurrenceSec = null,
            MinOccurrencePercent = null,
            CustomFields = null,
            TagGroupSortOrder = null,
            SortName = null,
        };

    private static async Task<Dictionary<(int HostId, int TagId), List<TagProvenanceDto>>> LoadProvenanceAsync(
        CoveContext db,
        AffinityHostType hostType,
        int[] ids,
        int[] tagIds,
        CancellationToken cancellationToken)
    {
        // Project to just the provenance fields rather than materializing whole TagApplication rows:
        // tag_applications is one of the largest tables in the database and carries a payload column
        // that nothing on this path reads.
        var provenanceRows = await db.TagApplications
            .AsNoTracking()
            .Where(application => application.HostType == hostType
                && ids.Contains(application.HostId)
                && tagIds.Contains(application.TagId))
            .OrderBy(application => application.SourceKey)
            .ThenBy(application => application.CreatedAt)
            .Select(application => new ProvenanceRow(
                application.HostId,
                application.TagId,
                application.SourceKey,
                application.SourceRunId,
                application.ModelKey,
                application.Confidence,
                application.CreatedAt,
                application.ContextType,
                application.ContextId,
                application.TotalDurationSec,
                application.HostDurationSec))
            .ToListAsync(cancellationToken);

        return provenanceRows
            .GroupBy(row => (row.HostId, row.TagId))
            .ToDictionary(
                group => group.Key,
                group => group.Select(MapProvenance).ToList());
    }

    private sealed record ProvenanceRow(
        int HostId,
        int TagId,
        string SourceKey,
        string SourceRunId,
        string ModelKey,
        float? Confidence,
        DateTime CreatedAt,
        string? ContextType,
        int? ContextId,
        double? TotalDurationSec,
        double? HostDurationSec);

    private static TagProvenanceDto MapProvenance(ProvenanceRow application)
        => new(
            application.SourceKey,
            string.IsNullOrWhiteSpace(application.SourceRunId) ? null : application.SourceRunId,
            string.IsNullOrWhiteSpace(application.ModelKey) ? null : application.ModelKey,
            application.Confidence,
            application.CreatedAt.ToString("o"),
            application.ContextType,
            application.ContextId,
            application.TotalDurationSec,
            application.HostDurationSec);

    private static bool HasEditableDirectSource(IReadOnlyCollection<TagProvenanceDto> provenance)
    {
        var hostLevelSources = provenance.Where(source => source.ContextType == null).ToArray();
        return hostLevelSources.Length == 0 || hostLevelSources.Any(source => !IsExtensionSource(source.SourceKey));
    }

    private static bool IsExtensionSource(string sourceKey)
        => SourceKeyConventions.IsExtensionSource(sourceKey);
}
