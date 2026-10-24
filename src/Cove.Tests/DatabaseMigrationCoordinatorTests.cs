using Cove.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Cove.Tests;

public sealed class DatabaseMigrationCoordinatorTests
{
    private static DatabaseMigrationCoordinator CreateCoordinator()
        => new(new ServiceCollection().BuildServiceProvider().GetRequiredService<IServiceScopeFactory>(), new StubLifetime());

    [Fact]
    public async Task ARequestDuringARunJoinsItAndTheRunReportsItsStep()
    {
        var coordinator = CreateCoordinator();
        var release = new TaskCompletionSource();
        var runs = 0;

        async Task<ActionResult> Run(IServiceProvider services, Action<string> setPhase, CancellationToken ct)
        {
            Interlocked.Increment(ref runs);
            setPhase(DatabaseMigrationCoordinator.BackupPhase);
            await release.Task;
            return new OkObjectResult("done");
        }

        Assert.Null(coordinator.Phase);
        var first = coordinator.RunOrJoin(Run);
        var second = coordinator.RunOrJoin(Run);

        Assert.Same(first, second);
        await WaitUntilAsync(() => coordinator.Phase == DatabaseMigrationCoordinator.BackupPhase);

        release.SetResult();
        await first;

        Assert.Equal(1, runs);
        Assert.Null(coordinator.Phase);
    }

    [Fact]
    public async Task ACallerThatStopsWaitingDoesNotStopTheRun()
    {
        var coordinator = CreateCoordinator();
        var release = new TaskCompletionSource();
        var finished = false;

        async Task<ActionResult> Run(IServiceProvider services, Action<string> setPhase, CancellationToken ct)
        {
            await release.Task;
            finished = !ct.IsCancellationRequested;
            return new OkObjectResult("done");
        }

        using var leaving = new CancellationTokenSource();
        var waiting = coordinator.RunOrJoin(Run).WaitAsync(leaving.Token);
        await leaving.CancelAsync();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => waiting);
        Assert.NotNull(coordinator.Phase);

        release.SetResult();
        await coordinator.RunOrJoin(Run);

        Assert.True(finished);
        Assert.Null(coordinator.Phase);
    }

    [Fact]
    public async Task AFinishedRunLetsTheNextRequestStartAnother()
    {
        var coordinator = CreateCoordinator();
        var runs = 0;
        Task<ActionResult> Run(IServiceProvider services, Action<string> setPhase, CancellationToken ct)
        {
            Interlocked.Increment(ref runs);
            return Task.FromResult<ActionResult>(new OkObjectResult("done"));
        }

        await coordinator.RunOrJoin(Run);
        await coordinator.RunOrJoin(Run);

        Assert.Equal(2, runs);
    }

    private static async Task WaitUntilAsync(Func<bool> condition)
    {
        for (var attempt = 0; attempt < 200 && !condition(); attempt++)
            await Task.Delay(10, TestContext.Current.CancellationToken);
        Assert.True(condition());
    }

    private sealed class StubLifetime : IHostApplicationLifetime
    {
        public CancellationToken ApplicationStarted => CancellationToken.None;
        public CancellationToken ApplicationStopping => CancellationToken.None;
        public CancellationToken ApplicationStopped => CancellationToken.None;
        public void StopApplication() { }
    }
}
