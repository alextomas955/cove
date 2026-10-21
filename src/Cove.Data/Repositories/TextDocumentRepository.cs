using Cove.Core.Entities;
using Cove.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Cove.Data.Repositories;

public class TextDocumentRepository : ITextDocumentRepository
{
    // The list endpoints never hand out more than this many rows per page, so the repository caps the
    // same way and an extension cannot ask for the whole library as one page.
    public const int MaxPerPage = ListPaging.MaxPerPage;

    private static readonly HashSet<string> AffinityMultiSortKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "read_count", "like_counter", "read_duration", "last_read_at",
    };

    private readonly CoveContext _db;
    public TextDocumentRepository(CoveContext db) => _db = db;

    public async Task<TextDocument?> GetByIdAsync(int id, CancellationToken ct = default) => await _db.TextDocuments.FindAsync([id], ct);

    public async Task<TextDocument?> GetByIdWithRelationsAsync(int id, CancellationToken ct = default)
        => await _db.TextDocuments.AsNoTracking()
            .Include(item => item.Studio)
            .Include(item => item.Urls)
            .Include(item => item.Files)
            .Include(item => item.TextTags).ThenInclude(link => link.Tag).ThenInclude(tag => tag!.TagGroup)
            .Include(item => item.TextPerformers).ThenInclude(link => link.Performer)
            .FirstOrDefaultAsync(item => item.Id == id, ct);

    public async Task<IReadOnlyList<TextDocument>> GetAllAsync(CancellationToken ct = default)
        => await _db.TextDocuments.AsNoTracking().OrderBy(text => text.Id).ToListAsync(ct);

    public async Task<TextDocument> AddAsync(TextDocument entity, CancellationToken ct = default)
    {
        _db.TextDocuments.Add(entity);
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task UpdateAsync(TextDocument entity, CancellationToken ct = default)
    {
        if (_db.Entry(entity).State == EntityState.Detached)
            _db.TextDocuments.Update(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _db.TextDocuments.FindAsync([id], ct);
        if (entity != null) { _db.TextDocuments.Remove(entity); await _db.SaveChangesAsync(ct); }
    }

    public async Task<int> CountAsync(CancellationToken ct = default) => await _db.TextDocuments.CountAsync(ct);

    public async Task<(IReadOnlyList<TextDocument> Items, int TotalCount)> FindAsync(TextDocumentFilter? filter, FindFilter? findFilter, CancellationToken ct = default, FilterExpression<TextDocumentFilter>? expression = null)
    {
        using var relativeDates = RelativeDateEvaluation.Begin();
        var query = await TextDocumentFilterQuery.BuildAsync(_db, filter, findFilter, ct: ct, expression: expression);

        // Count-only requests (perPage <= 0) skip sorting and loading, as the video repository does.
        var perPage = findFilter?.PerPage ?? 25;
        if (perPage <= 0)
            return (Array.Empty<TextDocument>(), await query.CountAsync(ct));
        perPage = Math.Min(perPage, MaxPerPage);
        var page = Math.Max(1, findFilter?.Page ?? 1);

        // Count on the unsorted query; sort and page on it too, then load entities for the page's ids only.
        var totalCount = await query.CountAsync(ct);
        query = ApplyOrdering(query, findFilter);
        var pagedIds = await query
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .Select(text => text.Id)
            .ToListAsync(ct);

        return (await LoadListItemsAsync(pagedIds, ct), totalCount);
    }

    public async Task<IReadOnlyList<int>> FindIdsAsync(TextDocumentFilter? filter, FindFilter? findFilter, int limit, CancellationToken ct = default, FilterExpression<TextDocumentFilter>? expression = null)
    {
        if (limit <= 0)
            return [];

        // Same filtering and ordering as FindAsync, but the ids never leave the lightweight query, so a
        // membership pass over a large slice of the library costs one projection instead of N entities.
        using var relativeDates = RelativeDateEvaluation.Begin();
        var query = ApplyOrdering(await TextDocumentFilterQuery.BuildAsync(_db, filter, findFilter, ct: ct, expression: expression), findFilter);

        // int.MaxValue means every match; a LIMIT clause would only make Postgres plan for a bound it never reaches.
        if (limit < int.MaxValue)
            query = query.Take(limit);

        return await query.Select(text => text.Id).ToListAsync(ct);
    }

    public Task<TextAggregate> AggregateAsync(TextDocumentFilter? filter, FindFilter? findFilter, CancellationToken ct = default, FilterExpression<TextDocumentFilter>? expression = null)
        => AggregateAsync(filter, findFilter, ids: null, ct, expression);

    public async Task<TextAggregate> AggregateAsync(TextDocumentFilter? filter, FindFilter? findFilter, IReadOnlyCollection<int>? ids, CancellationToken ct = default, FilterExpression<TextDocumentFilter>? expression = null)
    {
        using var relativeDates = RelativeDateEvaluation.Begin();
        var query = await TextDocumentFilterQuery.BuildAsync(_db, filter, findFilter, ct: ct, expression: expression);
        if (ids is { Count: > 0 })
        {
            var selected = ids.ToArray();
            query = query.Where(text => selected.Contains(text.Id));
        }

        return await query.GroupBy(_ => 1)
            .Select(group => new TextAggregate(group.Count(), group.Sum(text => text.MaxFileSize)))
            .SingleOrDefaultAsync(ct)
            ?? new TextAggregate(0, 0);
    }

    /// <summary>Loads the relations the list DTO shows for exactly <paramref name="pagedIds"/>, back in that order.</summary>
    private async Task<List<TextDocument>> LoadListItemsAsync(IReadOnlyList<int> pagedIds, CancellationToken ct)
    {
        if (pagedIds.Count == 0)
            return [];

        var items = await _db.TextDocuments.AsNoTracking()
            .Include(text => text.Studio)
            .Include(text => text.Urls)
            .Include(text => text.Files)
            .Include(text => text.TextTags).ThenInclude(link => link.Tag).ThenInclude(tag => tag!.TagGroup)
            .Include(text => text.TextPerformers).ThenInclude(link => link.Performer)
            .Where(text => pagedIds.Contains(text.Id))
            .AsSplitQuery()
            .ToListAsync(ct);

        var orderMap = pagedIds.Select((id, index) => (id, index)).ToDictionary(item => item.id, item => item.index);
        return items.OrderBy(text => orderMap.GetValueOrDefault(text.Id, int.MaxValue)).ToList();
    }

    /// <summary>
    /// The list order for <paramref name="findFilter"/>: a multi-sort when several clauses are given, else
    /// the single sort key, with search relevance taking over when the request searches without a sort.
    /// </summary>
    private IQueryable<TextDocument> ApplyOrdering(IQueryable<TextDocument> query, FindFilter? findFilter)
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
            query = FullTextSearchHelpers.OrderByExactThenRelevance(_db, query, findFilter?.Q, text => text.Title);
        return query;
    }

    private IQueryable<TextDocument> ApplySort(IQueryable<TextDocument> query, string? sort, bool descending, int? seed)
    {
        if (FilterHelpers.TryParseCustomFieldSort(sort, out _, out _))
            return query.ApplyCustomFieldSort(_db, CustomFieldEntityTypes.Text, sort, descending);

        return (sort ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "random" => SeededRandomOrdering.OrderBy(query, seed, text => text.Id, descending),
            "title" => descending ? query.OrderByDescending(text => NaturalSort.Key(text.Title)).ThenByDescending(text => text.Id) : query.OrderBy(text => NaturalSort.Key(text.Title)).ThenBy(text => text.Id),
            "date" => descending ? query.OrderByDescending(text => text.Date).ThenByDescending(text => text.Id) : query.OrderBy(text => text.Date).ThenBy(text => text.Id),
            "words" => descending ? query.OrderByDescending(text => text.MaxWordCount).ThenByDescending(text => text.Id) : query.OrderBy(text => text.MaxWordCount).ThenBy(text => text.Id),
            "pages" => descending ? query.OrderByDescending(text => text.MaxPageCount).ThenByDescending(text => text.Id) : query.OrderBy(text => text.MaxPageCount).ThenBy(text => text.Id),
            "rating" => EngagementQueryHelpers.ApplyRatingSort(_db, query, EngagementQueryHelpers.CurrentUserId(_db), RatingHostType.Text, descending),
            "play_count" or "read_count" => EngagementQueryHelpers.ApplyAffinityIntSort(_db, query, EngagementQueryHelpers.CurrentUserId(_db), AffinityHostType.Text, nameof(UserEntityAffinity.ViewCount), descending),
            "like_counter" => EngagementQueryHelpers.ApplyAffinityIntSort(_db, query, EngagementQueryHelpers.CurrentUserId(_db), AffinityHostType.Text, nameof(UserEntityAffinity.LikeCount), descending),
            "play_duration" or "read_duration" => EngagementQueryHelpers.ApplyAffinityDoubleSort(_db, query, EngagementQueryHelpers.CurrentUserId(_db), AffinityHostType.Text, nameof(UserEntityAffinity.TotalConsumedSec), descending),
            "last_read_at" or "last_played_at" => EngagementQueryHelpers.ApplyAffinityTimestampSort(_db, query, EngagementQueryHelpers.CurrentUserId(_db), AffinityHostType.Text, nameof(UserEntityAffinity.LastConsumedAt), descending),
            "file_size" => descending ? query.OrderByDescending(text => text.MaxFileSize).ThenByDescending(text => text.Id) : query.OrderBy(text => text.MaxFileSize).ThenBy(text => text.Id),
            "file_mod_time" => descending ? query.OrderByDescending(text => text.MaxFileModTime).ThenByDescending(text => text.Id) : query.OrderBy(text => text.MaxFileModTime).ThenBy(text => text.Id),
            "file_count" => descending ? query.OrderByDescending(text => text.FileCount).ThenByDescending(text => text.Id) : query.OrderBy(text => text.FileCount).ThenBy(text => text.Id),
            "path" => descending ? query.OrderByDescending(text => NaturalSort.Key(text.MaxPath)).ThenByDescending(text => text.Id) : query.OrderBy(text => NaturalSort.Key(text.MinPath)).ThenBy(text => text.Id),
            "tag_count" => descending ? query.OrderByDescending(text => text.TextTags.Count).ThenByDescending(text => text.Id) : query.OrderBy(text => text.TextTags.Count).ThenBy(text => text.Id),
            "performer_count" => descending ? query.OrderByDescending(text => text.TextPerformers.Count).ThenByDescending(text => text.Id) : query.OrderBy(text => text.TextPerformers.Count).ThenBy(text => text.Id),
            "updatedat" or "updated_at" => descending ? query.OrderByDescending(text => text.UpdatedAt).ThenByDescending(text => text.Id) : query.OrderBy(text => text.UpdatedAt).ThenBy(text => text.Id),
            "createdat" => descending ? query.OrderByDescending(text => text.CreatedAt).ThenByDescending(text => text.Id) : query.OrderBy(text => text.CreatedAt).ThenBy(text => text.Id),
            "created_at" => descending ? query.OrderByDescending(text => text.CreatedAt).ThenByDescending(text => text.Id) : query.OrderBy(text => text.CreatedAt).ThenBy(text => text.Id),
            _ => descending ? query.OrderByDescending(text => text.UpdatedAt).ThenByDescending(text => text.Id) : query.OrderBy(text => text.UpdatedAt).ThenBy(text => text.Id),
        };
    }

    internal static CompoundSortRegistry<TextDocument> CreateMultiSortRegistry()
        => new(new Dictionary<string, Action<CompoundSortQuery<TextDocument>, bool>>(StringComparer.OrdinalIgnoreCase)
        {
            ["title"] = (compound, desc) =>
            {
                compound.Append(text => text.Title == null ? 1 : 0, false);
                compound.Append(text => text.Title, desc);
            },
            ["rating"] = (compound, desc) => compound.AppendRating(desc),
            ["read_count"] = (compound, desc) => compound.AppendAffinityInt(nameof(UserEntityAffinity.ViewCount), desc),
            ["like_counter"] = (compound, desc) => compound.AppendAffinityInt(nameof(UserEntityAffinity.LikeCount), desc),
            ["read_duration"] = (compound, desc) => compound.AppendAffinityDouble(nameof(UserEntityAffinity.TotalConsumedSec), desc),
            ["last_read_at"] = (compound, desc) => compound.AppendAffinityTimestamp(nameof(UserEntityAffinity.LastConsumedAt), desc),
            ["date"] = (compound, desc) =>
            {
                compound.Append(text => text.Date == null ? 1 : 0, false);
                compound.Append(text => text.Date, desc);
            },
            ["words"] = (compound, desc) => compound.Append(text => text.MaxWordCount, desc),
            ["pages"] = (compound, desc) => compound.Append(text => text.MaxPageCount, desc),
            ["file_size"] = (compound, desc) => compound.Append(text => text.MaxFileSize, desc),
            ["file_mod_time"] = (compound, desc) =>
            {
                compound.Append(text => text.MaxFileModTime == null ? 1 : 0, false);
                compound.Append(text => text.MaxFileModTime, desc);
            },
            ["file_count"] = (compound, desc) => compound.Append(text => text.FileCount, desc),
            ["path"] = (compound, desc) => compound.Append(text => desc ? text.MaxPath : text.MinPath, desc),
            ["tag_count"] = (compound, desc) => compound.Append(text => text.TextTags.Count, desc),
            ["performer_count"] = (compound, desc) => compound.Append(text => text.TextPerformers.Count, desc),
            ["createdAt"] = (compound, desc) => compound.Append(text => text.CreatedAt, desc),
            ["created_at"] = (compound, desc) => compound.Append(text => text.CreatedAt, desc),
            ["updatedAt"] = (compound, desc) => compound.Append(text => text.UpdatedAt, desc),
            ["updated_at"] = (compound, desc) => compound.Append(text => text.UpdatedAt, desc),
        });

    private IQueryable<TextDocument> ApplyMultiSort(IQueryable<TextDocument> query, IReadOnlyList<SortClause> clauses, CompoundSortRegistry<TextDocument> registry)
    {
        var userId = EngagementQueryHelpers.CurrentUserId(_db);
        var compound = CompoundSortQuery<TextDocument>.Create(
            _db, query, userId, AffinityHostType.Text, RatingHostType.Text,
            includeAffinity: clauses.Any(clause => AffinityMultiSortKeys.Contains(clause.Key)),
            includeRating: clauses.Any(clause => clause.Key.Equals("rating", StringComparison.OrdinalIgnoreCase)));
        registry.Apply(compound, clauses);

        return compound.Finish(text => text.Id, clauses[0].Direction == Core.Enums.SortDirection.Desc);
    }
}
