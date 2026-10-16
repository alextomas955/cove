using System.Linq.Expressions;

namespace Cove.Data;

/// <summary>
/// Date sort keys that treat a missing date as the oldest: undated rows come first from oldest to
/// newest and last from newest to oldest. PostgreSQL cannot be asked for <c>NULLS FIRST</c> through
/// LINQ, so the key coalesces a missing date to <see cref="DateOnly.MinValue"/>, which Npgsql inlines
/// as <c>DATE '-infinity'</c>. An expression index on <c>(COALESCE(date, '-infinity'::date), "Id")</c>
/// then serves the first page in both directions.
/// </summary>
public static class UndatedOldestOrdering
{
    // A constant node rather than a captured value, so EF inlines it instead of sending a parameter the
    // index expression could not match. In-memory queries evaluate it as an ordinary value.
    private static readonly ConstantExpression Floor = Expression.Constant(DateOnly.MinValue);

    public static Expression<Func<T, DateOnly>> Key<T>(Expression<Func<T, DateOnly?>> date)
        => Expression.Lambda<Func<T, DateOnly>>(Expression.Coalesce(date.Body, Floor), date.Parameters);

    public static IOrderedQueryable<T> OrderByDate<T>(this IQueryable<T> query, Expression<Func<T, DateOnly?>> date, bool descending)
        => descending ? query.OrderByDescending(Key(date)) : query.OrderBy(Key(date));
}
