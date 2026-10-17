using Cove.Core.Entities;

namespace Cove.Core.Interfaces;

/// <summary>
/// Text document list queries in the shape of <see cref="IVideoRepository"/>: the same filter, search,
/// sort, seeded-random and paging rules the /api/texts endpoints apply, so an extension reads texts the
/// way the UI does instead of rebuilding the query.
/// </summary>
public interface ITextDocumentRepository : IRepository<TextDocument>
{
    /// <summary>
    /// One page of matching documents, loaded with the relations the list DTO needs (studio, urls, files,
    /// tags with their groups, performers) in sort order, plus the total match count.
    /// <see cref="FindFilter.PerPage"/> at or below zero counts without loading; above 250 it is capped at 250.
    /// </summary>
    Task<(IReadOnlyList<TextDocument> Items, int TotalCount)> FindAsync(TextDocumentFilter? filter, FindFilter? findFilter, CancellationToken ct = default, FilterExpression<TextDocumentFilter>? expression = null);

    Task<TextAggregate> AggregateAsync(TextDocumentFilter? filter, FindFilter? findFilter, CancellationToken ct = default, FilterExpression<TextDocumentFilter>? expression = null);

    /// <summary>
    /// Totals over the matches restricted to <paramref name="ids"/> (null or empty means every match).
    /// <see cref="TextDocumentFilter"/> carries no id criterion, so a selection's totals pass its ids here.
    /// </summary>
    Task<TextAggregate> AggregateAsync(TextDocumentFilter? filter, FindFilter? findFilter, IReadOnlyCollection<int>? ids, CancellationToken ct = default, FilterExpression<TextDocumentFilter>? expression = null);

    /// <summary>
    /// Ids of the matching documents in sort order, up to <paramref name="limit"/>, without loading entities.
    /// Used where only membership matters. The default implementation falls back to
    /// <see cref="FindAsync(TextDocumentFilter?, FindFilter?, CancellationToken, FilterExpression{TextDocumentFilter}?)"/>.
    /// </summary>
    async Task<IReadOnlyList<int>> FindIdsAsync(
        TextDocumentFilter? filter,
        FindFilter? findFilter,
        int limit,
        CancellationToken ct = default,
        FilterExpression<TextDocumentFilter>? expression = null)
    {
        var (items, _) = await FindAsync(filter, findFilter, ct, expression);
        return items.Take(limit).Select(text => text.Id).ToList();
    }

    /// <summary>The document with the relations its detail view shows, untracked; null when it does not exist.</summary>
    Task<TextDocument?> GetByIdWithRelationsAsync(int id, CancellationToken ct = default);
}
