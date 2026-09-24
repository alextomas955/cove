using System.Text.Json;
using Cove.Api.Services;
using Cove.Core.Entities;

namespace Cove.Tests;

/// <summary>
/// The JSON here was captured from ffprobe 8.1.2 reading real files with Cove's own probe arguments,
/// and every expectation is the size ffmpeg actually decodes from that file rather than a value read
/// off a specification. VideoRotationApiTests covers the same cases end to end.
/// </summary>
public class FfprobeDisplayOrientationTests
{
    private const string LandscapeJson = """
    { "codec_type": "video", "width": 1920, "height": 1080 }
    """;

    private const string NativePortraitJson = """
    { "codec_type": "video", "width": 1080, "height": 1920 }
    """;

    // ffprobe reports display-matrix rotation signed and unnormalised: a 270 degree matrix comes
    // back as -90 and a 180 degree one as -180. These three strings are verbatim ffprobe output.
    private const string DisplayMatrix90Json = """
    {
      "codec_type": "video", "width": 1920, "height": 1080,
      "side_data_list": [ { "side_data_type": "Display Matrix", "rotation": 90 } ]
    }
    """;

    private const string DisplayMatrix270Json = """
    {
      "codec_type": "video", "width": 1920, "height": 1080,
      "side_data_list": [ { "side_data_type": "Display Matrix", "rotation": -90 } ]
    }
    """;

    private const string DisplayMatrix180Json = """
    {
      "codec_type": "video", "width": 1920, "height": 1080,
      "side_data_list": [ { "side_data_type": "Display Matrix", "rotation": -180 } ]
    }
    """;

    // Matroska upcases tag names, so this is how a legacy rotate tag actually arrives.
    private const string LegacyRotateTagJson = """
    {
      "codec_type": "video", "width": 1920, "height": 1080,
      "tags": { "ROTATE": "90" }
    }
    """;

    private static JsonElement Stream(string json) => JsonDocument.Parse(json).RootElement.Clone();

    [Theory]
    [InlineData(LandscapeJson, 1920, 1080)]
    [InlineData(DisplayMatrix90Json, 1080, 1920)]
    [InlineData(DisplayMatrix270Json, 1080, 1920)]
    [InlineData(DisplayMatrix180Json, 1920, 1080)]
    // ffmpeg ignores the legacy tag, so this one is a control.
    [InlineData(LegacyRotateTagJson, 1920, 1080)]
    [InlineData(NativePortraitJson, 1080, 1920)]
    public void Apply_StoresTheDimensionsFfmpegActuallyDecodes(string streamJson, int expectedWidth, int expectedHeight)
    {
        var stream = Stream(streamJson);

        var (width, height) = FfprobeDisplayOrientation.Apply(stream,
            stream.GetProperty("width").GetInt32(),
            stream.GetProperty("height").GetInt32());

        Assert.Equal(expectedWidth, width);
        Assert.Equal(expectedHeight, height);
    }

    [Theory]
    [InlineData(90, true)]
    [InlineData(-90, true)]
    [InlineData(270, true)]
    [InlineData(-270, true)]
    [InlineData(180, false)]
    [InlineData(-180, false)]
    [InlineData(0, false)]
    public void SwapsAxes_DecidesOnTheMagnitudeOfTheTurn(int rotation, bool expected)
    {
        var stream = Stream($$"""
        {
          "codec_type": "video", "width": 1920, "height": 1080,
          "side_data_list": [ { "side_data_type": "Display Matrix", "rotation": {{rotation}} } ]
        }
        """);

        Assert.Equal(expected, FfprobeDisplayOrientation.SwapsAxes(stream));
    }

    [Fact]
    public void SwapsAxes_IgnoresTheLegacyRotateTag()
    {
        // Deliberate divergence from stash's isRotated: current ffmpeg does not autorotate on this
        // tag, so honouring it would store a size contradicting the thumbnail Cove renders.
        Assert.False(FfprobeDisplayOrientation.SwapsAxes(Stream(LegacyRotateTagJson)));
        Assert.False(FfprobeDisplayOrientation.SwapsAxes(Stream("""
        { "codec_type": "video", "width": 1920, "height": 1080, "tags": { "rotate": "90" } }
        """)));
    }

    [Theory]
    // Side data that carries no rotation at all, such as the audio-channel or CPB entries.
    [InlineData("""{ "side_data_list": [ { "side_data_type": "CPB properties" } ] }""")]
    [InlineData("""{ "side_data_list": [] }""")]
    [InlineData("""{ "side_data_list": null }""")]
    // A non-numeric rotation must not throw the whole probe away.
    [InlineData("""{ "side_data_list": [ { "rotation": "90" } ] }""")]
    [InlineData("""{ "side_data_list": [ { "rotation": null } ] }""")]
    [InlineData("""{ }""")]
    public void SwapsAxes_TreatsUnusableRotationAsUnrotated(string streamJson)
    {
        Assert.False(FfprobeDisplayOrientation.SwapsAxes(Stream(streamJson)));
    }

    [Fact]
    public void SwapsAxes_ReadsRotationFromAnyEntryInTheSideDataList()
    {
        // ffprobe orders side data by however the demuxer emitted it; the display matrix is not
        // guaranteed to be first.
        var stream = Stream("""
        {
          "side_data_list": [
            { "side_data_type": "CPB properties" },
            { "side_data_type": "Display Matrix", "rotation": 90 }
          ]
        }
        """);

        Assert.True(FfprobeDisplayOrientation.SwapsAxes(stream));
    }

    [Fact]
    public void ApplyFfprobeMetadata_StoresDisplayDimensionsForARotatedFile()
    {
        var videoFile = new VideoFile();

        ScanService.ApplyFfprobeMetadata(videoFile, $$"""
        {
          "format": { "duration": "1.0", "bit_rate": "1000000" },
          "streams": [ {{DisplayMatrix90Json}} ]
        }
        """);

        Assert.Equal(1080, videoFile.Width);
        Assert.Equal(1920, videoFile.Height);
    }

    [Fact]
    public void ApplyFfprobeMetadata_LeavesAHalfTurnedFileAlone()
    {
        var videoFile = new VideoFile();

        ScanService.ApplyFfprobeMetadata(videoFile, $$"""
        {
          "format": { "duration": "1.0", "bit_rate": "1000000" },
          "streams": [ {{DisplayMatrix180Json}} ]
        }
        """);

        Assert.Equal(1920, videoFile.Width);
        Assert.Equal(1080, videoFile.Height);
    }
}
