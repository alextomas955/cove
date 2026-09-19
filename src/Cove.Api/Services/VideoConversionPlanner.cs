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

public enum VideoConversionQuality
{
    High,
    Balanced,
    Small,
}

public enum VideoConversionSpeed
{
    Fast,
    Balanced,
    Slow,
}

/// <summary>What a conversion job produces for every selected video.</summary>
public sealed record VideoConversionSettings(
    VideoConversionCodec Codec,
    VideoConversionContainer Container,
    VideoConversionQuality Quality,
    VideoConversionSpeed Speed,
    bool ReplaceOriginal,
    bool DiscardIfLarger);

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
    string? ColorSpace);

/// <summary>The parts of an ffprobe <c>-show_format -show_streams</c> result a conversion needs.</summary>
public sealed record ProbedMedia(double Duration, IReadOnlyList<ProbedStream> Streams)
{
    /// <summary>The main video stream: the first video stream that is not embedded cover art.</summary>
    public ProbedStream? Video => Streams.FirstOrDefault(stream => stream.CodecType == "video" && !stream.AttachedPicture);

    public IEnumerable<ProbedStream> Audio => Streams.Where(stream => stream.CodecType == "audio");

    public IEnumerable<ProbedStream> Subtitles => Streams.Where(stream => stream.CodecType == "subtitle");

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
                    String(stream, "color_space")));
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

        return new ProbedMedia(duration, streams);
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

    private static double Number(JsonElement element, string property)
        => double.TryParse(String(element, property), NumberStyles.Float, CultureInfo.InvariantCulture, out var value) ? value : 0;
}

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
    /// The constant-quality value for a codec, on the scale its encoders take (x264/x265 CRF and the
    /// hardware encoders' CQ/QP share roughly the same 0-51 range; SVT-AV1's CRF runs 0-63).
    /// </summary>
    public static int QualityValue(VideoConversionCodec codec, VideoConversionQuality quality, string encoder)
    {
        var (high, balanced, small) = codec switch
        {
            VideoConversionCodec.H264 => (18, 22, 26),
            VideoConversionCodec.Hevc => (20, 24, 28),
            VideoConversionCodec.Av1 when encoder == "libsvtav1" => (24, 30, 36),
            VideoConversionCodec.Av1 => (22, 27, 32),
            _ => throw new ArgumentOutOfRangeException(nameof(codec), codec, "Stream copy has no quality setting."),
        };
        return quality switch
        {
            VideoConversionQuality.High => high,
            VideoConversionQuality.Small => small,
            _ => balanced,
        };
    }

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
        string? decodeInputArgs)
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
        args.Append(" -i ").Append(Quote(inputPath));

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
            var quality = QualityValue(settings.Codec, settings.Quality, encoder!);
            Append(args, FfmpegHwAccel.ConversionVideoEncodeArgs(encoder!, quality, settings.Speed, tenBit));
            Append(args, FfmpegHwAccel.ConversionVideoFilter(encoder!, tenBit));

            // Carry the colour description over explicitly so HDR and wide-gamut sources are not tagged as
            // (and then displayed as) plain BT.709.
            AppendColor(args, "-color_primaries", video.ColorPrimaries);
            AppendColor(args, "-color_trc", video.ColorTransfer);
            AppendColor(args, "-colorspace", video.ColorSpace);

            // Keep the source's timestamps exactly, so markers and generated sprites stay aligned.
            args.Append(" -fps_mode passthrough");
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
