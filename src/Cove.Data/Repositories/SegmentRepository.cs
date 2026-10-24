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

        if (!library.RequiresJoinedCount && ApplySegmentOrdering(library, sort, descending, findFilter.Seed) is { } segmentOrder)
            return (await FindPageBySegmentOrderAsync(library, segmentOrder, page, perPage, ct), totalCount);

        var items = await ApplyOrdering(library.Query, sort, descending, findFilter.Seed)
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .ToListAsync(ct);
        return (items, totalCount);
    }

    /// <summary>
    /// The page for a sort that needs at most one display join: the page's ids are picked from the
    /// segments (plus that join) and only those rows get every display join. Ordering the fully joined
    /// query instead makes PostgreSQL join every matching segment to faces and performers before it can
    /// sort, which on millions of rows is a multi-gigabyte on-disk sort for a page of 24.
    /// </summary>
    private static async Task<IReadOnlyList<SegmentLibraryItem>> FindPageBySegmentOrderAsync(
        LibraryQuery library, IQueryable<Segment> segmentOrder, int page, int perPage, CancellationToken ct)
    {
        var pageIds = await segmentOrder
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .Select(segment => segment.Id)
            .ToListAsync(ct);
        if (pageIds.Count == 0)
            return [];

        var rows = await library.Query.Where(item => pageIds.Contains(item.Segment.Id)).ToListAsync(ct);
        var position = pageIds.Select((id, index) => (id, index)).ToDictionary(entry => entry.id, entry => entry.index);
        return [.. rows.OrderBy(item => position[item.Segment.Id])];
    }

    public async Task<SegmentAggregate> AggregateAsync(SegmentFilter? filter, FindFilter? findFilter, CancellationToken ct = default)
    {
        using var relativeDates = RelativeDateEvaluation.Begin();
        var library = await BuildLibraryQueryAsync(filter ?? new SegmentFilter(), findFilter?.Q, ct);
        var count = await library.CountAsync(ct);
        var duration = await library.DurationSumAsync(ct);
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

        // A segment belongs to a performer through its face (RefId is a face of theirs) or directly (a
        // "performer" segment whose RefId is the performer) — the joins' FacePerformerId and
        // DirectPerformerId. Resolving those ref ids first keeps the filter on the bare segments.
        var performerIds = (filter.PerformerIds ?? []).Concat(filter.PerformersCriterion?.Value ?? []).Where(id => id > 0).Distinct().ToList();
        if (performerIds.Count > 0)
        {
            var (faceRefIds, performerRefIds) = await LoadPerformerRefIdsAsync(performerIds, ct);
            segmentQuery = segmentQuery.Where(segment => segment.RefId.HasValue
                && (faceRefIds.Contains(segment.RefId.Value)
                    || (performerRefIds.Contains(segment.RefId.Value) && segment.Kind != null && segment.Kind.ToLower() == "performer")));
        }
        if (filter.PerformersCriterion?.Excludes is { Count: > 0 } excludedPerformerIds)
        {
            var (faceRefIds, performerRefIds) = await LoadPerformerRefIdsAsync(excludedPerformerIds, ct);
            segmentQuery = segmentQuery.Where(segment => !(segment.RefId.HasValue
                && (faceRefIds.Contains(segment.RefId.Value)
                    || (performerRefIds.Contains(segment.RefId.Value) && segment.Kind != null && segment.Kind.ToLower() == "performer"))));
        }

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

    /// <summary>
    /// The segment ref ids that resolve to these performers through the library joins: the readable faces
    /// assigned to a readable one of them, and the readable performers themselves.
    /// </summary>
    private async Task<(List<long> FaceRefIds, List<long> PerformerRefIds)> LoadPerformerRefIdsAsync(IReadOnlyCollection<int> performerIds, CancellationToken ct)
    {
        var performerRefIds = await _db.Performers.AsNoTracking()
            .Where(performer => performerIds.Contains(performer.Id))
            .Select(performer => (long)performer.Id)
            .ToListAsync(ct);
        var faceRefIds = await _db.Faces.AsNoTracking()
            .Where(face => face.PerformerId.HasValue
                && performerIds.Contains(face.PerformerId.Value)
                && _db.Performers.Any(performer => performer.Id == face.PerformerId))
            .Select(face => (long)face.Id)
            .ToListAsync(ct);
        return (faceRefIds, performerRefIds);
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

    /// <summary>
    /// The sorts that need at most one display join, ordered exactly as <see cref="ApplyOrdering"/> orders
    /// them; null for the performer sorts, which read the face and performer joins.
    /// </summary>
    private static IQueryable<Segment>? ApplySegmentOrdering(LibraryQuery library, string sort, bool descending, int? seed)
    {
        var query = library.ExistingSegments;
        var db = library.Db;
        var withTagName =
            from segment in query
            join tag in db.Tags.AsNoTracking() on segment.TagId equals tag.Id into tagJoin
            from tag in tagJoin.DefaultIfEmpty()
            select new SegmentSortRow { Segment = segment, JoinedName = tag != null ? tag.Name : null };
        var withVideoTitle =
            from segment in library.SegmentQuery
            join video in db.Videos.AsNoTracking() on segment.HostId equals video.Id
            select new SegmentSortRow { Segment = segment, JoinedName = video.Title };

        return sort switch
        {
            "random" => SeededRandomOrdering.OrderBy(query, seed, segment => segment.Id, descending),
            "created_at" => OrderSegmentsBy(query, segment => segment.CreatedAt, descending),
            "start_sec" => OrderSegmentsBy(query, segment => segment.StartSec, descending),
            "end_sec" => OrderSegmentsBy(query, segment => segment.EndSec ?? segment.StartSec, descending),
            "duration" => OrderSegmentsBy(query, segment => (segment.EndSec ?? segment.StartSec) - segment.StartSec, descending),
            "confidence" => OrderSegmentsBy(query, segment => segment.Confidence ?? -1f, descending),
            "kind" => OrderSegmentsBy(query, segment => NaturalSort.Key(segment.Kind ?? string.Empty), descending),
            "source_key" => OrderSegmentsBy(query, segment => NaturalSort.Key(segment.SourceKey), descending),
            "title" => OrderSortRowsBy(withTagName, row => NaturalSort.Key(row.Segment.Title ?? row.Segment.Kind ?? row.JoinedName ?? string.Empty), descending),
            "video_title" => OrderSortRowsBy(withVideoTitle, row => NaturalSort.Key(row.JoinedName ?? string.Empty), descending),
            "tag_name" => OrderSortRowsBy(withTagName, row => NaturalSort.Key(row.JoinedName ?? string.Empty), descending),
            "performer" or "ref" => null,
            _ => OrderSegmentsBy(query, segment => segment.UpdatedAt, descending),
        };
    }

    private static IQueryable<Segment> OrderSortRowsBy<T>(IQueryable<SegmentSortRow> rows, Expression<Func<SegmentSortRow, T>> keySelector, bool descending)
        => (descending
                ? rows.OrderByDescending(keySelector).ThenByDescending(row => row.Segment.Id)
                : rows.OrderBy(keySelector).ThenBy(row => row.Segment.Id))
            .Select(row => row.Segment);

    /// <summary>A segment with the one joined name its sort reads.</summary>
    private sealed class SegmentSortRow
    {
        public required Segment Segment { get; init; }
        public string? JoinedName { get; init; }
    }

    private static IOrderedQueryable<Segment> OrderSegmentsBy<T>(IQueryable<Segment> query, Expression<Func<Segment, T>> keySelector, bool descending)
        => descending
            ? query.OrderByDescending(keySelector).ThenByDescending(segment => segment.Id)
            : query.OrderBy(keySelector).ThenBy(segment => segment.Id);

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
        /// <summary>
        /// The filtered segments whose host video exists — the same rows as <see cref="Query"/> while
        /// no join-dependent filter is active, without the display joins.
        /// </summary>
        public IQueryable<Segment> ExistingSegments
            => SegmentQuery.Where(segment => Db.Videos.Any(video => video.Id == segment.HostId));

        public Task<int> CountAsync(CancellationToken ct)
            => RequiresJoinedCount ? Query.CountAsync(ct) : ExistingSegments.CountAsync(ct);

        // Same reasoning as the count: without a join-dependent filter the sum only needs the segments.
        public Task<double> DurationSumAsync(CancellationToken ct)
            => RequiresJoinedCount
                ? Query.SumAsync(item => Math.Max(0, (item.Segment.EndSec ?? item.Segment.StartSec) - item.Segment.StartSec), ct)
                : ExistingSegments.SumAsync(segment => Math.Max(0, (segment.EndSec ?? segment.StartSec) - segment.StartSec), ct);
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
