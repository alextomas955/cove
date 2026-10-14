using Microsoft.EntityFrameworkCore;

namespace Cove.Data.Services;

/// <summary>
/// Prefilters the JSON reference scans that entity merges run over Cove-owned JSON columns. The JSON
/// rewriters (<see cref="EntityReferenceJsonRewriter"/> and <see cref="TagReferenceJsonRewriter"/>)
/// are a no-op for rows whose stored JSON never mentions a merged source id, so loading whole tables
/// for the rewrite is O(table) work for nothing. This helper restricts the load to rows whose JSON
/// text contains at least one source id: the leading-wildcard LIKE still scans the column on the
/// server (an id may appear anywhere in arbitrary JSON, so no index helps), but only matching rows
/// are transferred and materialized. CAST (rather than the Postgres :: operator) and LOWER (rather
/// than ILIKE) keep the predicate valid on both the Npgsql and SQLite providers.
/// </summary>
internal static class StoredJsonReferenceScan
{
    /// <param name="requiredText">
    /// Lowercase text that every rewritable row's JSON must also contain, such as the entity name for a
    /// rewriter whose recognized shapes all name the entity. An id's digits also occur inside timestamps,
    /// durations and other numbers, so the id alone matches many rows the rewriter leaves unchanged.
    /// </param>
    public static IQueryable<TEntity> PrefilterBySourceIds<TEntity>(
        DbSet<TEntity> source,
        string table,
        string jsonColumn,
        IReadOnlyCollection<int> sourceIds,
        string? requiredText = null)
        where TEntity : class
    {
        if (sourceIds.Count == 0)
            return source.Where(entity => false);

        var condition = string.Join(
            " OR ",
            sourceIds.Select(id => $"CAST(\"{jsonColumn}\" AS TEXT) LIKE '%{id}%'"));
        var sql = $"SELECT * FROM {table} WHERE ({condition})";
        if (requiredText != null)
        {
            if (requiredText.Any(character => !char.IsAsciiLetterLower(character)))
                throw new ArgumentException("Required text must be lowercase ASCII letters.", nameof(requiredText));
            sql += $" AND LOWER(CAST(\"{jsonColumn}\" AS TEXT)) LIKE '%{requiredText}%'";
        }
        return source.FromSqlRaw(sql);
    }
}
