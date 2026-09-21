using Cove.ApiTests.Infrastructure;

namespace Cove.ApiTests.Tests.Entities.Images;

/// <summary>
/// A phone photographed in portrait stores a landscape grid plus an EXIF orientation saying to turn
/// it. These tests drive such files through the scanner and assert the dimensions the API reports,
/// which are what the image grid builds each card's shape from and what the thumbnail comes out at.
/// </summary>
public sealed class ImageOrientationApiTests(
    ITestOutputHelper output,
    CoveApiTestFixture fixture) : ApiTest(output, fixture)
{
    [Fact]
    public async Task GivenQuarterTurnedPhoto_WhenScanned_ThenFileReportsTheDimensionsAViewerSees()
    {
        var fileName = $"oriented-6-{Guid.NewGuid():N}.jpg";
        var path = AsTestFileSystem().CreateLibraryFile(fileName, ApiTestImages.OrientedJpeg(1920, 1080, orientation: 6));

        var image = await AsUser().CreateImageFromFileAsync(path, TestContext.Current.CancellationToken);

        var file = image.Files.Should().ContainSingle().Which;
        file.Width.Should().Be(1080, "a quarter-turned photo is displayed standing up");
        file.Height.Should().Be(1920);
    }

    [Fact]
    public async Task GivenMirroredQuarterTurnedPhoto_WhenScanned_ThenFileReportsTheDimensionsAViewerSees()
    {
        // Orientation 5 combines a mirror with a quarter turn. The mirror changes nothing about the
        // dimensions, but the quarter turn still transposes them.
        var fileName = $"oriented-5-{Guid.NewGuid():N}.jpg";
        var path = AsTestFileSystem().CreateLibraryFile(fileName, ApiTestImages.OrientedJpeg(1920, 1080, orientation: 5));

        var image = await AsUser().CreateImageFromFileAsync(path, TestContext.Current.CancellationToken);

        var file = image.Files.Should().ContainSingle().Which;
        file.Width.Should().Be(1080);
        file.Height.Should().Be(1920);
    }

    [Fact]
    public async Task GivenHalfTurnedPhoto_WhenScanned_ThenFileKeepsItsStoredDimensions()
    {
        // A half turn preserves the axes, so this must come back unchanged.
        var fileName = $"oriented-3-{Guid.NewGuid():N}.jpg";
        var path = AsTestFileSystem().CreateLibraryFile(fileName, ApiTestImages.OrientedJpeg(1920, 1080, orientation: 3));

        var image = await AsUser().CreateImageFromFileAsync(path, TestContext.Current.CancellationToken);

        var file = image.Files.Should().ContainSingle().Which;
        file.Width.Should().Be(1920);
        file.Height.Should().Be(1080);
    }

    [Fact]
    public async Task GivenUprightPhoto_WhenScanned_ThenFileKeepsItsStoredDimensions()
    {
        var fileName = $"oriented-1-{Guid.NewGuid():N}.jpg";
        var path = AsTestFileSystem().CreateLibraryFile(fileName, ApiTestImages.OrientedJpeg(1920, 1080, orientation: 1));

        var image = await AsUser().CreateImageFromFileAsync(path, TestContext.Current.CancellationToken);

        var file = image.Files.Should().ContainSingle().Which;
        file.Width.Should().Be(1920);
        file.Height.Should().Be(1080);
    }

    [Fact]
    public async Task GivenNativelyPortraitPhoto_WhenScanned_ThenFileKeepsItsStoredDimensions()
    {
        // The control that would break loudest if the transpose were applied unconditionally.
        var fileName = $"portrait-native-{Guid.NewGuid():N}.jpg";
        var path = AsTestFileSystem().CreateLibraryFile(fileName, ApiTestImages.OrientedJpeg(1080, 1920, orientation: 1));

        var image = await AsUser().CreateImageFromFileAsync(path, TestContext.Current.CancellationToken);

        var file = image.Files.Should().ContainSingle().Which;
        file.Width.Should().Be(1080);
        file.Height.Should().Be(1920);
    }
}
