using Cove.Core.Interfaces;

namespace Cove.Api.Services;

/// <summary>
/// Bounds how many video streams Cove has ffmpeg decoding at once, across every generate operation.
///
/// This exists because the unit the user configures and the unit that costs machine time stopped
/// being the same thing. MaxParallelTasks counts concurrent work items, and while frame extraction
/// ran one ffmpeg per frame those were equivalent: N parallel videos meant N decoders. Batched
/// extraction hands one ffmpeg many seeks at once, so a single work item can open two dozen decoders,
/// and a setting of 25 would quietly mean six hundred. Previews are the same shape - one process
/// reading a dozen seeked inputs.
///
/// So the budget is denominated in decode inputs rather than in processes: every ffmpeg invocation
/// reserves one slot per input it opens, and the total in flight never exceeds the configured limit.
/// A user lowering the setting to keep their machine usable gets exactly that, whatever internal
/// batching the generator happens to use.
/// </summary>
public sealed class FfmpegConcurrencyLimiter(CoveConfiguration config)
{
    private readonly Lock _swap = new();
    private SemaphoreSlim? _slots;

    // Multi-slot reservations are taken one slot at a time, so two callers each holding half of what
    // they need would wait on each other forever. Admission serializes the taking, which makes that
    // impossible: a caller either collects its whole reservation or blocks before holding anything.
    private readonly SemaphoreSlim _admission = new(1, 1);
    private int _capacity;

    /// <summary>Concurrent decode inputs currently permitted. Follows the configured value.</summary>
    public int Capacity
    {
        get
        {
            EnsureCapacity();
            return _capacity;
        }
    }

    /// <summary>
    /// Reserves capacity for an ffmpeg invocation that opens <paramref name="inputs"/> inputs, and
    /// returns the reservation to release. A request larger than the whole budget is clamped rather
    /// than refused - the work still has to happen, it just gets the machine to itself.
    /// </summary>
    public async Task<IAsyncDisposable> AcquireAsync(int inputs, CancellationToken ct)
    {
        EnsureCapacity();
        var slots = _slots!;
        var wanted = Math.Clamp(inputs, 1, _capacity);

        await _admission.WaitAsync(ct);
        var taken = 0;
        try
        {
            for (; taken < wanted; taken++)
                await slots.WaitAsync(ct);
        }
        catch
        {
            // Hand back whatever was collected before the failure; otherwise a cancelled generate
            // would permanently shrink the budget.
            if (taken > 0) slots.Release(taken);
            throw;
        }
        finally
        {
            _admission.Release();
        }

        return new Reservation(slots, wanted);
    }

    /// <summary>Largest batch worth forming: never more than the whole budget.</summary>
    public int ClampBatchSize(int desired) => Math.Clamp(desired, 1, Capacity);

    private void EnsureCapacity()
    {
        var desired = config.MaxParallelTasks <= 0
            ? Environment.ProcessorCount
            : config.MaxParallelTasks;

        if (_slots != null && _capacity == desired)
            return;

        lock (_swap)
        {
            if (_slots != null && _capacity == desired)
                return;

            // Reservations already held belong to the previous semaphore and release against it, so
            // the old instance simply drains and is collected. Swapping cannot strand a holder.
            _slots = new SemaphoreSlim(desired, desired);
            _capacity = desired;
        }
    }

    private sealed class Reservation(SemaphoreSlim slots, int count) : IAsyncDisposable
    {
        private int _released;

        public ValueTask DisposeAsync()
        {
            if (Interlocked.Exchange(ref _released, 1) == 0)
                slots.Release(count);
            return ValueTask.CompletedTask;
        }
    }
}
