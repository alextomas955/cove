import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accessTokenRefreshDueAt, authedFetch, refreshAccessTokenIfDue } from "../api/client";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import { authStore } from "../auth/authStore";
import { resetServerAvailabilityForTests } from "../state/serverAvailability";

const NOW = Date.parse("2026-09-19T12:00:00Z");
const LIFETIME_SEC = 15 * 60;

function jwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(claims)}.signature`;
}

/** A server token issued at `issuedAtMs` (server clock) that lives `lifetimeSec`. */
function token(issuedAtMs: number, lifetimeSec = LIFETIME_SEC, subject = "access"): string {
  const iat = Math.floor(issuedAtMs / 1000);
  return jwt({ sub: subject, iat, exp: iat + lifetimeSec });
}

/** Stores a session whose access token this page received at `receivedAt` (local clock). */
function storeSession(accessToken: string, receivedAt: number) {
  localStorage.setItem("cove_access_token", accessToken);
  localStorage.setItem("cove_access_token_received_at", String(receivedAt));
  localStorage.setItem("cove_refresh_token", "refresh");
}

/** A session received `ageSec` ago, with local and server clocks in agreement. */
function storeAgedSession(ageSec: number, lifetimeSec = LIFETIME_SEC) {
  const issuedAt = NOW - ageSec * 1000;
  storeSession(token(issuedAt, lifetimeSec), issuedAt);
}

const meResponse = {
  user: { id: 17, username: "viewer", kind: "user" },
  permissions: ["videos.read"],
  readGrantedEntityKinds: [],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function Username() {
  const { user, loading } = useAuth();
  return <div data-testid="user">{loading ? "loading" : (user?.username ?? "anonymous")}</div>;
}

describe("proactive access token refresh", () => {
  const requests: string[] = [];
  let refreshResponse: () => Response | Promise<Response>;
  const refreshes = () => requests.filter((url) => url === "/api/auth/refresh").length;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    requests.length = 0;
    refreshResponse = () => json({ token: token(Date.now(), LIFETIME_SEC, "renewed"), refreshToken: "rotated" });
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        const url = String(input);
        requests.push(url);
        if (url === "/api/auth/refresh") return refreshResponse();
        if (url === "/api/auth/me") return json(meResponse);
        return new Response(null, { status: 401 });
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
    resetServerAvailabilityForTests();
  });

  it("times the refresh a minute before the token's lifetime ends, or at half a short lifetime", () => {
    expect(accessTokenRefreshDueAt(token(NOW), NOW)).toBe(NOW + 14 * 60_000);
    expect(accessTokenRefreshDueAt(token(NOW, 60), NOW)).toBe(NOW + 30_000);
    expect(accessTokenRefreshDueAt("not-a-jwt", NOW)).toBeNull();
    expect(accessTokenRefreshDueAt(jwt({ sub: "no-expiry" }), NOW)).toBeNull();
  });

  it("follows the token's lifetime on the local clock when the clocks disagree", () => {
    // Issued by a server whose clock is 20 minutes behind, and one 20 minutes ahead.
    expect(accessTokenRefreshDueAt(token(NOW - 20 * 60_000), NOW)).toBe(NOW + 14 * 60_000);
    expect(accessTokenRefreshDueAt(token(NOW + 20 * 60_000), NOW)).toBe(NOW + 14 * 60_000);
    // A token stored before receive times were recorded falls back to its server expiry.
    expect(accessTokenRefreshDueAt(token(NOW), null)).toBe(NOW + 14 * 60_000);
  });

  it("records when a new access token arrives and forgets it on sign-out", () => {
    authStore.setTokens(token(NOW), "refresh");
    expect(authStore.getAccessTokenReceivedAt()).toBe(NOW);

    vi.setSystemTime(NOW + 5_000);
    authStore.setTokens(authStore.getAccessToken(), "refresh");
    expect(authStore.getAccessTokenReceivedAt()).toBe(NOW);

    authStore.clear();
    expect(authStore.getAccessTokenReceivedAt()).toBeNull();
  });

  it("refreshes a token in its final minute and leaves a fresh one alone", async () => {
    storeAgedSession(10 * 60);
    await refreshAccessTokenIfDue();
    expect(requests).toEqual([]);

    storeAgedSession(LIFETIME_SEC - 30);
    await refreshAccessTokenIfDue();
    expect(requests).toEqual(["/api/auth/refresh"]);
    expect(authStore.getRefreshToken()).toBe("rotated");
  });

  it("does not refresh a just-received token from a server whose clock is far behind", async () => {
    storeSession(token(NOW - 20 * 60_000), NOW);
    await refreshAccessTokenIfDue();
    expect(requests).toEqual([]);
  });

  it("does not refresh share-link sessions", async () => {
    storeAgedSession(LIFETIME_SEC - 30);
    authStore.setShareToken("share");
    await refreshAccessTokenIfDue();
    expect(requests).toEqual([]);
  });

  it("keeps the session when a proactive refresh is rate limited or the server fails", async () => {
    for (const status of [429, 503]) {
      storeAgedSession(LIFETIME_SEC - 30);
      const expiring = authStore.getAccessToken();
      refreshResponse = () => new Response(null, { status });
      await refreshAccessTokenIfDue();
      expect(authStore.getAccessToken()).toBe(expiring);
      expect(authStore.getRefreshToken()).toBe("refresh");
    }
  });

  it("still signs out when a request is rejected and the refresh is rate limited", async () => {
    storeAgedSession(60);
    refreshResponse = () => new Response(null, { status: 429 });
    const authRequired = vi.fn();
    window.addEventListener("cove-auth-required", authRequired);

    await authedFetch("/api/videos");

    window.removeEventListener("cove-auth-required", authRequired);
    expect(authRequired).toHaveBeenCalledTimes(1);
  });

  it("ends the session when the refresh token is rejected", async () => {
    storeAgedSession(LIFETIME_SEC - 30);
    refreshResponse = () => new Response(null, { status: 401 });
    await refreshAccessTokenIfDue();
    expect(authStore.getAccessToken()).toBeNull();
  });

  it("does not revive a session that was signed out while its refresh was in flight", async () => {
    storeAgedSession(LIFETIME_SEC - 30);
    let respond: (response: Response) => void = () => {};
    refreshResponse = () => new Promise<Response>((resolve) => (respond = resolve));

    const refreshing = refreshAccessTokenIfDue();
    await vi.waitFor(() => expect(refreshes()).toBe(1));
    authStore.clear();
    respond(json({ token: token(NOW), refreshToken: "rotated" }));
    await refreshing;

    expect(authStore.getAccessToken()).toBeNull();
    expect(authStore.getRefreshToken()).toBeNull();
  });

  it("refreshes an expiring stored token before loading the app", async () => {
    storeAgedSession(LIFETIME_SEC - 20);

    render(
      <AuthProvider authEnabled>
        <Username />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("viewer"));
    expect(requests.slice(0, 2)).toEqual(["/api/auth/refresh", "/api/auth/me"]);
  });

  describe("while the app is open", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
      vi.setSystemTime(NOW);
    });

    const renderApp = async () => {
      render(
        <AuthProvider authEnabled>
          <Username />
        </AuthProvider>,
      );
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByTestId("user")).toHaveTextContent("viewer");
    };

    it("refreshes shortly before the token expires", async () => {
      storeAgedSession(LIFETIME_SEC - 5 * 60);
      await renderApp();

      await act(() => vi.advanceTimersByTimeAsync(4 * 60_000 - 1_000));
      expect(refreshes()).toBe(0);

      await act(() => vi.advanceTimersByTimeAsync(1_000));
      expect(refreshes()).toBe(1);
      expect(authStore.getRefreshToken()).toBe("rotated");

      // The renewed token is scheduled by its own lifetime, not refreshed again straight away.
      await act(() => vi.advanceTimersByTimeAsync(10 * 60_000));
      expect(refreshes()).toBe(1);
    });

    it("backs off after a failed refresh, including when the tab becomes visible", async () => {
      storeAgedSession(LIFETIME_SEC - 90);
      refreshResponse = () => new Response(null, { status: 503 });
      await renderApp();

      await act(() => vi.advanceTimersByTimeAsync(30_000));
      expect(refreshes()).toBe(1);

      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
        await vi.advanceTimersByTimeAsync(14_000);
      });
      expect(refreshes()).toBe(1);

      await act(() => vi.advanceTimersByTimeAsync(1_000));
      expect(refreshes()).toBe(2);
    });

    it("reschedules when another tab rotates the token", async () => {
      storeAgedSession(LIFETIME_SEC - 90);
      await renderApp();

      await act(async () => {
        storeAgedSession(0);
        window.dispatchEvent(new StorageEvent("storage", { key: "cove_access_token" }));
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(refreshes()).toBe(0);
    });
  });
});
