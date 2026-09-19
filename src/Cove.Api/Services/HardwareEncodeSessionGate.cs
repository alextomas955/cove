using Cove.Core.Interfaces;

namespace Cove.Api.Services;

/// <summary>
/// Caps concurrent hardware-encode sessions across every Cove feature that encodes on the GPU (preview
/// generation, library conversion). Consumer GeForce GPUs limit simultaneous NVENC encode sessions
/// (historically 2-3, raised to 5 then 8 on recent drivers); letting each feature spawn its own sessions
/// can overrun that, and ffmpeg then fails with
/// "nvEncOpenEncodeSessionEx failed: 10 (NV_ENC_ERR_OUT_OF_MEMORY) / Too many concurrent sessions".
/// The limit comes from config.HardwareEncodeSessionLimit (0 = a safe default of 2, the floor across
/// consumer drivers); users on newer drivers (5-8) or pro cards can raise it. Software encodes are not
/// throttled. (This does NOT address NV_ENC_ERR_INCOMPATIBLE_CLIENT_KEY (21), a driver/NVENC library
/// mismatch — callers fall back to a software encoder for that instead.)
/// </summary>
public sealed class HardwareEncodeSessionGate(CoveConfiguration config)
{
    private const int DefaultLimit = 2;

    private SemaphoreSlim? _gate;
    private int _capacity;
    private readonly object _lock = new();

    public int Capacity => config.HardwareEncodeSessionLimit > 0 ? config.HardwareEncodeSessionLimit : DefaultLimit;

    public async Task<IDisposable> AcquireAsync(CancellationToken ct)
    {
        var gate = Current();
        await gate.WaitAsync(ct);
        return new Lease(gate);
    }

    private SemaphoreSlim Current()
    {
        var desired = Capacity;
        lock (_lock)
        {
            // Recreate when the configured limit changes so a Settings change takes effect without a
            // restart. The old gate is GC'd once its holders release.
            if (_gate != null && _capacity == desired) return _gate;
            _capacity = desired;
            return _gate = new SemaphoreSlim(desired);
        }
    }

    private sealed class Lease(SemaphoreSlim gate) : IDisposable
    {
        private int _released;

        public void Dispose()
        {
            if (Interlocked.Exchange(ref _released, 1) == 0)
                gate.Release();
        }
    }
}
