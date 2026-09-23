import { useState } from "react";
import { hashKey, type QueryKey } from "@tanstack/react-query";

/**
 * Identifies the list whose items are on screen. It follows the requested list only once that list's
 * data arrives, because a query using `keepPreviousData` keeps showing the previous list as a
 * placeholder until then. Hashed like a query key, so an object rebuilt in another key order is still
 * the same list.
 */
export function useSettledListKey(requestedList: QueryKey, showingPlaceholder: boolean): string {
  const requestedKey = hashKey(requestedList);
  const [settledKey, setSettledKey] = useState(requestedKey);
  if (!showingPlaceholder && settledKey !== requestedKey) {
    setSettledKey(requestedKey);
    return requestedKey;
  }
  return settledKey;
}
