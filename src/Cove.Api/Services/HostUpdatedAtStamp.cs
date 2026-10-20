using Cove.Core.Entities;
using Cove.Data;

using Microsoft.EntityFrameworkCore;

namespace Cove.Api.Services;

/// <summary>
/// Marks tag-application hosts as updated after a change that is stored outside the host row, such as
/// adding or removing a tag application. Only <c>UpdatedAt</c> is written, set-based and keyed by id, so
/// the host is never loaded or tracked: no name normalization runs for performers, studios or tags, and
/// nothing already staged on the caller's context is saved with it. The update goes through the same
/// row-level read filters as every other host query, so a host the caller cannot see is left alone
/// rather than written through a bypass; callers have already authorized the tag write itself.
/// </summary>
internal static class HostUpdatedAtStamp
{
    public static async Task TouchAsync(
        CoveContext db,
        IEnumerable<(AffinityHostType HostType, int HostId)> hosts,
        CancellationToken ct)
    {
        // ExecuteUpdate is relational-only; in-memory test contexts have no row to stamp this way.
        if (!db.Database.IsRelational())
            return;

        var now = DateTime.UtcNow;
        foreach (var group in hosts.Where(host => host.HostId > 0).GroupBy(host => host.HostType))
        {
            var ids = group.Select(host => host.HostId).Distinct().ToArray();
            switch (group.Key)
            {
                case AffinityHostType.Video: await TouchAsync(db.Videos, ids, now, ct); break;
                case AffinityHostType.Image: await TouchAsync(db.Images, ids, now, ct); break;
                case AffinityHostType.Audio: await TouchAsync(db.Audios, ids, now, ct); break;
                case AffinityHostType.Text: await TouchAsync(db.TextDocuments, ids, now, ct); break;
                case AffinityHostType.Performer: await TouchAsync(db.Performers, ids, now, ct); break;
                case AffinityHostType.Face: await TouchAsync(db.Faces, ids, now, ct); break;
                case AffinityHostType.Tag: await TouchAsync(db.Tags, ids, now, ct); break;
                case AffinityHostType.Studio: await TouchAsync(db.Studios, ids, now, ct); break;
                case AffinityHostType.Gallery: await TouchAsync(db.Galleries, ids, now, ct); break;
                case AffinityHostType.Group: await TouchAsync(db.Groups, ids, now, ct); break;
            }
        }
    }

    public static Task TouchAsync(CoveContext db, AffinityHostType hostType, int hostId, CancellationToken ct)
        => TouchAsync(db, [(hostType, hostId)], ct);

    private static Task<int> TouchAsync<TEntity>(IQueryable<TEntity> hosts, int[] ids, DateTime now, CancellationToken ct)
        where TEntity : BaseEntity
        => hosts
            .Where(host => ids.Contains(host.Id))
            .ExecuteUpdateAsync(setters => setters.SetProperty(host => host.UpdatedAt, now), ct);
}
