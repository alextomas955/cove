using Cove.Core.Auth;
using Cove.Core.Entities;
using Cove.Core.Interfaces;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Query;
using PermissionKeys = Cove.Core.Auth.Permissions;

namespace Cove.Data.Repositories;

/// <summary>Applies an <see cref="AiAnalysisCriterion"/> to a video or image query.</summary>
/// <remarks>
/// The latest run of an item is the one with the greatest (<c>StartedAt</c>, <c>Id</c>). Every state is written as
/// EXISTS / NOT EXISTS over <c>ai_runs</c>, never as a correlated "ORDER BY ... LIMIT 1" lookup, so a COUNT over a
/// large library becomes a semi- or anti-join that the
/// (<c>TargetType</c>, <c>SourceKey</c>, <c>TargetId</c>, <c>StartedAt</c> DESC, <c>Id</c> DESC) index answers.
/// <para>
/// The runs keep the AiRun query filter: <c>IgnoreQueryFilters</c> applies to a whole EF query, so calling it here
/// would also drop the visibility filters of the outer video or image query. A caller without <c>airuns.read</c> is
/// rejected instead, because the filter would hide every run and "never run" would match everything.
/// </para>
/// </remarks>
internal static class AiAnalysisQuery
{
    private static readonly AiRunStatus[] AllStatuses = Enum.GetValues<AiRunStatus>();
    private static readonly string[] ModelKeyProperties = ["config_name", "name"];

    public static IQueryable<T> Apply<T>(CoveContext db, IQueryable<T> query, AiRunTargetType targetType, AiAnalysisCriterion? criterion)
        where T : BaseEntity
    {
        if (criterion == null)
            return query;

        if (!db.CanFilterByAiRuns)
        {
            throw new ForbiddenException(
                "Filtering by AI analysis requires permission to view AI runs.",
                PermissionKeys.AiRunsRead);
        }

        if (!string.IsNullOrWhiteSpace(criterion.Analysis))
            throw new FilterCriterionException("Filtering AI analysis by analysis kind is not supported yet.");

        var sourceKey = string.IsNullOrWhiteSpace(criterion.SourceKey) ? null : criterion.SourceKey.Trim();
        var runs = db.AiRuns.Where(run => run.TargetType == targetType);
        if (sourceKey != null)
            runs = runs.Where(run => run.SourceKey == sourceKey);

        query = ApplyStates(query, runs, criterion.States);
        query = ApplyModels(query, runs, criterion.ModelKeys, criterion.ModelModifier);
        return ApplyAnalysedAt(query, runs.Where(run => run.Status == AiRunStatus.Completed), criterion.AnalysedAtCriterion);
    }

    private static IQueryable<T> ApplyStates<T>(IQueryable<T> query, IQueryable<AiRun> runs, IReadOnlyCollection<AiAnalysisState>? states)
        where T : BaseEntity
    {
        if (states is not { Count: > 0 })
            return query;

        var wanted = states.SelectMany(ToStatuses).Distinct().ToArray();
        if (!states.Contains(AiAnalysisState.NeverRun))
        {
            // The latest run has one of the wanted statuses.
            return query.Where(item => runs.Any(run =>
                run.TargetId == EF.Property<int>(item, "Id")
                && wanted.Contains(run.Status)
                && !runs.Any(newer => newer.TargetId == run.TargetId
                    && (newer.StartedAt > run.StartedAt || (newer.StartedAt == run.StartedAt && newer.Id > run.Id)))));
        }

        // "Never run, or the latest run is wanted" is "no latest run is unwanted": an item has exactly one latest
        // run once it has any, so a single anti-join answers it without an OR across two subqueries.
        var unwanted = AllStatuses.Except(wanted).ToArray();
        if (unwanted.Length == 0)
            return query;

        return query.Where(item => !runs.Any(run =>
            run.TargetId == EF.Property<int>(item, "Id")
            && unwanted.Contains(run.Status)
            && !runs.Any(newer => newer.TargetId == run.TargetId
                && (newer.StartedAt > run.StartedAt || (newer.StartedAt == run.StartedAt && newer.Id > run.Id)))));
    }

    private static IEnumerable<AiRunStatus> ToStatuses(AiAnalysisState state) => state switch
    {
        AiAnalysisState.Completed => [AiRunStatus.Completed],
        AiAnalysisState.Failed => [AiRunStatus.Failed],
        AiAnalysisState.Cancelled => [AiRunStatus.Cancelled],
        // Stale Running rows (a worker that died mid-run) stay here until something closes them.
        AiAnalysisState.InProgress => [AiRunStatus.Pending, AiRunStatus.Running],
        _ => [],
    };

    /// <summary>
    /// Matches models over every completed run, not only the latest: the AI planner re-runs only superseded models,
    /// so the latest run may list a subset. A key matches a run model's <c>config_name</c> (what the facets list)
    /// or its display <c>name</c>, so a typed name works too; both are containment tests on the same row.
    /// </summary>
    private static IQueryable<T> ApplyModels<T>(IQueryable<T> query, IQueryable<AiRun> runs, IReadOnlyCollection<string>? modelKeys, CriterionModifier modifier)
        where T : BaseEntity
    {
        var keys = modelKeys?
            .Where(key => !string.IsNullOrWhiteSpace(key))
            .Select(key => key.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToArray() ?? [];
        if (keys.Length == 0)
            return query;

        // One containment test per key and model property, OR-ed into a single predicate on the run.
        var run = Expression.Parameter(typeof(AiRun), "run");
        Expression? usesModel = null;
        foreach (var key in keys)
        {
            foreach (var property in ModelKeyProperties)
            {
                var pattern = ModelPattern(property, key);
                Expression<Func<AiRun, bool>> contains = candidate => EF.Functions.JsonContains(candidate.Models!, pattern);
                var test = ReplacingExpressionVisitor.Replace(contains.Parameters[0], run, contains.Body);
                usesModel = usesModel == null ? test : Expression.OrElse(usesModel, test);
            }
        }

        var used = runs
            .Where(candidate => candidate.Status == AiRunStatus.Completed && candidate.Models != null)
            .Where(Expression.Lambda<Func<AiRun, bool>>(usesModel!, run));
        return modifier == CriterionModifier.Excludes
            ? query.Where(item => !used.Any(candidate => candidate.TargetId == EF.Property<int>(item, "Id")))
            : query.Where(item => used.Any(candidate => candidate.TargetId == EF.Property<int>(item, "Id")));
    }

    private static string ModelPattern(string property, string key)
        => System.Text.Json.JsonSerializer.Serialize(new[] { new Dictionary<string, string> { [property] = key } });

    /// <summary>
    /// Compares when the item was last analysed: the greatest <c>CompletedAt ?? StartedAt</c> over its completed
    /// runs, null when none completed. Each modifier is rewritten into EXISTS / NOT EXISTS tests on that maximum
    /// (for example "max &lt; t" is "some completed run, and none at or after t") so no per-row aggregate is needed.
    /// </summary>
    private static IQueryable<T> ApplyAnalysedAt<T>(IQueryable<T> query, IQueryable<AiRun> completed, TimestampCriterion? criterion)
        where T : BaseEntity
    {
        if (criterion == null)
            return query;
        criterion = RelativeDateEvaluation.Resolve(criterion);

        if (criterion.Modifier == CriterionModifier.IsNull)
            return query.Where(item => !completed.Any(run => run.TargetId == EF.Property<int>(item, "Id")));
        if (criterion.Modifier == CriterionModifier.NotNull)
            return query.Where(item => completed.Any(run => run.TargetId == EF.Property<int>(item, "Id")));

        if (!FilterHelpers.TryParseTimestamp(criterion.Value, out var ts1))
            return query;
        var ts2 = FilterHelpers.TryParseTimestamp(criterion.Value2, out var parsedTs2) ? parsedTs2 : ts1;
        var lower = ts1 <= ts2 ? ts1 : ts2;
        var upper = ts1 <= ts2 ? ts2 : ts1;

        return criterion.Modifier switch
        {
            CriterionModifier.GreaterThan => query.Where(item =>
                completed.Any(run => run.TargetId == EF.Property<int>(item, "Id") && (run.CompletedAt ?? run.StartedAt) > ts1)),
            CriterionModifier.LessThan => query.Where(item =>
                completed.Any(run => run.TargetId == EF.Property<int>(item, "Id"))
                && !completed.Any(run => run.TargetId == EF.Property<int>(item, "Id") && (run.CompletedAt ?? run.StartedAt) >= ts1)),
            CriterionModifier.Equals => query.Where(item =>
                completed.Any(run => run.TargetId == EF.Property<int>(item, "Id") && (run.CompletedAt ?? run.StartedAt) == ts1)
                && !completed.Any(run => run.TargetId == EF.Property<int>(item, "Id") && (run.CompletedAt ?? run.StartedAt) > ts1)),
            // Like the other nullable timestamps, "not equal" also matches items without a value.
            CriterionModifier.NotEquals => query.Where(item =>
                !completed.Any(run => run.TargetId == EF.Property<int>(item, "Id") && (run.CompletedAt ?? run.StartedAt) == ts1)
                || completed.Any(run => run.TargetId == EF.Property<int>(item, "Id") && (run.CompletedAt ?? run.StartedAt) > ts1)),
            CriterionModifier.Between => query.Where(item =>
                completed.Any(run => run.TargetId == EF.Property<int>(item, "Id")
                    && (run.CompletedAt ?? run.StartedAt) >= lower && (run.CompletedAt ?? run.StartedAt) <= upper)
                && !completed.Any(run => run.TargetId == EF.Property<int>(item, "Id") && (run.CompletedAt ?? run.StartedAt) > upper)),
            CriterionModifier.NotBetween => query.Where(item =>
                completed.Any(run => run.TargetId == EF.Property<int>(item, "Id") && (run.CompletedAt ?? run.StartedAt) > upper)
                || (completed.Any(run => run.TargetId == EF.Property<int>(item, "Id"))
                    && !completed.Any(run => run.TargetId == EF.Property<int>(item, "Id") && (run.CompletedAt ?? run.StartedAt) >= lower))),
            _ => query,
        };
    }
}

/// <summary>A filter criterion the server cannot evaluate as given. API callers receive it as a 400 response.</summary>
public sealed class FilterCriterionException(string message) : ArgumentException(message);
