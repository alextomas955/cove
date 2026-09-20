using Cove.Api.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace Cove.Tests;

/// <summary>
/// A sprite sheet is a scrubbing preview, not evidence: a few unreadable frames should be filled
/// from their neighbours rather than costing the video its whole preview. Past that point the sheet
/// is mostly filler and the video is reported as failed instead.
/// </summary>
public class SpriteFrameGapFillerTests
{
    private static Image<Rgba32>?[] Frames(int count, params int[] missingIndexes)
    {
        var frames = new Image<Rgba32>?[count];
        for (var i = 0; i < count; i++)
            frames[i] = missingIndexes.Contains(i) ? null : new Image<Rgba32>(4, 4);
        return frames;
    }

    private static void DisposeAll(SpriteFrameSet set, Image<Rgba32>?[] source)
    {
        if (set.Frames is not null)
            foreach (var f in set.Frames) f?.Dispose();
        else
            foreach (var f in source) f?.Dispose();
    }

    [Fact]
    public void ReturnsFramesUnchangedWhenEverythingDecoded()
    {
        var source = Frames(81);
        var set = SpriteFrameGapFiller.Fill(source);
        try
        {
            Assert.True(set.IsUsable);
            Assert.Equal(81, set.DecodedCount);
            Assert.Equal(0, set.SubstitutedCount);
        }
        finally { DisposeAll(set, source); }
    }

    [Fact]
    public void FillsSmallGapsFromNeighbours()
    {
        var source = Frames(81, 10, 40, 41);          // 78/81 decoded, above the 90% floor
        var set = SpriteFrameGapFiller.Fill(source);
        try
        {
            Assert.True(set.IsUsable);
            Assert.Equal(78, set.DecodedCount);
            Assert.Equal(3, set.SubstitutedCount);
            Assert.All(set.Frames!, f => Assert.NotNull(f));
        }
        finally { DisposeAll(set, source); }
    }

    [Fact]
    public void RejectsWhenTooManyFramesAreMissing()
    {
        var source = Frames(81, Enumerable.Range(0, 20).ToArray());   // 61/81, below the floor
        var set = SpriteFrameGapFiller.Fill(source);
        try
        {
            Assert.False(set.IsUsable);
            Assert.Null(set.Frames);
            Assert.Equal(61, set.DecodedCount);
            Assert.Equal(81, set.RequestedCount);
        }
        finally { DisposeAll(set, source); }
    }

    [Fact]
    public void RejectsWhenNothingDecoded()
    {
        var source = Frames(81, Enumerable.Range(0, 81).ToArray());
        var set = SpriteFrameGapFiller.Fill(source);
        Assert.False(set.IsUsable);
        Assert.Equal(0, set.DecodedCount);
    }

    /// <summary>
    /// Substituted slots must be clones. If a gap held a second reference to its neighbour, the
    /// caller's disposal loop would dispose the same image twice and throw mid-sprite.
    /// </summary>
    [Fact]
    public void SubstitutedFramesAreClonesSoDisposalIsSafe()
    {
        var source = Frames(10, 3);
        var set = SpriteFrameGapFiller.Fill(source);
        Assert.True(set.IsUsable);

        var frames = set.Frames!;
        Assert.NotSame(frames[2], frames[3]);
        Assert.Equal(10, frames.Distinct().Count());

        foreach (var f in frames) f.Dispose();      // must not throw
    }

    /// <summary>A leading gap has no earlier neighbour and must fall forward instead.</summary>
    [Fact]
    public void FillsLeadingGapFromTheFollowingFrame()
    {
        var source = Frames(10, 0);
        var set = SpriteFrameGapFiller.Fill(source);
        try
        {
            Assert.True(set.IsUsable);
            Assert.NotNull(set.Frames![0]);
            Assert.Equal(1, set.SubstitutedCount);
        }
        finally { DisposeAll(set, source); }
    }
}
