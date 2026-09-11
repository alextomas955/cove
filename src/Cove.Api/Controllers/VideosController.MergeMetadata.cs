using Cove.Api.Services;
using Cove.Core.DTOs;
using Cove.Core.Entities;
using Cove.Core.Helpers;
using Microsoft.EntityFrameworkCore;

namespace Cove.Api.Controllers;

public partial class VideosController
{
    private static readonly HashSet<string> MergeScalarFields =
        ["title", "code", "details", "director", "date", "studioId", "captions", "organized", "isVr", "cover"];

    private async Task<string?> ValidateMergeMetadata(Video target, Video source, VideoMergeMetadataDto choices,
        int[] visibleTags, int[] visiblePerformers, int[] visibleGalleries, CancellationToken ct)
    {
        if (choices.Fields?.Any(item => !MergeScalarFields.Contains(item.Key) || item.Value is not ("source" or "target")) == true
            || choices.CustomFields?.Any(item => item.Value is not ("source" or "target")) == true)
            return "Unknown metadata field or selection side.";
        if (!ValidSelection(choices.TagIds, visibleTags)
            || !ValidSelection(choices.PerformerIds, target.VideoPerformers.Concat(source.VideoPerformers).Select(item => item.PerformerId).Intersect(visiblePerformers))
            || !ValidSelection(choices.GalleryIds, target.VideoGalleries.Concat(source.VideoGalleries).Select(item => item.GalleryId).Intersect(visibleGalleries)))
            return "Selected relationships must be readable items from the compared videos.";
        if (!ValidSelection(choices.Urls, target.Urls.Concat(source.Urls).Select(item => item.Url), StringComparer.OrdinalIgnoreCase)
            || !ValidSelection(choices.RemoteIds?.Select(item => (item.Endpoint, item.RemoteId)),
                target.RemoteIds.Concat(source.RemoteIds).Select(item => (item.Endpoint, item.RemoteId)), RemoteIdKeyComparer.Instance))
            return "Selected links must belong to one of the compared videos.";
        if (choices.CustomFields != null)
        {
            var values = await customFields.GetValuesAsync(CustomFieldEntityTypes.Video, new[] { target.Id, source.Id }, ct);
            if (choices.CustomFields.Keys.Except(values.Values.SelectMany(item => item.Keys), StringComparer.OrdinalIgnoreCase).Any())
                return "Selected custom fields must belong to one of the compared videos.";
        }
        return null;
    }

    private static bool ValidSelection<T>(IEnumerable<T>? selected, IEnumerable<T> available, IEqualityComparer<T>? comparer = null)
        => selected == null || !selected.Except(available, comparer).Any();

    private async Task<string?> ApplyMergeScalars(Video target, Video source, VideoMergeMetadataDto choices, List<string> createdCoverBlobs, IReadOnlyDictionary<int, string> readableStudioNames, CancellationToken ct)
    {
        var provenance = new Dictionary<string, object?>();
        foreach (var (key, side) in choices.Fields ?? [])
        {
            if (side != "source") continue;
            switch (key)
            {
                case "title": target.Title = source.Title; provenance[key] = target.Title; break;
                case "code": target.Code = source.Code; provenance[key] = target.Code; break;
                case "details": target.Details = source.Details; provenance[key] = target.Details; break;
                case "director": target.Director = source.Director; provenance[key] = target.Director; break;
                case "date": target.Date = source.Date; target.DatePrecision = source.DatePrecision; provenance[key] = PartialDate.Format(target.Date, target.DatePrecision); break;
                case "studioId":
                    target.StudioId = source.StudioId;
                    if (!source.StudioId.HasValue) provenance["studio"] = null;
                    else if (readableStudioNames.TryGetValue(source.StudioId.Value, out var studioName)) provenance["studio"] = studioName;
                    break;
                case "captions": target.Captions = source.Captions; provenance[key] = target.Captions; break;
                case "organized": target.Organized = source.Organized; provenance[key] = target.Organized; break;
                case "isVr": target.IsVr = source.IsVr; provenance[key] = target.IsVr; break;
                case "cover":
                    if (source.ImageBlobId != null) target.ImageBlobId = source.ImageBlobId;
                    else
                    {
                        var screenshot = await streamService.GetVideoScreenshot(source.Id, null, ct);
                        if (screenshot == null) return "The selected source cover is unavailable. Reopen the comparison and try again.";
                        else
                        {
                            await using var image = screenshot.Value.stream;
                            target.ImageBlobId = await blobService.StoreBlobAsync(image, screenshot.Value.contentType, ct);
                            createdCoverBlobs.Add(target.ImageBlobId);
                        }
                    }
                    break;
            }
        }
        if (choices.CustomFields != null)
        {
            var values = await customFields.GetValuesAsync(CustomFieldEntityTypes.Video, new[] { target.Id, source.Id }, ct);
            var result = new Dictionary<string, object>(values[target.Id], StringComparer.OrdinalIgnoreCase);
            foreach (var (key, side) in choices.CustomFields)
            {
                if (side != "source") continue;
                if (values[source.Id].TryGetValue(key, out var value)) result[key] = value;
                else result.Remove(key);
            }
            await customFields.SaveValuesAsync(CustomFieldEntityTypes.Video, target.Id, result, ct);
        }
        if (fieldProvenanceService != null && provenance.Count > 0)
            await fieldProvenanceService.RecordManyAsync(AffinityHostType.Video, target.Id, provenance, "manual", cancellationToken: ct);
        return null;
    }

    private void ApplyMergeCollections(Video target, VideoMergeMetadataDto choices,
        int[] visibleTags, int[] visiblePerformers, int[] visibleGalleries)
    {
        // Fix up relationships moved by changing their foreign key before pruning the combined sets.
        db.ChangeTracker.DetectChanges();
        if (choices.TagIds != null)
        {
            var existing = target.VideoTags.Select(item => item.TagId).ToHashSet();
            foreach (var id in choices.TagIds.Distinct().Where(id => !existing.Contains(id)))
                target.VideoTags.Add(new VideoTag { VideoId = target.Id, TagId = id });
        }
        PruneMergeCollection(target.VideoTags, choices.TagIds, item => item.TagId, visibleTags);
        PruneMergeCollection(target.VideoPerformers, choices.PerformerIds, item => item.PerformerId, visiblePerformers);
        PruneMergeCollection(target.VideoGalleries, choices.GalleryIds, item => item.GalleryId, visibleGalleries);
        PruneMergeCollection(target.Urls, choices.Urls, item => item.Url, comparer: StringComparer.OrdinalIgnoreCase);
        PruneMergeCollection(target.RemoteIds, choices.RemoteIds?.Select(item => (item.Endpoint, item.RemoteId)),
            item => (item.Endpoint, item.RemoteId), comparer: RemoteIdKeyComparer.Instance);
    }

    private void PruneMergeCollection<T, TKey>(ICollection<T> items, IEnumerable<TKey>? selected,
        Func<T, TKey> key, IEnumerable<TKey>? visible = null, IEqualityComparer<TKey>? comparer = null) where T : class
    {
        if (selected == null) return;
        var keep = selected.ToHashSet(comparer);
        var editable = visible?.ToHashSet(comparer);
        foreach (var item in items.Where(item => !keep.Contains(key(item)) && (editable == null || editable.Contains(key(item)))).ToArray())
        {
            items.Remove(item);
            db.Remove(item);
        }
    }
}
