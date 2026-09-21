using System.Globalization;
using System.Text;
using System.Text.Json;

namespace Cove.Api.Services;

public enum VideoConversionCodec
{
    /// <summary>Keep the video stream as it is and only change the container (a remux).</summary>
    Copy,
    H264,
    Hevc,
    Av1,
}

public enum VideoConversionContainer
{
    Mp4,
    Mkv,
}

/// <summary>
/// The single ladder the convert dialog offers, ordered from most quality to most speed. It replaces a
/// separate quality and speed pair, because those two controls were not independent in practice:
/// measured on a 4K source at a fixed quality target, hevc_nvenc's p4, p5, p6 and p7 presets landed
/// within 1% of the same size and 0.2 VMAF of each other while p7 cost 2.4x p4's time, and libx265's
/// "slower" cost 4x "slow" for 0.3 VMAF. Most of the nine combinations were therefore indistinguishable
/// or simply slower for nothing, and picking between them meant understanding encoder internals.
///
/// Each rung names its intent rather than a quality standard, because the same encoder setting lands at
/// very different measured quality depending on the content: on one 4K source libx265 slow scored 95.1
/// VMAF, and on a grainy over-encoded 1080p one the same class of setting scored 79.7.
///
/// Hardware rungs are separate entries rather than a toggle: a machine without a usable hardware encoder
/// cannot offer them at all, and hardware is a different quality-per-bit trade rather than a modifier -
/// at matched size libx265 scored 2.4 VMAF above hevc_nvenc, and reached the same quality as it using
/// 37% fewer bits.
/// </summary>
public enum VideoConversionEffort
{
    /// <summary>
    /// The bitrate judged practically identical to the original on high-detail 4K footage. Software
    /// encoder: best quality per bit, and by far the slowest.
    /// </summary>
    HighSoftware,

    /// <summary>The same target on the GPU. Several times faster.</summary>
    HighHardware,

    /// <summary>
    /// 70% of the High target. Judged to lose fine detail - hair, freckles - at a few feet, while
    /// most of the picture holds up. Software encoder.
    /// </summary>
    BalancedSoftware,

    /// <summary>70% of the High target, on the GPU.</summary>
    BalancedHardware,
}

/// <summary>What a rung resolves to: which encoder family, its preset, its quality target, and how much
/// of the source's video bitrate the result may use.</summary>
/// <summary>
/// What a rung resolves to: which encoder family, its preset, and what share of the resolution's
/// transparent bitrate it aims for.
/// </summary>
public sealed record VideoConversionEffortProfile(
    bool PreferHardware,
    string SoftwarePreset,
    string HardwarePreset,
    double TargetShare);

/// <summary>What a conversion job produces for every selected video.</summary>
public sealed record VideoConversionSettings(
    VideoConversionCodec Codec,
    VideoConversionContainer Container,
    VideoConversionEffort Effort,
    bool ReplaceOriginal,
    bool DiscardIfLarger,
    /// <summary>Re-encode at this frame rate instead of the source's. Lowers the bitrate target too,
    /// since the target is derived from the output's frame rate.</summary>
    double? OutputFrameRate = null,
    /// <summary>Convert even when the predicted saving is too small to be obviously worthwhile.</summary>
    bool ConvertMarginalSavings = false);

/// <summary>A user-facing reason a video cannot be converted as asked. The message is shown on the job unit.</summary>
public sealed class VideoConversionException(string message) : Exception(message);

public sealed record ProbedStream(
    int Index,
    string CodecType,
    string CodecName,
    string? PixelFormat,
    int BitsPerRawSample,
    bool AttachedPicture,
    string? ColorPrimaries,
    string? ColorTransfer,
    string? ColorSpace,
    double BitRateKbps = 0,
    int Width = 0,
    int Height = 0,
    double FrameRate = 0);

/// <summary>The parts of an ffprobe <c>-show_format -show_streams</c> result a conversion needs.</summary>
public sealed record ProbedMedia(double Duration, IReadOnlyList<ProbedStream> Streams)
{
    /// <summary>The main video stream: the first video stream that is not embedded cover art.</summary>
    public ProbedStream? Video => Streams.FirstOrDefault(stream => stream.CodecType == "video" && !stream.AttachedPicture);

    public IEnumerable<ProbedStream> Audio => Streams.Where(stream => stream.CodecType == "audio");

    public IEnumerable<ProbedStream> Subtitles => Streams.Where(stream => stream.CodecType == "subtitle");

    /// <summary>
    /// The video stream's bitrate in kbit/s, which is what a conversion's ceiling is measured against.
    /// Not every container records a per-stream rate, so it falls back to the container average minus
    /// whatever the audio streams declare - an estimate, but one that errs high and so only ever makes
    /// the ceiling more generous.
    /// </summary>
    public double VideoBitRateKbps
    {
        get
        {
            if (Video is { BitRateKbps: > 0 } video)
                return video.BitRateKbps;
            if (OverallBitRateKbps <= 0)
                return 0;
            var audio = Audio.Sum(stream => stream.BitRateKbps);
            return Math.Max(0, OverallBitRateKbps - audio);
        }
    }

    /// <summary>Container average bitrate in kbit/s, when the probe reported one.</summary>
    public double OverallBitRateKbps { get; init; }

    public static ProbedMedia Parse(string ffprobeJson)
    {
        using var document = JsonDocument.Parse(ffprobeJson);
        var root = document.RootElement;

        var streams = new List<ProbedStream>();
        if (root.TryGetProperty("streams", out var streamArray) && streamArray.ValueKind == JsonValueKind.Array)
        {
            foreach (var stream in streamArray.EnumerateArray())
            {
                var attachedPicture = stream.TryGetProperty("disposition", out var disposition)
                    && disposition.TryGetProperty("attached_pic", out var attached)
                    && attached.ValueKind == JsonValueKind.Number
                    && attached.GetInt32() == 1;
                streams.Add(new ProbedStream(
                    stream.TryGetProperty("index", out var index) && index.ValueKind == JsonValueKind.Number ? index.GetInt32() : streams.Count,
                    String(stream, "codec_type") ?? string.Empty,
                    String(stream, "codec_name") ?? string.Empty,
                    String(stream, "pix_fmt"),
                    int.TryParse(String(stream, "bits_per_raw_sample"), NumberStyles.Integer, CultureInfo.InvariantCulture, out var bits) ? bits : 0,
                    attachedPicture,
                    String(stream, "color_primaries"),
                    String(stream, "color_transfer"),
                    String(stream, "color_space"),
                    Number(stream, "bit_rate") / 1000d,
                    (int)Number(stream, "width"),
                    (int)Number(stream, "height"),
                    Fraction(stream, "avg_frame_rate") is > 0 and var avg ? avg : Fraction(stream, "r_frame_rate")));
            }
        }

        var duration = root.TryGetProperty("format", out var format) ? Number(format, "duration") : 0;
        if (duration <= 0)
        {
            // Some containers only carry a per-stream duration.
            duration = streamArray.ValueKind == JsonValueKind.Array
                ? streamArray.EnumerateArray()
                    .Where(stream => String(stream, "codec_type") == "video")
                    .Select(stream => Number(stream, "duration"))
                    .DefaultIfEmpty(0)
                    .Max()
                : 0;
        }

        var overall = root.TryGetProperty("format", out var formatElement) ? Number(formatElement, "bit_rate") / 1000d : 0;
        return new ProbedMedia(duration, streams) { OverallBitRateKbps = overall };
    }

    private static string? String(JsonElement element, string property)
        => element.TryGetProperty(property, out var value)
            ? value.ValueKind switch
            {
                JsonValueKind.String => value.GetString(),
                JsonValueKind.Number => value.GetRawText(),
                _ => null,
            }
            : null;

    /// <summary>ffprobe reports frame rates as "30000/1001"; 0 when absent or degenerate.</summary>
    private static double Fraction(JsonElement element, string property)
    {
        var text = String(element, property);
        if (string.IsNullOrWhiteSpace(text))
            return 0;
        var slash = text.IndexOf('/');
        if (slash < 0)
            return double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var plain) ? plain : 0;
        return double.TryParse(text[..slash], NumberStyles.Float, CultureInfo.InvariantCulture, out var num)
            && double.TryParse(text[(slash + 1)..], NumberStyles.Float, CultureInfo.InvariantCulture, out var den)
            && den > 0
            ? num / den
            : 0;
    }

    private static double Number(JsonElement element, string property)
        => double.TryParse(String(element, property), NumberStyles.Float, CultureInfo.InvariantCulture, out var value) ? value : 0;
}

/// <summary>
/// A slice of the source to encode as a trial run, to find out what the full conversion would produce
/// without paying for it.
/// </summary>
public sealed record VideoConversionSample(double StartSeconds, double DurationSeconds);

/// <summary>The ffmpeg run that converts one file, and what it will produce.</summary>
public sealed record VideoConversionPlan(
    string Arguments,
    bool CopiesVideo,
    string ExpectedVideoCodec,
    int AudioStreamCount,
    IReadOnlyList<string> Notes);

/// <summary>
/// The decisions of a library conversion that need no I/O: whether a file needs converting at all, where
/// the result goes, which streams it keeps, and the ffmpeg command line. <see cref="VideoConversionJobService"/>
/// runs the plans.
/// </summary>
public static class VideoConversionPlanner
{
    /// <summary>Suffix of the file ffmpeg writes to. It is not a video extension, so a scan that runs mid-encode ignores it.</summary>
    public const string PartialSuffix = ".cove-partial";

    /// <summary>
    /// The largest duration difference between the converted and original file that still counts as the
    /// same video. It matches the primary-file swap's tolerance, which would refuse anything further apart.
    /// </summary>
    public const double DurationTolerance = 1;

    // Codecs the MP4 muxer stores without re-encoding. Everything else in an MP4 target gets re-encoded
    // (audio) or dropped (image subtitles), or refuses a video stream copy.
    private static readonly HashSet<string> Mp4VideoCodecs = ["h264", "hevc", "av1", "vp9", "mpeg4", "mpeg2video", "mpeg1video"];
    private static readonly HashSet<string> Mp4AudioCodecs = ["aac", "mp3", "ac3", "eac3", "opus", "flac", "alac"];
    private static readonly HashSet<string> TextSubtitleCodecs = ["subrip", "srt", "ass", "ssa", "webvtt", "mov_text", "text"];

    public static string CodecName(VideoConversionCodec codec) => codec switch
    {
        VideoConversionCodec.H264 => "h264",
        VideoConversionCodec.Hevc => "hevc",
        VideoConversionCodec.Av1 => "av1",
        _ => throw new ArgumentOutOfRangeException(nameof(codec), codec, "Stream copy keeps the source codec."),
    };

    public static string Extension(VideoConversionContainer container) => container == VideoConversionContainer.Mkv ? ".mkv" : ".mp4";

    public static string ContainerLabel(VideoConversionContainer container) => container == VideoConversionContainer.Mkv ? "MKV" : "MP4";

    public static bool IsInContainer(string path, VideoConversionContainer container)
    {
        var extension = Path.GetExtension(path).ToLowerInvariant();
        return container == VideoConversionContainer.Mkv
            ? extension == ".mkv"
            : extension is ".mp4" or ".m4v";
    }

    /// <summary>True when the video stream can be copied as is, because the target is a remux or the source is already in the target codec.</summary>
    public static bool CopiesVideo(string sourceVideoCodec, VideoConversionCodec target)
        => target == VideoConversionCodec.Copy || string.Equals(sourceVideoCodec, CodecName(target), StringComparison.OrdinalIgnoreCase);

    /// <summary>Why a file needs no conversion, or null when it does.</summary>
    public static string? SkipReason(string sourcePath, string sourceVideoCodec, VideoConversionSettings settings)
    {
        if (!IsInContainer(sourcePath, settings.Container))
            return null;

        if (settings.Codec == VideoConversionCodec.Copy)
            return $"Already an {ContainerLabel(settings.Container)} file.";

        return CopiesVideo(sourceVideoCodec, settings.Codec)
            ? $"Already {FfmpegHwAccel.CodecLabel(settings.Codec)} in {ContainerLabel(settings.Container)}."
            : null;
    }

    /// <summary>
    /// What each rung resolves to.
    ///
    /// Presets come from a measured sweep rather than ffmpeg's naming. libx265 "slower" and every
    /// hevc_nvenc preset above p4 are deliberately absent: on a 4K source at a fixed quality target,
    /// "slower" cost 4x "slow" for 0.3 VMAF, and p5/p6/p7 matched p4 within 0.2 VMAF and 1% of size
    /// while taking up to 2.4x as long.
    ///
    /// TargetShare is a fraction of the resolution's transparent bitrate (see
    /// <see cref="VideoBitrateTarget"/>), not of the source's. That is what lets a conversion be judged
    /// before it runs: a file already below its target has nothing to reclaim and is left alone.
    /// </summary>
    public static VideoConversionEffortProfile Profile(VideoConversionEffort effort) => effort switch
    {
        VideoConversionEffort.HighSoftware => new(false, "slow", "p4", 1.00),
        VideoConversionEffort.HighHardware => new(true, "medium", "p4", 1.00),
        VideoConversionEffort.BalancedSoftware => new(false, "medium", "p4", 0.70),
        VideoConversionEffort.BalancedHardware => new(true, "medium", "p4", 0.70),
        _ => throw new ArgumentOutOfRangeException(nameof(effort), effort, "Unknown conversion effort."),
    };

    /// <summary>True when the rung asks for a hardware encoder. A machine without one falls back to software.</summary>
    public static bool PrefersHardware(VideoConversionEffort effort) => Profile(effort).PreferHardware;

    /// <summary>
    /// Why this conversion is not worth running, or null to go ahead. Both cases are decided from
    /// metadata alone, before anything is encoded.
    /// </summary>
    public static string? NotWorthConverting(long sourceBytes, long projectedBytes)
    {
        if (sourceBytes <= 0 || projectedBytes <= 0)
            return null;

        if (projectedBytes >= sourceBytes)
        {
            return "The source is already at or below the bitrate this resolution can make use of, "
                 + "so re-encoding it would not save space and could only lose quality.";
        }

        return null;
    }

    /// <summary>
    /// How much of the original a conversion is expected to save, as a fraction. Used to decide whether
    /// the saving is worth the time, which the caller confirms with the user.
    /// </summary>
    public static double ProjectedSaving(long sourceBytes, long projectedBytes)
        => sourceBytes <= 0 || projectedBytes <= 0 ? 0 : 1d - (projectedBytes / (double)sourceBytes);

    /// <summary>A saving smaller than this is not obviously worth the encode, and is confirmed first.</summary>
    public const double MarginalSavingThreshold = 0.15;

    /// <summary>
    /// Where the converted file goes: next to the original, under the same name with the new extension
    /// (so sidecar captions keep matching). When that name is the original's own or is already in use, the
    /// codec is added to the name ("clip.hevc.mp4"), then a counter.
    /// </summary>
    public static string ChooseOutputPath(string sourcePath, VideoConversionSettings settings, Func<string, bool> isTaken)
    {
        var directory = Path.GetDirectoryName(sourcePath) ?? string.Empty;
        var stem = Path.GetFileNameWithoutExtension(sourcePath);
        var extension = Extension(settings.Container);
        var label = settings.Codec == VideoConversionCodec.Copy ? "remux" : CodecName(settings.Codec);

        bool Usable(string candidate) =>
            !string.Equals(candidate, sourcePath, StringComparison.OrdinalIgnoreCase) && !isTaken(candidate);

        var plain = Path.Combine(directory, stem + extension);
        if (Usable(plain))
            return plain;

        var labelled = Path.Combine(directory, $"{stem}.{label}{extension}");
        for (var counter = 2; !Usable(labelled); counter++)
            labelled = Path.Combine(directory, $"{stem}.{label}-{counter}{extension}");
        return labelled;
    }

    /// <summary>
    /// Builds the ffmpeg command line. <paramref name="encoder"/> is required unless the video stream is
    /// copied. Keeps the main video stream, every audio stream, chapters and metadata; subtitles and MKV
    /// font attachments are kept where the target container can hold them, and each one dropped is noted.
    /// </summary>
    public static VideoConversionPlan Build(
        ProbedMedia source,
        string inputPath,
        string outputPath,
        VideoConversionSettings settings,
        string? encoder,
        string? decodeInputArgs,
        VideoConversionSample? sample = null,
        int targetKbps = 0,
        double? outputFrameRate = null)
    {
        var video = source.Video ?? throw new VideoConversionException("The file has no video stream to convert.");
        var mp4 = settings.Container == VideoConversionContainer.Mp4;
        var copyVideo = CopiesVideo(video.CodecName, settings.Codec);
        var notes = new List<string>();

        if (copyVideo && mp4 && !Mp4VideoCodecs.Contains(video.CodecName))
        {
            throw new VideoConversionException(
                $"The {video.CodecName} video stream cannot be stored in MP4 without re-encoding. Convert it to H.264, HEVC or AV1, or choose MKV.");
        }

        if (!copyVideo && string.IsNullOrWhiteSpace(encoder))
            throw new ArgumentException("An encoder is required when the video is re-encoded.", nameof(encoder));

        var args = new StringBuilder("-hide_banner -nostdin -y -v error -nostats -progress pipe:1");
        if (!copyVideo)
        {
            Append(args, FfmpegHwAccel.InputArgsForEncoder(encoder!));
            Append(args, decodeInputArgs);
        }
        if (sample is not null)
        {
            // Input-side seek: the trial run must not pay to decode everything before its slice.
            args.Append(" -ss ").Append(sample.StartSeconds.ToString("0.###", CultureInfo.InvariantCulture));
        }
        args.Append(" -i ").Append(Quote(inputPath));
        if (sample is not null)
            args.Append(" -t ").Append(sample.DurationSeconds.ToString("0.###", CultureInfo.InvariantCulture));

        args.Append(" -map 0:").Append(video.Index.ToString(CultureInfo.InvariantCulture));

        var audio = source.Audio.ToList();
        for (var ordinal = 0; ordinal < audio.Count; ordinal++)
        {
            args.Append(" -map 0:").Append(audio[ordinal].Index.ToString(CultureInfo.InvariantCulture));
            var ordinalText = ordinal.ToString(CultureInfo.InvariantCulture);
            if (mp4 && !Mp4AudioCodecs.Contains(audio[ordinal].CodecName))
            {
                args.Append(" -c:a:").Append(ordinalText).Append(" aac -b:a:").Append(ordinalText).Append(" 192k");
                notes.Add($"Audio track {ordinal + 1} ({audio[ordinal].CodecName}) was re-encoded to AAC because MP4 cannot hold it.");
            }
            else
            {
                args.Append(" -c:a:").Append(ordinalText).Append(" copy");
            }
        }

        var subtitleOrdinal = 0;
        var droppedSubtitles = 0;
        foreach (var subtitle in source.Subtitles)
        {
            if (mp4 && !TextSubtitleCodecs.Contains(subtitle.CodecName))
            {
                droppedSubtitles++;
                continue;
            }

            args.Append(" -map 0:").Append(subtitle.Index.ToString(CultureInfo.InvariantCulture));
            args.Append(" -c:s:").Append(subtitleOrdinal.ToString(CultureInfo.InvariantCulture)).Append(mp4 ? " mov_text" : " copy");
            subtitleOrdinal++;
        }
        if (droppedSubtitles > 0)
            notes.Add($"{droppedSubtitles} image-based subtitle track(s) were dropped because MP4 cannot hold them.");

        if (!mp4)
            args.Append(" -map 0:t? -c:t copy");

        if (copyVideo)
        {
            args.Append(" -c:v copy");
        }
        else
        {
            var tenBit = IsTenBit(video);

            // Encode to the bitrate the picture can make use of, rather than to an absolute quality.
            // targetKbps is derived from the OUTPUT's resolution and frame rate, so reducing either
            // lowers it automatically.
            Append(args, FfmpegHwAccel.ConversionBitrateArgs(encoder!, targetKbps, settings.Effort, tenBit));
            Append(args, FfmpegHwAccel.ConversionVideoFilter(encoder!, tenBit));

            // Carry the colour description over explicitly so HDR and wide-gamut sources are not tagged as
            // (and then displayed as) plain BT.709.
            AppendColor(args, "-color_primaries", video.ColorPrimaries);
            AppendColor(args, "-color_trc", video.ColorTransfer);
            AppendColor(args, "-colorspace", video.ColorSpace);

            if (outputFrameRate is { } fps && fps > 0)
            {
                // Dropping frame rate is the one size lever that costs no per-frame fidelity, and it
                // lowers the bitrate target too since that is derived from the output's frame rate.
                args.Append(" -r ").Append(fps.ToString("0.###", CultureInfo.InvariantCulture));
            }
            else
            {
                // Keep the source's timestamps exactly, so markers and generated sprites stay aligned.
                args.Append(" -fps_mode passthrough");
            }
        }

        var outputVideoCodec = copyVideo ? video.CodecName : CodecName(settings.Codec);
        // Apple players and browsers only play HEVC in MP4 when it is tagged hvc1 (ffmpeg defaults to hev1).
        if (mp4 && outputVideoCodec == "hevc")
            args.Append(" -tag:v hvc1");

        args.Append(" -map_metadata 0 -map_chapters 0");
        args.Append(mp4 ? " -movflags +faststart -f mp4 " : " -f matroska ");
        args.Append(Quote(outputPath));

        return new VideoConversionPlan(args.ToString(), copyVideo, outputVideoCodec, audio.Count, notes);
    }

    /// <summary>Length of the trial encode. Long enough to average over a scene change, short enough to be cheap.</summary>
    public const double SampleSeconds = 60;

    /// <summary>
    /// How much bigger than the source a projection has to be before the conversion is abandoned without
    /// running. A trial encode of one slice is an estimate, not a measurement, so a file only misses out
    /// on its real attempt when the projection is clearly, not marginally, worse.
    /// </summary>
    public const double ProjectionMargin = 1.15;

    /// <summary>
    /// Where to take the trial slice, or null when the file is too short for one to be worth it - the
    /// trial would cost a large fraction of simply doing the conversion.
    /// </summary>
    public static VideoConversionSample? ChooseSample(double durationSeconds)
        => durationSeconds >= SampleSeconds * 4
            ? new VideoConversionSample(durationSeconds * 0.25, SampleSeconds)
            : null;

    /// <summary>
    /// Scales a trial encode up to the size the whole file would be. Both figures include audio and
    /// container overhead, because the trial is produced by the same command as the real conversion.
    /// </summary>
    public static long ProjectFullSize(long sampleBytes, double sampleSeconds, double durationSeconds)
        => sampleSeconds <= 0 ? 0 : (long)(sampleBytes * (durationSeconds / sampleSeconds));

    /// <summary>True when a projection is far enough above the source that encoding it would be wasted.</summary>
    public static bool ProjectsLarger(long projectedBytes, long sourceBytes)
        => projectedBytes > 0 && sourceBytes > 0 && projectedBytes > sourceBytes * ProjectionMargin;

        /// <summary>The full-decode check a converted file must pass before it can replace the original.</summary>
    public static string DecodeCheckArguments(string path, string? decodeInputArgs)
    {
        var args = new StringBuilder("-hide_banner -nostdin -v error -nostats -progress pipe:1");
        Append(args, decodeInputArgs);
        args.Append(" -i ").Append(Quote(path)).Append(" -map 0:v:0 -map 0:a? -f null -");
        return args.ToString();
    }

    /// <summary>Checks a converted file's streams and length against the plan and the original. Returns the problem, or null.</summary>
    public static string? VerifyOutput(ProbedMedia source, ProbedMedia output, VideoConversionPlan plan)
    {
        var video = output.Video;
        if (video is null)
            return "The converted file has no video stream.";
        if (!string.Equals(video.CodecName, plan.ExpectedVideoCodec, StringComparison.OrdinalIgnoreCase))
            return $"The converted file's video is {video.CodecName}, not {plan.ExpectedVideoCodec}.";

        var audioCount = output.Audio.Count();
        if (audioCount != plan.AudioStreamCount)
            return $"The converted file has {audioCount} audio track(s); the original has {plan.AudioStreamCount}.";

        if (output.Duration <= 0)
            return "The converted file's length could not be read.";
        if (Math.Abs(output.Duration - source.Duration) > DurationTolerance)
        {
            return string.Create(CultureInfo.InvariantCulture,
                $"The converted file is {output.Duration:0.##}s long; the original is {source.Duration:0.##}s.");
        }

        return null;
    }

    /// <summary>Reads an ffmpeg <c>-progress</c> line and returns the position it reports, in seconds.</summary>
    public static bool TryParseProgressSeconds(string line, out double seconds)
    {
        seconds = 0;
        // out_time_ms is (despite its name) microseconds too; newer builds also print out_time_us.
        var separator = line.IndexOf('=');
        if (separator <= 0)
            return false;
        var key = line.AsSpan(0, separator);
        if (!key.SequenceEqual("out_time_us") && !key.SequenceEqual("out_time_ms"))
            return false;
        if (!long.TryParse(line.AsSpan(separator + 1), NumberStyles.Integer, CultureInfo.InvariantCulture, out var micros) || micros < 0)
            return false;
        seconds = micros / 1_000_000d;
        return true;
    }

    internal static bool IsTenBit(ProbedStream video)
        => video.BitsPerRawSample > 8
            || (video.PixelFormat is { } format && (format.Contains("10", StringComparison.Ordinal) || format.Contains("12", StringComparison.Ordinal)));

    private static void AppendColor(StringBuilder args, string option, string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value is "unknown" or "reserved")
            return;
        args.Append(' ').Append(option).Append(' ').Append(value);
    }

    private static void Append(StringBuilder args, string? fragment)
    {
        if (!string.IsNullOrWhiteSpace(fragment))
            args.Append(' ').Append(fragment.Trim());
    }

    private static string Quote(string path) => "\"" + path.Replace("\"", "\\\"", StringComparison.Ordinal) + "\"";
}
