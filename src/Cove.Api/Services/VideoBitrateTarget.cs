namespace Cove.Api.Services;

/// <summary>
/// The bitrate a conversion aims for, derived from the output's resolution and frame rate rather than
/// from the source's bitrate.
///
/// Constant-quality encoding cannot answer "is this worth converting?", because it targets an absolute
/// quality knowing nothing about what the source spent - on an already-lean file it asks for more bits
/// than the original used. Targeting a bitrate the picture can actually make use of inverts that: the
/// answer is known before any encoding happens, so a file whose source already sits below the target is
/// skipped rather than degraded, and the output size is simple arithmetic.
///
/// The shape follows published delivery ladders (Apple's HLS authoring tiers, YouTube's upload
/// recommendations once their ~2x mastering headroom is removed) rather than a single measurement:
///
///   * bitrate rises sub-linearly with pixel count. A 4K frame does not need four times a 1080p
///     frame's bits, because larger frames hold proportionally more spatial redundancy.
///   * bitrate rises sub-linearly with frame rate. Every published ladder puts 60fps at roughly 1.5x
///     its 30fps tier, not 2x, because consecutive frames are more alike the faster they come.
///
/// Calibrated against a measured point: a 3840x2160 59.94fps source re-encoded to HEVC at 16541 kbps
/// was reported visually indistinguishable from a 54828 kbps H.264 original (and better in one spot,
/// having removed noise), while the same source at 6797 kbps was clearly worse. This model puts the
/// transparent target at 15124 kbps for that clip - 91% of the measured-good point and 2.2x the
/// measured-bad one.
///
/// The caveat is the one Netflix's per-title work exists for: content complexity dominates, so a fixed
/// target is an approximation. Grain and fine detail need more than this; flat animation needs far
/// less. These numbers were calibrated on deliberately high-detail material, so they behave as an
/// upper bound rather than an average.
/// </summary>
public static class VideoBitrateTarget
{
    /// <summary>Scales the whole ladder. Set so 2160p30 lands at 10 Mbps and 1080p30 at 3.5 Mbps.</summary>
    private const double BaseKbpsPerMegapixel = 2000d;

    /// <summary>Pixel-count exponent. 1.0 would be linear; measured ladders sit near 0.76.</summary>
    private const double PixelExponent = 0.76d;

    /// <summary>Frame-rate exponent. 0.6 puts 60fps at about 1.5x the 30fps tier.</summary>
    private const double FrameRateExponent = 0.6d;

    private const double ReferenceFrameRate = 30d;

    /// <summary>H.264 needs roughly 60% more bits than HEVC for the same picture.</summary>
    private const double H264Multiplier = 1.6d;

    /// <summary>AV1 is denser than HEVC; the gain is real but smaller than the headline claims.</summary>
    private const double Av1Multiplier = 0.85d;

    /// <summary>Assumed frame rate when a file does not report a usable one.</summary>
    private const double AssumedFrameRate = 30d;

    /// <summary>
    /// The bitrate, in kbit/s, at which <paramref name="codec"/> should be visually transparent for this
    /// resolution and frame rate. Returns 0 when the dimensions are unknown and nothing can be derived.
    /// </summary>
    public static int TransparentKbps(VideoConversionCodec codec, int width, int height, double frameRate)
    {
        if (width <= 0 || height <= 0)
            return 0;

        var megapixels = width * (double)height / 1_000_000d;
        var fps = frameRate > 0 ? frameRate : AssumedFrameRate;

        var kbps = BaseKbpsPerMegapixel
            * Math.Pow(megapixels, PixelExponent)
            * Math.Pow(fps / ReferenceFrameRate, FrameRateExponent)
            * CodecMultiplier(codec);

        return (int)Math.Round(kbps);
    }

    private static double CodecMultiplier(VideoConversionCodec codec) => codec switch
    {
        VideoConversionCodec.H264 => H264Multiplier,
        VideoConversionCodec.Av1 => Av1Multiplier,
        _ => 1d,
    };

    /// <summary>
    /// The bitrate for a rung, as its share of the transparent target. Returns 0 when no target can be
    /// derived, which callers treat as "no opinion" rather than "zero bitrate".
    /// </summary>
    public static int ForEffort(VideoConversionCodec codec, VideoConversionEffort effort, int width, int height, double frameRate)
    {
        var transparent = TransparentKbps(codec, width, height, frameRate);
        return transparent <= 0 ? 0 : (int)Math.Round(transparent * VideoConversionPlanner.Profile(effort).TargetShare);
    }

    /// <summary>
    /// The size, in bytes, a conversion at <paramref name="kbps"/> would produce, including a rough
    /// allowance for the audio that is copied through unchanged.
    /// </summary>
    public static long ProjectedBytes(int kbps, double durationSeconds, double audioKbps)
        => kbps <= 0 || durationSeconds <= 0
            ? 0
            : (long)((kbps + Math.Max(0, audioKbps)) * 1000d * durationSeconds / 8d);
}
