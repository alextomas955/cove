using Cove.Api.Services;
using Cove.Core.DTOs;

namespace Cove.Tests;

public class DownloaderMaxHeightTests
{
    private static readonly IReadOnlyList<DownloaderQualityOptionDto> YtDlpOptions =
    [
        new("best", "Best available") { Height = 2160 },
        new("max-height-2160", "2160p") { Height = 2160 },
        new("max-height-1440", "1440p") { Height = 1440 },
        new("max-height-1080", "1080p") { Height = 1080 },
        new("max-height-720", "720p") { Height = 720 },
    ];

    [Theory]
    [InlineData(null)]
    [InlineData("best")]
    [InlineData("BEST")]
    public void ResolveQualityId_CapsBestAtTheLargestFittingOption(string? requested)
    {
        Assert.Equal("max-height-1080", DownloaderService.ResolveQualityId(requested, YtDlpOptions, 1080));
        Assert.Equal("max-height-1440", DownloaderService.ResolveQualityId(requested, YtDlpOptions, 1500));
    }

    [Fact]
    public void ResolveQualityId_KeepsAnExplicitResolution()
    {
        Assert.Equal("max-height-2160", DownloaderService.ResolveQualityId("max-height-2160", YtDlpOptions, 1080));
        Assert.Equal("max-height-720", DownloaderService.ResolveQualityId("max-height-720", YtDlpOptions, 1080));
    }

    [Fact]
    public void ResolveQualityId_WithoutALimitUsesTheRequestOrTheFirstOption()
    {
        Assert.Equal("best", DownloaderService.ResolveQualityId(null, YtDlpOptions, 0));
        Assert.Equal("best", DownloaderService.ResolveQualityId("best", YtDlpOptions, -1));
        Assert.Null(DownloaderService.ResolveQualityId(null, [], 1080));
    }

    [Fact]
    public void ResolveQualityId_LeavesBestWhenEveryOptionAlreadyFits()
    {
        var small = YtDlpOptions.Where(option => option.Id == "best" || option.Height <= 1080).ToList();
        Assert.Equal("best", DownloaderService.ResolveQualityId("best", small, 1440));
    }

    [Fact]
    public void ResolveQualityId_TakesTheSmallestOptionWhenNothingFits()
    {
        var large = YtDlpOptions.Where(option => option.Id == "best" || option.Height >= 1440).ToList();
        Assert.Equal("max-height-1440", DownloaderService.ResolveQualityId(null, large, 1080));
    }

    [Fact]
    public void ResolveQualityId_IgnoresOptionsWithoutAHeight()
    {
        IReadOnlyList<DownloaderQualityOptionDto> unsized = [new("hq", "High"), new("lq", "Low")];
        Assert.Equal("hq", DownloaderService.ResolveQualityId(null, unsized, 1080));
        Assert.Equal("lq", DownloaderService.ResolveQualityId("lq", unsized, 1080));
    }

    [Fact]
    public void WantsBestQuality_MatchesEmptyAndBest()
    {
        Assert.True(DownloaderService.WantsBestQuality(null));
        Assert.True(DownloaderService.WantsBestQuality(" "));
        Assert.True(DownloaderService.WantsBestQuality("Best"));
        Assert.False(DownloaderService.WantsBestQuality("max-height-1080"));
    }
}
