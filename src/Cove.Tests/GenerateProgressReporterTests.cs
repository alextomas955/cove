using Cove.Api.Services;
using Cove.Core.DTOs;
using Cove.Core.Interfaces;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cove.Tests;

/// <summary>
/// A full-library generate runs for hours. Without a live tally there is no way to tell a slow run
/// from a stuck one, or to notice a wave of failures before the final summary. These tests pin the
/// message the job surfaces while it works.
/// </summary>
public class GenerateProgressReporterTests
{
    private sealed class CapturingProgress : IJobProgress
    {
        public List<(double Fraction, string? Message)> Reports { get; } = [];

        public void Report(double progress, string? subTask = null)
        {
            lock (Reports) Reports.Add((progress, subTask));
        }

        public string? LastMessage
        {
            get { lock (Reports) return Reports.Count > 0 ? Reports[^1].Message : null; }
        }
    }

    private static GenerateProgressReporter Reporter(CapturingProgress progress, int total)
        => new(progress, NullLogger.Instance, total);

    [Fact]
    public void EachCompletedVideoUpdatesTheJobMessage()
    {
        var progress = new CapturingProgress();
        var reporter = Reporter(progress, 10);

        reporter.RecordSucceeded();
        reporter.RecordSucceeded();

        Assert.Equal(2, progress.Reports.Count);
        Assert.Contains("2", progress.LastMessage);
        Assert.Contains("10", progress.LastMessage);
    }

    [Fact]
    public void ProgressFractionTracksCompletedWork()
    {
        var progress = new CapturingProgress();
        var reporter = Reporter(progress, 4);

        reporter.RecordSucceeded();
        Assert.Equal(0.25, progress.Reports[^1].Fraction, 3);

        reporter.RecordFailed();
        reporter.RecordSkipped();
        reporter.RecordSucceeded();
        Assert.Equal(1.0, progress.Reports[^1].Fraction, 3);
    }

    /// <summary>Failures have to be visible while the run is going, not only in the summary.</summary>
    [Fact]
    public void FailuresAndSkipsAppearInTheRunningMessage()
    {
        var progress = new CapturingProgress();
        var reporter = Reporter(progress, 5);

        reporter.RecordSucceeded();
        Assert.DoesNotContain("failed", progress.LastMessage!, StringComparison.OrdinalIgnoreCase);

        reporter.RecordFailed();
        Assert.Contains("1", progress.LastMessage);
        Assert.Contains("failed", progress.LastMessage!, StringComparison.OrdinalIgnoreCase);

        reporter.RecordSkipped();
        Assert.Contains("skipped", progress.LastMessage!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void CompletionSummaryReportsTheFinalTally()
    {
        var progress = new CapturingProgress();
        var reporter = Reporter(progress, 3);

        reporter.RecordSucceeded();
        reporter.RecordFailed();
        reporter.RecordSkipped();
        reporter.ReportCompleted();

        var final = progress.Reports[^1];
        Assert.Equal(1d, final.Fraction, 3);
        Assert.Contains("1", final.Message);
        Assert.Contains("failed", final.Message!, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("skipped", final.Message!, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void CountsAreSafeUnderTheParallelWorkersThatProduceThem()
    {
        var progress = new CapturingProgress();
        var reporter = Reporter(progress, 300);

        Parallel.For(0, 300, i =>
        {
            if (i % 3 == 0) reporter.RecordFailed();
            else if (i % 7 == 0) reporter.RecordSkipped();
            else reporter.RecordSucceeded();
        });

        Assert.Equal(300, reporter.Processed);
        Assert.Equal(300, reporter.Succeeded + reporter.Failed + reporter.Skipped);
    }

    [Fact]
    public void ZeroTotalDoesNotDivideByZero()
    {
        var progress = new CapturingProgress();
        var reporter = Reporter(progress, 0);

        reporter.RecordSucceeded();
        reporter.ReportCompleted();

        Assert.All(progress.Reports, r => Assert.InRange(r.Fraction, 0d, 1d));
    }

    [Theory]
    [InlineData(true, false, false, false, "covers")]
    [InlineData(false, true, false, false, "previews")]
    [InlineData(false, false, true, false, "sprites")]
    [InlineData(false, false, false, true, "phashes")]
    public void SelectedAssetsAreNamedForTheLog(bool thumbs, bool previews, bool sprites, bool phashes, string expected)
    {
        var described = GenerateJobService.DescribeSelectedAssets(new GenerateOptionsDto
        {
            Thumbnails = thumbs,
            Previews = previews,
            Sprites = sprites,
            Phashes = phashes,
        });

        Assert.Contains(expected, described);
    }

    [Fact]
    public void SelectingNothingIsSaidPlainly()
    {
        var described = GenerateJobService.DescribeSelectedAssets(new GenerateOptionsDto { Thumbnails = false });
        Assert.Equal("nothing", described);
    }
}
