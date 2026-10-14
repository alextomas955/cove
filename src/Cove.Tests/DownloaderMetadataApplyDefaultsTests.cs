using Cove.Api.Services;
using Cove.Core.Interfaces;

namespace Cove.Tests;

public class DownloaderMetadataApplyDefaultsTests
{
    private static readonly ScrapeApplyDefaultsConfig Defaults = new()
    {
        CreateMissingTags = false,
        CreateMissingPerformers = true,
        CreateMissingStudio = true,
        MarkOrganized = false,
    };

    [Fact]
    public void ResolveMetadataApplyOptions_UsesTheScrapeApplyDefaultsForAnythingUnspecified()
    {
        var options = DownloaderService.ResolveMetadataApplyOptions(Defaults, null, null, null, null);

        Assert.Equal(new DownloaderMetadataApplyOptions(CreateMissingTags: false, CreateMissingPerformers: true, CreateMissingStudio: true, MarkOrganized: false), options);
    }

    [Fact]
    public void ResolveMetadataApplyOptions_KeepsWhatTheRequestSaid()
    {
        var options = DownloaderService.ResolveMetadataApplyOptions(Defaults, createMissingTags: true, createMissingPerformers: false, createMissingStudio: null, markOrganized: true);

        Assert.Equal(new DownloaderMetadataApplyOptions(CreateMissingTags: true, CreateMissingPerformers: false, CreateMissingStudio: true, MarkOrganized: true), options);
    }

    [Fact]
    public void CombineApplyFlags_IsUnspecifiedWhenNothingWasSaid()
    {
        Assert.Null(DownloaderService.CombineApplyFlags([null, null]));
        Assert.Null(DownloaderService.CombineApplyFlags([]));
    }

    [Fact]
    public void CombineApplyFlags_AnyYesWins()
    {
        Assert.True(DownloaderService.CombineApplyFlags([false, true]));
        Assert.True(DownloaderService.CombineApplyFlags([true, false]));
        Assert.True(DownloaderService.CombineApplyFlags([null, true]));
    }

    [Fact]
    public void CombineApplyFlags_AnExplicitNoBeatsUnspecified()
    {
        Assert.False(DownloaderService.CombineApplyFlags([null, false]));
        Assert.False(DownloaderService.CombineApplyFlags([false, false]));
    }
}
