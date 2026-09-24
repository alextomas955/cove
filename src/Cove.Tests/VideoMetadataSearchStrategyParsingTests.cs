using Cove.Api.Controllers;
using Cove.Api.Services;

namespace Cove.Tests;

public sealed class VideoMetadataSearchStrategyParsingTests
{
    [Theory]
    [InlineData("remote-id-and-fingerprint-text", VideoMetadataSearchStrategy.RemoteIdAndFingerprintThenText)]
    [InlineData("remote-id-fingerprint", VideoMetadataSearchStrategy.RemoteIdFingerprint)]
    [InlineData("remote-id", VideoMetadataSearchStrategy.RemoteId)]
    [InlineData("fingerprint", VideoMetadataSearchStrategy.Fingerprint)]
    [InlineData("text", VideoMetadataSearchStrategy.Text)]
    [InlineData(" Text ", VideoMetadataSearchStrategy.Text)]
    public void ParsesEveryStrategyAClientCanName(string value, VideoMetadataSearchStrategy expected)
    {
        Assert.True(VideosController.TryParseMetadataSearchStrategy(value, out var strategy));
        Assert.Equal(expected, strategy);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void AbsentStrategyLeavesTheChoiceToTheService(string? value)
    {
        Assert.True(VideosController.TryParseMetadataSearchStrategy(value, out var strategy));
        Assert.Null(strategy);
    }

    [Fact]
    public void RejectsAnUnknownStrategy()
    {
        Assert.False(VideosController.TryParseMetadataSearchStrategy("title", out _));
    }
}
