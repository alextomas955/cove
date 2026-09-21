using Cove.ApiTests.Infrastructure;

namespace Cove.ApiTests.Tests.Entities.Images;

/// <summary>
/// Drives photos carrying an EXIF orientation through the scanner and asserts the dimensions the
/// API reports.
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
        // A mirror combined with a quarter turn: the mirror changes no dimensions, the turn does.
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
