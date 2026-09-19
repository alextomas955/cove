using System.Globalization;
using Cove.Core.Auth;
using Cove.Core.Common;
using Cove.Core.Entities;
using Cove.Core.Interfaces;
using Cove.Data;
using IVideoFileMaintenanceService = Cove.Plugins.IVideoFileMaintenanceService;
using Microsoft.EntityFrameworkCore;

namespace Cove.Api.Services;

/// <summary>What a conversion to one codec would run on this machine, for the conversion dialog.</summary>
public sealed record VideoConversionEncoderInfo(string Codec, string? Encoder, bool Hardware);

public sealed record VideoConversionJobStart(string JobId, int ItemCount);

/// <summary>
/// Converts videos' primary files to another codec and/or container. Each converted file is written next
/// to the original and attached to the same video as an extra file. When the job is asked to replace the
/// originals, the new file must also pass a full decode check and the primary-file swap's same-footage
/// check before it becomes primary and the original is deleted, so generated assets, markers and clips
/// carry over without regenerating anything. Any file that fails a check is left alone, and the unit says why.
/// </summary>
public sealed class VideoConversionJobService(
    IJobService jobService,
    IServiceScopeFactory scopeFactory,
    IMediaProbeService mediaProbe,
    HardwareEncodeSessionGate hwEncodeSessionGate,
    PhysicalFileAccessCoordinator physicalFileCoordinator,
    CoveConfiguration config,
    ILogger<VideoConversionJobService> logger)
{
    // ffmpeg writes a -progress block about twice a second; this long without one means it is hung.
    private static readonly TimeSpan StallTimeout = TimeSpan.FromMinutes(5);

    // Share of a unit's progress bar for each phase.
    private const double EncodeShare = 0.75;
    private const double VerifyShare = 0.2;

    private readonly Dictionary<(string Fingerprint, VideoConversionCodec Codec), string?> _encoders = [];
    private readonly object _encoderLock = new();

    public VideoConversionJobStart Start(CovePrincipal? principal, IReadOnlyList<int> videoIds, VideoConversionSettings settings)
    {
        var ids = videoIds.Where(id => id > 0).Distinct().ToArray();
        var target = settings.Codec == VideoConversionCodec.Copy
            ? ContainerLabelFor(settings)
            : $"{FfmpegHwAccel.CodecLabel(settings.Codec)} {ContainerLabelFor(settings)}";
        var description = $"Converting {ids.Length} video{(ids.Length == 1 ? "" : "s")} to {target}"
            + (settings.ReplaceOriginal ? " (replacing originals)" : string.Empty);

        var jobId = jobService.EnqueueFor(
            JobOwner.FromPrincipal(principal),
            "convert-videos",
            description,
            (progress, ct) => RunAsync(ids, settings, progress, ct));
        return new VideoConversionJobStart(jobId, ids.Length);
    }

    /// <summary>The encoder each codec would use under the current settings. Probes run once per ffmpeg/setting combination.</summary>
    public IReadOnlyList<VideoConversionEncoderInfo> DescribeEncoders()
    {
        var ffmpeg = FfmpegHwAccel.FindFfmpeg(config.FfmpegPath);
        return [.. new[] { VideoConversionCodec.H264, VideoConversionCodec.Hevc, VideoConversionCodec.Av1 }
            .Select(codec =>
            {
                var encoder = ffmpeg is null ? null : ResolveEncoder(ffmpeg, codec);
                return new VideoConversionEncoderInfo(
                    VideoConversionPlanner.CodecName(codec),
                    encoder,
                    encoder is not null && !FfmpegHwAccel.IsSoftwareEncoder(encoder));
            })];
    }

    private string? ResolveEncoder(string ffmpegPath, VideoConversionCodec codec)
    {
        var key = ($"{ffmpegPath}|{config.HardwareAcceleration}", codec);
        lock (_encoderLock)
        {
            if (_encoders.TryGetValue(key, out var cached))
                return cached;
        }

        // Probing runs test encodes, so it happens outside the lock; a concurrent duplicate probe is harmless.
        var encoder = FfmpegHwAccel.SelectConversionEncoder(ffmpegPath, codec, config.HardwareAcceleration, logger);
        lock (_encoderLock)
            _encoders[key] = encoder;
        return encoder;
    }

    private async Task RunAsync(int[] ids, VideoConversionSettings settings, IJobProgress progress, CancellationToken ct)
    {
        var ffmpeg = FfmpegHwAccel.FindFfmpeg(config.FfmpegPath)
            ?? throw new InvalidOperationException("FFmpeg was not found. Set its path in Settings before converting videos.");

        string? encoder = null;
        if (settings.Codec != VideoConversionCodec.Copy)
        {
            progress.Report(0, $"Choosing the {FfmpegHwAccel.CodecLabel(settings.Codec)} encoder...");
            encoder = ResolveEncoder(ffmpeg, settings.Codec)
                ?? throw new InvalidOperationException(
                    $"This ffmpeg build cannot encode {FfmpegHwAccel.CodecLabel(settings.Codec)}: "
                    + $"{FfmpegHwAccel.SoftwareEncoderFor(settings.Codec)} is not built in and no hardware encoder for it passed a test encode.");
        }

        List<(int Id, string Label)> work;
        await using (var scope = scopeFactory.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CoveContext>();
            var found = await db.Videos.AsNoTracking()
                .Where(video => ids.Contains(video.Id))
                .Select(video => new { video.Id, video.Title, Basename = video.PrimaryFile != null ? video.PrimaryFile.Basename : null })
                .ToDictionaryAsync(video => video.Id, ct);
            work = [.. ids.Select(id => (id, found.TryGetValue(id, out var video)
                ? (!string.IsNullOrWhiteSpace(video.Title) ? video.Title : video.Basename ?? $"Video {id}")
                : $"Video {id}"))];
        }

        progress.DeclareUnitCount(work.Count);

        // Hardware encoders run within the shared GPU session limit; a software encode already uses
        // every core, so running two at once only makes both slower.
        var parallelism = encoder is not null && !FfmpegHwAccel.IsSoftwareEncoder(encoder)
            ? Math.Min(2, hwEncodeSessionGate.Capacity)
            : 1;

        var result = await jobService.RunBatchAsync(
            work,
            parallelism,
            (item, unit, token) => ConvertAsync(ffmpeg, encoder, item.Id, settings, unit, token),
            progress,
            unitIdFactory: (item, _) => item.Id.ToString(CultureInfo.InvariantCulture),
            labelFactory: item => item.Label,
            ct: ct);

        progress.SetSummary(result.Summary);
    }

    private async Task ConvertAsync(
        string ffmpeg,
        string? encoder,
        int videoId,
        VideoConversionSettings settings,
        IJobUnit unit,
        CancellationToken ct)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CoveContext>();

        var video = await db.Videos.AsNoTracking()
            .Include(item => item.PrimaryFile!).ThenInclude(file => file.ParentFolder)
            .SingleOrDefaultAsync(item => item.Id == videoId, ct);
        if (video is null)
        {
            unit.Complete(JobUnitOutcome.Skipped, "The video no longer exists.");
            return;
        }

        var original = video.PrimaryFile;
        if (original is null)
        {
            unit.Complete(JobUnitOutcome.Skipped, "The video has no primary file.");
            return;
        }
        if (original.ZipFileId is not null)
        {
            unit.Complete(JobUnitOutcome.Skipped, "The primary file is inside an archive.");
            return;
        }

        var sourcePath = FilesystemPaths.ToNativePath(!string.IsNullOrWhiteSpace(original.Path)
            ? original.Path
            : BaseFileEntity.ComputePath(original.ParentFolder?.Path, original.Basename));
        if (!File.Exists(sourcePath))
        {
            unit.Complete(JobUnitOutcome.Failed, $"The primary file is missing on disk: {sourcePath}");
            return;
        }

        unit.Report(0, "Reading the original file...");
        var source = await ProbeAsync(sourcePath, "original", ct);
        var sourceCodec = source.Video?.CodecName ?? string.Empty;
        if (VideoConversionPlanner.SkipReason(sourcePath, sourceCodec, settings) is { } skip)
        {
            unit.Complete(JobUnitOutcome.Skipped, skip);
            return;
        }

        // Names already used in the folder, including rows whose file is missing from disk: importing onto
        // one of those would adopt that row instead of creating a new file.
        var usedNames = (await db.Set<BaseFileEntity>().AsNoTracking()
                .Where(file => file.ParentFolderId == original.ParentFolderId)
                .Select(file => file.Basename)
                .ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var outputPath = VideoConversionPlanner.ChooseOutputPath(sourcePath, settings, candidate =>
            File.Exists(candidate)
            || File.Exists(candidate + VideoConversionPlanner.PartialSuffix)
            || usedNames.Contains(Path.GetFileName(candidate)));
        var partialPath = outputPath + VideoConversionPlanner.PartialSuffix;

        var sourceSize = new FileInfo(sourcePath).Length;
        EnsureFreeSpace(outputPath, sourceSize);

        var copiesVideo = VideoConversionPlanner.CopiesVideo(sourceCodec, settings.Codec);
        var notes = new List<string>();
        if (copiesVideo && settings.Codec != VideoConversionCodec.Copy)
            notes.Add($"The video was already {FfmpegHwAccel.CodecLabel(settings.Codec)}, so it was copied without re-encoding.");
        var published = false;
        try
        {
            var plan = await EncodeAsync(ffmpeg, copiesVideo ? null : encoder, source, sourcePath, partialPath, settings, notes, unit, ct);
            notes.AddRange(plan.Notes);

            var output = await ProbeAsync(partialPath, "converted", ct);
            if (VideoConversionPlanner.VerifyOutput(source, output, plan) is { } problem)
            {
                unit.Complete(JobUnitOutcome.Failed, $"{problem} The original was kept.");
                return;
            }

            var outputSize = new FileInfo(partialPath).Length;
            if (!copiesVideo && settings.DiscardIfLarger && outputSize >= sourceSize)
            {
                unit.Complete(JobUnitOutcome.Skipped,
                    $"The converted file was {FormatSize(outputSize)}, no smaller than the original's {FormatSize(sourceSize)}, so it was discarded and the original kept.");
                return;
            }

            if (settings.ReplaceOriginal)
            {
                unit.Report(EncodeShare, "Checking the converted file decodes cleanly...");
                await VerifyDecodesAsync(ffmpeg, partialPath, output.Duration, unit, ct);
            }

            int newFileId;
            unit.Report(EncodeShare + VerifyShare, "Adding the converted file to the video...");
            using (await physicalFileCoordinator.AcquireReadAsync(ct))
            {
                if (File.Exists(outputPath))
                    throw new VideoConversionException($"{outputPath} appeared while converting, so the converted file was not moved into place.");

                File.Move(partialPath, outputPath);
                published = true;
                var scanService = scope.ServiceProvider.GetRequiredService<IScanService>() as ScanService
                    ?? throw new InvalidOperationException("Library conversion needs Cove's scan service to import the converted file.");
                newFileId = await scanService.ImportConvertedVideoFileWithinProducerLeaseAsync(outputPath, videoId, ct);
            }

            var outcome = $"Converted to {Path.GetFileName(outputPath)} ({FormatSize(sourceSize)} → {FormatSize(outputSize)})";
            if (!settings.ReplaceOriginal)
            {
                unit.Complete(JobUnitOutcome.Succeeded, Describe($"{outcome}, added as an extra file.", notes));
                return;
            }

            // Replacing is only safe while the file that was converted is still the one the video plays.
            var currentPrimary = await db.Videos.AsNoTracking()
                .Where(item => item.Id == videoId)
                .Select(item => item.PrimaryFileId)
                .SingleOrDefaultAsync(ct);
            if (currentPrimary != original.Id)
            {
                unit.Complete(JobUnitOutcome.Failed,
                    Describe($"{outcome}, but the video's primary file changed during the conversion, so nothing was replaced. The converted file is attached as an extra file.", notes));
                return;
            }

            // The swap re-checks that both files show the same footage (length and perceptual hash) before
            // changing anything, which is what keeps the video's generated assets valid.
            unit.Report(0.97, "Making the converted file primary...");
            var maintenance = scope.ServiceProvider.GetRequiredService<IVideoFileMaintenanceService>();
            var swap = await maintenance.MakePrimaryWhenSameContentAsync(videoId, newFileId, ct);
            if (!swap.Applied)
            {
                unit.Complete(JobUnitOutcome.Failed,
                    Describe($"{outcome}, but it was not made primary: {swap.Reason} The original was kept, and the converted file is attached as an extra file.", notes));
                return;
            }

            var removal = await maintenance.DeleteFileAsync(original.Id, deleteFromDisk: true, ct);
            if (!removal.Applied)
            {
                unit.Complete(JobUnitOutcome.Failed,
                    Describe($"{outcome} and made primary, but the original could not be deleted: {removal.Reason}", notes));
                return;
            }

            unit.Complete(JobUnitOutcome.Succeeded, Describe($"{outcome}; it replaced the original, which was deleted.", notes));
        }
        catch (VideoConversionException ex)
        {
            unit.Complete(JobUnitOutcome.Failed, ex.Message);
        }
        finally
        {
            if (!published)
                DeletePartial(partialPath);
        }
    }

    private async Task<VideoConversionPlan> EncodeAsync(
        string ffmpeg,
        string? encoder,
        ProbedMedia source,
        string sourcePath,
        string partialPath,
        VideoConversionSettings settings,
        List<string> notes,
        IJobUnit unit,
        CancellationToken ct)
    {
        var decodeArgs = config.FfmpegInputArgs;
        var plan = VideoConversionPlanner.Build(source, sourcePath, partialPath, settings, encoder, decodeArgs);
        var action = plan.CopiesVideo ? "Remuxing" : $"Encoding with {encoder}";

        var result = await RunTrackedAsync(ffmpeg, plan.Arguments, source.Duration, $"{action}...", 0, EncodeShare, unit, ct, encoder);
        if (result.ExitCode == 0)
            return plan;

        // Same policy as preview generation: a hardware encoder that passed its probe can still fail on a
        // real file (a 10-bit format the GPU lacks, an exhausted session), so encode once more in software.
        if (encoder is not null && !FfmpegHwAccel.IsSoftwareEncoder(encoder))
        {
            var software = FfmpegHwAccel.SoftwareEncoderFor(settings.Codec);
            logger.LogWarning("Hardware conversion with {Encoder} failed for {Path}; retrying with {Software}: {Error}",
                encoder, sourcePath, software, LastLine(result.StandardError));
            notes.Add($"{encoder} failed ({LastLine(result.StandardError)}), so it was encoded with {software} instead.");
            DeletePartial(partialPath);

            plan = VideoConversionPlanner.Build(source, sourcePath, partialPath, settings, software, decodeArgs);
            result = await RunTrackedAsync(ffmpeg, plan.Arguments, source.Duration, $"Encoding with {software}...", 0, EncodeShare, unit, ct, software);
            if (result.ExitCode == 0)
                return plan;
        }

        throw new VideoConversionException(result.TimedOut
            ? "ffmpeg stopped responding, so the conversion was stopped. The original was kept."
            : $"ffmpeg could not convert the file: {LastLine(result.StandardError)} The original was kept.");
    }

    private async Task VerifyDecodesAsync(string ffmpeg, string path, double duration, IJobUnit unit, CancellationToken ct)
    {
        var result = await RunTrackedAsync(
            ffmpeg,
            VideoConversionPlanner.DecodeCheckArguments(path, config.FfmpegInputArgs),
            duration,
            "Checking the converted file decodes cleanly...",
            EncodeShare,
            VerifyShare,
            unit,
            ct,
            encoder: null);

        // With -v error, anything ffmpeg prints is a decode error.
        if (result.ExitCode != 0 || !string.IsNullOrWhiteSpace(result.StandardError))
        {
            throw new VideoConversionException(result.TimedOut
                ? "The decode check stopped responding, so the converted file was discarded and the original kept."
                : $"The converted file did not decode cleanly ({LastLine(result.StandardError)}), so it was discarded and the original kept.");
        }
    }

    private async Task<FfmpegProcessResult> RunTrackedAsync(
        string ffmpeg,
        string arguments,
        double duration,
        string message,
        double start,
        double share,
        IJobUnit unit,
        CancellationToken ct,
        string? encoder)
    {
        unit.Report(start, message);
        var lastReported = -1d;
        void OnProgress(string line)
        {
            if (duration <= 0 || !VideoConversionPlanner.TryParseProgressSeconds(line, out var seconds))
                return;
            var fraction = Math.Clamp(seconds / duration, 0, 1);
            // Throttle to whole percents so a long encode does not flood the job feed.
            if (fraction - lastReported < 0.01)
                return;
            lastReported = fraction;
            unit.Report(start + share * fraction, $"{message} {fraction:P0}");
        }

        logger.LogDebug("Running ffmpeg {Arguments}", arguments);
        if (encoder is null || FfmpegHwAccel.IsSoftwareEncoder(encoder))
            return await FfmpegProcessRunner.RunWithProgressAsync(ffmpeg, arguments, OnProgress, StallTimeout, ct);

        using (await hwEncodeSessionGate.AcquireAsync(ct))
            return await FfmpegProcessRunner.RunWithProgressAsync(ffmpeg, arguments, OnProgress, StallTimeout, ct);
    }

    private async Task<ProbedMedia> ProbeAsync(string path, string which, CancellationToken ct)
    {
        var probe = await mediaProbe.ProbeAsync(path, ct);
        if (probe.Status != MediaProbeStatus.Success || probe.Json is null)
            throw new VideoConversionException($"ffprobe could not read the {which} file: {probe.Reason ?? probe.Status.ToString()}");
        return ProbedMedia.Parse(probe.Json);
    }

    private static void EnsureFreeSpace(string outputPath, long sourceSize)
    {
        DriveInfo drive;
        try
        {
            var root = Path.GetPathRoot(Path.GetFullPath(outputPath));
            if (string.IsNullOrEmpty(root))
                return;
            drive = new DriveInfo(root);
            if (!drive.IsReady)
                return;
        }
        catch (Exception ex) when (ex is ArgumentException or IOException or UnauthorizedAccessException)
        {
            // Network shares and some mounts have no drive to ask; ffmpeg reports a full disk itself.
            return;
        }

        // A conversion can come out larger than the original, so require room for a full copy.
        if (drive.AvailableFreeSpace < sourceSize)
        {
            throw new VideoConversionException(
                $"Not enough free space on {drive.Name}: the conversion needs up to {FormatSize(sourceSize)} and {FormatSize(drive.AvailableFreeSpace)} is free.");
        }
    }

    private void DeletePartial(string partialPath)
    {
        try
        {
            if (File.Exists(partialPath))
                File.Delete(partialPath);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            logger.LogWarning(ex, "Could not delete the partial conversion output {Path}", partialPath);
        }
    }

    private static string Describe(string outcome, List<string> notes)
        => notes.Count == 0 ? outcome : $"{outcome} {string.Join(" ", notes)}";

    private static string LastLine(string stderr)
    {
        var line = stderr.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).LastOrDefault();
        return string.IsNullOrEmpty(line) ? "no error output" : line;
    }

    private static string ContainerLabelFor(VideoConversionSettings settings) => VideoConversionPlanner.ContainerLabel(settings.Container);

    private static string FormatSize(long bytes)
    {
        string[] units = ["B", "KB", "MB", "GB", "TB"];
        double value = bytes;
        var unit = 0;
        while (value >= 1024 && unit < units.Length - 1)
        {
            value /= 1024;
            unit++;
        }
        return string.Create(CultureInfo.InvariantCulture, $"{value:0.#} {units[unit]}");
    }
}
