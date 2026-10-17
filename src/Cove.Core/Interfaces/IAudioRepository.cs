using Cove.Core.Entities;

namespace Cove.Core.Interfaces;

/// <summary>
/// Audio list queries in the shape of <see cref="IVideoRepository"/>: the same filter, search, sort,
/// seeded-random and paging rules the /api/audios endpoints apply, so an extension reads audios the
/// way the UI does instead of rebuilding the query.
/// </summary>
public interface IAudioRepository : IRepository<Audio>
{
    /// <summary>
    /// One page of matching audios, loaded with the relations the list DTO needs (studio, urls, files,
    /// tags, performers, tracks) in sort order, plus the total match count. <see cref="FindFilter.PerPage"/>
    /// at or below zero counts without loading; above 250 it is capped at 250.
    /// </summary>
    Task<(IReadOnlyList<Audio> Items, int TotalCount)> FindAsync(AudioFilter? filter, FindFilter? findFilter, CancellationToken ct = default, FilterExpression<AudioFilter>? expression = null);

    Task<AudioAggregate> AggregateAsync(AudioFilter? filter, FindFilter? findFilter, CancellationToken ct = default, FilterExpression<AudioFilter>? expression = null);

    /// <summary>
    /// Totals over the matches restricted to <paramref name="ids"/> (null or empty means every match).
    /// <see cref="AudioFilter"/> carries no id criterion, so a selection's totals pass its ids here.
    /// </summary>
    Task<AudioAggregate> AggregateAsync(AudioFilter? filter, FindFilter? findFilter, IReadOnlyCollection<int>? ids, CancellationToken ct = default, FilterExpression<AudioFilter>? expression = null);

    /// <summary>
    /// Ids of the matching audios in sort order, up to <paramref name="limit"/>, without loading entities.
    /// Used where only membership matters. The default implementation falls back to
    /// <see cref="FindAsync(AudioFilter?, FindFilter?, CancellationToken, FilterExpression{AudioFilter}?)"/>.
    /// </summary>
    async Task<IReadOnlyList<int>> FindIdsAsync(
        AudioFilter? filter,
        FindFilter? findFilter,
        int limit,
        CancellationToken ct = default,
        FilterExpression<AudioFilter>? expression = null)
    {
        var (items, _) = await FindAsync(filter, findFilter, ct, expression);
        return items.Take(limit).Select(audio => audio.Id).ToList();
    }

    /// <summary>The audio with the relations its detail view shows, untracked; null when it does not exist.</summary>
    Task<Audio?> GetByIdWithRelationsAsync(int id, CancellationToken ct = default);
}
