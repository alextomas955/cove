import type { QueryClient } from "@tanstack/react-query";

/**
 * Refreshes an entity's cached queries after a save and resolves once the entity itself has reloaded, so
 * an editor reopened right away starts from the saved entity. Slower queries nested under the same key
 * (faces, similar items, playback manifests) refresh in the background.
 */
export async function refreshSavedEntity(queryClient: QueryClient, queryKey: readonly unknown[]) {
  void queryClient.invalidateQueries({ queryKey, predicate: (query) => query.queryKey.length > queryKey.length });
  await queryClient.invalidateQueries({ queryKey, exact: true });
}
