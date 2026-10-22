using Cove.Core.Auth;
using Cove.Core.DTOs;
using Cove.Core.Entities;
using System.Text.Json;
using Cove.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Cove.Api.Controllers;

[ApiController]
[Route("api/ai-runs")]
[RequiresPermission(Permissions.AiRunsRead)]
public class AiRunsController(CoveContext db, IMemoryCache? memoryCache = null, ICurrentPrincipalAccessor? principalAccessor = null) : ControllerBase
{
    private static readonly TimeSpan FacetCacheDuration = TimeSpan.FromSeconds(30);

    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<AiRunDto>>> List(
        [FromQuery] AiRunTargetType? targetType,
        [FromQuery] int? targetId,
        [FromQuery] string? sourceKey,
        [FromQuery] string? runKey,
        [FromQuery] AiRunStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int perPage = 50,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        perPage = Math.Clamp(perPage, 1, 250);

        var query = db.AiRuns.AsNoTracking().AsQueryable();

        if (targetType.HasValue)
            query = query.Where(run => run.TargetType == targetType.Value);

        if (targetId.HasValue)
            query = query.Where(run => run.TargetId == targetId.Value);

        if (!string.IsNullOrWhiteSpace(sourceKey))
            query = query.Where(run => run.SourceKey == sourceKey);

        if (!string.IsNullOrWhiteSpace(runKey))
            query = query.Where(run => run.RunKey == runKey);

        if (status.HasValue)
            query = query.Where(run => run.Status == status.Value);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(run => run.StartedAt)
            .ThenByDescending(run => run.Id)
            .Skip((page - 1) * perPage)
            .Take(perPage)
            .ToListAsync(cancellationToken);

        return Ok(new PaginatedResponse<AiRunDto>(items.Select(MapToDto).ToList(), totalCount, page, perPage));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AiRunDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var run = await db.AiRuns.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        return run is null ? NotFound() : Ok(MapToDto(run));
    }

    /// <summary>
    /// The AI run sources recorded for one target type, with run counts, for the AI analysis filter. Models (the
    /// distinct <c>config_name</c> of completed runs, optionally of one source) are listed only when
    /// <paramref name="include"/> is <c>models</c>, because they need the runs' model lists.
    /// </summary>
    [HttpGet("facets")]
    public async Task<ActionResult<AiRunFacetsDto>> Facets(
        [FromQuery] AiRunTargetType targetType,
        [FromQuery] string? sourceKey,
        [FromQuery] string? include,
        CancellationToken cancellationToken = default)
    {
        var includeModels = string.Equals(include?.Trim(), "models", StringComparison.OrdinalIgnoreCase);
        sourceKey = string.IsNullOrWhiteSpace(sourceKey) ? null : sourceKey.Trim();

        // Run visibility follows the caller's permissions, so the short cache is per caller.
        var principal = principalAccessor?.Current;
        var cacheKey = $"ai-run-facets:{principal?.Kind}:{principal?.UserId}:{principal?.TokenId}:{principal?.Username}:{targetType}:{sourceKey}:{includeModels}";
        if (memoryCache != null && memoryCache.TryGetValue(cacheKey, out AiRunFacetsDto? cached) && cached != null)
            return Ok(cached);

        var runs = db.AiRuns.AsNoTracking().Where(run => run.TargetType == targetType);
        var sources = await runs
            .GroupBy(run => run.SourceKey)
            .Select(group => new AiRunSourceFacetDto(group.Key, group.Count()))
            .ToListAsync(cancellationToken);
        sources.Sort((left, right) => string.CompareOrdinal(left.SourceKey, right.SourceKey));

        List<AiRunModelFacetDto>? models = null;
        if (includeModels)
        {
            var completed = runs.Where(run => run.Status == AiRunStatus.Completed && run.Models != null);
            if (sourceKey != null)
                completed = completed.Where(run => run.SourceKey == sourceKey);
            // Runs of one configuration repeat the same model list, so DISTINCT leaves few documents to read.
            var documents = await completed.Select(run => run.Models!).Distinct().ToListAsync(cancellationToken);
            models = ExtractModels(documents);
        }

        var result = new AiRunFacetsDto(sources, models);
        memoryCache?.Set(cacheKey, result, FacetCacheDuration);
        return Ok(result);
    }

    private static List<AiRunModelFacetDto> ExtractModels(IEnumerable<JsonDocument> documents)
    {
        var byKey = new Dictionary<string, string?>(StringComparer.Ordinal);
        foreach (var document in documents)
        {
            using (document)
            {
                if (document.RootElement.ValueKind != JsonValueKind.Array)
                    continue;
                foreach (var model in document.RootElement.EnumerateArray())
                {
                    if (model.ValueKind != JsonValueKind.Object)
                        continue;
                    var configName = ReadString(model, "config_name");
                    var name = ReadString(model, "name");
                    var key = configName ?? name;
                    if (key == null)
                        continue;
                    if (!byKey.TryGetValue(key, out var existing) || existing == null)
                        byKey[key] = name != null && name != key ? name : null;
                }
            }
        }

        return byKey
            .OrderBy(pair => pair.Key, StringComparer.OrdinalIgnoreCase)
            .Select(pair => new AiRunModelFacetDto(pair.Key, pair.Value))
            .ToList();
    }

    private static string? ReadString(JsonElement element, string property)
        => element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(value.GetString())
            ? value.GetString()!.Trim()
            : null;

    private static AiRunDto MapToDto(AiRun run) => new(
        run.Id,
        run.RunKey,
        run.SourceKey,
        run.TargetType,
        run.TargetId,
        run.Trigger,
        run.JobId,
        run.Status,
        run.StartedAt,
        run.CompletedAt,
        run.LoadPolicy,
        run.FrameIntervalSec,
        run.Vr,
        run.Request?.RootElement.Clone(),
        run.Models?.RootElement.Clone(),
        run.Summary?.RootElement.Clone(),
        run.Error,
        run.CreatedAt,
        run.UpdatedAt);
}

/// <summary>An AI run source and how many runs it recorded for the requested target type.</summary>
public sealed record AiRunSourceFacetDto(string SourceKey, int RunCount);

/// <summary>A model used by completed runs: its <c>config_name</c> (or name when it has none), and a distinct display name.</summary>
public sealed record AiRunModelFacetDto(string Key, string? Name);

public sealed record AiRunFacetsDto(IReadOnlyList<AiRunSourceFacetDto> Sources, IReadOnlyList<AiRunModelFacetDto>? Models);
