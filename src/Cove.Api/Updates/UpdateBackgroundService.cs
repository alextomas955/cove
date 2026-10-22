namespace Cove.Api.Updates;

/// <summary>
/// Checks for updates on the configured interval (with jitter, and only when the persisted result is
/// stale, so restarts do not refetch) and starts an opt-in automatic update inside its window.
/// </summary>
internal sealed class UpdateBackgroundService(
    UpdateService updates,
    Cove.Core.Interfaces.CoveConfiguration config,
    IHostApplicationLifetime lifetime,
    ILogger<UpdateBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan StartupDelay = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan Tick = TimeSpan.FromMinutes(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await WaitForStartedAsync(stoppingToken);
            // Saved settings are applied right after start-up; also spread installs' first requests.
            await Task.Delay(StartupDelay + TimeSpan.FromSeconds(Random.Shared.Next(0, 120)), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    if (config.Updates.CheckEnabled && updates.IsCheckDue())
                        await updates.CheckAsync(stoppingToken);
                    await updates.TryAutoUpdateAsync(stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogWarning(ex, "Scheduled update check failed");
                }

                await Task.Delay(Tick, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
    }

    private Task WaitForStartedAsync(CancellationToken stoppingToken)
    {
        var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        lifetime.ApplicationStarted.Register(() => started.TrySetResult());
        stoppingToken.Register(() => started.TrySetCanceled(stoppingToken));
        return started.Task;
    }
}
