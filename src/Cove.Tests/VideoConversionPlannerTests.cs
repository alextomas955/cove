using System.Diagnostics;
using Cove.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cove.Tests;

public class VideoConversionPlannerTests
{
    private static readonly VideoConversionSettings HevcMp4 = new(
        VideoConversionCodec.Hevc, VideoConversionContainer.Mp4, VideoConversionEffort.HighHardware,
        ReplaceOriginal: false, DiscardIfLarger: true);

    private static ProbedStream Video(string codec, string pixFmt = "yuv420p", int index = 0, bool attachedPicture = false)
        => new(index, "video", codec, pixFmt, 0, attachedPicture, null, null, null);

    private static ProbedStream Stream(int index, string type, string codec)
        => new(index, type, codec, null, 0, false, null, null, null);

    [Theory]
    [InlineData("/lib/a.mp4", "hevc", VideoConversionCodec.Hevc, VideoConversionContainer.Mp4, true)]
    [InlineData("/lib/a.m4v", "hevc", VideoConversionCodec.Hevc, VideoConversionContainer.Mp4, true)]
    [InlineData("/lib/a.mkv", "hevc", VideoConversionCodec.Hevc, VideoConversionContainer.Mp4, false)]
    [InlineData("/lib/a.mp4", "h264", VideoConversionCodec.Hevc, VideoConversionContainer.Mp4, false)]
    [InlineData("/lib/a.mp4", "wmv3", VideoConversionCodec.Copy, VideoConversionContainer.Mp4, true)]
    [InlineData("/lib/a.avi", "mpeg4", VideoConversionCodec.Copy, VideoConversionContainer.Mkv, false)]
    public void SkipReason_SkipsOnlyFilesAlreadyInTheTargetFormat(
        string path, string codec, VideoConversionCodec target, VideoConversionContainer container, bool skipped)
    {
        var settings = HevcMp4 with { Codec = target, Container = container };

        Assert.Equal(skipped, VideoConversionPlanner.SkipReason(path, codec, settings) is not null);
    }

    [Fact]
    public void ChooseOutputPath_KeepsTheNameWhenOnlyTheExtensionChanges()
    {
        var source = Path.Combine("lib", "clip.mkv");

        Assert.Equal(Path.Combine("lib", "clip.mp4"), VideoConversionPlanner.ChooseOutputPath(source, HevcMp4, _ => false));
    }

    [Fact]
    public void ChooseOutputPath_LabelsTheCodecWhenTheNameIsTheOriginalsOrTaken()
    {
        var source = Path.Combine("lib", "clip.mp4");
        var taken = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { Path.Combine("lib", "clip.hevc.mp4") };

        Assert.Equal(Path.Combine("lib", "clip.hevc.mp4"), VideoConversionPlanner.ChooseOutputPath(source, HevcMp4, _ => false));
        Assert.Equal(Path.Combine("lib", "clip.hevc-2.mp4"), VideoConversionPlanner.ChooseOutputPath(source, HevcMp4, taken.Contains));
        Assert.Equal(
            Path.Combine("lib", "clip.remux.mp4"),
            VideoConversionPlanner.ChooseOutputPath(source, HevcMp4 with { Codec = VideoConversionCodec.Copy }, _ => false));
    }

    [Fact]
    public void Build_Mp4TargetReencodesIncompatibleAudioDropsImageSubtitlesAndTagsHevc()
    {
        var source = new ProbedMedia(60,
        [
            Video("h264", attachedPicture: true, index: 0),
            Video("h264", index: 1),
            Stream(2, "audio", "pcm_s16le"),
            Stream(3, "audio", "aac"),
            Stream(4, "subtitle", "subrip"),
            Stream(5, "subtitle", "hdmv_pgs_subtitle"),
        ]);

        var plan = VideoConversionPlanner.Build(source, "in.mkv", "out.mp4", HevcMp4, "libx265", decodeInputArgs: null);

        Assert.False(plan.CopiesVideo);
        Assert.Equal("hevc", plan.ExpectedVideoCodec);
        Assert.Equal(2, plan.AudioStreamCount);
        Assert.Contains("-map 0:1 ", plan.Arguments); // the real video, not the cover art
        Assert.DoesNotContain("-map 0:0 ", plan.Arguments);
        Assert.Contains("-c:a:0 aac -b:a:0 192k", plan.Arguments);
        Assert.Contains("-c:a:1 copy", plan.Arguments);
        Assert.Contains("-map 0:4 -c:s:0 mov_text", plan.Arguments);
        Assert.DoesNotContain("-map 0:5", plan.Arguments);
        Assert.Contains("-c:v libx265", plan.Arguments);
        Assert.Contains("-tag:v hvc1", plan.Arguments);
        Assert.Contains("-fps_mode passthrough", plan.Arguments);
        Assert.Contains("-f mp4 \"out.mp4\"", plan.Arguments);
        Assert.Equal(2, plan.Notes.Count);
    }

    [Fact]
    public void Build_CopiesTheVideoWhenTheSourceIsAlreadyInTheTargetCodec()
    {
        var source = new ProbedMedia(60, [Video("hevc"), Stream(1, "audio", "flac"), Stream(2, "subtitle", "hdmv_pgs_subtitle")]);

        var plan = VideoConversionPlanner.Build(source, "in.mkv", "out.mkv", HevcMp4 with { Container = VideoConversionContainer.Mkv }, encoder: null, decodeInputArgs: "-hwaccel cuda");

        Assert.True(plan.CopiesVideo);
        Assert.Contains("-c:v copy", plan.Arguments);
        Assert.Contains("-map 0:2 -c:s:0 copy", plan.Arguments);
        Assert.Contains("-map 0:t? -c:t copy", plan.Arguments);
        Assert.DoesNotContain("-hwaccel", plan.Arguments); // nothing is decoded in a remux
        Assert.DoesNotContain("hvc1", plan.Arguments);
        Assert.Contains("-f matroska", plan.Arguments);
        Assert.Empty(plan.Notes);
    }

    [Fact]
    public void Build_RefusesToCopyAVideoCodecMp4CannotHold()
    {
        var source = new ProbedMedia(60, [Video("wmv3")]);

        var error = Assert.Throws<VideoConversionException>(() => VideoConversionPlanner.Build(
            source, "in.wmv", "out.mp4", HevcMp4 with { Codec = VideoConversionCodec.Copy }, encoder: null, decodeInputArgs: null));
        Assert.Contains("wmv3", error.Message);
    }

    [Fact]
    public void Build_KeepsTenBitAndTheColourDescriptionForHevc()
    {
        var source = new ProbedMedia(60, [new ProbedStream(0, "video", "vp9", "yuv420p10le", 0, false, "bt2020", "smpte2084", "bt2020nc")]);

        var plan = VideoConversionPlanner.Build(source, "in.webm", "out.mp4", HevcMp4, "hevc_nvenc", decodeInputArgs: null);

        Assert.Contains("-pix_fmt p010le -profile:v main10", plan.Arguments);
        Assert.Contains("-color_primaries bt2020 -color_trc smpte2084 -colorspace bt2020nc", plan.Arguments);
    }

    /// <summary>
    /// Each encoder family is driven in its own capped-VBR mode, aiming at the bitrate the ladder
    /// chose. The ceiling lets busy scenes spend more while keeping the file near the size the user was
    /// shown before starting.
    /// </summary>
    [Theory]
    [InlineData("libx265", "-c:v libx265 -preset medium -b:v 5000k -maxrate 7500k -bufsize 10000k")]
    [InlineData("hevc_nvenc", "-c:v hevc_nvenc -preset p4 -tune hq -rc vbr -b:v 5000k -maxrate 7500k -bufsize 10000k")]
    [InlineData("hevc_qsv", "-c:v hevc_qsv -preset medium -b:v 5000k -maxrate 7500k -bufsize 10000k")]
    public void ConversionBitrateArgs_AimAtTheTargetWithACeiling(string encoder, string expectedPrefix)
    {
        var args = FfmpegHwAccel.ConversionBitrateArgs(encoder, 5000, VideoConversionEffort.HighHardware, tenBit: false);
        Assert.StartsWith(expectedPrefix, args, StringComparison.Ordinal);
    }
    [Fact]
    public void ConversionVideoFilter_UploadsFramesOnlyForVaapi()
    {
        Assert.Equal("-vf \"format=p010,hwupload\"", FfmpegHwAccel.ConversionVideoFilter("hevc_vaapi", tenBit: true));
        Assert.Equal("-vf \"format=nv12,hwupload\"", FfmpegHwAccel.ConversionVideoFilter("h264_vaapi", tenBit: true));
        Assert.Equal(string.Empty, FfmpegHwAccel.ConversionVideoFilter("hevc_nvenc", tenBit: true));
    }

    [Fact]
    public void HardwareEncodersFor_LimitsAv1ToNvenc()
    {
        Assert.Equal(["av1_nvenc"], FfmpegHwAccel.HardwareEncodersFor(VideoConversionCodec.Av1).Select(item => item.Encoder));
        Assert.Equal(5, FfmpegHwAccel.HardwareEncodersFor(VideoConversionCodec.Hevc).Count);
    }

    [Fact]
    public void VerifyOutput_RejectsAWrongCodecMissingAudioOrDifferentLength()
    {
        var source = new ProbedMedia(100, [Video("h264"), Stream(1, "audio", "aac")]);
        var plan = new VideoConversionPlan("", CopiesVideo: false, ExpectedVideoCodec: "hevc", AudioStreamCount: 1, Notes: []);

        Assert.Null(VideoConversionPlanner.VerifyOutput(source, new ProbedMedia(100.4, [Video("hevc"), Stream(1, "audio", "aac")]), plan));
        Assert.NotNull(VideoConversionPlanner.VerifyOutput(source, new ProbedMedia(100, [Video("h264"), Stream(1, "audio", "aac")]), plan));
        Assert.NotNull(VideoConversionPlanner.VerifyOutput(source, new ProbedMedia(100, [Video("hevc")]), plan));
        Assert.NotNull(VideoConversionPlanner.VerifyOutput(source, new ProbedMedia(97, [Video("hevc"), Stream(1, "audio", "aac")]), plan));
    }

    [Theory]
    [InlineData("out_time_us=2500000", true, 2.5)]
    [InlineData("out_time_ms=1000000", true, 1)]
    [InlineData("out_time_us=N/A", false, 0)]
    [InlineData("progress=continue", false, 0)]
    public void TryParseProgressSeconds_ReadsFfmpegProgressLines(string line, bool parsed, double seconds)
    {
        Assert.Equal(parsed, VideoConversionPlanner.TryParseProgressSeconds(line, out var value));
        Assert.Equal(seconds, value);
    }

    [Fact]
    public void ProbedMedia_ParsesFfprobeJson()
    {
        const string json = """
            {"streams":[
              {"index":0,"codec_name":"mjpeg","codec_type":"video","disposition":{"attached_pic":1}},
              {"index":1,"codec_name":"hevc","codec_type":"video","pix_fmt":"yuv420p10le","color_primaries":"bt2020"},
              {"index":2,"codec_name":"aac","codec_type":"audio"}],
             "format":{"duration":"12.500000"}}
            """;

        var media = ProbedMedia.Parse(json);

        Assert.Equal(12.5, media.Duration);
        Assert.Equal(1, media.Video!.Index);
        Assert.True(VideoConversionPlanner.IsTenBit(media.Video));
        Assert.Single(media.Audio);
    }

    /// <summary>
    /// Runs the planner's command lines through a real ffmpeg: an MKV with PCM audio is re-encoded to an
    /// HEVC MP4 in software, checked the way the job checks it, and decode-verified.
    /// </summary>
    [Fact]
    public async Task RealFfmpeg_ConvertsVerifiesAndDecodeChecksASoftwareHevcEncode()
    {
        var ffmpeg = FfmpegHwAccel.FindFfmpeg(null);
        Assert.SkipWhen(ffmpeg is null, "Requires ffmpeg on PATH.");
        var ffprobe = Path.Combine(Path.GetDirectoryName(ffmpeg!)!, OperatingSystem.IsWindows() ? "ffprobe.exe" : "ffprobe");
        Assert.SkipWhen(!File.Exists(ffprobe), "Requires ffprobe next to ffmpeg.");
        Assert.SkipWhen(!FfmpegHwAccel.ListEncoders(ffmpeg!).Contains("libx265"), "Requires an ffmpeg build with libx265.");

        var ct = TestContext.Current.CancellationToken;
        var root = Path.Combine(Path.GetTempPath(), $"cove-convert-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);
        try
        {
            var sourcePath = Path.Combine(root, "clip.mkv");
            var make = await FfmpegProcessRunner.RunAsync(ffmpeg!,
                $"-hide_banner -v error -f lavfi -i testsrc=size=160x120:rate=25:duration=3 -f lavfi -i sine=frequency=440:duration=3 "
                + $"-c:v libx264 -preset ultrafast -c:a pcm_s16le -shortest \"{sourcePath}\"",
                TimeSpan.FromMinutes(1), ct);
            Assert.Equal(0, make.ExitCode);

            var source = ProbedMedia.Parse(await ProbeAsync(ffprobe, sourcePath, ct));
            var outputPath = VideoConversionPlanner.ChooseOutputPath(sourcePath, HevcMp4, File.Exists);
            Assert.Equal(Path.Combine(root, "clip.mp4"), outputPath);

            var plan = VideoConversionPlanner.Build(source, sourcePath, outputPath, HevcMp4 with { Effort = VideoConversionEffort.BalancedHardware }, "libx265", null);
            var positions = new List<double>();
            var encode = await FfmpegProcessRunner.RunWithProgressAsync(ffmpeg!, plan.Arguments,
                line => { if (VideoConversionPlanner.TryParseProgressSeconds(line, out var seconds)) positions.Add(seconds); },
                TimeSpan.FromMinutes(1), ct);
            Assert.True(encode.ExitCode == 0, encode.StandardError);
            Assert.NotEmpty(positions);

            var output = ProbedMedia.Parse(await ProbeAsync(ffprobe, outputPath, ct));
            Assert.Null(VideoConversionPlanner.VerifyOutput(source, output, plan));
            Assert.Equal("aac", output.Audio.Single().CodecName);

            var decode = await FfmpegProcessRunner.RunWithProgressAsync(ffmpeg!, VideoConversionPlanner.DecodeCheckArguments(outputPath, null),
                _ => { }, TimeSpan.FromMinutes(1), ct);
            Assert.Equal(0, decode.ExitCode);
            Assert.True(string.IsNullOrWhiteSpace(decode.StandardError), decode.StandardError);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task RealFfmpeg_DecodeCheckReportsATruncatedFile()
    {
        var ffmpeg = FfmpegHwAccel.FindFfmpeg(null);
        Assert.SkipWhen(ffmpeg is null, "Requires ffmpeg on PATH.");

        var ct = TestContext.Current.CancellationToken;
        var root = Path.Combine(Path.GetTempPath(), $"cove-convert-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);
        try
        {
            var path = Path.Combine(root, "clip.mkv");
            var make = await FfmpegProcessRunner.RunAsync(ffmpeg!,
                $"-hide_banner -v error -f lavfi -i testsrc=size=320x240:rate=25:duration=4 -c:v libx264 -preset ultrafast \"{path}\"",
                TimeSpan.FromMinutes(1), ct);
            Assert.Equal(0, make.ExitCode);

            // Cut the file off mid-stream and scribble over part of what is left.
            var bytes = await File.ReadAllBytesAsync(path, ct);
            var damaged = bytes[..(bytes.Length * 2 / 3)];
            for (var i = damaged.Length / 2; i < damaged.Length / 2 + 2000 && i < damaged.Length; i++)
                damaged[i] ^= 0x5A;
            await File.WriteAllBytesAsync(path, damaged, ct);

            var decode = await FfmpegProcessRunner.RunWithProgressAsync(ffmpeg!, VideoConversionPlanner.DecodeCheckArguments(path, null),
                _ => { }, TimeSpan.FromMinutes(1), ct);

            Assert.True(decode.ExitCode != 0 || !string.IsNullOrWhiteSpace(decode.StandardError));
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void SelectConversionEncoder_HonoursHardwareAccelerationOff()
    {
        var ffmpeg = FfmpegHwAccel.FindFfmpeg(null);
        Assert.SkipWhen(ffmpeg is null, "Requires ffmpeg on PATH.");
        Assert.SkipWhen(!FfmpegHwAccel.ListEncoders(ffmpeg!).Contains("libx265"), "Requires an ffmpeg build with libx265.");

        Assert.Equal("libx265", FfmpegHwAccel.SelectConversionEncoder(ffmpeg!, VideoConversionCodec.Hevc, "off", preferHardware: true, NullLogger.Instance));
    }

    private static async Task<string> ProbeAsync(string ffprobe, string path, CancellationToken ct)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = ffprobe,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
        };
        foreach (var arg in new[] { "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path })
            startInfo.ArgumentList.Add(arg);
        using var process = Process.Start(startInfo)!;
        var json = await process.StandardOutput.ReadToEndAsync(ct);
        await process.WaitForExitAsync(ct);
        Assert.Equal(0, process.ExitCode);
        return json;
    }
}
