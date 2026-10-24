/**
 * Coalesces lookups started in the same task into one request. Queries that render together — a page
 * of cards, a dashboard row — each ask for their own ids and still cost one round trip between them,
 * while a query started later (the next page of an infinite list) asks only for its own ids.
 *
 * Nothing is kept once a request answers: the caller's own cache (its query data) holds the results.
 */
export function createBatchedLoader<T>(
  fetchMany: (ids: number[]) => Promise<T[]>,
  keyOf: (item: T) => number,
  maxBatch = 1000,
): (ids: number[]) => Promise<T[]> {
  type Waiter = { ids: number[]; resolve: (items: T[]) => void; reject: (error: unknown) => void };
  let pending: Waiter[] | null = null;

  const flush = (waiters: Waiter[]) => {
    const ids = [...new Set(waiters.flatMap((waiter) => waiter.ids))];
    const chunks: number[][] = [];
    for (let start = 0; start < ids.length; start += maxBatch) chunks.push(ids.slice(start, start + maxBatch));
    // Every caller waits for all chunks: one caller's ids can straddle two of them. Starting each fetch
    // inside a promise turns a synchronous throw into a rejection the callers see, not a stuck query.
    Promise.all(chunks.map((chunk) => Promise.resolve().then(() => fetchMany(chunk)))).then(
      (results) => {
        const byId = new Map(results.flat().map((item) => [keyOf(item), item]));
        for (const waiter of waiters) {
          waiter.resolve(waiter.ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])));
        }
      },
      (error) => waiters.forEach((waiter) => waiter.reject(error)),
    );
  };

  return (ids) =>
    new Promise<T[]>((resolve, reject) => {
      if (!pending) {
        const waiters: Waiter[] = [];
        pending = waiters;
        setTimeout(() => {
          pending = null;
          flush(waiters);
        }, 0);
      }
      pending.push({ ids, resolve, reject });
    });
}
