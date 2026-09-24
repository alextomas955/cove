using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Primitives;

namespace Cove.Data.Services;

/// <summary>
/// Expires short-lived query caches whenever the library is written. A cached list response is keyed on
/// the query alone, so it cannot tell which rows a write affects: a video that stops matching a filter
/// drops out of a cached page, but one that starts matching appears in no cached entry at all, and every
/// later page and total shifts with it. The only sound invalidation is of the whole namespace.
/// </summary>
public sealed class LibraryWriteSignal
{
    private CancellationTokenSource _source = new();

    /// <summary>
    /// Take the token before running the query whose result is cached, so a write committed while the
    /// query runs expires the entry the moment it is stored rather than leaving it to its timeout.
    /// </summary>
    public IChangeToken GetChangeToken() => new CancellationChangeToken(Volatile.Read(ref _source).Token);

    public void Signal() => Interlocked.Exchange(ref _source, new CancellationTokenSource()).Cancel();
}

/// <summary>
/// Signals <see cref="LibraryWriteSignal"/> after every committed write made through the context: a
/// SaveChanges that wrote anything, and the commit of an explicit transaction, whose SaveChanges calls
/// complete before their writes are visible. Writes made outside the context bypass it and are left to
/// the caches' own expiry, as all writes were before.
/// </summary>
public sealed class LibraryWriteSignalInterceptor(LibraryWriteSignal signal) : SaveChangesInterceptor, IDbTransactionInterceptor
{
    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        if (result > 0)
            signal.Signal();
        return result;
    }

    public override ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        if (result > 0)
            signal.Signal();
        return ValueTask.FromResult(result);
    }

    public void TransactionCommitted(DbTransaction transaction, TransactionEndEventData eventData) => signal.Signal();

    public Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        signal.Signal();
        return Task.CompletedTask;
    }
}
