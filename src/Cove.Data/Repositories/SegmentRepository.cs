using System.Linq.Expressions;
using Cove.Core.Entities;
using Cove.Core.Interfaces;
using Cove.Data.Services;
using Microsoft.EntityFrameworkCore;

namespace Cove.Data.Repositories;

public class SegmentRepository : ISegmentRepository
{
    private readonly CoveContext _db;
    public SegmentRepository(CoveContext db) => _db = db;

    public async Task<IReadOnlyList<Segment>> FindAsync(SegmentFilter filter, CancellationToken ct = default)
    {
        var query = _db.Segments.AsQueryable();

        if (filter.HostType.HasValue)
            query = query.Where(s => s.HostType == filter.HostType.Value);
        if (filter.HostId.HasValue)
            query = query.Where(s => s.HostId == filter.HostId.Value);
        if (filter.SourceKey != null)
            query = query.Where(s => s.SourceKey == filter.SourceKey);
        if (filter.RefIds != null && filter.RefIds.Count > 0)
            query = query.Where(s => s.RefId.HasValue && filter.RefIds.Contains(s.RefId.Value));

        return await query.AsNoTracking().ToListAsync(ct);
    }

    public async Task<(IReadOnlyList<SegmentLibraryItem> Items, int TotalCount)> FindAsync(SegmentFilter? filter, FindFilter? findFilter, CancellationToken ct = default)
    {
        using var relativeDates = RelativeDateEvaluation.Begin();
        filter ??= new SegmentFilter();
        findFilter ??= new FindFilter();
        var page = Math.Max(findFilter.Page, 1);
        // PerPage of 0 or less means count only, as the video repository treats it.
        var perPage = Math.Clamp(findFilter.PerPage, 0, ListPaging.MaxPerPage);

        var library = await BuildLibraryQueryAsync(filter, findFilter.Q, ct);
        var totalCount = await library.CountAsync(ct);
        if (perPage == 0)
            return ([], totalCount);

        // The segment list has a single sort key; a multi-sort request falls back to its first clause.
        var primarySort = findFilter.Sorts?.FirstOrDefault();
        var sort = NormalizeSort(primarySort?.Key ?? findFilter.Sort);
        var descending = primarySort?.Direction == Core.Enums.SortDirection.Desc
            || (primarySort is null && findFilter.Direction == Core.Enums.SortDirection.Desc);

        var items = await ApplyOrdering(library.Query, sort, descending, findFilter.Seed)
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .ToListAsync(ct);
        return (items, totalCount);
    }

    public async Task<SegmentAggregate> AggregateAsync(SegmentFilter? filter, FindFilter? findFilter, CancellationToken ct = default)
    {
        using var relativeDates = RelativeDateEvaluation.Begin();
        var library = await BuildLibraryQueryAsync(filter ?? new SegmentFilter(), findFilter?.Q, ct);
        var count = await library.CountAsync(ct);
        var duration = await library.Query.SumAsync(
            item => Math.Max(0, (item.Segment.EndSec ?? item.Segment.StartSec) - item.Segment.StartSec),
            ct);
        return new SegmentAggregate(count, duration);
    }

    /// <summary>
    /// The filtered library query. Segment-only predicates are applied to a bare Segments query BEFORE
    /// the display joins are added. The joins (video/tag/face/performer) exist purely to decorate the
    /// returned page, but when they sit underneath the filter chain the COUNT has to drag all five of
    /// them across every matching row — on a multi-million-row segments table that costs seconds.
    /// Filtering first lets the unfiltered COUNT run against segments alone.
    /// </summary>
    private async Task<LibraryQuery> BuildLibraryQueryAsync(SegmentFilter filter, string? q, CancellationToken ct)
    {
        var db = _db;
        // The library lists video-hosted segments unless a caller asks for another host type.
        var hostType = filter.HostType ?? SegmentHostType.Video;
        var segmentQuery = db.Segments.AsNoTracking().Where(segment => segment.HostType == hostType);

        if (filter.Ids is { Count: > 0 } ids)
            segmentQuery = segmentQuery.Where(segment => ids.Contains(segment.Id));
        if (filter.ExcludeIds is { Count: > 0 } excludeIds)
            segmentQuery = segmentQuery.Where(segment => !excludeIds.Contains(segment.Id));

        if (filter.HostId.HasValue)
            segmentQuery = segmentQuery.Where(segment => segment.HostId == filter.HostId.Value);
        else if (filter.VideoIds is { Count: > 0 } videoIds)
            segmentQuery = segmentQuery.Where(segment => videoIds.Contains(segment.HostId));
        if (filter.ExcludeVideoIds is { Count: > 0 } excludeVideoIds)
            segmentQuery = segmentQuery.Where(segment => !excludeVideoIds.Contains(segment.HostId));
        if (filter.VideosCriterion?.Value is { Count: > 0 } criterionVideoIds)
            segmentQuery = segmentQuery.Where(segment => criterionVideoIds.Contains(segment.HostId));
        if (filter.VideosCriterion?.Excludes is { Count: > 0 } criterionExcludedVideoIds)
            segmentQuery = segmentQuery.Where(segment => !criterionExcludedVideoIds.Contains(segment.HostId));

        var videoTagIds = await ExpandTagIdsAsync(filter.VideoTagIds, filter.VideoTagDepth, ct);
        if (filter.VideoTagsCriterion is { } videoTagsCriterion)
            videoTagIds = [.. videoTagIds, .. await ExpandTagIdsAsync(videoTagsCriterion.Value, videoTagsCriterion.Depth, ct)];
        if (videoTagIds.Count > 0)
        {
            var effectiveVideoTags = EffectiveHostTagQuery.ForHostType(db, AffinityHostType.Video);
            segmentQuery = segmentQuery.Where(segment => effectiveVideoTags.Any(tag => tag.HostId == segment.HostId && videoTagIds.Contains(tag.TagId)));
        }

        var tagIds = await ExpandTagIdsAsync(filter.TagIds, filter.TagDepth, ct);
        if (tagIds.Count > 0)
            segmentQuery = segmentQuery.Where(segment => segment.TagId.HasValue && tagIds.Contains(segment.TagId.Value));
        if (filter.TagsCriterion is { } tagsCriterion)
        {
            // A segment carries one tag, so the tags criterion is the single-id case the studio helper covers.
            var expandedTags = HierarchicalCriterionExpander.RequiresExpansion(tagsCriterion)
                ? await HierarchicalCriterionExpander.ExpandTagsAsync(db, tagsCriterion, ct)
                : null;
            segmentQuery = FilterHelpers.ApplyStudioCriterion(segmentQuery, expandedTags?.Criterion ?? tagsCriterion, segment => segment.TagId, expandedTags?.ValueGroups, expandedTags?.RequiredIdGroups);
        }

        if (filter.SourceKey != null)
            segmentQuery = segmentQuery.Where(segment => segment.SourceKey == filter.SourceKey);
        segmentQuery = FilterHelpers.ApplyString(segmentQuery, filter.SourceKeyCriterion, segment => segment.SourceKey);
        segmentQuery = FilterHelpers.ApplyString(segmentQuery, filter.KindCriterion, segment => segment.Kind);

        if (!string.IsNullOrWhiteSpace(filter.SourceCategory))
        {
            segmentQuery = filter.SourceCategory.Trim().ToLowerInvariant() switch
            {
                "extensions" => segmentQuery.Where(segment => segment.SourceKey.StartsWith("ext:")),
                "user" => segmentQuery.Where(segment => segment.SourceKey == "user"),
                _ => segmentQuery,
            };
        }

        if (filter.RefIds is { Count: > 0 } refIds)
            segmentQuery = segmentQuery.Where(segment => segment.RefId.HasValue
                && refIds.Contains(segment.RefId.Value)
                && segment.Kind != null
                && segment.Kind.ToLower() == "face");
        if (filter.FacesCriterion?.Value is { Count: > 0 } faceIds)
        {
            var faceRefIds = faceIds.Select(id => (long)id).ToList();
            segmentQuery = segmentQuery.Where(segment => segment.RefId.HasValue
                && faceRefIds.Contains(segment.RefId.Value)
                && segment.Kind != null
                && segment.Kind.ToLower() == "face");
        }
        if (filter.FacesCriterion?.Excludes is { Count: > 0 } excludedFaceIds)
        {
            var excludedFaceRefIds = excludedFaceIds.Select(id => (long)id).ToList();
            segmentQuery = segmentQuery.Where(segment => !(segment.RefId.HasValue
                && excludedFaceRefIds.Contains(segment.RefId.Value)
                && segment.Kind != null
                && segment.Kind.ToLower() == "face"));
        }

        if (filter.Tagged.HasValue)
            segmentQuery = filter.Tagged.Value
                ? segmentQuery.Where(segment => segment.TagId != null)
                : segmentQuery.Where(segment => segment.TagId == null);

        if (filter.MinConfidence.HasValue)
            segmentQuery = segmentQuery.Where(segment => segment.Confidence.HasValue && segment.Confidence.Value >= filter.MinConfidence.Value);
        segmentQuery = FilterHelpers.ApplyNullableDouble(segmentQuery, filter.ConfidenceCriterion, segment => (double?)segment.Confidence);

        if (filter.MinDurationSec.HasValue)
            segmentQuery = segmentQuery.Where(segment => ((segment.EndSec ?? segment.StartSec) - segment.StartSec) >= filter.MinDurationSec.Value);
        segmentQuery = FilterHelpers.ApplyDouble(segmentQuery, filter.DurationCriterion, segment => (segment.EndSec ?? segment.StartSec) - segment.StartSec);

        segmentQuery = FilterHelpers.ApplyString(segmentQuery, filter.TitleCriterion, segment => segment.Title);
        segmentQuery = FilterHelpers.ApplyString(segmentQuery, filter.SourceRunIdCriterion, segment => segment.SourceRunId);
        segmentQuery = FilterHelpers.ApplyString(segmentQuery, filter.ColorHintCriterion, segment => segment.ColorHint);
        segmentQuery = FilterHelpers.ApplyBool(segmentQuery, filter.HasImageCriterion, segment => segment.ImageBlobId != null && segment.ImageBlobId != string.Empty);
        segmentQuery = FilterHelpers.ApplyBool(segmentQuery, filter.HasPayloadCriterion, segment => segment.Payload != null);
        segmentQuery = FilterHelpers.ApplyDouble(segmentQuery, filter.StartSecCriterion, segment => segment.StartSec);
        segmentQuery = FilterHelpers.ApplyDouble(segmentQuery, filter.EndSecCriterion, segment => segment.EndSec ?? segment.StartSec);
        segmentQuery = FilterHelpers.ApplyTimestamp(segmentQuery, filter.CreatedAtCriterion, segment => segment.CreatedAt);
        segmentQuery = FilterHelpers.ApplyTimestamp(segmentQuery, filter.UpdatedAtCriterion, segment => segment.UpdatedAt);

        // Now add the display joins. Every join key is the target table's primary key, so none of them
        // can fan out a segment into multiple rows — the row count of `query` equals the row count of
        // `segmentQuery` restricted to segments whose host video still exists.
        var query =
            from segment in segmentQuery
            join video in db.Videos.AsNoTracking() on segment.HostId equals video.Id
            join tag in db.Tags.AsNoTracking() on segment.TagId equals tag.Id into tagJoin
            from tag in tagJoin.DefaultIfEmpty()
            join face in db.Faces.AsNoTracking() on segment.RefId equals (long?)face.Id into faceJoin
            from face in faceJoin.DefaultIfEmpty()
            join facePerformer in db.Performers.AsNoTracking() on face!.PerformerId equals (int?)facePerformer.Id into facePerformerJoin
            from facePerformer in facePerformerJoin.DefaultIfEmpty()
            join directPerformer in db.Performers.AsNoTracking() on segment.RefId equals (long?)directPerformer.Id into directPerformerJoin
            from directPerformer in directPerformerJoin.DefaultIfEmpty()
            select new SegmentLibraryItem
            {
                Segment = segment,
                VideoTitle = video.Title,
                TagName = tag != null ? tag.Name : null,
                RefLabel = face != null ? (facePerformer != null ? facePerformer!.Name : face.Label) : segment.Kind != null && segment.Kind!.ToLower() == "performer" && directPerformer != null ? directPerformer!.Name : null,
                FaceId = face != null ? face!.Id : null,
                FacePerformerId = facePerformer != null ? facePerformer!.Id : null,
                DirectPerformerId = segment.Kind != null && segment.Kind!.ToLower() == "performer" && directPerformer != null ? directPerformer!.Id : null,
                PerformerId = segment.Kind != null && segment.Kind!.ToLower() == "performer" && directPerformer != null ? directPerformer!.Id : facePerformer != null ? facePerformer!.Id : null,
                PerformerName = segment.Kind != null && segment.Kind!.ToLower() == "performer" && directPerformer != null ? directPerformer!.Name : facePerformer != null ? facePerformer!.Name : null,
            };

        // The filters below read joined columns, so they can only be applied after the join and they
        // force the COUNT onto the joined query.
        var requiresJoinedCount = false;

        if (filter.VideoTitleCriterion is not null)
        {
            query = FilterHelpers.ApplyString(query, filter.VideoTitleCriterion, item => item.VideoTitle);
            requiresJoinedCount = true;
        }

        var performerIds = (filter.PerformerIds ?? []).Concat(filter.PerformersCriterion?.Value ?? []).Where(id => id > 0).Distinct().ToList();
        if (performerIds.Count > 0)
        {
            query = query.Where(item =>
                (item.DirectPerformerId.HasValue && performerIds.Contains(item.DirectPerformerId.Value)) ||
                (item.FacePerformerId.HasValue && performerIds.Contains(item.FacePerformerId.Value)));
            requiresJoinedCount = true;
        }
        if (filter.PerformersCriterion?.Excludes is { Count: > 0 } excludedPerformerIds)
        {
            query = query.Where(item =>
                !(item.DirectPerformerId.HasValue && excludedPerformerIds.Contains(item.DirectPerformerId.Value)) &&
                !(item.FacePerformerId.HasValue && excludedPerformerIds.Contains(item.FacePerformerId.Value)));
            requiresJoinedCount = true;
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            requiresJoinedCount = true;
            var normalizedTerm = q.Trim().ToLowerInvariant();
            query = query.Where(item =>
                (item.Segment.Title != null && item.Segment.Title.ToLower().Contains(normalizedTerm)) ||
                (item.Segment.Kind != null && item.Segment.Kind.ToLower().Contains(normalizedTerm)) ||
                (item.TagName != null && item.TagName.ToLower().Contains(normalizedTerm)) ||
                (item.Segment.TagId.HasValue && db.Set<TagAlias>().Any(alias => alias.TagId == item.Segment.TagId.Value && alias.Alias.ToLower().Contains(normalizedTerm))) ||
                (item.RefLabel != null && item.RefLabel.ToLower().Contains(normalizedTerm)) ||
                (item.PerformerName != null && item.PerformerName.ToLower().Contains(normalizedTerm)) ||
                (item.FacePerformerId.HasValue && db.Set<PerformerAlias>().Any(alias => alias.PerformerId == item.FacePerformerId.Value && alias.Alias.ToLower().Contains(normalizedTerm))) ||
                (item.DirectPerformerId.HasValue && db.Set<PerformerAlias>().Any(alias => alias.PerformerId == item.DirectPerformerId.Value && alias.Alias.ToLower().Contains(normalizedTerm))) ||
                (item.VideoTitle != null && item.VideoTitle.ToLower().Contains(normalizedTerm)) ||
                item.Segment.SourceKey.ToLower().Contains(normalizedTerm));
        }

        return new LibraryQuery(query, segmentQuery, requiresJoinedCount, db);
    }

    /// <summary>Flat tag ids, with the descendants of each tag added when the depth asks for them.</summary>
    private async Task<List<int>> ExpandTagIdsAsync(IReadOnlyList<int>? tagIds, int? depth, CancellationToken ct)
    {
        var ids = (tagIds ?? []).Where(id => id > 0).Distinct().ToList();
        if (ids.Count == 0 || depth != -1)
            return ids;

        var expanded = await HierarchicalCriterionExpander.ExpandTagsAsync(_db,
            new MultiIdCriterion { Value = ids, Modifier = CriterionModifier.Includes, Depth = -1 }, ct);
        return expanded.Criterion.Value.ToList();
    }

    private static string NormalizeSort(string? sort)
        => string.IsNullOrWhiteSpace(sort) ? "updated_at" : sort.Trim().ToLowerInvariant();

    private static IOrderedQueryable<SegmentLibraryItem> ApplyOrdering(IQueryable<SegmentLibraryItem> query, string sort, bool descending, int? seed)
    {
        return sort switch
        {
            "random" => (IOrderedQueryable<SegmentLibraryItem>)SeededRandomOrdering.OrderBy(query, seed, item => item.Segment.Id, descending),
            "created_at" => OrderBy(query, item => item.Segment.CreatedAt, descending),
            "start_sec" => OrderBy(query, item => item.Segment.StartSec, descending),
            "end_sec" => OrderBy(query, item => item.Segment.EndSec ?? item.Segment.StartSec, descending),
            "duration" => OrderBy(query, item => (item.Segment.EndSec ?? item.Segment.StartSec) - item.Segment.StartSec, descending),
            "confidence" => OrderBy(query, item => item.Segment.Confidence ?? -1f, descending),
            "title" => OrderBy(query, item => NaturalSort.Key(item.Segment.Title ?? item.Segment.Kind ?? item.TagName ?? string.Empty), descending),
            "video_title" => OrderBy(query, item => NaturalSort.Key(item.VideoTitle ?? string.Empty), descending),
            "kind" => OrderBy(query, item => NaturalSort.Key(item.Segment.Kind ?? string.Empty), descending),
            "source_key" => OrderBy(query, item => NaturalSort.Key(item.Segment.SourceKey), descending),
            "tag_name" => OrderBy(query, item => NaturalSort.Key(item.TagName ?? string.Empty), descending),
            "performer" => OrderBy(query, item => NaturalSort.Key(item.PerformerName ?? string.Empty), descending),
            "ref" => OrderBy(query, item => NaturalSort.Key(item.RefLabel ?? item.PerformerName ?? string.Empty), descending),
            _ => OrderBy(query, item => item.Segment.UpdatedAt, descending),
        };
    }

    private static IOrderedQueryable<SegmentLibraryItem> OrderBy<T>(
        IQueryable<SegmentLibraryItem> query,
        Expression<Func<SegmentLibraryItem, T>> keySelector,
        bool descending)
    {
        return descending
            ? query.OrderByDescending(keySelector).ThenByDescending(item => item.Segment.Id)
            : query.OrderBy(keySelector).ThenBy(item => item.Segment.Id);
    }

    /// <summary>
    /// The joined library query plus what the count needs. When no join-dependent filter is active the
    /// joins cannot change the row count, so the COUNT runs against segments alone with an existence
    /// check standing in for the inner join to videos. That is the difference between a multi-second
    /// count and a single index scan on large libraries.
    /// </summary>
    private sealed record LibraryQuery(IQueryable<SegmentLibraryItem> Query, IQueryable<Segment> SegmentQuery, bool RequiresJoinedCount, CoveContext Db)
    {
        public Task<int> CountAsync(CancellationToken ct)
            => RequiresJoinedCount
                ? Query.CountAsync(ct)
                : SegmentQuery.Where(segment => Db.Videos.Any(video => video.Id == segment.HostId)).CountAsync(ct);
    }

    public void Add(Segment segment) => _db.Segments.Add(segment);

    public void RemoveRange(IEnumerable<Segment> segments) => _db.Segments.RemoveRange(segments);

    public async Task UpdateRefIdAsync(string sourceKey, IReadOnlyList<long> oldRefIds, long newRefId, CancellationToken ct = default)
    {
        // Tracked update (not ExecuteUpdate) so it works on any provider and commits with the
        // caller's SaveChangesAsync alongside the rest of a face merge.
        var segments = await _db.Segments
            .Where(s => s.SourceKey == sourceKey && s.RefId.HasValue && oldRefIds.Contains(s.RefId!.Value))
            .ToListAsync(ct);
        foreach (var segment in segments)
            segment.RefId = newRefId;
    }

    public async Task ReassignRefByRunAsync(string sourceKey, long oldRefId, IReadOnlyCollection<string> runIds, long newRefId, CancellationToken ct = default)
    {
        if (runIds.Count == 0)
            return;

        var segments = await _db.Segments
            .Where(s => s.SourceKey == sourceKey && s.RefId == oldRefId && s.SourceRunId != null && runIds.Contains(s.SourceRunId))
            .ToListAsync(ct);
        foreach (var segment in segments)
            segment.RefId = newRefId;
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
