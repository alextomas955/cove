using Cove.Core.Entities;
using Cove.Data;
using Microsoft.EntityFrameworkCore;

namespace Cove.Api.Services;

/// <summary>
/// Saves a staged single-entity deletion that may race a duplicate request for the same entity, such as a
/// double-clicked confirmation. Losing that race is reported as "already deleted" rather than as a failure.
/// </summary>
internal static class DeletionRace
{
    /// <summary>
    /// On any concurrency conflict the context's change tracker is cleared, including before the conflict is
    /// rethrown, so the caller can keep using the context for further deletions.
    /// </summary>
    /// <returns>False when a competing request deleted the entity after it was loaded.</returns>
    public static async Task<bool> SaveAsync<TEntity>(
        CoveContext db,
        TEntity entity,
        ILogger? logger,
        CancellationToken ct)
        where TEntity : BaseEntity
    {
        try
        {
            await db.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateConcurrencyException ex)
        {
            // The delete committed and was accepted when only CoveContext's follow-up derived-count save
            // conflicted; the deletion then stands and its cleanup and event must still happen.
            var committed = db.Entry(entity).State != EntityState.Deleted;
            // EF keeps the changes it could not apply and retries them on the next save. Clean deletes a
            // whole batch through one context, so leaving them would fail every later deletion in that batch.
            db.ChangeTracker.Clear();
            if (committed)
            {
                logger?.LogWarning(ex, "Deleted {EntityType} {EntityId}, but refreshing derived counts conflicted with a concurrent change.", typeof(TEntity).Name, entity.Id);
                return true;
            }

            if (await db.Set<TEntity>().IgnoreQueryFilters().AsNoTracking().AnyAsync(item => item.Id == entity.Id, ct))
                throw;
            return false;
        }
    }
}
