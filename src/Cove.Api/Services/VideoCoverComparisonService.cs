using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Cove.Core.DTOs;
using Cove.Core.Interfaces;
using Cove.Data;

namespace Cove.Api.Services;

/// <summary>
/// Answers the one cover question a URL comparison cannot: the tagger shows a remote cover beside the
/// video's own, and two different URLs say nothing about whether they are the same picture. A video
/// whose cover was downloaded from the very source being searched reads as a conflict on every visit.
///
/// Both images are compared by perceptual hash, and only the incoming resolution decides whether the
/// same picture is worth taking. Nothing here writes a cover: the verdict is a suggestion the person
/// in the review either takes or ignores.
/// </summary>
public sealed class VideoCoverComparisonService(
    CoveContext db,
    IBlobService blobService,
    IVideoCoverService coverService,
    IFingerprintService fingerprintService,
    IMemoryCache cache,
    ILogger<VideoCoverComparisonService> logger)
{
    /// <summary>
    /// Hamming distance under which two covers are taken to be the same picture. Same as the distance
    /// that calls two video files equivalent; covers of genuinely different scenes sit far above it.
    /// </summary>
    internal const int SameCoverDistance = 8;

    /// <summary>
    /// How much larger the incoming cover must be before the same picture is worth suggesting. A few
    /// percent is a re-encode, not an upgrade; a real one is a step up such as 720p to 1080p.
    /// </summary>
    internal const double UpgradePixelRatio = 1.2;

    /// <summary>
    /// How far the two aspect ratios may differ and still be called the same picture. The hash is
    /// taken after a square resize, so it cannot tell a landscape cover from the portrait poster of
    /// the same artwork; the shape can, and a different shape is a different choice to offer.
    /// </summary>
    internal const double MaxAspectRatioDifference = 0.1;

    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(30);

    /// <summary>
    /// A failed read is cached only briefly: a blocked or slow source must not pin the old URL-only
    /// behaviour for half an hour after one blip.
    /// </summary>
    private static readonly TimeSpan FailureCacheDuration = TimeSpan.FromMinutes(1);

    /// <summary>
    /// Bounds how many candidate covers are fetched from a metadata server at once. A tagger page can
    /// hold hundreds of rows, and each asks for its own comparison as soon as its search returns; the
    /// searches themselves are throttled the same way, and a burst of downloads is what gets a client
    /// rate-limited.
    /// </summary>
    private static readonly SemaphoreSlim FetchConcurrency = new(4, 4);

    public async Task<VideoCoverComparisonDto> CompareAsync(int videoId, string? imageUrl, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return Unavailable;

        var blobId = await db.Videos
            .AsNoTracking()
            .Where(video => video.Id == videoId)
            .Select(video => video.ImageBlobId)
            .FirstOrDefaultAsync(ct);

        // An auto-generated frame cover is not a cover the person chose, and it will not resemble a
        // studio's artwork. Leaving it uncompared keeps the tagger's existing "replace" default.
        if (string.IsNullOrWhiteSpace(blobId))
            return Unavailable;

        // The blob id changes whenever the cover does, so it expires the entry without a separate signal.
        var cacheKey = $"video-cover-comparison:{videoId}:{blobId}:{imageUrl}";
        if (cache.TryGetValue(cacheKey, out VideoCoverComparisonDto? cached) && cached != null)
            return cached;

        var comparison = Compare(
            await ReadStoredCoverSignatureAsync(blobId, ct),
            await FetchCandidateSignatureAsync(imageUrl, ct));

        cache.Set(
            cacheKey,
            comparison,
            comparison.Verdict == VideoCoverComparisonVerdicts.Unavailable ? FailureCacheDuration : CacheDuration);
        return comparison;
    }

    /// <summary>The decision itself, over two signatures that have already been read.</summary>
    internal static VideoCoverComparisonDto Compare(ImageSignature? current, ImageSignature? candidate)
    {
        if (current == null || candidate == null)
            return Unavailable;

        var distance = MetadataServerService.ComputePhashHammingDistance(current.Phash, candidate.Phash);
        var details = new VideoCoverComparisonDto
        {
            Distance = distance,
            Current = Describe(current),
            Candidate = Describe(candidate),
        };

        if (distance > SameCoverDistance || !HasSameShape(current, candidate))
            return details with { Verdict = VideoCoverComparisonVerdicts.Differs };

        // The same picture: only a materially higher resolution is worth the person's attention.
        // Equal resolution has nothing to offer, whatever the two files weigh.
        return details with
        {
            Verdict = candidate.PixelCount > current.PixelCount * UpgradePixelRatio
                ? VideoCoverComparisonVerdicts.Upgrade
                : VideoCoverComparisonVerdicts.Same,
        };
    }

    private static bool HasSameShape(ImageSignature current, ImageSignature candidate)
    {
        if (current.Height <= 0 || candidate.Height <= 0)
            return false;

        var currentRatio = (double)current.Width / current.Height;
        var candidateRatio = (double)candidate.Width / candidate.Height;
        return Math.Abs(currentRatio - candidateRatio) <= MaxAspectRatioDifference * Math.Max(currentRatio, candidateRatio);
    }

    private async Task<ImageSignature?> FetchCandidateSignatureAsync(string imageUrl, CancellationToken ct)
    {
        await FetchConcurrency.WaitAsync(ct);
        try
        {
            var fetched = await coverService.TryFetchImageAsync(imageUrl, ct);
            return fetched == null ? null : fingerprintService.ComputeImageSignature(fetched.Data);
        }
        finally
        {
            FetchConcurrency.Release();
        }
    }

    private async Task<ImageSignature?> ReadStoredCoverSignatureAsync(string blobId, CancellationToken ct)
    {
        try
        {
            var blob = await blobService.GetBlobAsync(blobId, ct);
            if (blob == null)
                return null;

            await using var stream = blob.Value.Stream;
            using var buffer = new MemoryStream();
            await stream.CopyToAsync(buffer, ct);
            return fingerprintService.ComputeImageSignature(buffer.ToArray());
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to read stored cover {BlobId} for comparison", blobId);
            return null;
        }
    }

    private static VideoCoverImageDto Describe(ImageSignature signature) => new()
    {
        Width = signature.Width,
        Height = signature.Height,
        ByteSize = signature.ByteSize,
    };

    private static VideoCoverComparisonDto Unavailable => new() { Verdict = VideoCoverComparisonVerdicts.Unavailable };
}
