using System.Linq.Expressions;
using Cove.Core.Entities;
using Cove.Core.Enums;
using Cove.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Cove.Data.Repositories;

public class FaceRepository : IFaceRepository
{
    // The faces list caps a page at 250 like the other entity lists.
    private const int MaxPerPage = 250;

    private readonly CoveContext _db;
    public FaceRepository(CoveContext db) => _db = db;

    public async Task<(IReadOnlyList<Face> Items, int TotalCount)> FindAsync(FaceFilter? filter, FindFilter? findFilter, CancellationToken ct = default)
    {
        using var relativeDates = RelativeDateEvaluation.Begin();
        filter ??= new FaceFilter();
        var search = findFilter?.Q;
        var sort = findFilter?.Sort;
        var descending = findFilter?.Direction == SortDirection.Desc;

        // The list always renders the linked performer, so the navigation is included regardless of
        // FaceFilter.IncludePerformer.
        var baseQuery = _db.Faces
            .AsNoTracking()
            .Include(face => face.Performer)
            .AsQueryable();

        var query = FullTextSearchHelpers.Apply(_db, baseQuery, search,
            face => face.Label,
            face => face.PrimarySourceKey,
            face => face.SearchText,
            face => face.Performer != null ? face.Performer.Name : null);

        // Postgres full-text matches only the face's own SearchVector, which does not include a *linked*
        // performer's name — so a search by performer name wouldn't surface that performer's faces (and
        // the merge dialog, which searches faces the same way, couldn't find a face by who it's linked
        // to). Union linked performer name/alias matches, mirroring how video search includes performers.
        var faceSearchTerm = search?.Trim();
        if (!string.IsNullOrWhiteSpace(faceSearchTerm))
        {
            var performerTerm = faceSearchTerm.ToLowerInvariant();
            query = query.Concat(baseQuery.Where(face => face.Performer != null && (
                    face.Performer.Name.ToLower().Contains(performerTerm)
                    || face.Performer.Aliases.Any(alias => alias.Alias.ToLower().Contains(performerTerm)))))
                .Distinct();
        }

        if (filter.PrimarySourceKeys != null && filter.PrimarySourceKeys.Count > 0)
            query = query.Where(face => face.PrimarySourceKey != null && filter.PrimarySourceKeys.Contains(face.PrimarySourceKey));
        if (filter.Ids != null && filter.Ids.Count > 0)
            query = query.Where(face => filter.Ids.Contains(face.Id));
        if (filter.HasPerformer.HasValue)
            query = filter.HasPerformer.Value
                ? query.Where(face => face.PerformerId != null)
                : query.Where(face => face.PerformerId == null);
        if (filter.Ignored.HasValue)
            query = query.Where(face => face.Ignored == filter.Ignored.Value);

        if (filter.PerformerId.HasValue)
            query = query.Where(face => face.PerformerId == filter.PerformerId.Value);

        // The single-FK multi-id helper: a face links to at most one performer.
        query = FilterHelpers.ApplyStudioCriterion(query, filter.PerformersCriterion, face => face.PerformerId);
        query = FilterHelpers.ApplyBool(query, filter.LinkedCriterion, face => face.PerformerId != null);
        query = FilterHelpers.ApplyBool(query, filter.IgnoredCriterion, face => face.Ignored);

        // A merged face is absorbed into its surviving target, so it must never surface in the faces list
        // — regardless of IsMerged / MergedIntoFaceId. Otherwise a cluster appears twice (the merged
        // "loser" plus its target) and per-performer counts/numbering look wrong. The tombstone row is
        // retained only for AI re-scan redirect and un-merge; it is intentionally invisible to the list.
        query = query.Where(face => face.MergedIntoFaceId == null);

        query = FilterHelpers.ApplyString(query, filter.LabelCriterion, face => face.Label);
        query = FilterHelpers.ApplyString(query, filter.PrimarySourceKeyCriterion, face => face.PrimarySourceKey);
        query = FaceQueryHelpers.ApplyAppearancePathCriterion(_db, query, filter.PathCriterion);
        query = FilterHelpers.ApplyInt(query, filter.DetectionCountCriterion, face => face.DetectionCount);
        query = FilterHelpers.ApplyInt(query, filter.AppearanceCountCriterion, face => face.AppearanceCount);
        query = FilterHelpers.ApplyInt(query, filter.FrameSampleCountCriterion, face => face.FrameSampleCount);
        query = FilterHelpers.ApplyInt(query, filter.VideoCountCriterion, face => face.VideoCount);
        query = FilterHelpers.ApplyInt(query, filter.ImageCountCriterion, face => face.ImageCount);
        query = query.ApplyCustomFieldCriteria(_db, CustomFieldEntityTypes.Face, null, filter.CustomFieldCriteria);
        query = FilterHelpers.ApplyBool(query, filter.HasCoverCriterion, face => face.CoverBlobId != null && face.CoverBlobId != "");

        var hasTopSuggestionFilter = filter.MinSuggestionConfidence.HasValue
            || filter.SuggestionConfidenceCriterion != null
            || filter.TopSuggestionPerformersCriterion != null;
        if (hasTopSuggestionFilter)
        {
            // Suggestion confidence and suggested-performer are filtered and sorted directly on the
            // materialized Face.TopSuggestion* columns, so this stays an indexed, paginated SQL query
            // no matter how many unlinked faces exist. (This branch previously loaded every matching
            // face and computed suggestions for all of them on the request thread — the O(N) cost.)

            // Only unlinked faces carry a materialized suggestion.
            var suggestionQuery = query.Where(face => face.PerformerId == null && face.TopSuggestionPerformerId != null);

            // The materialized columns hold the *global* top suggestion, so a face whose cached top this
            // user has already decided on (rejected/accepted) no longer shows that performer — see
            // FacesController.ResolveDecidedTopSuggestionsAsync. Filtering and sorting those faces on the
            // stored value would contradict the suggestion the row actually renders, so keep them out.
            if (_db.CurrentPrincipalForReadOptimization?.UserId is int decisionUserId)
                suggestionQuery = suggestionQuery.Where(face => !_db.FaceSuggestionDecisions.Any(decision =>
                    decision.FaceId == face.Id
                    && decision.UserId == decisionUserId
                    && decision.PerformerId == face.TopSuggestionPerformerId));

            suggestionQuery = FilterHelpers.ApplyStudioCriterion(suggestionQuery, filter.TopSuggestionPerformersCriterion, face => face.TopSuggestionLocalPerformerId);

            if (filter.MinSuggestionConfidence.HasValue)
            {
                var min = NormalizeConfidenceThreshold((float)filter.MinSuggestionConfidence.Value);
                suggestionQuery = suggestionQuery.Where(face => face.TopSuggestionConfidence >= min);
            }

            suggestionQuery = ApplyStoredConfidenceCriterion(suggestionQuery, filter.SuggestionConfidenceCriterion);

            var sortedFiltered = IsSuggestionConfidenceSort(sort)
                ? suggestionQuery
                    .OrderByDescending(face => face.TopSuggestionConfidence ?? -1f)
                    .ThenByDescending(face => face.UpdatedAt)
                    .ThenBy(face => face.Id)
                : ApplyFaceSort(_db, suggestionQuery, sort, descending, findFilter?.Seed);

            return await PageAsync(sortedFiltered, findFilter, ct);
        }

        // sort=suggestion_confidence orders by the stored TopSuggestionConfidence (see ApplyFaceSort), so
        // the page is paginated in SQL and the top suggestion is read straight off the materialized
        // columns — no per-request suggestion compute.
        var sortedQuery = FullTextSearchHelpers.ShouldOrderByRelevance(_db, search, sort)
            ? FullTextSearchHelpers.OrderByRelevance(_db, query, search)
            : ApplyFaceSort(_db, query, sort, descending, findFilter?.Seed);

        return await PageAsync(sortedQuery, findFilter, ct);
    }

    private static async Task<(IReadOnlyList<Face> Items, int TotalCount)> PageAsync(IQueryable<Face> sortedQuery, FindFilter? findFilter, CancellationToken ct)
    {
        var perPage = findFilter?.PerPage ?? 25;

        // Short-circuit for count-only requests (perPage <= 0)
        if (perPage <= 0)
            return (Array.Empty<Face>(), await sortedQuery.CountAsync(ct));

        perPage = Math.Min(perPage, MaxPerPage);
        var page = Math.Max(findFilter?.Page ?? 1, 1);
        var totalCount = await sortedQuery.CountAsync(ct);
        var items = await sortedQuery
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    private static IQueryable<Face> ApplyFaceSort(CoveContext db, IQueryable<Face> query, string? sort, bool descending, int? seed = null)
    {
        var rawSort = (sort ?? string.Empty).Trim();
        if (FilterHelpers.TryParseCustomFieldSort(rawSort, out _, out _))
            return query.ApplyCustomFieldSort(db, CustomFieldEntityTypes.Face, rawSort, descending);

        var normalized = rawSort.ToLowerInvariant();

        // Back-compat: older clients baked the direction into the sort key (e.g. "video_count_desc",
        // "label_asc"). Strip the trailing direction suffix and let it drive the descending flag so the
        // single-key sorts + the shared asc/desc toggle behave the same as every other list in the app.
        if (normalized.EndsWith("_asc", StringComparison.Ordinal))
        {
            normalized = normalized[..^"_asc".Length];
            descending = false;
        }
        else if (normalized.EndsWith("_desc", StringComparison.Ordinal))
        {
            normalized = normalized[..^"_desc".Length];
            descending = true;
        }

        return normalized switch
        {
            "label" => OrderFacesBy(query, face => NaturalSort.Key(face.Label ?? (face.Performer != null ? face.Performer.Name : string.Empty)), descending),
            "performer_name" => descending
                ? query.OrderByDescending(face => NaturalSort.Key(face.Performer != null ? face.Performer.Name : string.Empty)).ThenByDescending(face => NaturalSort.Key(face.Label)).ThenByDescending(face => face.Id)
                : query.OrderBy(face => NaturalSort.Key(face.Performer != null ? face.Performer.Name : string.Empty)).ThenBy(face => NaturalSort.Key(face.Label)).ThenBy(face => face.Id),
            "primary_source_key" => OrderFacesBy(query, face => face.PrimarySourceKey ?? string.Empty, descending),
            "ignored" => OrderFacesBy(query, face => face.Ignored, descending),
            "merged" => OrderFacesBy(query, face => face.MergedIntoFaceId != null, descending),
            "cover_present" => OrderFacesBy(query, face => face.CoverBlobId != null && face.CoverBlobId != string.Empty, descending),
            "detection_count" => OrderFacesBy(query, face => face.DetectionCount, descending),
            "appearance_count" => OrderFacesBy(query, face => face.AppearanceCount, descending),
            "frame_sample_count" => OrderFacesBy(query, face => face.FrameSampleCount, descending),
            "video_count" => OrderFacesBy(query, face => face.VideoCount, descending),
            "image_count" => OrderFacesBy(query, face => face.ImageCount, descending),
            "random" => SeededRandomOrdering.OrderBy(query, seed, face => face.Id, descending),
            "created" or "created_at" => OrderFacesBy(query, face => face.CreatedAt, descending),
            "updated" or "updated_at" => OrderFacesBy(query, face => face.UpdatedAt, descending),
            // Composite "best ordering" sort used as the default surface; intentionally direction-agnostic.
            "appearance" => query.OrderBy(face => face.MergedIntoFaceId != null).ThenByDescending(face => face.AppearanceCount).ThenByDescending(face => face.FrameSampleCount).ThenBy(face => face.Label).ThenBy(face => face.Id),
            // Suggestion review ordering: unlinked faces with the strongest suggestions first; direction-agnostic.
            "suggestion_confidence" => query.OrderBy(face => face.PerformerId != null).ThenByDescending(face => face.TopSuggestionConfidence ?? -1f).ThenByDescending(face => face.UpdatedAt).ThenBy(face => face.Id),
            _ => query.OrderBy(face => face.MergedIntoFaceId != null).ThenByDescending(face => face.AppearanceCount).ThenByDescending(face => face.FrameSampleCount).ThenBy(face => face.Label).ThenBy(face => face.Id),
        };
    }

    private static IQueryable<Face> OrderFacesBy<TKey>(IQueryable<Face> query, Expression<Func<Face, TKey>> keySelector, bool descending)
        => descending
            ? query.OrderByDescending(keySelector).ThenByDescending(face => face.Id)
            : query.OrderBy(keySelector).ThenBy(face => face.Id);

    private static bool IsSuggestionConfidenceSort(string? sort)
        => string.Equals(sort?.Trim(), "suggestion_confidence", StringComparison.OrdinalIgnoreCase);

    // Confidence inputs are percents; a value of at most 1 is a 0..1 fraction from older clients.
    private static float NormalizeConfidenceThreshold(float confidence)
        => confidence <= 1f ? confidence * 100f : confidence;

    // Translates the suggestion-confidence criterion onto the stored Face.TopSuggestionConfidence column
    // so filtering happens in SQL. Equality carries a small tolerance because the stored confidence is a
    // float. Values are normalized to the 0..100 scale here.
    private static IQueryable<Face> ApplyStoredConfidenceCriterion(IQueryable<Face> query, DoubleCriterion? criterion)
    {
        if (criterion is null)
            return query;

        var value = NormalizeConfidenceThreshold((float)criterion.Value);
        var value2 = criterion.Value2.HasValue ? NormalizeConfidenceThreshold((float)criterion.Value2.Value) : (float?)null;

        switch (criterion.Modifier)
        {
            case CriterionModifier.IsNull:
                // A materialized suggestion is required upstream, so "is null" matches nothing.
                return query.Where(face => face.TopSuggestionPerformerId == null);
            case CriterionModifier.NotNull:
                return query;
            case CriterionModifier.NotEquals:
                return query.Where(face => face.TopSuggestionConfidence < value - 0.0001f || face.TopSuggestionConfidence > value + 0.0001f);
            case CriterionModifier.LessThan:
                return query.Where(face => face.TopSuggestionConfidence < value);
            case CriterionModifier.Between:
                if (value2.HasValue)
                {
                    var lo = Math.Min(value, value2.Value);
                    var hi = Math.Max(value, value2.Value);
                    return query.Where(face => face.TopSuggestionConfidence >= lo && face.TopSuggestionConfidence <= hi);
                }
                return query;
            case CriterionModifier.NotBetween:
                if (value2.HasValue)
                {
                    var lo = Math.Min(value, value2.Value);
                    var hi = Math.Max(value, value2.Value);
                    return query.Where(face => face.TopSuggestionConfidence < lo || face.TopSuggestionConfidence > hi);
                }
                return query;
            case CriterionModifier.Equals:
                return query.Where(face => face.TopSuggestionConfidence >= value - 0.0001f && face.TopSuggestionConfidence <= value + 0.0001f);
            default:
                return query.Where(face => face.TopSuggestionConfidence >= value);
        }
    }

    public async Task<IReadOnlyList<Face>> FindFacesAsync(FaceFilter filter, bool tracking = false, CancellationToken ct = default)
    {
        IQueryable<Face> query = filter.IncludePerformer
            ? _db.Faces.Include(f => f.Performer!).ThenInclude(p => p.RemoteIds)
            : _db.Faces.AsQueryable();

        if (filter.PrimarySourceKeys != null && filter.PrimarySourceKeys.Count > 0)
            query = query.Where(f => f.PrimarySourceKey != null && filter.PrimarySourceKeys.Contains(f.PrimarySourceKey));
        if (filter.Ids != null && filter.Ids.Count > 0)
            query = query.Where(f => filter.Ids.Contains(f.Id));
        if (filter.HasPerformer.HasValue)
            query = filter.HasPerformer.Value
                ? query.Where(f => f.PerformerId != null)
                : query.Where(f => f.PerformerId == null);
        if (filter.Ignored.HasValue)
            query = query.Where(f => f.Ignored == filter.Ignored.Value);
        if (filter.IsMerged.HasValue)
            query = filter.IsMerged.Value
                ? query.Where(f => f.MergedIntoFaceId != null)
                : query.Where(f => f.MergedIntoFaceId == null);

        if (!tracking)
            query = query.AsNoTracking();

        return await query.ToListAsync(ct);
    }

    public async Task<Face?> GetFaceAsync(int faceId, bool tracking = true, CancellationToken ct = default)
    {
        var query = _db.Faces.AsQueryable();
        if (!tracking)
            query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync(f => f.Id == faceId, ct);
    }

    public async Task<bool> FaceExistsAsync(int faceId, CancellationToken ct = default)
        => await _db.Faces.AnyAsync(f => f.Id == faceId, ct);

    public void AddFace(Face face) => _db.Faces.Add(face);

    public async Task<IReadOnlyList<FaceAppearance>> FindAppearancesAsync(FaceAppearanceFilter filter, CancellationToken ct = default)
    {
        var query = _db.FaceAppearances.AsQueryable();

        if (filter.HostType.HasValue)
            query = query.Where(a => a.HostType == filter.HostType.Value);
        if (filter.HostId.HasValue)
            query = query.Where(a => a.HostId == filter.HostId.Value);
        if (filter.SourceKey != null)
            query = query.Where(a => a.SourceKey == filter.SourceKey);
        if (filter.FaceIds != null && filter.FaceIds.Count > 0)
            query = query.Where(a => filter.FaceIds.Contains(a.FaceId));

        return await query.AsNoTracking().ToListAsync(ct);
    }

    public void AddAppearance(FaceAppearance appearance) => _db.FaceAppearances.Add(appearance);

    public void RemoveAppearances(IEnumerable<FaceAppearance> appearances) => _db.FaceAppearances.RemoveRange(appearances);

    public async Task UpdateAppearanceFaceIdAsync(string sourceKey, IReadOnlyList<int> oldFaceIds, int newFaceId, CancellationToken ct = default)
    {
        // Tracked update (not ExecuteUpdate) so it works on any provider and commits with the
        // caller's SaveChangesAsync alongside the rest of a face merge.
        var appearances = await _db.FaceAppearances
            .Where(a => a.SourceKey == sourceKey && oldFaceIds.Contains(a.FaceId))
            .ToListAsync(ct);
        foreach (var appearance in appearances)
            appearance.FaceId = newFaceId;
    }

    public async Task<int> ReassignAppearancesByRunAsync(string sourceKey, int oldFaceId, IReadOnlyCollection<string> runIds, int newFaceId, CancellationToken ct = default)
    {
        if (runIds.Count == 0)
            return 0;

        var appearances = await _db.FaceAppearances
            .Where(a => a.SourceKey == sourceKey && a.FaceId == oldFaceId && a.SourceRunId != null && runIds.Contains(a.SourceRunId))
            .ToListAsync(ct);
        foreach (var appearance in appearances)
            appearance.FaceId = newFaceId;
        return appearances.Count;
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
