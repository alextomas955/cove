using Cove.Core.Entities;
using Cove.Core.Enums;
using Cove.Core.Interfaces;
using Cove.Data;
using Microsoft.EntityFrameworkCore;

namespace Cove.Api.Services;

/// <summary>
/// Hand edits made in a review beside a scrape or import: library tags and performers added through
/// search, and current ones taken off, the same way the video's own edit form changes them. They apply
/// on top of whatever the scrape did, so a tag the scrape added can be taken off again in the same
/// save, and an addition does not depend on the tag collection being switched on.
/// </summary>
public static class VideoRelationshipEdits
{
    public static async Task ApplyAsync(
        CoveContext db,
        Video video,
        IReadOnlyCollection<int>? addedTagIds,
        IReadOnlyCollection<int>? removedTagIds,
        IReadOnlyCollection<int>? addedPerformerIds,
        IReadOnlyCollection<int>? removedPerformerIds,
        ITagProvenanceService? tagProvenanceService,
        CancellationToken ct)
    {
        // A link the scrape just added still has TagId 0 until it is saved; its Tag carries the id.
        var previousTagIds = video.VideoTags.Select(TagIdOf).Where(id => id > 0).ToArray();
        var tagsChanged = false;
        foreach (var tagId in Distinct(removedTagIds))
        {
            var links = video.VideoTags.Where(link => link.TagId == tagId || link.Tag?.Id == tagId).ToList();
            foreach (var link in links)
                video.VideoTags.Remove(link);
            tagsChanged |= links.Count > 0;
        }
        var wantedTagIds = Distinct(addedTagIds).Where(id => !video.VideoTags.Any(link => link.TagId == id || link.Tag?.Id == id)).ToArray();
        if (wantedTagIds.Length > 0)
        {
            // Only tags the caller can read resolve; the context's query filters decide that.
            var readable = await db.Tags.Where(tag => wantedTagIds.Contains(tag.Id)).Select(tag => tag.Id).ToListAsync(ct);
            foreach (var tagId in wantedTagIds.Where(readable.Contains))
            {
                video.VideoTags.Add(new VideoTag { VideoId = video.Id, TagId = tagId });
                tagsChanged = true;
            }
        }
        if (tagsChanged && tagProvenanceService != null)
        {
            var currentTagIds = video.VideoTags.Select(TagIdOf).Where(id => id > 0).ToArray();
            await tagProvenanceService.SyncTagSetAsync(AffinityHostType.Video, video.Id, previousTagIds, currentTagIds, cancellationToken: ct);
        }

        foreach (var performerId in Distinct(removedPerformerIds))
        {
            foreach (var link in video.VideoPerformers.Where(link => link.PerformerId == performerId || link.Performer?.Id == performerId).ToList())
                video.VideoPerformers.Remove(link);
        }
        var wantedPerformerIds = Distinct(addedPerformerIds)
            .Where(id => !video.VideoPerformers.Any(link => link.PerformerId == id || link.Performer?.Id == id))
            .ToArray();
        if (wantedPerformerIds.Length > 0)
        {
            var readable = await db.Performers.Where(performer => wantedPerformerIds.Contains(performer.Id)).Select(performer => performer.Id).ToListAsync(ct);
            foreach (var performerId in wantedPerformerIds.Where(readable.Contains))
                video.VideoPerformers.Add(new VideoPerformer { VideoId = video.Id, PerformerId = performerId });
        }
    }

    private static int TagIdOf(VideoTag link) => link.TagId > 0 ? link.TagId : link.Tag?.Id ?? 0;

    private static IEnumerable<int> Distinct(IReadOnlyCollection<int>? ids) => (ids ?? []).Where(id => id > 0).Distinct();
}
