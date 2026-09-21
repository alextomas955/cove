using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;

namespace Cove.Api.Services;

/// <summary>
/// Converts an image's stored pixel dimensions into the <em>display</em> dimensions a viewer sees.
/// A camera that records in one orientation and tags the file with another — how phones store
/// portrait photos — leaves the stored grid transposed relative to the picture. This is the still
/// image counterpart of <see cref="FfprobeDisplayOrientation"/>, and exists for the same reason:
/// Cove's thumbnails are auto-oriented (ThumbnailService applies AutoOrient), so storing the raw
/// grid would leave the recorded size contradicting the thumbnail Cove itself renders.
/// </summary>
internal static class ExifDisplayOrientation
{
    /// <summary>
    /// Returns <paramref name="storedWidth"/>/<paramref name="storedHeight"/> transposed when the
    /// image's EXIF orientation turns the picture onto its side.
    /// </summary>
    internal static (int Width, int Height) Apply(ImageInfo image, int storedWidth, int storedHeight)
        => SwapsAxes(image) ? (storedHeight, storedWidth) : (storedWidth, storedHeight);

    /// <summary>
    /// True when the image's EXIF orientation rotates the picture a quarter turn either way.
    /// </summary>
    /// <remarks>
    /// Of the eight EXIF orientations, 5 to 8 are the ones carrying a quarter turn (alone or
    /// combined with a mirror) and so transpose the axes; 1 to 4 are upright or mirrored or a half
    /// turn, which all preserve them. Verified against ImageSharp's own AutoOrient — the operation
    /// that produces Cove's thumbnails — which transposes for exactly 5 to 8 and no others.
    /// A mirror never changes the dimensions, only which way round the picture reads.
    /// </remarks>
    internal static bool SwapsAxes(ImageInfo? image)
    {
        var profile = image?.Metadata.ExifProfile;
        if (profile is null || !profile.TryGetValue(ExifTag.Orientation, out var orientation))
            return false;

        return orientation?.Value is 5 or 6 or 7 or 8;
    }
}
