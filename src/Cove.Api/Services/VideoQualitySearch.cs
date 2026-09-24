using System.Globalization;
using System.Text;
using System.Text.Json;

namespace Cove.Api.Services;

/// <summary>
/// The quality a conversion must keep, and the per-video search that finds the smallest encode keeping it.
///
/// A conversion used to aim at a bitrate derived from resolution and frame rate. That could not work
/// across a real library, because what decides the right bitrate is how compressible this particular
/// footage is and how much real detail its source holds - neither of which is in the metadata. Two 8K
/// VR videos encoded to within 0.1% of the same bitrate were judged one transparent and one visibly
/// soft; every fitted curve fixed one case and broke another.
///
/// So quality is measured instead of predicted, the way per-title encoding does it: short samples of
/// the video are encoded at a candidate quality setting, scored against the source, and the setting is
/// searched until the score reaches the target. The whole video is then encoded at that setting.
///
/// The score is PSNR-HVS, chosen by measurement against judged conversions rather than by reputation:
///
///   verdict                                     PSNR-HVS    VMAF
///   8K VR, "soft"                                 44.27    97.21
///   1080p flat, "just barely shy of High"         45.50        -
///   8K VR, "slightly soft"                        45.54    98.30
///   1080p flat, "good"                            46.25        -
///   8K VR, "acceptable, slight loss"              46.69    99.03
///   6K/7K/8K VR, "indistinguishable" (x5)      46.55-48.8  97.1-99.0
///
/// PSNR-HVS put both "just short" verdicts at the same score on 1080p flat and 8K VR, 16x apart in
/// pixel count. VMAF could not: it scored two indistinguishable encodes below a soft one, because it
/// compresses the top of its scale and underweights the fine texture - freckles, hair - that was
/// actually lost. Plain PSNR separated the VR verdicts too but not across resolutions.
///
/// The one verdict no metric matched was a lean source judged indistinguishable at a lower score.
/// Its own detail was mostly the original encoder's noise, which scores as lost fidelity but is not
/// visible. The consequence is conservative - such a file keeps a few more bits than it needed, or
/// is skipped as not worth converting - never a visible loss.
/// </summary>
public static class VideoQualitySearch
{
    /// <summary>
    /// "High": judged indistinguishable on close inspection. Above both "just short" verdicts (45.50,
    /// 45.54) by about 1 dB, and at the level of the lowest scores judged fine.
    /// </summary>
    public const double HighTarget = 46.5;

    /// <summary>
    /// "Balanced": some fine detail lost at close inspection, most of the picture intact. Between the
    /// "slightly soft" verdicts (about 45.5) and the "strips too much detail" one (44.3).
    /// </summary>
    public const double BalancedTarget = 45.0;

    /// <summary>
    /// How close above the target a passing sample score must be to stop searching early. Smaller only
    /// buys a fraction of a percent of size for another round of sample encodes.
    /// </summary>
    public const double Tolerance = 0.25;

    /// <summary>Upper bound on sample-encode rounds per video; the search usually settles in two or three.</summary>
    public const int MaxRounds = 5;

    /// <summary>
    /// Eight one-second samples. Chosen by benchmark rather than by feel: 21 videos from 240p to 8K VR,
    /// each measured against a dense reference (16 x 4 s), comparing the quality every configuration's
    /// chosen setting really delivers.
    ///
    ///   config   worst shortfall   per-round time: 1080p    4K    8K VR
    ///   4 x 4 s      -0.46 dB                     10.7 s  26.5 s  49.2 s
    ///   4 x 2 s      -0.50 dB                      6.3 s  14.2 s  25.6 s
    ///   8 x 1 s      -0.29 dB                      8.2 s  16.1 s  27.5 s
    ///   8 x 2 s      -0.21 dB                     12.6 s  28.4 s  51.2 s
    ///
    /// What decides accuracy is how many places in the video are sampled, not how long each sample is:
    /// the misses come from scenes no sample reaches, and a longer window mostly repeats what its first
    /// second already showed. Two windows were outright unreliable. Below 720p a round costs about a
    /// second more than 4 x 4 s, because each sample's fixed ffmpeg start-up dominates there.
    /// A one-second clip encoded on its own scored within 0.02 dB of the first second of a longer one.
    /// </summary>
    public const int SampleCount = 8;

    public const double SampleSeconds = 1;

    public static double Target(VideoConversionEffort effort) => effort switch
    {
        VideoConversionEffort.HighSoftware or VideoConversionEffort.HighHardware => HighTarget,
        VideoConversionEffort.BalancedSoftware or VideoConversionEffort.BalancedHardware => BalancedTarget,
        _ => throw new ArgumentOutOfRangeException(nameof(effort), effort, "Unknown conversion effort."),
    };

    /// <summary>
    /// Where the samples come from: evenly through the video, away from the very start and end, which
    /// are often titles or fades that say little about the rest. A video too short for separate samples
    /// is measured whole.
    /// </summary>
    public static IReadOnlyList<(double Start, double Length)> SampleWindows(
        double duration, int count = SampleCount, double seconds = SampleSeconds)
    {
        if (duration <= 0)
            return [];
        if (duration <= count * seconds * 2)
            return [(0, duration)];

        var windows = new List<(double, double)>(count);
        for (var i = 0; i < count; i++)
        {
            var centre = duration * (0.1 + 0.8 * (i + 0.5) / count);
            windows.Add((Math.Max(0, centre - seconds / 2), seconds));
        }
        return windows;
    }

    /// <summary>
    /// The filter graph that scores an encoded sample (input 0) against the sample of the source it was
    /// made from (input 1).
    ///
    /// Frames are paired by index, not timestamp. libvmaf pairs by timestamp, and a container storing
    /// milliseconds rounds 1/30 s to 33 and 67 ms while the reference sits at 33.33 - which silently
    /// paired every third frame with its neighbour and made a lossless encode score 81 instead of 100.
    /// The reference takes the same fps filter the encode did, so both select identical frames.
    ///
    /// VR is scored on the left eye: it is how the footage is judged, and half the pixels to score.
    /// </summary>
    public static string ScoreFilter(int width, int height, double outputFrameRate, bool frameRateChanged, bool isVr, string logPath)
    {
        var rate = outputFrameRate.ToString("0.###", CultureInfo.InvariantCulture);
        var fps = frameRateChanged ? $"fps={rate}," : string.Empty;
        var index = $"settb=1/{rate},setpts=N,";
        var crop = isVr ? $"crop={width / 2}:{height}:0:0," : string.Empty;
        var log = EscapeFilterPath(logPath);
        return $"[1:v]{fps}{index}{crop}format=yuv420p[r];[0:v]{index}{crop}format=yuv420p[d];"
             + $"[d][r]libvmaf=model=version=vmaf_v0.6.1:feature=name=psnr_hvs:n_threads={ScoreThreads}"
             + $":log_fmt=json:log_path='{log}'";
    }

    /// <summary>Threads per scoring process. Scoring runs alongside encoding, so it leaves room for it.</summary>
    private static int ScoreThreads => Math.Clamp(Environment.ProcessorCount - 2, 1, 32);

    /// <summary>
    /// The score a round records when every sample was identical to its source - a still or black
    /// stretch that encodes perfectly. Well above any target, and finite so the search's arithmetic holds.
    /// </summary>
    public const double PerfectScore = 99;

    /// <summary>
    /// The mean PSNR-HVS over every frame of a libvmaf JSON log, or null when every frame was identical
    /// to its source. Every frame is used: scoring a subset is not a saving worth having, because encoders
    /// give alternating frame types systematically different quality - every fourth frame on one 8K
    /// sample scored 46.83 where all of them gave 44.99.
    ///
    /// A frame identical to its source scores infinity, which libvmaf writes as null. Such a frame says
    /// nothing about loss, so it is left out rather than counted. A metric missing altogether is a
    /// different thing - this ffmpeg cannot measure - and fails visibly.
    /// </summary>
    public static double? ParsePsnrHvs(string libvmafJson)
    {
        using var document = JsonDocument.Parse(libvmafJson);
        double sum = 0;
        var count = 0;
        var frames = 0;
        foreach (var frame in document.RootElement.GetProperty("frames").EnumerateArray())
        {
            frames++;
            if (!frame.GetProperty("metrics").TryGetProperty("psnr_hvs", out var value))
                throw new VideoConversionException("The quality measurement produced no PSNR-HVS scores; this ffmpeg's libvmaf may not support it.");
            if (value.ValueKind == JsonValueKind.Number)
            {
                sum += value.GetDouble();
                count++;
            }
        }
        if (frames == 0)
            throw new VideoConversionException("The quality measurement scored no frames.");
        return count == 0 ? null : sum / count;
    }

    /// <summary>
    /// A round's score from its samples' scores: the mean of those that lost anything, or
    /// <see cref="PerfectScore"/> when none did. A perfect sample is left out rather than averaged in,
    /// because it would pull the mean up with information about nothing.
    /// </summary>
    public static double RoundScore(IEnumerable<double?> sampleScores)
    {
        var measured = sampleScores.Where(score => score.HasValue).Select(score => score!.Value).ToList();
        return measured.Count == 0 ? PerfectScore : measured.Average();
    }

    /// <summary>ffmpeg filter arguments need ':' and '\' escaped inside a quoted path.</summary>
    public static string EscapeFilterPath(string path)
    {
        var builder = new StringBuilder(path.Length + 8);
        foreach (var c in path.Replace('\\', '/'))
        {
            if (c is ':' or '\'')
                builder.Append('\\');
            builder.Append(c);
        }
        return builder.ToString();
    }

    /// <summary>The size a whole-video encode will come out at, from what the samples cost.</summary>
    public static long PredictBytes(double sampleBytesPerSecond, double duration, double audioKbps)
        => sampleBytesPerSecond <= 0 || duration <= 0
            ? 0
            : (long)((sampleBytesPerSecond + Math.Max(0, audioKbps) * 1000 / 8) * duration);
}

/// <summary>
/// An encoder's constant-quality control, expressed as a "level" where higher always means a smaller,
/// lower-quality file - the direction of CRF and CQ. <see cref="HigherIsBetter"/> marks the one family
/// whose own scale runs the other way, so the search never has to know.
/// </summary>
public sealed record VideoQualityKnob(double Min, double Max, double Start, double Step, double Slope, bool HigherIsBetter = false)
{
    /// <summary>Snaps a level onto the encoder's granularity and range.</summary>
    public double Snap(double level) => Math.Clamp(Math.Round(level / Step) * Step, Min, Max);
}

/// <summary>
/// The search itself, kept apart from any I/O so it can be tested against a known score curve.
///
/// Score falls as the level rises, close to linearly: about 0.56 dB per NVENC CQ step on 8K VR. The
/// first guess uses the knob's expected slope, later ones the slope actually measured between rounds,
/// so a typical video settles in two or three rounds. It stops as soon as it holds a passing level
/// with a failing one a single step above it, or a pass within <see cref="VideoQualitySearch.Tolerance"/>
/// of the target.
/// </summary>
public sealed class VideoQualitySearchState(VideoQualityKnob knob, double target)
{
    private readonly List<(double Level, double Score, double BytesPerSecond)> _rounds = [];

    public IReadOnlyList<(double Level, double Score, double BytesPerSecond)> Rounds => _rounds;

    public VideoQualityKnob Knob => knob;
    public double Target => target;

    public void Record(double level, double score, double bytesPerSecond) => _rounds.Add((level, score, bytesPerSecond));

    /// <summary>The highest level that met the target, which is the smallest file that did.</summary>
    public (double Level, double Score, double BytesPerSecond)? Best
        => _rounds.Where(round => round.Score >= target).OrderByDescending(round => round.Level).Cast<(double, double, double)?>().FirstOrDefault();

    /// <summary>True when even the best quality the knob allows missed the target.</summary>
    public bool Unreachable => _rounds.Any(round => round.Level <= knob.Min && round.Score < target);

    /// <summary>The next level to try, or null when the search is finished.</summary>
    public double? Next()
    {
        if (_rounds.Count == 0)
            return knob.Snap(knob.Start);
        if (_rounds.Count >= VideoQualitySearch.MaxRounds || Unreachable)
            return null;

        var best = Best;
        var lowestFail = _rounds.Where(round => round.Score < target).OrderBy(round => round.Level).Cast<(double Level, double Score, double BytesPerSecond)?>().FirstOrDefault();

        if (best is { } pass)
        {
            if (pass.Score - target <= VideoQualitySearch.Tolerance || pass.Level >= knob.Max)
                return null;
            if (lowestFail is { } fail && fail.Level - pass.Level <= knob.Step + 1e-9)
                return null;
        }

        var last = _rounds[^1];
        double proposal;
        if (best is { } p && lowestFail is { } f && f.Level > p.Level)
        {
            // Bracketed: interpolate between the pass and the fail, staying strictly inside.
            var t = (p.Score - target) / Math.Max(1e-6, p.Score - f.Score);
            proposal = p.Level + t * (f.Level - p.Level);
            proposal = knob.Snap(proposal);
            if (proposal <= p.Level)
                proposal = p.Level + knob.Step;
            if (proposal >= f.Level)
                proposal = f.Level - knob.Step;
        }
        else
        {
            proposal = knob.Snap(last.Level + (last.Score - target) / MeasuredSlope());
        }

        // A proposal that snaps back onto a level already tried means the target lies within a step of
        // it - a video that missed by 0.12 dB at one level must still get to try the next one down, or the
        // search ends with no passing level at all. Step once in the direction the evidence points.
        if (Tried(proposal))
        {
            if (best is null && lowestFail is { } onlyFails)
                proposal = knob.Snap(onlyFails.Level - knob.Step);
            else if (lowestFail is null && best is { } onlyPasses)
                proposal = knob.Snap(onlyPasses.Level + knob.Step);
        }

        return Tried(proposal) ? null : proposal;
    }

    private bool Tried(double level) => _rounds.Any(round => Math.Abs(round.Level - level) < 1e-9);

    /// <summary>dB lost per level, from the two most recent rounds when they differ enough to trust.</summary>
    private double MeasuredSlope()
    {
        if (_rounds.Count >= 2)
        {
            var (a, b) = (_rounds[^1], _rounds[^2]);
            if (Math.Abs(a.Level - b.Level) >= knob.Step)
            {
                var slope = (b.Score - a.Score) / (a.Level - b.Level);
                if (slope > 0.05)
                    return Math.Clamp(slope, 0.1, 3);
            }
        }
        return knob.Slope;
    }
}
