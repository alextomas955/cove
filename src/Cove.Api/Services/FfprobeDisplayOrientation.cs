using System.Text.Json;

namespace Cove.Api.Services;

/// <summary>
/// Converts ffprobe's <em>coded</em> frame dimensions into the <em>display</em> dimensions a viewer
/// actually sees. A rotation-flagged file — how phones record portrait video — stores a landscape
/// pixel grid plus a display matrix saying to stand it up, so its coded size is the transpose of
/// its display size. Storing the coded size makes Cove contradict itself: ffmpeg autorotates when
/// it extracts a thumbnail, so the card would build a 16:9 box around a portrait image.
/// </summary>
internal static class FfprobeDisplayOrientation
{
    /// <summary>
    /// Returns <paramref name="codedWidth"/>/<paramref name="codedHeight"/> transposed when the
    /// stream's display matrix turns the picture onto its side.
    /// </summary>
    internal static (int Width, int Height) Apply(JsonElement videoStream, int codedWidth, int codedHeight)
        => SwapsAxes(videoStream) ? (codedHeight, codedWidth) : (codedWidth, codedHeight);

    /// <summary>
    /// True when the stream's display matrix rotates the picture a quarter turn either way.
    /// </summary>
    /// <remarks>
    /// Only the display matrix is consulted, deliberately. ffprobe can also report rotation as a
    /// legacy <c>tags.rotate</c> string, and other tools (stash's <c>isRotated</c>) honour both, but
    /// current ffmpeg does not autorotate on that tag: decoding a frame from a Matroska file whose
    /// only rotation is <c>ROTATE=90</c> yields an unturned 1920x1080 picture, while the same file
    /// carrying a display matrix yields 1080x1920. Cove's thumbnails come from ffmpeg, so honouring
    /// the tag would store dimensions contradicting the picture Cove itself renders — reintroducing
    /// the very mismatch this type exists to remove. The tag only ever mattered because much older
    /// ffprobe builds reported display matrices that way.
    ///
    /// A half turn preserves the axes, so only quarter turns transpose. ffprobe reports these
    /// signed and not normalised — a 270 degree matrix arrives as -90 and a 180 degree one as
    /// -180 — so the magnitude, not the literal value, decides.
    /// </remarks>
    internal static bool SwapsAxes(JsonElement videoStream)
    {
        if (videoStream.ValueKind != JsonValueKind.Object
            || !videoStream.TryGetProperty("side_data_list", out var sideDataList)
            || sideDataList.ValueKind != JsonValueKind.Array)
            return false;

        foreach (var sideData in sideDataList.EnumerateArray())
        {
            if (sideData.ValueKind != JsonValueKind.Object
                || !sideData.TryGetProperty("rotation", out var rotation))
                continue;

            // av_display_rotation_get computes a double, so tolerate a fractional encoding even
            // though ffprobe currently prints whole degrees.
            if (rotation.ValueKind != JsonValueKind.Number || !rotation.TryGetDouble(out var degrees))
                continue;

            if (IsQuarterTurn(degrees))
                return true;
        }

        return false;
    }

    private static bool IsQuarterTurn(double degrees)
    {
        if (!double.IsFinite(degrees))
            return false;

        var quarterTurns = Math.Abs(Math.Round(degrees)) % 360;
        return quarterTurns is 90 or 270;
    }
}
