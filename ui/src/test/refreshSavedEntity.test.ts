import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { refreshSavedEntity } from "../utils/refreshSavedEntity";

describe("refreshSavedEntity", () => {
  it("waits for the entity query but not for the queries nested under it", async () => {
    const queryClient = new QueryClient();
    let entityVersion = 0;
    let resolveFaces: ((value: string[]) => void) | undefined;
    const entity = new QueryObserver(queryClient, {
      queryKey: ["performer", 1],
      queryFn: async () => ({ id: 1, version: ++entityVersion }),
    });
    const faces = new QueryObserver(queryClient, {
      queryKey: ["performer", 1, "linked-faces"],
      queryFn: () => new Promise<string[]>((resolve) => (resolveFaces = resolve)),
    });
    const unsubscribe = [entity.subscribe(() => {}), faces.subscribe(() => {})];
    await entity.refetch();

    await refreshSavedEntity(queryClient, ["performer", 1]);

    expect(queryClient.getQueryData(["performer", 1])).toEqual({ id: 1, version: 2 });
    expect(queryClient.getQueryState(["performer", 1, "linked-faces"])?.fetchStatus).toBe("fetching");
    resolveFaces?.([]);
    unsubscribe.forEach((stop) => stop());
  });
});
