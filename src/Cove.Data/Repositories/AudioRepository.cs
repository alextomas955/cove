using Cove.Core.Entities;
using Cove.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Cove.Data.Repositories;

public class AudioRepository : IAudioRepository
{
    // The list endpoints never hand out more than this many rows per page, so the repository caps the
    // same way and an extension cannot ask for the whole library as one page.
    public const int MaxPerPage = ListPaging.MaxPerPage;

    private static readonly HashSet<string> AffinityMultiSortKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "play_count", "like_counter", "play_duration", "last_played_at",
    };

    private readonly CoveContext _db;
    public AudioRepository(CoveContext db) => _db = db;

    public async Task<Audio?> GetByIdAsync(int id, CancellationToken ct = default) => await _db.Audios.FindAsync([id], ct);

    public async Task<Audio?> GetByIdWithRelationsAsync(int id, CancellationToken ct = default)
        => await _db.Audios.AsNoTracking()
            .Include(item => item.Studio)
            .Include(item => item.Urls)
            .Include(item => item.Files)
            .Include(item => item.AudioTags).ThenInclude(link => link.Tag)
            .Include(item => item.AudioPerformers).ThenInclude(link => link.Performer)
            .Include(item => item.Tracks)
            .FirstOrDefaultAsync(item => item.Id == id, ct);

    public async Task<IReadOnlyList<Audio>> GetAllAsync(CancellationToken ct = default)
        => await _db.Audios.AsNoTracking().OrderBy(audio => audio.Id).ToListAsync(ct);

    public async Task<Audio> AddAsync(Audio entity, CancellationToken ct = default)
    {
        _db.Audios.Add(entity);
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task UpdateAsync(Audio entity, CancellationToken ct = default)
    {
        if (_db.Entry(entity).State == EntityState.Detached)
            _db.Audios.Update(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _db.Audios.FindAsync([id], ct);
        if (entity != null) { _db.Audios.Remove(entity); await _db.SaveChangesAsync(ct); }
    }

    public async Task<int> CountAsync(CancellationToken ct = default) => await _db.Audios.CountAsync(ct);

    public async Task<(IReadOnlyList<Audio> Items, int TotalCount)> FindAsync(AudioFilter? filter, FindFilter? findFilter, CancellationToken ct = default, FilterExpression<AudioFilter>? expression = null)
    {
        using var relativeDates = RelativeDateEvaluation.Begin();
        var query = await AudioFilterQuery.BuildAsync(_db, filter, findFilter, ct: ct, expression: expression);

        // Count-only requests (perPage <= 0) skip sorting and loading, as the video repository does.
        var perPage = findFilter?.PerPage ?? 25;
        if (perPage <= 0)
            return (Array.Empty<Audio>(), await query.CountAsync(ct));
        perPage = Math.Min(perPage, MaxPerPage);
        var page = Math.Max(1, findFilter?.Page ?? 1);

        // Count on the unsorted query; sort and page on it too, then load entities for the page's ids only.
        var totalCount = await query.CountAsync(ct);
        query = ApplyOrdering(query, findFilter);
        var pagedIds = await query
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .Select(audio => audio.Id)
            .ToListAsync(ct);

        return (await LoadListItemsAsync(pagedIds, ct), totalCount);
    }

    public async Task<IReadOnlyList<int>> FindIdsAsync(AudioFilter? filter, FindFilter? findFilter, int limit, CancellationToken ct = default, FilterExpression<AudioFilter>? expression = null)
    {
        if (limit <= 0)
            return [];

        // Same filtering and ordering as FindAsync, but the ids never leave the lightweight query, so a
        // membership pass over a large slice of the library costs one projection instead of N entities.
        using var relativeDates = RelativeDateEvaluation.Begin();
        var query = ApplyOrdering(await AudioFilterQuery.BuildAsync(_db, filter, findFilter, ct: ct, expression: expression), findFilter);

        // int.MaxValue means every match; a LIMIT clause would only make Postgres plan for a bound it never reaches.
        if (limit < int.MaxValue)
            query = query.Take(limit);

        return await query.Select(audio => audio.Id).ToListAsync(ct);
    }

    public Task<AudioAggregate> AggregateAsync(AudioFilter? filter, FindFilter? findFilter, CancellationToken ct = default, FilterExpression<AudioFilter>? expression = null)
        => AggregateAsync(filter, findFilter, ids: null, ct, expression);

    public async Task<AudioAggregate> AggregateAsync(AudioFilter? filter, FindFilter? findFilter, IReadOnlyCollection<int>? ids, CancellationToken ct = default, FilterExpression<AudioFilter>? expression = null)
    {
        using var relativeDates = RelativeDateEvaluation.Begin();
        var query = await AudioFilterQuery.BuildAsync(_db, filter, findFilter, ct: ct, expression: expression);
        if (ids is { Count: > 0 })
        {
            var selected = ids.ToArray();
            query = query.Where(audio => selected.Contains(audio.Id));
        }

        return await query.GroupBy(_ => 1)
            .Select(group => new AudioAggregate(group.Count(), group.Sum(audio => audio.MaxDuration), group.Sum(audio => audio.MaxFileSize)))
            .SingleOrDefaultAsync(ct)
            ?? new AudioAggregate(0, 0, 0);
    }

    /// <summary>Loads the relations the list DTO shows for exactly <paramref name="pagedIds"/>, back in that order.</summary>
    private async Task<List<Audio>> LoadListItemsAsync(IReadOnlyList<int> pagedIds, CancellationToken ct)
    {
        if (pagedIds.Count == 0)
            return [];

        var items = await _db.Audios.AsNoTracking()
            .Include(audio => audio.Studio)
            .Include(audio => audio.Urls)
            .Include(audio => audio.Files)
            .Include(audio => audio.AudioTags).ThenInclude(link => link.Tag)
            .Include(audio => audio.AudioPerformers).ThenInclude(link => link.Performer)
            .Include(audio => audio.Tracks)
            .Where(audio => pagedIds.Contains(audio.Id))
            .AsSplitQuery()
            .ToListAsync(ct);

        var orderMap = pagedIds.Select((id, index) => (id, index)).ToDictionary(item => item.id, item => item.index);
        return items.OrderBy(audio => orderMap.GetValueOrDefault(audio.Id, int.MaxValue)).ToList();
    }

    /// <summary>
    /// The list order for <paramref name="findFilter"/>: a multi-sort when several clauses are given, else
    /// the single sort key, with search relevance taking over when the request searches without a sort.
    /// </summary>
    private IQueryable<Audio> ApplyOrdering(IQueryable<Audio> query, FindFilter? findFilter)
    {
        var multiSortRegistry = CreateMultiSortRegistry();
        var sortClauses = multiSortRegistry.Normalize(findFilter?.Sorts);
        var primarySort = sortClauses.FirstOrDefault();
        var sort = primarySort?.Key ?? findFilter?.Sort;
        var descending = primarySort?.Direction == Core.Enums.SortDirection.Desc
            || (primarySort is null && findFilter?.Direction == Core.Enums.SortDirection.Desc);
        query = sortClauses.Count > 1
            ? ApplyMultiSort(query, sortClauses, multiSortRegistry)
            : ApplySort(query, sort, descending, findFilter?.Seed);
        if (FullTextSearchHelpers.ShouldOrderByRelevance(_db, findFilter?.Q, sort))
            query = FullTextSearchHelpers.OrderByExactThenRelevance(_db, query, findFilter?.Q, audio => audio.Title);
        return query;
    }

    private IQueryable<Audio> ApplySort(IQueryable<Audio> query, string? sort, bool descending, int? seed)
    {
        if (FilterHelpers.TryParseCustomFieldSort(sort, out _, out _))
            return query.ApplyCustomFieldSort(_db, CustomFieldEntityTypes.Audio, sort, descending);

        return (sort ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "random" => SeededRandomOrdering.OrderBy(query, seed, audio => audio.Id, descending),
            "title" => descending ? query.OrderByDescending(audio => NaturalSort.Key(audio.Title)).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => NaturalSort.Key(audio.Title)).ThenBy(audio => audio.Id),
            "date" => descending ? query.OrderByDescending(audio => audio.Date).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.Date).ThenBy(audio => audio.Id),
            "duration" => descending ? query.OrderByDescending(audio => audio.MaxDuration).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.MaxDuration).ThenBy(audio => audio.Id),
            "rating" => EngagementQueryHelpers.ApplyRatingSort(_db, query, EngagementQueryHelpers.CurrentUserId(_db), RatingHostType.Audio, descending),
            "play_count" => EngagementQueryHelpers.ApplyAffinityIntSort(_db, query, EngagementQueryHelpers.CurrentUserId(_db), AffinityHostType.Audio, nameof(UserEntityAffinity.ViewCount), descending),
            "like_counter" => EngagementQueryHelpers.ApplyAffinityIntSort(_db, query, EngagementQueryHelpers.CurrentUserId(_db), AffinityHostType.Audio, nameof(UserEntityAffinity.LikeCount), descending),
            "play_duration" => EngagementQueryHelpers.ApplyAffinityDoubleSort(_db, query, EngagementQueryHelpers.CurrentUserId(_db), AffinityHostType.Audio, nameof(UserEntityAffinity.TotalConsumedSec), descending),
            "last_played_at" => EngagementQueryHelpers.ApplyAffinityTimestampSort(_db, query, EngagementQueryHelpers.CurrentUserId(_db), AffinityHostType.Audio, nameof(UserEntityAffinity.LastConsumedAt), descending),
            "file_size" => descending ? query.OrderByDescending(audio => audio.MaxFileSize).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.MaxFileSize).ThenBy(audio => audio.Id),
            "file_mod_time" => descending ? query.OrderByDescending(audio => audio.MaxFileModTime).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.MaxFileModTime).ThenBy(audio => audio.Id),
            "file_count" => descending ? query.OrderByDescending(audio => audio.FileCount).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.FileCount).ThenBy(audio => audio.Id),
            "path" => descending ? query.OrderByDescending(audio => NaturalSort.Key(audio.MaxPath)).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => NaturalSort.Key(audio.MinPath)).ThenBy(audio => audio.Id),
            "bitrate" or "bit_rate" => descending ? query.OrderByDescending(audio => audio.MaxBitRate).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.MaxBitRate).ThenBy(audio => audio.Id),
            "has_video" or "has_video_files" => descending ? query.OrderByDescending(audio => audio.HasVideoFiles).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.HasVideoFiles).ThenBy(audio => audio.Id),
            "track_count" => descending ? query.OrderByDescending(audio => audio.Tracks.Count).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.Tracks.Count).ThenBy(audio => audio.Id),
            "tag_count" => descending ? query.OrderByDescending(audio => audio.AudioTags.Count).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.AudioTags.Count).ThenBy(audio => audio.Id),
            "performer_count" => descending ? query.OrderByDescending(audio => audio.AudioPerformers.Count).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.AudioPerformers.Count).ThenBy(audio => audio.Id),
            "updatedat" or "updated_at" => descending ? query.OrderByDescending(audio => audio.UpdatedAt).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.UpdatedAt).ThenBy(audio => audio.Id),
            "createdat" => descending ? query.OrderByDescending(audio => audio.CreatedAt).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.CreatedAt).ThenBy(audio => audio.Id),
            "created_at" => descending ? query.OrderByDescending(audio => audio.CreatedAt).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.CreatedAt).ThenBy(audio => audio.Id),
            _ => descending ? query.OrderByDescending(audio => audio.UpdatedAt).ThenByDescending(audio => audio.Id) : query.OrderBy(audio => audio.UpdatedAt).ThenBy(audio => audio.Id),
        };
    }

    internal static CompoundSortRegistry<Audio> CreateMultiSortRegistry()
        => new(new Dictionary<string, Action<CompoundSortQuery<Audio>, bool>>(StringComparer.OrdinalIgnoreCase)
        {
            ["title"] = (compound, desc) =>
            {
                compound.Append(audio => audio.Title == null ? 1 : 0, false);
                compound.Append(audio => audio.Title, desc);
            },
            ["rating"] = (compound, desc) => compound.AppendRating(desc),
            ["play_count"] = (compound, desc) => compound.AppendAffinityInt(nameof(UserEntityAffinity.ViewCount), desc),
            ["like_counter"] = (compound, desc) => compound.AppendAffinityInt(nameof(UserEntityAffinity.LikeCount), desc),
            ["play_duration"] = (compound, desc) => compound.AppendAffinityDouble(nameof(UserEntityAffinity.TotalConsumedSec), desc),
            ["last_played_at"] = (compound, desc) => compound.AppendAffinityTimestamp(nameof(UserEntityAffinity.LastConsumedAt), desc),
            ["date"] = (compound, desc) =>
            {
                compound.Append(audio => audio.Date == null ? 1 : 0, false);
                compound.Append(audio => audio.Date, desc);
            },
            ["duration"] = (compound, desc) => compound.Append(audio => audio.MaxDuration, desc),
            ["file_size"] = (compound, desc) => compound.Append(audio => audio.MaxFileSize, desc),
            ["file_mod_time"] = (compound, desc) =>
            {
                compound.Append(audio => audio.MaxFileModTime == null ? 1 : 0, false);
                compound.Append(audio => audio.MaxFileModTime, desc);
            },
            ["file_count"] = (compound, desc) => compound.Append(audio => audio.FileCount, desc),
            ["path"] = (compound, desc) => compound.Append(audio => desc ? audio.MaxPath : audio.MinPath, desc),
            ["bitrate"] = (compound, desc) => compound.Append(audio => audio.MaxBitRate, desc),
            ["has_video_files"] = (compound, desc) => compound.Append(audio => audio.HasVideoFiles, desc),
            ["track_count"] = (compound, desc) => compound.Append(audio => audio.Tracks.Count, desc),
            ["tag_count"] = (compound, desc) => compound.Append(audio => audio.AudioTags.Count, desc),
            ["performer_count"] = (compound, desc) => compound.Append(audio => audio.AudioPerformers.Count, desc),
            ["createdAt"] = (compound, desc) => compound.Append(audio => audio.CreatedAt, desc),
            ["created_at"] = (compound, desc) => compound.Append(audio => audio.CreatedAt, desc),
            ["updatedAt"] = (compound, desc) => compound.Append(audio => audio.UpdatedAt, desc),
            ["updated_at"] = (compound, desc) => compound.Append(audio => audio.UpdatedAt, desc),
        });

    private IQueryable<Audio> ApplyMultiSort(IQueryable<Audio> query, IReadOnlyList<SortClause> clauses, CompoundSortRegistry<Audio> registry)
    {
        var userId = EngagementQueryHelpers.CurrentUserId(_db);
        var compound = CompoundSortQuery<Audio>.Create(
            _db, query, userId, AffinityHostType.Audio, RatingHostType.Audio,
            includeAffinity: clauses.Any(clause => AffinityMultiSortKeys.Contains(clause.Key)),
            includeRating: clauses.Any(clause => clause.Key.Equals("rating", StringComparison.OrdinalIgnoreCase)));
        registry.Apply(compound, clauses);

        return compound.Finish(audio => audio.Id, clauses[0].Direction == Core.Enums.SortDirection.Desc);
    }
}
