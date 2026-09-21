namespace Cove.ApiTests.Infrastructure;

public static class ApiTestImages
{
    private const string OnePixelPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==";
    private const string RedPixelPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==";
    private const string BluePixelPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/5ncLrgAAAABJRU5ErkJggg==";

    public static byte[] OnePixelPng()
        => Convert.FromBase64String(OnePixelPngBase64);

    public static byte[] RedPixelPng()
        => Convert.FromBase64String(RedPixelPngBase64);

    public static byte[] BluePixelPng()
        => Convert.FromBase64String(BluePixelPngBase64);

    /// <summary>
    /// A JPEG whose stored grid is <paramref name="width"/>x<paramref name="height"/> and which
    /// carries the given EXIF orientation, the way a phone records a photo it wants turned before
    /// display. Orientations 5 to 8 carry a quarter turn, so a viewer sees the transposed size.
    /// </summary>
    public static byte[] OrientedJpeg(int width, int height, ushort orientation)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(width, 1);
        ArgumentOutOfRangeException.ThrowIfLessThan(height, 1);
        if (orientation is < 1 or > 8)
            throw new ArgumentOutOfRangeException(nameof(orientation), "EXIF orientation is 1 through 8.");

        using var image = new SixLabors.ImageSharp.Image<SixLabors.ImageSharp.PixelFormats.Rgba32>(width, height);
        image.Metadata.ExifProfile = new SixLabors.ImageSharp.Metadata.Profiles.Exif.ExifProfile();
        image.Metadata.ExifProfile.SetValue(
            SixLabors.ImageSharp.Metadata.Profiles.Exif.ExifTag.Orientation,
            orientation);

        using var buffer = new MemoryStream();
        image.Save(buffer, new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder());
        return buffer.ToArray();
    }
}
