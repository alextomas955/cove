using Cove.Core.Entities;
using Cove.Core.Interfaces;
using Cove.Data;
using Cove.Data.Repositories;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;

namespace Cove.Tests;

/// <summary>
/// The AI analysis filter runs inside every COUNT of a filtered list, so its latest-run test must stay a semi- or
/// anti-join that Postgres can answer from the ai_runs index, never a per-row "ORDER BY ... LIMIT 1" lookup or aggregate.
/// </summary>
public class AiAnalysisQueryShapeTests
{
    [Fact]
    public void LatestStateIsAnExistsWithNoNewerRun()
    {
        var sql = Sql(new AiAnalysisCriterion { SourceKey = "ext:ai.core", States = [AiAnalysisState.Failed] });

        Assert.Contains("END AND EXISTS (", sql, StringComparison.Ordinal);
        Assert.Contains("AND NOT EXISTS (", sql, StringComparison.Ordinal);
        Assert.Contains("a0.\"StartedAt\" > a.\"StartedAt\"", sql, StringComparison.Ordinal);
        Assert.DoesNotContain("LIMIT", sql, StringComparison.Ordinal);
        Assert.DoesNotContain("ORDER BY", sql, StringComparison.Ordinal);
    }

    [Fact]
    public void NeverRunOrStateIsOneAntiJoinWithoutOr()
    {
        var sql = Sql(new AiAnalysisCriterion { States = [AiAnalysisState.NeverRun, AiAnalysisState.Cancelled] });

        Assert.Contains("END AND NOT EXISTS (", sql, StringComparison.Ordinal);
        Assert.Contains("\"Status\" = ANY (@unwanted)", sql, StringComparison.Ordinal);
        Assert.DoesNotContain(") OR EXISTS (", sql, StringComparison.Ordinal);
        Assert.DoesNotContain(") OR NOT EXISTS (", sql, StringComparison.Ordinal);
        Assert.DoesNotContain("LIMIT", sql, StringComparison.Ordinal);
    }

    [Fact]
    public void AnalysedAtUsesExistenceTestsInsteadOfAnAggregate()
    {
        var sql = Sql(new AiAnalysisCriterion
        {
            AnalysedAtCriterion = new TimestampCriterion { Value = "2026-01-01T00:00:00Z", Modifier = CriterionModifier.LessThan },
        });

        Assert.Contains("COALESCE(", sql, StringComparison.Ordinal);
        Assert.DoesNotContain("max(", sql, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("LIMIT", sql, StringComparison.Ordinal);
    }

    [Fact]
    public void ModelsAreJsonContainmentTestsOnCompletedRuns()
    {
        var sql = Sql(new AiAnalysisCriterion { ModelKeys = ["clip_v2"], ModelModifier = CriterionModifier.Excludes });

        Assert.Contains("\"Models\" @> @pattern", sql, StringComparison.Ordinal);
        Assert.Contains("END AND NOT EXISTS (", sql, StringComparison.Ordinal);
    }

    [Fact]
    public void AnAnalysisKindIsRejected()
    {
        using var context = CreatePostgresContext();
        Assert.Throws<FilterCriterionException>(() =>
            AiAnalysisQuery.Apply(context, context.Videos, AiRunTargetType.Video, new AiAnalysisCriterion { Analysis = "tags" }));
    }

    private static string Sql(AiAnalysisCriterion criterion)
    {
        using var context = CreatePostgresContext();
        return AiAnalysisQuery.Apply(context, context.Videos, AiRunTargetType.Video, criterion)
            .Select(video => video.Id)
            .ToQueryString();
    }

    private static CoveContext CreatePostgresContext()
    {
        var options = new DbContextOptionsBuilder<CoveContext>()
            .UseNpgsql(
                "Host=localhost;Database=query_shape;Username=query_shape;Password=query_shape",
                npgsql => npgsql.UseVector())
            .Options;

        return new CoveContext(options);
    }
}
