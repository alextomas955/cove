import { describe, expect, it, vi } from "vitest";
import { createAppQueryClient } from "../queryClient";

async function runQuery(error: unknown) {
  const client = createAppQueryClient();
  const queryFn = vi.fn().mockRejectedValue(error);
  await client.fetchQuery({ queryKey: ["retry-test"], queryFn, retryDelay: 0 }).catch(() => undefined);
  return queryFn.mock.calls.length;
}

describe("app query client retries", () => {
  it("retries an ordinary failure once", async () => {
    expect(await runQuery(new Error("API Error 500: boom"))).toBe(2);
  });

  it("does not retry a request that hit the client timeout", async () => {
    expect(await runQuery(new DOMException("API request timed out after 15000 ms.", "TimeoutError"))).toBe(1);
  });
});
