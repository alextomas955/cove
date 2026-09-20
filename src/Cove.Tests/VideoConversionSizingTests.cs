using Cove.Api.Services;

namespace Cove.Tests;

/// <summary>
/// The point of converting a library to a denser codec is to get disk space back. Constant-quality
/// encoding alone could not promise that: it targets an absolute quality with no knowledge of what the
/// source spent, so on an already-compressed file it asked for more bits than the original used. These
/// tests pin the pieces that make the promise hold - the ladder, the ceiling, and the trial encode.
/// </summary>
public class VideoConversionSizingTests
{
    private static readonly VideoConversionEffort[] SoftwareRungs =
    [
        VideoConversionEffort.QualitySoftware,
        VideoConversionEffort.HighSoftware,
        VideoConversionEffort.BalancedSoftware,
        VideoConversionEffort.SmallerSoftware,
    ];

    private static readonly VideoConversionEffort[] AllRungs =
    [
        VideoConversionEffort.QualitySoftware,
        VideoConversionEffort.HighSoftware,
        VideoConversionEffort.BalancedSoftware,
        VideoConversionEffort.SmallerSoftware,
        VideoConversionEffort.QualityHardware,
        VideoConversionEffort.SmallerHardware,
    ];

    private static VideoConversionSettings Settings(VideoConversionEffort effort) => new(
        VideoConversionCodec.Hevc, VideoConversionContainer.Mp4, effort,
        ReplaceOriginal: true, DiscardIfLarger: true);

    private static ProbedMedia Source(double durationSeconds, double videoKbps = 0) => new(
        durationSeconds,
        [new ProbedStream(0, "video", "h264", "yuv420p", 8, false, null, null, null, videoKbps)]);

    /// <summary>
    /// Measured against libx265 at the same number, hevc_nvenc produced 2.55x the bitrate at cq24 and
    /// reached parity near cq31. Without the correction a rung would mean something quite different
    /// depending on whether the machine had a usable hardware encoder.
    /// </summary>
    [Theory]
    [InlineData("hevc_nvenc")]
    [InlineData("hevc_qsv")]
    [InlineData("hevc_vaapi")]
    [InlineData("hevc_amf")]
    public void HardwareEncodersAskForAHigherQualityNumberThanSoftware(string hardwareEncoder)
    {
        foreach (var rung in AllRungs)
        {
            var software = VideoConversionPlanner.QualityValue(VideoConversionCodec.Hevc, rung, "libx265");
            var hardware = VideoConversionPlanner.QualityValue(VideoConversionCodec.Hevc, rung, hardwareEncoder);
            Assert.Equal(software + VideoConversionPlanner.HardwareQualityOffset, hardware);
        }
    }

    /// <summary>The ladder must actually descend, or the dropdown's ordering is a lie.</summary>
    [Fact]
    public void QualityFallsMonotonicallyDownTheSoftwareRungs()
    {
        var values = SoftwareRungs
            .Select(rung => VideoConversionPlanner.QualityValue(VideoConversionCodec.Hevc, rung, "libx265"))
            .ToList();

        Assert.Equal(values.OrderBy(value => value), values);
        Assert.Equal(values.Count, values.Distinct().Count());
    }

    /// <summary>
    /// Presets measured as pointless are deliberately absent: on a 4K source libx265 "slower" cost 4x
    /// "slow" for 0.3 VMAF, and every hevc_nvenc preset above p4 matched p4 within 0.2 VMAF and 1% of
    /// its size while taking up to 2.4x as long.
    /// </summary>
    [Fact]
    public void LadderNeverSelectsAPresetThatMeasuredAsWastedTime()
    {
        string[] wastedHardware = ["p5", "p6", "p7"];
        foreach (var rung in AllRungs)
        {
            var profile = VideoConversionPlanner.Profile(rung);
            Assert.NotEqual("slower", profile.SoftwarePreset);
            Assert.NotEqual("veryslow", profile.SoftwarePreset);
            Assert.DoesNotContain(profile.HardwarePreset, wastedHardware);
        }
    }

    [Fact]
    public void HardwareRungsPickHardwareAndSoftwareRungsDoNot()
    {
        Assert.True(VideoConversionPlanner.PrefersHardware(VideoConversionEffort.QualityHardware));
        Assert.True(VideoConversionPlanner.PrefersHardware(VideoConversionEffort.SmallerHardware));
        foreach (var rung in SoftwareRungs)
            Assert.False(VideoConversionPlanner.PrefersHardware(rung));
    }

    // ---- the guarantee: a conversion can never grow a file ----

    /// <summary>
    /// The property the redesign exists for. Without a ceiling, converting an already-compressed source
    /// at a quality-preserving setting produced a file larger than the original and threw it away.
    /// </summary>
    [Theory]
    [InlineData(4350)]      // the 4K web download that started this
    [InlineData(26147)]     // a wildly over-encoded 1080p source
    [InlineData(800)]       // a small, already-lean file
    public void EveryRungCapsBelowTheSourceBitrate(double sourceKbps)
    {
        foreach (var rung in AllRungs)
        {
            var cap = VideoConversionPlanner.BitrateCapKbps(rung, sourceKbps);
            Assert.NotNull(cap);
            Assert.True(cap!.Value < sourceKbps, $"{rung} capped at {cap} against {sourceKbps} kbps");
        }
    }

    [Fact]
    public void CapsTightenAsTheLadderPrefersSmallerFiles()
    {
        const double source = 10_000;
        var quality = VideoConversionPlanner.BitrateCapKbps(VideoConversionEffort.QualitySoftware, source)!.Value;
        var balanced = VideoConversionPlanner.BitrateCapKbps(VideoConversionEffort.BalancedSoftware, source)!.Value;
        var smaller = VideoConversionPlanner.BitrateCapKbps(VideoConversionEffort.SmallerSoftware, source)!.Value;

        Assert.True(quality > balanced && balanced > smaller);
    }

    /// <summary>An unknown source bitrate yields no ceiling rather than a guessed one.</summary>
    [Fact]
    public void NoCapWhenTheSourceBitrateIsUnknown()
    {
        Assert.Null(VideoConversionPlanner.BitrateCapKbps(VideoConversionEffort.QualitySoftware, 0));
        Assert.Null(VideoConversionPlanner.BitrateCapKbps(VideoConversionEffort.QualitySoftware, -1));
    }

    /// <summary>The ceiling has to reach the command line, or it is only a decision nobody applies.</summary>
    [Fact]
    public void CommandLineCarriesTheCeilingWhenTheSourceBitrateIsKnown()
    {
        var source = Source(1200, videoKbps: 4350);
        var plan = VideoConversionPlanner.Build(
            source, "/in.mp4", "/out.mp4", Settings(VideoConversionEffort.BalancedSoftware),
            "libx265", null, sample: null, sourceVideoBitrateKbps: source.VideoBitRateKbps);

        var cap = VideoConversionPlanner.BitrateCapKbps(VideoConversionEffort.BalancedSoftware, 4350)!.Value;
        Assert.Contains($"-maxrate {cap}k", plan.Arguments);
        Assert.Contains($"-bufsize {cap * 2}k", plan.Arguments);
    }

    [Fact]
    public void CommandLineOmitsTheCeilingWhenTheSourceBitrateIsUnknown()
    {
        var plan = VideoConversionPlanner.Build(
            Source(1200), "/in.mp4", "/out.mp4", Settings(VideoConversionEffort.BalancedSoftware), "libx265", null);

        Assert.DoesNotContain("-maxrate", plan.Arguments);
    }

    /// <summary>
    /// A per-stream rate is preferred; when the container does not record one, the container average
    /// less the audio streams is used, which errs high and so only ever loosens the ceiling.
    /// </summary>
    [Fact]
    public void VideoBitrateFallsBackToTheContainerAverageLessAudio()
    {
        Assert.Equal(4000, Source(100, videoKbps: 4000).VideoBitRateKbps);

        var withoutStreamRate = new ProbedMedia(100,
        [
            new ProbedStream(0, "video", "h264", null, 8, false, null, null, null),
            new ProbedStream(1, "audio", "aac", null, 0, false, null, null, null, 200),
        ])
        { OverallBitRateKbps = 4200 };

        Assert.Equal(4000, withoutStreamRate.VideoBitRateKbps);
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
        Assert.InRange(VideoConversionPlanner.ProjectFullSize(10_000_000, 60, 600), 99_000_000, 101_000_000);
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
        Assert.False(VideoConversionPlanner.ProjectsLarger((long)(source * 1.10), source));
        Assert.True(VideoConversionPlanner.ProjectsLarger((long)(source * 1.5), source));
        Assert.True(VideoConversionPlanner.ProjectsLarger((long)(source * 1.83), source));
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
        var plan = VideoConversionPlanner.Build(
            Source(1200), "/in.mp4", "/probe.mp4", Settings(VideoConversionEffort.BalancedSoftware),
            "hevc_nvenc", decodeInputArgs: null, sample: new VideoConversionSample(300, 60));

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
        var plan = VideoConversionPlanner.Build(
            Source(1200), "/in.mp4", "/out.mp4", Settings(VideoConversionEffort.BalancedSoftware), "hevc_nvenc", null);

        Assert.DoesNotContain(" -ss ", plan.Arguments);
        Assert.DoesNotContain(" -t ", plan.Arguments);
    }

    /// <summary>The trial must ask for exactly the encode the real conversion would, or it predicts nothing.</summary>
    [Fact]
    public void TrialUsesTheSameEncoderSettingsAsTheRealConversion()
    {
        var settings = Settings(VideoConversionEffort.SmallerSoftware);
        var full = VideoConversionPlanner.Build(Source(1200), "/in.mp4", "/out.mp4", settings, "hevc_nvenc", null);
        var trial = VideoConversionPlanner.Build(
            Source(1200), "/in.mp4", "/probe.mp4", settings, "hevc_nvenc", null, new VideoConversionSample(300, 60));

        var quality = VideoConversionPlanner
            .QualityValue(VideoConversionCodec.Hevc, VideoConversionEffort.SmallerSoftware, "hevc_nvenc")
            .ToString(System.Globalization.CultureInfo.InvariantCulture);

        Assert.Contains(quality, full.Arguments);
        Assert.Contains(quality, trial.Arguments);
        Assert.Equal(full.ExpectedVideoCodec, trial.ExpectedVideoCodec);
    }
}
