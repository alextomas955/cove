using Microsoft.AspNetCore.Mvc;

namespace Cove.Api.Services;

/// <summary>
/// Runs the manual database migration once at a time, apart from the request that asked for it. The
/// backup and migration take minutes on a large library; tied to the request, a reloaded page would
/// cancel them part-way and offer to start again, and a second tab would start a second run. Here a
/// later request joins the run in progress, and <see cref="Phase"/> tells any page that one is running.
/// </summary>
public sealed class DatabaseMigrationCoordinator(IServiceScopeFactory scopeFactory, IHostApplicationLifetime lifetime)
{
    public const string PreparePhase = "prepare";
    public const string BackupPhase = "backup";
    public const string MigratePhase = "migrate";

    private readonly Lock _gate = new();
    private Task<ActionResult>? _current;
    private volatile string? _phase;

    /// <summary>
    /// The step a running migration is on (<see cref="PreparePhase"/>, <see cref="BackupPhase"/> or
    /// <see cref="MigratePhase"/>), or null when none runs.
    /// </summary>
    public string? Phase => _phase;

    /// <summary>
    /// Starts <paramref name="run"/> in its own service scope, or returns the run already in progress.
    /// The run stops only when the application does, not when a caller stops waiting.
    /// </summary>
    public Task<ActionResult> RunOrJoin(Func<IServiceProvider, Action<string>, CancellationToken, Task<ActionResult>> run)
    {
        lock (_gate)
        {
            if (_current is { IsCompleted: false })
                return _current;

            _phase = PreparePhase;
            _current = RunAsync(run);
            return _current;
        }
    }

    private async Task<ActionResult> RunAsync(Func<IServiceProvider, Action<string>, CancellationToken, Task<ActionResult>> run)
    {
        // Leave the caller's lock before any work runs.
        await Task.Yield();
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            return await run(scope.ServiceProvider, phase => _phase = phase, lifetime.ApplicationStopping);
        }
        finally
        {
            _phase = null;
        }
    }
}
