using Cove.Api.Services;

namespace Cove.Tests;

/// <summary>
/// The point of converting a library to a denser codec is to get disk space back. Two things stopped
/// that happening: a hardware encoder's quality number meant something different from the software
/// encoder's at the same value, and a conversion that could only ever grow the file still ran to
/// completion before being thrown away. These tests pin both.
/// </summary>
public class VideoConversionSizingTests
{
    /// <summary>
    /// Measured against libx265 at the same number, hevc_nvenc produced 2.55x the bitrate at cq24 and
    /// reached parity near cq31. Without the correction, "Balanced" on a machine with NVENC asked for a
    /// far richer encode than the same setting on a machine without one.
    /// </summary>
    [Theory]
    [InlineData("hevc_nvenc")]
    [InlineData("hevc_qsv")]
    [InlineData("hevc_vaapi")]
    [InlineData("hevc_amf")]
    public void HardwareEncodersAskForAHigherQualityNumberThanSoftware(string hardwareEncoder)
    {
        foreach (var quality in new[] { VideoConversionQuality.High, VideoConversionQuality.Balanced, VideoConversionQuality.Small })
        {
            var software = VideoConversionPlanner.QualityValue(VideoConversionCodec.Hevc, quality, "libx265");
            var hardware = VideoConversionPlanner.QualityValue(VideoConversionCodec.Hevc, quality, hardwareEncoder);
            Assert.Equal(software + VideoConversionPlanner.HardwareQualityOffset, hardware);
        }
    }

    [Fact]
    public void SoftwareEncodersKeepTheirCrfValues()
    {
        Assert.Equal(24, VideoConversionPlanner.QualityValue(VideoConversionCodec.Hevc, VideoConversionQuality.Balanced, "libx265"));
        Assert.Equal(22, VideoConversionPlanner.QualityValue(VideoConversionCodec.H264, VideoConversionQuality.Balanced, "libx264"));
    }

    /// <summary>AV1's values were already chosen per encoder, so they must not be shifted a second time.</summary>
    [Fact]
    public void Av1ValuesAreNotShiftedAgain()
    {
        Assert.Equal(30, VideoConversionPlanner.QualityValue(VideoConversionCodec.Av1, VideoConversionQuality.Balanced, "libsvtav1"));
        Assert.Equal(27, VideoConversionPlanner.QualityValue(VideoConversionCodec.Av1, VideoConversionQuality.Balanced, "av1_nvenc"));
    }

    [Fact]
    public void QualityStillOrdersHighestQualityToSmallestFile()
    {
        var high = VideoConversionPlanner.QualityValue(VideoConversionCodec.Hevc, VideoConversionQuality.High, "hevc_nvenc");
        var balanced = VideoConversionPlanner.QualityValue(VideoConversionCodec.Hevc, VideoConversionQuality.Balanced, "hevc_nvenc");
        var small = VideoConversionPlanner.QualityValue(VideoConversionCodec.Hevc, VideoConversionQuality.Small, "hevc_nvenc");
        Assert.True(high < balanced && balanced < small);
    }

    // ---- trial encode ----

    [Fact]
    public void ShortVideosSkipTheTrialBecauseItWouldCostAsMuchAsConverting()
    {
        Assert.Null(VideoConversionPlanner.ChooseSample(VideoConversionPlanner.SampleSeconds * 2));
        Assert.Null(VideoConversionPlanner.ChooseSample(30));
        Assert.Null(VideoConversionPlanner.ChooseSample(0));
    }

    [Fact]
    public void LongVideosTakeTheirTrialSliceAwayFromTheStart()
    {
        var sample = VideoConversionPlanner.ChooseSample(1200);
        Assert.NotNull(sample);
        Assert.Equal(VideoConversionPlanner.SampleSeconds, sample!.DurationSeconds);
        // Starting at zero would measure intros and title cards rather than the body of the video.
        Assert.True(sample.StartSeconds > 0);
        Assert.True(sample.StartSeconds + sample.DurationSeconds < 1200);
    }

    [Fact]
    public void ProjectionScalesTheTrialToTheWholeFile()
    {
        // 10 MB for 60s of a 600s video projects to about 100 MB.
        var projected = VideoConversionPlanner.ProjectFullSize(10_000_000, 60, 600);
        Assert.InRange(projected, 99_000_000, 101_000_000);
    }

    [Fact]
    public void ProjectionIsZeroWhenTheTrialHasNoLength()
    {
        Assert.Equal(0, VideoConversionPlanner.ProjectFullSize(10_000_000, 0, 600));
    }

    /// <summary>
    /// A trial encode estimates; it does not measure. A file is only denied its real attempt when the
    /// projection is clearly worse, never when it is borderline.
    /// </summary>
    [Fact]
    public void OnlyClearlyLargerProjectionsAbandonTheConversion()
    {
        const long source = 1_000_000_000;

        Assert.False(VideoConversionPlanner.ProjectsLarger((long)(source * 0.7), source));
        Assert.False(VideoConversionPlanner.ProjectsLarger(source, source));
        Assert.False(VideoConversionPlanner.ProjectsLarger((long)(source * 1.10), source), "a marginal projection still deserves a real attempt");
        Assert.True(VideoConversionPlanner.ProjectsLarger((long)(source * 1.5), source));
        Assert.True(VideoConversionPlanner.ProjectsLarger((long)(source * 1.83), source), "the measured 4K case projected 183% of source");
    }

    [Fact]
    public void MissingFiguresNeverAbandonTheConversion()
    {
        Assert.False(VideoConversionPlanner.ProjectsLarger(0, 1_000_000));
        Assert.False(VideoConversionPlanner.ProjectsLarger(1_000_000, 0));
    }

    /// <summary>The trial must seek to its slice on the input side and bound its length.</summary>
    [Fact]
    public void TrialArgumentsSeekAndLimitLength()
    {
        var source = new ProbedMedia(1200, [new ProbedStream(0, "video", "h264", "yuv420p", 8, false, null, null, null)]);
        var settings = new VideoConversionSettings(
            VideoConversionCodec.Hevc, VideoConversionContainer.Mp4,
            VideoConversionQuality.Balanced, VideoConversionSpeed.Balanced,
            ReplaceOriginal: true, DiscardIfLarger: true);

        var plan = VideoConversionPlanner.Build(
            source, "/in.mp4", "/probe.mp4", settings, "hevc_nvenc", decodeInputArgs: null,
            sample: new VideoConversionSample(300, 60));

        var seekIndex = plan.Arguments.IndexOf("-ss 300", StringComparison.Ordinal);
        var inputIndex = plan.Arguments.IndexOf("-i ", StringComparison.Ordinal);
        Assert.True(seekIndex >= 0, "the trial must seek");
        Assert.True(seekIndex < inputIndex, "-ss must precede -i so the skipped part is never decoded");
        Assert.Contains("-t 60", plan.Arguments);
    }

    /// <summary>A real conversion carries no trial seek, or it would convert only part of the file.</summary>
    [Fact]
    public void FullConversionArgumentsCarryNoTrialWindow()
    {
        var source = new ProbedMedia(1200, [new ProbedStream(0, "video", "h264", "yuv420p", 8, false, null, null, null)]);
        var settings = new VideoConversionSettings(
            VideoConversionCodec.Hevc, VideoConversionContainer.Mp4,
            VideoConversionQuality.Balanced, VideoConversionSpeed.Balanced,
            ReplaceOriginal: true, DiscardIfLarger: true);

        var plan = VideoConversionPlanner.Build(source, "/in.mp4", "/out.mp4", settings, "hevc_nvenc", decodeInputArgs: null);

        Assert.DoesNotContain(" -ss ", plan.Arguments);
        Assert.DoesNotContain(" -t ", plan.Arguments);
    }

    /// <summary>The trial must ask for exactly the encode the real conversion would, or it predicts nothing.</summary>
    [Fact]
    public void TrialUsesTheSameEncoderSettingsAsTheRealConversion()
    {
        var source = new ProbedMedia(1200, [new ProbedStream(0, "video", "h264", "yuv420p", 8, false, null, null, null)]);
        var settings = new VideoConversionSettings(
            VideoConversionCodec.Hevc, VideoConversionContainer.Mp4,
            VideoConversionQuality.Small, VideoConversionSpeed.Fast,
            ReplaceOriginal: true, DiscardIfLarger: true);

        var full = VideoConversionPlanner.Build(source, "/in.mp4", "/out.mp4", settings, "hevc_nvenc", null);
        var trial = VideoConversionPlanner.Build(source, "/in.mp4", "/probe.mp4", settings, "hevc_nvenc", null,
            new VideoConversionSample(300, 60));

        var quality = VideoConversionPlanner.QualityValue(VideoConversionCodec.Hevc, VideoConversionQuality.Small, "hevc_nvenc")
            .ToString(System.Globalization.CultureInfo.InvariantCulture);
        Assert.Contains(quality, full.Arguments);
        Assert.Contains(quality, trial.Arguments);
        Assert.Equal(full.ExpectedVideoCodec, trial.ExpectedVideoCodec);
    }
}
