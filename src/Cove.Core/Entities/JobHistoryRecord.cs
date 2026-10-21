namespace Cove.Core.Entities;

/// <summary>
/// A finished job, kept so the job list survives a restart and so the job can be run again. Only the
/// most recent jobs are kept.
/// </summary>
public class JobHistoryRecord
{
    /// <summary>Insertion order; the newest records have the highest ids.</summary>
    public long Id { get; set; }

    public string JobId { get; set; } = string.Empty;

    /// <summary>The <c>JobOwner</c> key, or null for a job that belongs to no one in particular.</summary>
    public string? OwnerKey { get; set; }

    public DateTime CompletedAt { get; set; }

    /// <summary>The finished job's <c>JobInfo</c>, as JSON.</summary>
    public string Info { get; set; } = string.Empty;

    /// <summary>The HTTP method of the API request that started the job, or null when no request did.</summary>
    public string? RequestMethod { get; set; }

    /// <summary>The path and query string of the API request that started the job.</summary>
    public string? RequestPath { get; set; }

    /// <summary>The JSON body of the API request that started the job, or null when it had none.</summary>
    public string? RequestBody { get; set; }
}
