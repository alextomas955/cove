using Cove.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Cove.Data;

public partial class CoveContext
{
    // A tag application is stored outside its host's row, so adding or removing one would not otherwise
    // move the host's UpdatedAt (#720). Every writer (the API, extensions such as AI tagging through the
    // tag application repository) saves through this context, so stamping here covers them all. Re-saving
    // an existing application with a new confidence is not a change to the host and is not stamped.
    private (AffinityHostType HostType, int HostId)[] CollectTagApplicationHosts()
        => ChangeTracker.Entries<TagApplication>()
            .Where(entry => entry.State is EntityState.Added or EntityState.Deleted)
            .Select(entry => (entry.Entity.HostType, entry.Entity.HostId))
            .Where(host => host.HostId > 0)
            .Distinct()
            .ToArray();

    // Only UpdatedAt is written, set-based and keyed by id, so the host is never loaded or tracked: no name
    // normalization runs for performers, studios or tags. The update goes through the same row-level read
    // filters as other host queries (bypassed for system and background work). ExecuteUpdate is
    // relational-only, so in-memory test contexts skip it.
    private void StampTagApplicationHosts((AffinityHostType HostType, int HostId)[] hosts)
    {
        if (hosts.Length == 0 || !Database.IsRelational())
            return;

        var now = DateTime.UtcNow;
        foreach (var group in hosts.GroupBy(host => host.HostType))
        {
            var ids = group.Select(host => host.HostId).ToArray();
            _ = group.Key switch
            {
                AffinityHostType.Video => Stamp(Videos, ids, now),
                AffinityHostType.Image => Stamp(Images, ids, now),
                AffinityHostType.Audio => Stamp(Audios, ids, now),
                AffinityHostType.Text => Stamp(TextDocuments, ids, now),
                AffinityHostType.Performer => Stamp(Performers, ids, now),
                AffinityHostType.Face => Stamp(Faces, ids, now),
                AffinityHostType.Tag => Stamp(Tags, ids, now),
                AffinityHostType.Studio => Stamp(Studios, ids, now),
                AffinityHostType.Gallery => Stamp(Galleries, ids, now),
                AffinityHostType.Group => Stamp(Groups, ids, now),
                _ => 0,
            };
        }

        static int Stamp<TEntity>(IQueryable<TEntity> hosts, int[] ids, DateTime now) where TEntity : BaseEntity
            => hosts.Where(host => ids.Contains(host.Id))
                .ExecuteUpdate(setters => setters.SetProperty(host => host.UpdatedAt, now));
    }

    private async Task StampTagApplicationHostsAsync((AffinityHostType HostType, int HostId)[] hosts, CancellationToken cancellationToken)
    {
        if (hosts.Length == 0 || !Database.IsRelational())
            return;

        var now = DateTime.UtcNow;
        foreach (var group in hosts.GroupBy(host => host.HostType))
        {
            var ids = group.Select(host => host.HostId).ToArray();
            _ = group.Key switch
            {
                AffinityHostType.Video => await StampAsync(Videos, ids, now, cancellationToken),
                AffinityHostType.Image => await StampAsync(Images, ids, now, cancellationToken),
                AffinityHostType.Audio => await StampAsync(Audios, ids, now, cancellationToken),
                AffinityHostType.Text => await StampAsync(TextDocuments, ids, now, cancellationToken),
                AffinityHostType.Performer => await StampAsync(Performers, ids, now, cancellationToken),
                AffinityHostType.Face => await StampAsync(Faces, ids, now, cancellationToken),
                AffinityHostType.Tag => await StampAsync(Tags, ids, now, cancellationToken),
                AffinityHostType.Studio => await StampAsync(Studios, ids, now, cancellationToken),
                AffinityHostType.Gallery => await StampAsync(Galleries, ids, now, cancellationToken),
                AffinityHostType.Group => await StampAsync(Groups, ids, now, cancellationToken),
                _ => 0,
            };
        }

        static Task<int> StampAsync<TEntity>(IQueryable<TEntity> hosts, int[] ids, DateTime now, CancellationToken cancellationToken) where TEntity : BaseEntity
            => hosts.Where(host => ids.Contains(host.Id))
                .ExecuteUpdateAsync(setters => setters.SetProperty(host => host.UpdatedAt, now), cancellationToken);
    }
}
