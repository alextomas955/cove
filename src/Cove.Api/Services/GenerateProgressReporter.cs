using System.Globalization;
using Cove.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace Cove.Api.Services;

/// <summary>
/// Running tally for a generate job, shared by the parallel workers.
///
/// Generation is long and mostly silent: a full-library run can spend hours between "started" and
/// "finished" with nothing in the log and a job message that never changes, so there is no way to
/// tell a slow run from a wedged one, or to notice that a tenth of the library is failing until the
/// summary lands. This keeps the job message current and drops a periodic line in the log, without
/// emitting one line per video across nine thousand of them.
/// </summary>
internal sealed class GenerateProgressReporter(IJobProgress progress, ILogger logger, int totalUnits)
{
    /// <summary>How often a heartbeat reaches the log. The job message updates on every video.</summary>
    private static readonly TimeSpan LogInterval = TimeSpan.FromSeconds(30);

    private readonly Lock _logGate = new();
    private readonly DateTime _startedAt = DateTime.UtcNow;
    private DateTime _lastLoggedAt = DateTime.UtcNow;

    private int _processed;
    private int _succeeded;
    private int _failed;
    private int _skipped;

    public int Processed => Volatile.Read(ref _processed);
    public int Succeeded => Volatile.Read(ref _succeeded);
    public int Failed => Volatile.Read(ref _failed);
    public int Skipped => Volatile.Read(ref _skipped);

    public void RecordSucceeded() => Record(ref _succeeded);
    public void RecordFailed() => Record(ref _failed);
    public void RecordSkipped() => Record(ref _skipped);

    private void Record(ref int bucket)
    {
        Interlocked.Increment(ref bucket);
        var processed = Interlocked.Increment(ref _processed);

        var fraction = totalUnits > 0 ? Math.Clamp((double)processed / totalUnits, 0d, 1d) : 0d;
        progress.Report(fraction, Describe(processed));

        MaybeLog(processed);
    }

    private void MaybeLog(int processed)
    {
        var now = DateTime.UtcNow;
        bool due;
        lock (_logGate)
        {
            due = now - _lastLoggedAt >= LogInterval;
            if (due) _lastLoggedAt = now;
        }

        if (!due)
            return;

        var elapsed = now - _startedAt;
        var rate = elapsed.TotalSeconds > 0 ? processed / elapsed.TotalSeconds : 0d;
        var remaining = rate > 0 && totalUnits > processed
            ? TimeSpan.FromSeconds((totalUnits - processed) / rate)
            : (TimeSpan?)null;

        logger.LogInformation(
            "Generate progress: {Processed}/{Total} videos ({Succeeded} ok, {Failed} failed, {Skipped} skipped) " +
            "at {Rate:F1}/min{Remaining}",
            processed, totalUnits, Succeeded, Failed, Skipped, rate * 60,
            remaining is { } left ? $", about {FormatDuration(left)} left" : string.Empty);
    }

    /// <summary>Final line for the log, and the message the finished job keeps showing.</summary>
    public void ReportCompleted()
    {
        var processed = Processed;
        var elapsed = DateTime.UtcNow - _startedAt;
        var summary =
            $"Generated {Succeeded:N0} of {totalUnits:N0} videos" +
            (Failed > 0 ? $", {Failed:N0} failed" : string.Empty) +
            (Skipped > 0 ? $", {Skipped:N0} skipped" : string.Empty) +
            $" in {FormatDuration(elapsed)}";

        progress.Report(1d, summary);

        if (Failed > 0)
        {
            logger.LogWarning(
                "Generate finished: {Succeeded} succeeded, {Failed} failed, {Skipped} skipped of {Total} videos in {Elapsed}. " +
                "Failed videos are listed in the job's unit results.",
                Succeeded, Failed, Skipped, totalUnits, FormatDuration(elapsed));
        }
        else
        {
            logger.LogInformation(
                "Generate finished: {Succeeded} succeeded, {Skipped} skipped of {Total} videos in {Elapsed}.",
                Succeeded, Skipped, totalUnits, FormatDuration(elapsed));
        }
    }

    private string Describe(int processed)
    {
        var text = $"{processed:N0} / {totalUnits:N0} videos";
        if (Failed > 0) text += $" · {Failed:N0} failed";
        if (Skipped > 0) text += $" · {Skipped:N0} skipped";
        return text;
    }

    private static string FormatDuration(TimeSpan span)
        => span.TotalHours >= 1
            ? $"{(int)span.TotalHours}h {span.Minutes}m"
            : span.TotalMinutes >= 1
                ? $"{(int)span.TotalMinutes}m {span.Seconds}s"
                : $"{span.TotalSeconds.ToString("F0", CultureInfo.InvariantCulture)}s";
}
