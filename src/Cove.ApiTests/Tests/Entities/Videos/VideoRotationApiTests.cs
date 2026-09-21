using Cove.ApiTests.Infrastructure;

namespace Cove.ApiTests.Tests.Entities.Videos;

/// <summary>
/// Rotation-flagged recordings — how phones record portrait video — store a landscape pixel grid
/// plus a display matrix standing it up. These tests drive real rotated files through the scanner
/// and assert the dimensions the API reports, because those dimensions are what the media grid
/// builds each card's aspect ratio from.
/// </summary>
public sealed class VideoRotationApiTests(
    ITestOutputHelper output,
    CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    [Fact]
    public async Task GivenQuarterTurnedRecording_WhenScanned_ThenFileReportsTheDimensionsAViewerSees()
    {
        var (ffmpegPath, ffprobePath) = await ResolveFfmpegAsync();
        var fileName = $"rotated-90-{Guid.NewGuid():N}.mp4";

        var path = await AsTestFileSystem().CreateRotatedSyntheticVideoAsync(
            ffmpegPath, ffprobePath, fileName,
            width: 320, height: 180, rotationDegrees: 90,
            durationSeconds: 1, color: "red",
            cancellationToken: TestContext.Current.CancellationToken);
        var video = await AsUser().CreateVideoFromFileAsync(path, TestContext.Current.CancellationToken);

        var file = video.Files.Should().ContainSingle().Which;
        file.Width.Should().Be(180, "a quarter-turned recording is displayed standing up");
        file.Height.Should().Be(320);
    }

    [Fact]
    public async Task GivenThreeQuarterTurnedRecording_WhenScanned_ThenFileReportsTheDimensionsAViewerSees()
    {
        // 270 degrees, which ffprobe reports as -90. Matching the literal 270 would miss this.
        var (ffmpegPath, ffprobePath) = await ResolveFfmpegAsync();
        var fileName = $"rotated-270-{Guid.NewGuid():N}.mp4";

        var path = await AsTestFileSystem().CreateRotatedSyntheticVideoAsync(
            ffmpegPath, ffprobePath, fileName,
            width: 320, height: 180, rotationDegrees: 270,
            durationSeconds: 1, color: "green",
            cancellationToken: TestContext.Current.CancellationToken);
        var video = await AsUser().CreateVideoFromFileAsync(path, TestContext.Current.CancellationToken);

        var file = video.Files.Should().ContainSingle().Which;
        file.Width.Should().Be(180);
        file.Height.Should().Be(320);
    }

    [Fact]
    public async Task GivenHalfTurnedRecording_WhenScanned_ThenFileKeepsItsCodedDimensions()
    {
        // A half turn preserves the axes, so this file must come back unchanged. ffprobe reports it
        // as -180, so an implementation testing for a non-zero rotation would wrongly transpose it.
        var (ffmpegPath, ffprobePath) = await ResolveFfmpegAsync();
        var fileName = $"rotated-180-{Guid.NewGuid():N}.mp4";

        var path = await AsTestFileSystem().CreateRotatedSyntheticVideoAsync(
            ffmpegPath, ffprobePath, fileName,
            width: 320, height: 180, rotationDegrees: 180,
            durationSeconds: 1, color: "blue",
            cancellationToken: TestContext.Current.CancellationToken);
        var video = await AsUser().CreateVideoFromFileAsync(path, TestContext.Current.CancellationToken);

        var file = video.Files.Should().ContainSingle().Which;
        file.Width.Should().Be(320);
        file.Height.Should().Be(180);
    }

    [Fact]
    public async Task GivenUnrotatedRecording_WhenScanned_ThenFileKeepsItsCodedDimensions()
    {
        var (ffmpegPath, _) = await ResolveFfmpegAsync();
        var fileName = $"unrotated-{Guid.NewGuid():N}.mp4";

        var path = await AsTestFileSystem().CreateSyntheticVideoAsync(
            ffmpegPath, fileName,
            width: 320, height: 180,
            durationSeconds: 1, color: "red",
            cancellationToken: TestContext.Current.CancellationToken);
        var video = await AsUser().CreateVideoFromFileAsync(path, TestContext.Current.CancellationToken);

        var file = video.Files.Should().ContainSingle().Which;
        file.Width.Should().Be(320);
        file.Height.Should().Be(180);
    }

    /// <summary>
    /// ffprobe sits beside ffmpeg in every layout Cove resolves, including its managed download.
    /// </summary>
    private async Task<(string FfmpegPath, string FfprobePath)> ResolveFfmpegAsync()
    {
        var capabilities = await AsUser().GetFfmpegCapabilitiesAsync(TestContext.Current.CancellationToken);
        capabilities.FfmpegFound.Should().BeTrue();
        capabilities.FfmpegPath.Should().NotBeNullOrWhiteSpace();

        var ffmpegPath = capabilities.FfmpegPath!;
        var ffprobePath = Path.Combine(
            Path.GetDirectoryName(ffmpegPath)!,
            OperatingSystem.IsWindows() ? "ffprobe.exe" : "ffprobe");
        File.Exists(ffprobePath).Should().BeTrue("the rotation fixtures are verified with ffprobe");

        return (ffmpegPath, ffprobePath);
    }
}
