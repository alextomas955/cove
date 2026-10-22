using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Channels;
using Cove.Core.Entities;
using Cove.Core.Interfaces;
using Cove.Data;
using Microsoft.EntityFrameworkCore;

namespace Cove.Api.Services;

/// <summary>A finished job as the job history keeps it.</summary>
public sealed record StoredJob(JobOwner? Owner, JobInfo Info, JobReplayRequest? Request);

public interface IJobHistoryStore
{
    Task<IReadOnlyList<StoredJob>> LoadRecentAsync(CancellationToken ct);

    /// <summary>
    /// Queues a finished job to be written, replacing the saved copy of the same job if there is one; the
    /// oldest jobs beyond the limit are removed.
    /// </summary>
    void Save(StoredJob job);
}

/// <summary>
/// Keeps the most recent finished jobs in the database, so the job list survives a restart and its jobs
/// can be retried. Writes are queued and made in the background, in the order jobs finished.
/// </summary>
public sealed class JobHistoryStore(IServiceScopeFactory scopeFactory, ILogger<JobHistoryStore> logger)
    : BackgroundService, IJobHistoryStore
{
    /// <summary>How many finished jobs are kept, in memory and in the database.</summary>
    public const int Capacity = 100;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    private readonly Channel<StoredJob> _pending = Channel.CreateUnbounded<StoredJob>(new UnboundedChannelOptions { SingleReader = true });

    public async Task<IReadOnlyList<StoredJob>> LoadRecentAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoveContext>();
        var records = await db.JobHistory
            .AsNoTracking()
            .OrderByDescending(record => record.Id)
            .Take(Capacity)
            .ToListAsync(ct);

        return records
            .Select(record => new StoredJob(
                record.OwnerKey is null ? null : new JobOwner(record.OwnerKey),
                JsonSerializer.Deserialize<JobInfo>(record.Info, JsonOptions)!,
                record.RequestMethod is null || record.RequestPath is null
                    ? null
                    : new JobReplayRequest(record.RequestMethod, record.RequestPath, record.RequestBody)))
            .ToList();
    }

    public void Save(StoredJob job) => _pending.Writer.TryWrite(job);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var job in _pending.Reader.ReadAllAsync(stoppingToken))
            {
                try
                {
                    await WriteAsync(job, stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogError(ex, "Could not save job {JobId} to the job history", job.Info.Id);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Shutting down.
        }
    }

    private async Task WriteAsync(StoredJob job, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CoveContext>();
        var existing = await db.JobHistory.FirstOrDefaultAsync(record => record.JobId == job.Info.Id, ct);
        if (existing is not null)
        {
            // A correction to a job saved earlier (see JobService.RecordLateFailure).
            existing.OwnerKey = job.Owner?.Key;
            existing.CompletedAt = job.Info.CompletedAt ?? existing.CompletedAt;
            existing.Info = JsonSerializer.Serialize(job.Info, JsonOptions);
            existing.RequestMethod = job.Request?.Method;
            existing.RequestPath = job.Request?.Path;
            existing.RequestBody = job.Request?.Body;
            await db.SaveChangesAsync(ct);
            return;
        }

        db.JobHistory.Add(new JobHistoryRecord
        {
            JobId = job.Info.Id,
            OwnerKey = job.Owner?.Key,
            CompletedAt = job.Info.CompletedAt ?? DateTime.UtcNow,
            Info = JsonSerializer.Serialize(job.Info, JsonOptions),
            RequestMethod = job.Request?.Method,
            RequestPath = job.Request?.Path,
            RequestBody = job.Request?.Body,
        });
        await db.SaveChangesAsync(ct);

        var oldestKept = await db.JobHistory
            .OrderByDescending(record => record.Id)
            .Skip(Capacity - 1)
            .Select(record => (long?)record.Id)
            .FirstOrDefaultAsync(ct);
        if (oldestKept is { } cutoff)
            await db.JobHistory.Where(record => record.Id < cutoff).ExecuteDeleteAsync(ct);
    }
}
