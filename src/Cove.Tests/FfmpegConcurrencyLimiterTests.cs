using Cove.Api.Services;
using Cove.Core.Interfaces;

namespace Cove.Tests;

/// <summary>
/// The decode budget is what makes the MaxParallelTasks setting mean something once one ffmpeg can
/// open two dozen inputs at a time. These tests pin the properties that matter: the ceiling actually
/// holds, an oversized request still runs, and nothing can wedge the budget shut.
/// </summary>
public class FfmpegConcurrencyLimiterTests
{
    private static FfmpegConcurrencyLimiter Limiter(int capacity)
        => new(new CoveConfiguration { MaxParallelTasks = capacity });

    [Fact]
    public void CapacityFollowsTheConfiguredValue()
    {
        Assert.Equal(7, Limiter(7).Capacity);
    }

    [Fact]
    public void NonPositiveConfigurationFallsBackToTheProcessorCount()
    {
        Assert.Equal(Environment.ProcessorCount, Limiter(0).Capacity);
    }

    [Fact]
    public async Task ConcurrentReservationsNeverExceedCapacity()
    {
        const int capacity = 12;
        var limiter = Limiter(capacity);
        var inFlight = 0;
        var peak = 0;
        var sync = new Lock();

        // Mixed widths, deliberately including requests that cannot both be held at once.
        var sizes = new[] { 8, 1, 5, 12, 3, 7, 1, 9, 4, 2, 6, 11 };
        await Task.WhenAll(sizes.Select(async size =>
        {
            await using var reservation = await limiter.AcquireAsync(size, TestContext.Current.CancellationToken);
            lock (sync)
            {
                inFlight += size;
                peak = Math.Max(peak, inFlight);
            }
            await Task.Delay(15, TestContext.Current.CancellationToken);
            lock (sync) { inFlight -= size; }
        }));

        Assert.True(peak <= capacity, $"peak concurrent inputs {peak} exceeded capacity {capacity}");
        Assert.Equal(0, inFlight);
    }

    /// <summary>
    /// Several callers each needing more than half the budget is exactly the shape that deadlocks a
    /// naive take-one-slot-at-a-time implementation: each ends up holding part of what the other
    /// needs. Admission has to be serialized for this to terminate.
    /// </summary>
    [Fact]
    public async Task OverlappingLargeReservationsDoNotDeadlock()
    {
        var limiter = Limiter(10);

        var work = Enumerable.Range(0, 8).Select(async _ =>
        {
            await using var reservation = await limiter.AcquireAsync(6, TestContext.Current.CancellationToken);
            await Task.Delay(10, TestContext.Current.CancellationToken);
        });

        var all = Task.WhenAll(work);
        var finished = await Task.WhenAny(all, Task.Delay(TimeSpan.FromSeconds(20), TestContext.Current.CancellationToken));
        Assert.Same(all, finished);
        await all;
    }

    /// <summary>A batch wider than the whole budget must still run, with the budget to itself.</summary>
    [Fact]
    public async Task RequestLargerThanCapacityIsClampedRatherThanBlockingForever()
    {
        var limiter = Limiter(4);

        var acquire = limiter.AcquireAsync(50, TestContext.Current.CancellationToken);
        var finished = await Task.WhenAny(acquire, Task.Delay(TimeSpan.FromSeconds(10), TestContext.Current.CancellationToken));
        Assert.Same(acquire, finished);

        await using var reservation = await acquire;
        Assert.NotNull(reservation);
    }

    [Fact]
    public async Task ReleasedReservationsReturnTheirSlots()
    {
        var limiter = Limiter(4);

        for (var round = 0; round < 25; round++)
            await (await limiter.AcquireAsync(4, TestContext.Current.CancellationToken)).DisposeAsync();

        // If any round leaked, the budget would be exhausted and this would never complete.
        var acquire = limiter.AcquireAsync(4, TestContext.Current.CancellationToken);
        var finished = await Task.WhenAny(acquire, Task.Delay(TimeSpan.FromSeconds(10), TestContext.Current.CancellationToken));
        Assert.Same(acquire, finished);
        await (await acquire).DisposeAsync();
    }

    /// <summary>
    /// A cancelled acquisition must not keep the slots it had already collected, or every cancelled
    /// generate would permanently shrink the budget until Cove restarted.
    /// </summary>
    [Fact]
    public async Task CancelledAcquisitionDoesNotLeakPartiallyCollectedSlots()
    {
        var limiter = Limiter(4);

        // Hold the whole budget so the next request blocks part-way through collecting.
        var held = await limiter.AcquireAsync(3, TestContext.Current.CancellationToken);

        using var cts = new CancellationTokenSource();
        var blocked = limiter.AcquireAsync(3, cts.Token);
        await Task.Delay(50, TestContext.Current.CancellationToken);
        await cts.CancelAsync();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => blocked);

        await held.DisposeAsync();

        // All four slots must be available again.
        var acquire = limiter.AcquireAsync(4, TestContext.Current.CancellationToken);
        var finished = await Task.WhenAny(acquire, Task.Delay(TimeSpan.FromSeconds(10), TestContext.Current.CancellationToken));
        Assert.Same(acquire, finished);
        await (await acquire).DisposeAsync();
    }

    [Fact]
    public async Task DisposingTwiceDoesNotInflateTheBudget()
    {
        var limiter = Limiter(2);
        var reservation = await limiter.AcquireAsync(2, TestContext.Current.CancellationToken);
        await reservation.DisposeAsync();
        await reservation.DisposeAsync();

        // A double release would push the count above capacity and let three run at once.
        var inFlight = 0;
        var peak = 0;
        var sync = new Lock();
        await Task.WhenAll(Enumerable.Range(0, 6).Select(async _ =>
        {
            await using var held = await limiter.AcquireAsync(1, TestContext.Current.CancellationToken);
            lock (sync) { inFlight++; peak = Math.Max(peak, inFlight); }
            await Task.Delay(15, TestContext.Current.CancellationToken);
            lock (sync) { inFlight--; }
        }));
        Assert.True(peak <= 2, $"peak {peak} exceeded capacity 2 after a double dispose");
    }

    [Fact]
    public void BatchSizeIsClampedToTheBudget()
    {
        Assert.Equal(6, Limiter(6).ClampBatchSize(24));
        Assert.Equal(24, Limiter(64).ClampBatchSize(24));
        Assert.Equal(1, Limiter(8).ClampBatchSize(0));
    }
}
