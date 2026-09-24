using Cove.Api.Controllers;
using Cove.Api.Services;
using Cove.ApiTests.Infrastructure;
using Cove.Core.Auth;
using Cove.Core.DTOs;
using Cove.Core.Entities.Auth;
using Cove.Core.Interfaces;

namespace Cove.ApiTests.Tests.Entities.Videos;

public sealed class VideoConversionApiTests(
    ITestOutputHelper output,
    CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    [Fact]
    [CoversEndpoint("GET", "/api/video-conversion/encoders")]
    public async Task GivenFfmpeg_WhenConversionEncodersAreListed_ThenEachCodecNamesTheEncoderItWouldUse()
    {
        var ct = TestContext.Current.CancellationToken;

        var encoders = await AsUser(ApiTestUsers.Eva).GetVideoConversionEncodersAsync(ct);

        encoders.Select(encoder => encoder.Codec).Should().Equal("h264", "hevc", "av1");
        // Every ffmpeg Cove can run with encodes H.264, in hardware or with libx264.
        encoders.Single(encoder => encoder.Codec == "h264").Encoder.Should().NotBeNullOrWhiteSpace();
        foreach (var encoder in encoders.Where(encoder => encoder.Encoder is not null))
            encoder.Hardware.Should().Be(!encoder.Encoder!.StartsWith("lib", StringComparison.Ordinal), encoder.Encoder);

        using var viewer = await CreateViewerSessionAsync(ct);
        var forbidden = () => viewer.Client.GetVideoConversionEncodersAsync(ct);
        await forbidden.Should().ThrowAsync<InvalidOperationException>().WithMessage("*returned 403 (Forbidden)*");
    }

    [Fact]
    [CoversEndpoint("POST", "/api/video-conversion")]
    public async Task GivenAnInvalidOrUnauthorisedRequest_WhenAConversionIsStarted_ThenItIsRefusedAndNothingIsQueued()
    {
        var ct = TestContext.Current.CancellationToken;
        var video = await CreateSyntheticVideoAsync("refused", ct);
        var historyBefore = await JobIdsAsync(ct);

        using var viewer = await CreateViewerSessionAsync(ct);
        var viewerStart = () => viewer.Client.StartVideoConversionAsync(Request(video.Id), ct);
        await viewerStart.Should().ThrowAsync<InvalidOperationException>().WithMessage("*returned 403 (Forbidden)*");

        var empty = Request(video.Id);
        empty.VideoIds = [];
        var unknownCodec = Request(video.Id);
        unknownCodec.Codec = "vp8";
        var unknownEffort = Request(video.Id);
        unknownEffort.Effort = "ultra";
        var numericEffort = Request(video.Id);
        numericEffort.Effort = "1";   // enum numbers are not part of the API

        foreach (var request in new[] { empty, unknownCodec, unknownEffort, numericEffort })
        {
            var start = () => AsUser(ApiTestUsers.Eva).StartVideoConversionAsync(request, ct);
            await start.Should().ThrowAsync<InvalidOperationException>().WithMessage("*returned 400 (BadRequest)*");
        }

        (await JobIdsAsync(ct)).Should().Equal(historyBefore);
    }

    /// <summary>
    /// A remux needs no quality measurement: the video stream is copied into the new container and the
    /// result is attached to the same video next to the original. Asking for the container a file is
    /// already in is skipped rather than rewritten.
    /// </summary>
    [Fact]
    [CoversEndpoint("POST", "/api/video-conversion")]
    public async Task GivenAnMp4_WhenItIsRemuxedToMkv_ThenTheCopyIsAttachedAndARepeatIntoMp4IsSkipped()
    {
        var ct = TestContext.Current.CancellationToken;
        var video = await CreateSyntheticVideoAsync("remux", ct);
        var original = video.Files.Should().ContainSingle().Which;

        var remux = Request(video.Id);
        remux.Codec = "copy";
        remux.Container = "mkv";
        var started = await AsUser(ApiTestUsers.Eva).StartVideoConversionAsync(remux, ct);
        started.ItemCount.Should().Be(1);
        var job = await AsUser().WaitForTerminalJobAsync(started.JobId, ct);

        job.Status.Should().Be(JobStatus.Completed, job.Error ?? job.Summary);
        job.UnitsSucceeded.Should().Be(1);
        var files = (await AsUser().GetVideoByIdAsync(video.Id, ct)).Files;
        files.Should().HaveCount(2);
        var copy = files.Single(file => file.Id != original.Id);
        copy.Basename.Should().EndWith(".mkv");
        copy.VideoCodec.Should().Be(original.VideoCodec);
        copy.Duration.Should().BeApproximately(original.Duration, 0.2);
        File.Exists(original.Path).Should().BeTrue("a conversion that does not replace originals leaves them in place");

        var alreadyMp4 = Request(video.Id);
        alreadyMp4.Codec = "copy";
        alreadyMp4.Container = "mp4";
        var repeat = await AsUser().WaitForTerminalJobAsync(
            (await AsUser(ApiTestUsers.Eva).StartVideoConversionAsync(alreadyMp4, ct)).JobId, ct);
        repeat.Status.Should().Be(JobStatus.Completed);
        repeat.UnitsSkipped.Should().Be(1);
        (await AsUser().GetVideoByIdAsync(video.Id, ct)).Files.Should().HaveCount(2);
    }

    /// <summary>
    /// A re-encode measures quality on samples before encoding, which needs ffmpeg's libvmaf. With it,
    /// the conversion completes and attaches the new file. Without it, the job must fail and say so
    /// rather than encode at a guessed setting - both are asserted, since which one applies depends on
    /// the ffmpeg build the host resolved.
    /// </summary>
    [Fact]
    [CoversEndpoint("POST", "/api/video-conversion")]
    public async Task GivenAVideo_WhenItIsReencoded_ThenItIsMeasuredAndConvertedOrRefusedWithoutLibvmaf()
    {
        var ct = TestContext.Current.CancellationToken;
        var capabilities = await AsUser().GetFfmpegCapabilitiesAsync(ct);
        var canMeasure = FfmpegHwAccel.HasQualityMeasurement(capabilities.FfmpegPath!);
        var video = await CreateSyntheticVideoAsync("reencode", ct);
        var original = video.Files.Should().ContainSingle().Which;

        var reencode = Request(video.Id);
        reencode.Codec = "h264";
        reencode.Container = "mkv";
        reencode.Effort = "balancedSoftware";
        // A synthetic clip is tiny already; these keep the outcome from depending on whether its
        // re-encode happens to come out a few bytes smaller.
        reencode.ConvertMarginalSavings = true;
        reencode.ConvertEvenIfLarger = true;
        var job = await AsUser().WaitForTerminalJobAsync(
            (await AsUser(ApiTestUsers.Eva).StartVideoConversionAsync(reencode, ct)).JobId, ct);
        var files = (await AsUser().GetVideoByIdAsync(video.Id, ct)).Files;

        if (canMeasure)
        {
            job.Status.Should().Be(JobStatus.Completed, job.Error ?? job.Summary);
            job.UnitsSucceeded.Should().Be(1, job.Summary);
            var converted = files.Should().HaveCount(2).And.ContainSingle(file => file.Id != original.Id).Which;
            converted.Basename.Should().EndWith(".mkv");
            converted.VideoCodec.Should().Be("h264");
            converted.Duration.Should().BeApproximately(original.Duration, 0.2);
        }
        else
        {
            job.Status.Should().Be(JobStatus.Failed);
            job.Error.Should().Contain("libvmaf");
            files.Should().ContainSingle();
        }
    }

    private static VideoConversionRequestDto Request(int videoId) => new()
    {
        VideoIds = [videoId],
        Codec = "hevc",
        Container = "mp4",
        Effort = "highHardware",
    };

    private async Task<VideoDto> CreateSyntheticVideoAsync(string label, CancellationToken ct)
    {
        var capabilities = await AsUser().GetFfmpegCapabilitiesAsync(ct);
        capabilities.FfmpegFound.Should().BeTrue();
        var path = await AsTestFileSystem().CreateSyntheticVideoAsync(
            capabilities.FfmpegPath!, $"convert-{label}-{Guid.NewGuid():N}.mp4", width: 160, height: 120,
            durationSeconds: 2, color: "orange", cancellationToken: ct);
        return await AsUser(ApiTestUsers.Eva).CreateVideoFromFileAsync(path, ct);
    }

    private async Task<string[]> JobIdsAsync(CancellationToken ct)
        => [.. (await AsUser().GetJobHistoryAsync(ct)).Select(job => job.Id)
            .Concat((await AsUser().GetJobsAsync(ct)).Select(job => job.Id))
            .Distinct()
            .Order(StringComparer.Ordinal)];

    private async Task<CoveAuthSession> CreateViewerSessionAsync(CancellationToken ct)
    {
        var username = $"conversion-viewer-{Guid.NewGuid():N}";
        await AsUser().CreateUserAsync(new CreateUserRequest(username, ApiTestUsers.Password, Roles: [BuiltinRoles.Viewer]), ct);
        return await AsUser().CreateAuthSessionAsync(username, ApiTestUsers.Password, ct);
    }
}
