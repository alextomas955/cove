using Cove.Api.Services;

namespace Cove.Tests;

/// <summary>
/// Conversion aims at the bitrate a given resolution and frame rate can actually make use of, rather
/// than at an absolute quality number. That is what lets the decision be made before any encoding
/// happens: a source already below its target has nothing to reclaim, and the output size of one that
/// is above it is arithmetic. These tests pin the model against the measurements it was fitted to.
/// </summary>
public class VideoConversionSizingTests
{
    // Measured on video 1501 (3840x2160, 59.94fps, 624s): a 54828 kbps H.264 original re-encoded to
    // HEVC at 16541 kbps was reported indistinguishable, and at 6797 kbps clearly worse.
    private const int Uhd = 3840, UhdHeight = 2160;
    private const double Fps60 = 59.94;
    private const int MeasuredTransparentKbps = 16541;
    private const int MeasuredWorseKbps = 6797;

    private static VideoConversionSettings Settings(
        VideoConversionEffort effort, double? fps = null, bool marginal = false) => new(
            VideoConversionCodec.Hevc, VideoConversionContainer.Mp4, effort,
            ReplaceOriginal: true, DiscardIfLarger: true, OutputFrameRate: fps, ConvertMarginalSavings: marginal);

    // ---- the bitrate model ----

    /// <summary>
    /// The transparent target must sit near the level reported as indistinguishable, and well above the
    /// one reported as clearly worse. Anywhere outside that band and the model is not describing what
    /// was actually observed.
    /// </summary>
    [Fact]
    public void TransparentTargetMatchesTheMeasuredPoint()
    {
        var target = VideoBitrateTarget.TransparentKbps(VideoConversionCodec.Hevc, Uhd, UhdHeight, Fps60);

        Assert.InRange(target, (int)(MeasuredTransparentKbps * 0.97), (int)(MeasuredTransparentKbps * 1.03));
        Assert.True(target > MeasuredWorseKbps * 1.5, $"target {target} is too close to the level reported as worse");
    }

    /// <summary>
    /// Bitrate must rise with pixel count but sub-linearly - a 4K frame does not need four times a
    /// 1080p frame's bits, because larger frames hold proportionally more spatial redundancy.
    /// </summary>
    [Fact]
    public void BitrateRisesWithResolutionButSubLinearly()
    {
        var hd = VideoBitrateTarget.TransparentKbps(VideoConversionCodec.Hevc, 1920, 1080, 30);
        var uhd = VideoBitrateTarget.TransparentKbps(VideoConversionCodec.Hevc, 3840, 2160, 30);

        Assert.True(uhd > hd);
        Assert.True(uhd < hd * 4, "four times the pixels must not mean four times the bitrate");
        Assert.True(uhd > hd * 2, "but it should still be meaningfully more");
    }

    /// <summary>
    /// Both judged points must lie on the curve. 4K at 16541 kbps was called practically identical to
    /// the original; 1080p at 4055 was called just short of High, so the target must sit above it.
    /// </summary>
    [Fact]
    public void CurvePassesThroughBothJudgedPoints()
    {
        var uhd = VideoBitrateTarget.TransparentKbps(VideoConversionCodec.Hevc, 3840, 2160, 59.94);
        Assert.InRange(uhd, (int)(16541 * 0.97), (int)(16541 * 1.03));

        const int judgedShortOfHigh = 4055;
        var hd = VideoBitrateTarget.TransparentKbps(VideoConversionCodec.Hevc, 1920, 1080, 30);
        Assert.True(hd > judgedShortOfHigh * 1.10, $"1080p target {hd} must clear the level judged short of High");
    }

    /// <summary>
    /// Every published ladder puts 60fps at roughly 1.5x its 30fps tier, not 2x, because consecutive
    /// frames are more alike the faster they come.
    /// </summary>
    [Fact]
    public void BitrateRisesWithFrameRateButSubLinearly()
    {
        var at30 = VideoBitrateTarget.TransparentKbps(VideoConversionCodec.Hevc, Uhd, UhdHeight, 30);
        var at60 = VideoBitrateTarget.TransparentKbps(VideoConversionCodec.Hevc, Uhd, UhdHeight, 60);

        Assert.InRange(at60 / (double)at30, 1.3, 1.7);
    }

    [Fact]
    public void H264NeedsMoreBitsThanHevcAndAv1Fewer()
    {
        var hevc = VideoBitrateTarget.TransparentKbps(VideoConversionCodec.Hevc, Uhd, UhdHeight, 30);
        var h264 = VideoBitrateTarget.TransparentKbps(VideoConversionCodec.H264, Uhd, UhdHeight, 30);
        var av1 = VideoBitrateTarget.TransparentKbps(VideoConversionCodec.Av1, Uhd, UhdHeight, 30);

        Assert.True(h264 > hevc);
        Assert.True(av1 < hevc);
    }

    [Fact]
    public void UnknownDimensionsYieldNoTargetRatherThanAGuess()
    {
        Assert.Equal(0, VideoBitrateTarget.TransparentKbps(VideoConversionCodec.Hevc, 0, 0, 30));
        Assert.Equal(0, VideoBitrateTarget.TransparentKbps(VideoConversionCodec.Hevc, 1920, 0, 30));
    }

    /// <summary>A file with no reported frame rate still gets a target, on a sane assumption.</summary>
    [Fact]
    public void MissingFrameRateFallsBackRatherThanCollapsing()
    {
        Assert.True(VideoBitrateTarget.TransparentKbps(VideoConversionCodec.Hevc, Uhd, UhdHeight, 0) > 0);
    }

    // ---- the ladder ----

    [Fact]
    public void QualityRungsAimAtTheTransparentTargetAndSmallerRungsBelowIt()
    {
        var target = VideoBitrateTarget.TransparentKbps(VideoConversionCodec.Hevc, Uhd, UhdHeight, Fps60);

        foreach (var rung in new[] { VideoConversionEffort.HighSoftware, VideoConversionEffort.HighHardware })
            Assert.Equal(target, VideoBitrateTarget.ForEffort(VideoConversionCodec.Hevc, rung, Uhd, UhdHeight, Fps60));

        foreach (var rung in new[] { VideoConversionEffort.BalancedSoftware, VideoConversionEffort.BalancedHardware })
            Assert.True(VideoBitrateTarget.ForEffort(VideoConversionCodec.Hevc, rung, Uhd, UhdHeight, Fps60) < target);
    }

    /// <summary>
    /// The two rungs are the levels judged by eye on real 4K footage: High at the bitrate reported
    /// practically identical to the original, Balanced at the one that softened fine detail such as
    /// hair and freckles while the rest of the picture held up.
    /// </summary>
    [Fact]
    public void RungsReproduceTheJudgedLevels()
    {
        var high = VideoBitrateTarget.ForEffort(
            VideoConversionCodec.Hevc, VideoConversionEffort.HighHardware, Uhd, UhdHeight, Fps60);
        var balanced = VideoBitrateTarget.ForEffort(
            VideoConversionCodec.Hevc, VideoConversionEffort.BalancedHardware, Uhd, UhdHeight, Fps60);

        Assert.InRange(high, (int)(MeasuredTransparentKbps * 0.97), (int)(MeasuredTransparentKbps * 1.03));
        Assert.InRange(balanced, (int)(high * 0.65), (int)(high * 0.75));
        Assert.True(balanced > MeasuredWorseKbps, "Balanced must stay above the level judged clearly worse");
    }

    /// <summary>
    /// The frame-rate term must give each frame MORE bits at lower rates, not simply scale with them.
    /// That is why halving the frame rate halved the file without visibly costing per-frame detail.
    /// </summary>
    [Fact]
    public void LowerFrameRatesGetMoreBitsPerFrame()
    {
        var at60 = VideoBitrateTarget.ForEffort(
            VideoConversionCodec.Hevc, VideoConversionEffort.HighHardware, Uhd, UhdHeight, Fps60);
        var at30 = VideoBitrateTarget.ForEffort(
            VideoConversionCodec.Hevc, VideoConversionEffort.HighHardware, Uhd, UhdHeight, 30);

        Assert.True(at30 < at60, "the total bitrate must fall");
        Assert.True(at30 / 30d > at60 / Fps60, "but each frame must get more bits");
    }

    // ---- deciding before encoding ----

    [Fact]
    public void ProjectedSizeIsBitrateTimesDuration()
    {
        // 10 Mbps video plus 200 kbps audio for 600s ≈ 765 MB.
        var bytes = VideoBitrateTarget.ProjectedBytes(10_000, 600, 200);
        Assert.InRange(bytes, 760_000_000, 770_000_000);
    }

    [Fact]
    public void NoProjectionWithoutABitrateOrDuration()
    {
        Assert.Equal(0, VideoBitrateTarget.ProjectedBytes(0, 600, 128));
        Assert.Equal(0, VideoBitrateTarget.ProjectedBytes(5000, 0, 128));
    }

    /// <summary>
    /// The case that started this: a source already leaner than its resolution's target. Re-encoding it
    /// cannot reclaim anything and can only lose quality, so it is refused without encoding.
    /// </summary>
    [Fact]
    public void SourceAlreadyBelowItsTargetIsRefused()
    {
        var reason = VideoConversionPlanner.NotWorthConverting(sourceBytes: 800_000_000, projectedBytes: 900_000_000);

        Assert.NotNull(reason);
        Assert.Contains("already", reason!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void SourceComfortablyAboveItsTargetIsConverted()
    {
        Assert.Null(VideoConversionPlanner.NotWorthConverting(sourceBytes: 4_000_000_000, projectedBytes: 1_200_000_000));
    }

    [Fact]
    public void SavingIsTheFractionOfTheOriginalReclaimed()
    {
        Assert.Equal(0.70, VideoConversionPlanner.ProjectedSaving(1_000_000, 300_000), 3);
        Assert.Equal(0d, VideoConversionPlanner.ProjectedSaving(0, 300_000));
    }

    /// <summary>
    /// Both real videos this was calibrated against must be judged correctly from metadata alone, and
    /// the lean one that prompted the redesign must be refused.
    /// </summary>
    [Theory]
    // width, height, fps, source kbps, duration, should convert
    [InlineData(3840, 2160, 25.0, 4350, 1410, false)]    // the lean 4K file: target exceeds source
    [InlineData(3840, 2160, 29.97, 35794, 1933, true)]   // grossly over-encoded
    [InlineData(3840, 2160, 59.94, 54828, 624, true)]    // video 1501
    public void RealLibraryFilesAreJudgedCorrectlyFromMetadata(
        int width, int height, double fps, int sourceKbps, double duration, bool shouldConvert)
    {
        var target = VideoBitrateTarget.ForEffort(
            VideoConversionCodec.Hevc, VideoConversionEffort.HighHardware, width, height, fps);
        var sourceBytes = (long)(sourceKbps * 1000d * duration / 8d);
        var projected = VideoBitrateTarget.ProjectedBytes(target, duration, 128);

        var refused = VideoConversionPlanner.NotWorthConverting(sourceBytes, projected) is not null;
        Assert.Equal(shouldConvert, !refused);
    }

    // ---- frame rate ----

    /// <summary>
    /// Lowering the output frame rate lowers the bitrate target with it, because the target is derived
    /// from the output's frame rate rather than the source's.
    /// </summary>
    [Fact]
    public void LoweringOutputFrameRateLowersTheTarget()
    {
        var at60 = VideoBitrateTarget.ForEffort(
            VideoConversionCodec.Hevc, VideoConversionEffort.HighHardware, Uhd, UhdHeight, Fps60);
        var at30 = VideoBitrateTarget.ForEffort(
            VideoConversionCodec.Hevc, VideoConversionEffort.HighHardware, Uhd, UhdHeight, 30);

        Assert.True(at30 < at60);
    }

    [Fact]
    public void RequestedFrameRateReachesTheCommandLine()
    {
        var source = new ProbedMedia(600,
            [new ProbedStream(0, "video", "h264", "yuv420p", 8, false, null, null, null, 20_000, Uhd, UhdHeight, Fps60)]);

        var plan = VideoConversionPlanner.Build(
            source, "/in.mp4", "/out.mp4", Settings(VideoConversionEffort.HighHardware, fps: 30),
            "hevc_nvenc", null, sample: null, targetKbps: 9000, outputFrameRate: 30);

        Assert.Contains("-r 30", plan.Arguments);
        Assert.DoesNotContain("-fps_mode passthrough", plan.Arguments);
    }

    /// <summary>
    /// Without a frame-rate change the source's timestamps must be preserved exactly, or markers and
    /// generated sprites stop lining up with the video.
    /// </summary>
    [Fact]
    public void KeepingTheSourceFrameRatePreservesTimestamps()
    {
        var source = new ProbedMedia(600,
            [new ProbedStream(0, "video", "h264", "yuv420p", 8, false, null, null, null, 20_000, Uhd, UhdHeight, Fps60)]);

        var plan = VideoConversionPlanner.Build(
            source, "/in.mp4", "/out.mp4", Settings(VideoConversionEffort.HighHardware),
            "hevc_nvenc", null, sample: null, targetKbps: 15000);

        Assert.Contains("-fps_mode passthrough", plan.Arguments);
        Assert.DoesNotContain(" -r ", plan.Arguments);
    }

    // ---- command line ----

    [Fact]
    public void CommandLineCarriesTheBitrateTargetAndItsCeiling()
    {
        var source = new ProbedMedia(600,
            [new ProbedStream(0, "video", "h264", "yuv420p", 8, false, null, null, null, 20_000, Uhd, UhdHeight, Fps60)]);

        var plan = VideoConversionPlanner.Build(
            source, "/in.mp4", "/out.mp4", Settings(VideoConversionEffort.HighHardware),
            "hevc_nvenc", null, sample: null, targetKbps: 15000);

        Assert.Contains("-b:v 15000k", plan.Arguments);
        Assert.Contains("-maxrate 22500k", plan.Arguments);
        Assert.Contains("-bufsize 30000k", plan.Arguments);
    }

    [Fact]
    public void ProbedStreamReadsDimensionsAndFrameRate()
    {
        const string json = """
        {
          "streams": [{
            "index": 0, "codec_type": "video", "codec_name": "h264",
            "width": 3840, "height": 2160,
            "avg_frame_rate": "30000/1001", "bit_rate": "54828000"
          }],
          "format": { "duration": "624.0", "bit_rate": "55000000" }
        }
        """;

        var probed = ProbedMedia.Parse(json);
        Assert.NotNull(probed.Video);
        Assert.Equal(3840, probed.Video!.Width);
        Assert.Equal(2160, probed.Video.Height);
        Assert.Equal(29.97, probed.Video.FrameRate, 2);
    }
}
