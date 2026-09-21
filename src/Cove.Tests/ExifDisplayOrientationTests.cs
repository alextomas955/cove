using Cove.Api.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace Cove.Tests;

/// <summary>
/// The expectations here are not read off the EXIF specification: each one is measured against
/// ImageSharp's AutoOrient, which is the operation ThumbnailService applies when it renders an
/// image thumbnail. A recorded size that disagrees with the thumbnail Cove would render fails here.
/// </summary>
public class ExifDisplayOrientationTests
{
    private static async Task<string> WriteJpegAsync(int width, int height, ushort? orientation, CancellationToken ct)
    {
        var path = Path.Combine(Path.GetTempPath(), $"cove-exif-{Guid.NewGuid():N}.jpg");
        using var image = new Image<Rgba32>(width, height);
        if (orientation is not null)
        {
            image.Metadata.ExifProfile = new ExifProfile();
            image.Metadata.ExifProfile.SetValue(ExifTag.Orientation, orientation.Value);
        }

        await image.SaveAsync(path, new JpegEncoder(), ct);
        return path;
    }

    [Theory]
    // Upright, mirrored, and half turned: the axes survive all of them.
    [InlineData(1, 1920, 1080)]
    [InlineData(2, 1920, 1080)]
    [InlineData(3, 1920, 1080)]
    [InlineData(4, 1920, 1080)]
    // Quarter turns, alone or combined with a mirror: these transpose.
    [InlineData(5, 1080, 1920)]
    [InlineData(6, 1080, 1920)]
    [InlineData(7, 1080, 1920)]
    [InlineData(8, 1080, 1920)]
    public async Task Apply_MatchesTheSizeAutoOrientProduces(ushort orientation, int expectedWidth, int expectedHeight)
    {
        var ct = TestContext.Current.CancellationToken;
        var path = await WriteJpegAsync(1920, 1080, orientation, ct);
        try
        {
            var info = await Image.IdentifyAsync(path, ct);
            var (width, height) = ExifDisplayOrientation.Apply(info, info.Width, info.Height);

            Assert.Equal(expectedWidth, width);
            Assert.Equal(expectedHeight, height);

            // The claim under test: what Cove records is the size its own thumbnail comes out at.
            using var thumbnail = await Image.LoadAsync(path, ct);
            thumbnail.Mutate(context => context.AutoOrient());
            Assert.Equal(thumbnail.Width, width);
            Assert.Equal(thumbnail.Height, height);
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task Apply_LeavesAnImageWithNoExifProfileAlone()
    {
        var ct = TestContext.Current.CancellationToken;
        var path = await WriteJpegAsync(1920, 1080, orientation: null, ct);
        try
        {
            var info = await Image.IdentifyAsync(path, ct);

            Assert.False(ExifDisplayOrientation.SwapsAxes(info));
            Assert.Equal((1920, 1080), ExifDisplayOrientation.Apply(info, info.Width, info.Height));
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task Apply_LeavesANativelyPortraitImageAlone()
    {
        // The control that matters most: a portrait photo with no orientation tag must not be
        // transposed into landscape by a fix meant for rotated ones.
        var ct = TestContext.Current.CancellationToken;
        var path = await WriteJpegAsync(1080, 1920, orientation: 1, ct);
        try
        {
            var info = await Image.IdentifyAsync(path, ct);

            Assert.Equal((1080, 1920), ExifDisplayOrientation.Apply(info, info.Width, info.Height));
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public void SwapsAxes_TreatsAMissingImageAsUnrotated()
    {
        Assert.False(ExifDisplayOrientation.SwapsAxes(null));
    }
}
