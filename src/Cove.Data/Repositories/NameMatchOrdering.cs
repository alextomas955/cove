using System.Linq.Expressions;
using System.Reflection;
using Cove.Core.Entities;

namespace Cove.Data.Repositories;

/// <summary>
/// Orders name-keyed entities (tags, performers, studios, groups) for a free-text search the way a
/// picker expects: favorites first, then by how well the name matches the search term (exact,
/// prefix, word start, substring, alias-only, other-field-only), then shorter names, then
/// alphabetical. Full-text rank is deliberately not used because short names all rank alike and
/// the tie-break by update time made result order look random.
/// </summary>
public static class NameMatchOrdering
{
    private static readonly MethodInfo StringToLowerMethod =
        typeof(string).GetMethod(nameof(string.ToLower), Type.EmptyTypes)!;
    private static readonly MethodInfo StringContainsMethod =
        typeof(string).GetMethod(nameof(string.Contains), [typeof(string)])!;
    private static readonly MethodInfo StringStartsWithMethod =
        typeof(string).GetMethod(nameof(string.StartsWith), [typeof(string)])!;
    private static readonly MethodInfo StringConcatMethod =
        typeof(string).GetMethod(nameof(string.Concat), [typeof(string), typeof(string)])!;
    private static readonly MethodInfo EnumerableAnyMethod = typeof(Enumerable)
        .GetMethods(BindingFlags.Public | BindingFlags.Static)
        .First(m => m.Name == nameof(Enumerable.Any) && m.GetParameters().Length == 2)
        .MakeGenericMethod(typeof(string));
    private static readonly PropertyInfo StringLengthProperty =
        typeof(string).GetProperty(nameof(string.Length))!;

    /// <param name="favoriteSelector">Favorite flag; omit for entities without favorites.</param>
    /// <param name="aliasSelector">Alias rows; omit for entities without an alias table.</param>
    /// <param name="aliasTextSelector">A single free-form alias string; omit when not applicable.</param>
    public static IQueryable<T> Apply<T>(
        IQueryable<T> query,
        string? search,
        Expression<Func<T, string>> nameSelector,
        Expression<Func<T, bool>>? favoriteSelector = null,
        Expression<Func<T, IEnumerable<string>>>? aliasSelector = null,
        Expression<Func<T, string?>>? aliasTextSelector = null)
        where T : BaseEntity
    {
        var normalized = search?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(normalized))
            return query;

        var entity = Expression.Parameter(typeof(T), "entity");
        var name = Rebind(nameSelector, entity);
        var nameLower = Expression.Call(name, StringToLowerMethod);
        var needle = Expression.Constant(normalized);
        var wordNeedle = Expression.Constant(" " + normalized);

        var exact = Expression.Equal(nameLower, needle);
        var prefix = Expression.Call(nameLower, StringStartsWithMethod, needle);
        var wordStart = Expression.Call(
            Expression.Call(StringConcatMethod, Expression.Constant(" "), nameLower),
            StringContainsMethod,
            wordNeedle);
        var contains = Expression.Call(nameLower, StringContainsMethod, needle);

        Expression aliasMatch = Expression.Constant(false);
        if (aliasSelector is not null)
        {
            var alias = Expression.Parameter(typeof(string), "alias");
            var aliasMatches = Expression.Lambda<Func<string, bool>>(
                Expression.Call(Expression.Call(alias, StringToLowerMethod), StringContainsMethod, needle),
                alias);
            aliasMatch = Expression.Call(EnumerableAnyMethod, Rebind(aliasSelector, entity), aliasMatches);
        }

        if (aliasTextSelector is not null)
        {
            var aliasText = Rebind(aliasTextSelector, entity);
            var aliasTextMatches = Expression.AndAlso(
                Expression.NotEqual(aliasText, Expression.Constant(null, typeof(string))),
                Expression.Call(Expression.Call(aliasText, StringToLowerMethod), StringContainsMethod, needle));
            aliasMatch = Expression.OrElse(aliasMatch, aliasTextMatches);
        }

        var tier = Expression.Condition(exact, Expression.Constant(0),
            Expression.Condition(prefix, Expression.Constant(1),
            Expression.Condition(wordStart, Expression.Constant(2),
            Expression.Condition(contains, Expression.Constant(3),
            Expression.Condition(aliasMatch, Expression.Constant(4), Expression.Constant(5))))));

        var ordered = favoriteSelector is null
            ? query.OrderBy(Expression.Lambda<Func<T, int>>(tier, entity))
            : query.OrderByDescending(favoriteSelector).ThenBy(Expression.Lambda<Func<T, int>>(tier, entity));

        return ordered
            .ThenBy(Expression.Lambda<Func<T, int>>(Expression.Property(name, StringLengthProperty), entity))
            .ThenBy(Expression.Lambda<Func<T, string>>(nameLower, entity))
            .ThenBy(item => item.Id);
    }

    private static Expression Rebind<T, TResult>(Expression<Func<T, TResult>> selector, ParameterExpression parameter)
        => new ParameterReplacer(selector.Parameters[0], parameter).Visit(selector.Body)!;

    private sealed class ParameterReplacer(ParameterExpression from, ParameterExpression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node)
            => node == from ? to : base.VisitParameter(node);
    }
}
