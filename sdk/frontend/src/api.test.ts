// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureCoveClientAuth, createCoveClient } from "./api";

const DATA_PATH = "/api/Extensions/{id}/data";

function okResponse(): Response {
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function unauthorizedResponse(): Response {
  return new Response("unauthorized", { status: 401 });
}

/** Pull the Request the mocked fetch was invoked with for a given call index. */
function requestAt(fetchMock: ReturnType<typeof vi.fn>, index: number): Request {
  return fetchMock.mock.calls[index][0] as Request;
}

describe("createCoveClient auth middleware (host parity)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    configureCoveClientAuth({});
    vi.restoreAllMocks();
  });

  it("injects a bearer Authorization header from the configured accessor", async () => {
    configureCoveClientAuth({ getAccessToken: () => "access-1" });
    fetchMock.mockResolvedValueOnce(okResponse());

    const client = createCoveClient();
    await client.GET(DATA_PATH, { params: { path: { id: "ext-1" } } });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestAt(fetchMock, 0).headers.get("Authorization")).toBe("Bearer access-1");
  });

  it("injects share-token headers and no bearer when a share token is configured", async () => {
    configureCoveClientAuth({
      getAccessToken: () => "access-1",
      getShareToken: () => "share-1",
      getSharePassword: () => "pw-1",
    });
    fetchMock.mockResolvedValueOnce(okResponse());

    const client = createCoveClient();
    await client.GET(DATA_PATH, { params: { path: { id: "ext-1" } } });

    const req = requestAt(fetchMock, 0);
    expect(req.headers.get("X-Share-Token")).toBe("share-1");
    expect(req.headers.get("X-Share-Password")).toBe("pw-1");
    expect(req.headers.get("Authorization")).toBeNull();
  });

  it("on 401 with a bearer + refresh, refreshes once and retries with the new token", async () => {
    let token = "old";
    const tryRefresh = vi.fn(async () => {
      token = "new";
      return true;
    });
    configureCoveClientAuth({
      getAccessToken: () => token,
      getRefreshToken: () => "refresh-1",
      tryRefresh,
    });
    fetchMock
      .mockResolvedValueOnce(unauthorizedResponse())
      .mockResolvedValueOnce(okResponse());

    const client = createCoveClient();
    await client.GET(DATA_PATH, { params: { path: { id: "ext-1" } } });

    expect(tryRefresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestAt(fetchMock, 1).headers.get("Authorization")).toBe("Bearer new");
  });

  it("dispatches cove-auth-required when a bearer refresh fails", async () => {
    const tryRefresh = vi.fn(async () => false);
    configureCoveClientAuth({
      getAccessToken: () => "old",
      getRefreshToken: () => "refresh-1",
      tryRefresh,
    });
    fetchMock.mockResolvedValueOnce(unauthorizedResponse());
    const dispatched = vi.fn();
    window.addEventListener("cove-auth-required", dispatched);

    const client = createCoveClient();
    await client.GET(DATA_PATH, { params: { path: { id: "ext-1" } } });

    expect(tryRefresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dispatched).toHaveBeenCalledTimes(1);
    window.removeEventListener("cove-auth-required", dispatched);
  });

  it("dispatches cove-auth-required on a 401 when unauthenticated", async () => {
    configureCoveClientAuth({});
    fetchMock.mockResolvedValueOnce(unauthorizedResponse());
    const dispatched = vi.fn();
    window.addEventListener("cove-auth-required", dispatched);

    const client = createCoveClient();
    await client.GET(DATA_PATH, { params: { path: { id: "ext-1" } } });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(dispatched).toHaveBeenCalledTimes(1);
    window.removeEventListener("cove-auth-required", dispatched);
  });
});
