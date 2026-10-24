import { describe, expect, it, vi } from "vitest";
import { createBatchedLoader } from "../utils/batchRequests";

type Item = { id: number };
const items = (ids: number[]): Item[] => ids.map((id) => ({ id }));

describe("createBatchedLoader", () => {
  it("coalesces lookups started together into one request", async () => {
    const fetchMany = vi.fn(async (ids: number[]) => items(ids));
    const load = createBatchedLoader(fetchMany, (item) => item.id);

    const [a, b] = await Promise.all([load([1, 2]), load([2, 3])]);

    expect(fetchMany).toHaveBeenCalledTimes(1);
    expect(fetchMany).toHaveBeenCalledWith([1, 2, 3]);
    expect(a.map((item) => item.id)).toEqual([1, 2]);
    expect(b.map((item) => item.id)).toEqual([2, 3]);
  });

  it("gives a caller whose ids straddle two requests all of its items", async () => {
    const fetchMany = vi.fn(async (ids: number[]) => items(ids));
    const load = createBatchedLoader(fetchMany, (item) => item.id, 3);

    const [first, straddling] = await Promise.all([load([1, 2]), load([3, 4, 5])]);

    expect(fetchMany).toHaveBeenCalledTimes(2);
    expect(first.map((item) => item.id)).toEqual([1, 2]);
    expect(straddling.map((item) => item.id)).toEqual([3, 4, 5]);
  });

  it("rejects every caller when the fetch throws synchronously instead of leaving them pending", async () => {
    const load = createBatchedLoader<Item>(
      () => {
        throw new Error("no client");
      },
      (item) => item.id,
    );

    await expect(Promise.all([load([1]), load([2])])).rejects.toThrow("no client");
  });

  it("omits ids the server did not return", async () => {
    const load = createBatchedLoader(
      async (ids: number[]) => items(ids.filter((id) => id !== 2)),
      (item) => item.id,
    );

    expect((await load([1, 2, 3])).map((item) => item.id)).toEqual([1, 3]);
  });
});
