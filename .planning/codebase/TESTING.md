# Testing Patterns

**Analysis Date:** 2026-07-19

Cove has two independent test suites: a **backend xUnit** suite (`src/Cove.Tests/`, plus a separate `src/Cove.PerformanceTests/` project) and a **frontend Vitest + React Testing Library** suite (`ui/src/test/`). There is ~71 C# test files and ~70 UI test files.

## Test Framework

### Backend (C#)
- **Runner:** xUnit 2.9.3 (`Microsoft.NET.Test.Sdk` 17.14.1, `xunit.runner.visualstudio`).
- **Coverage:** `coverlet.collector` 6.0.4.
- **Target:** net10.0. `<Using Include="Xunit" />` is declared in the csproj so `[Fact]`/`[Theory]` need no per-file using.
- **Config:** `src/Cove.Tests/Cove.Tests.csproj` — references `Cove.Api`, `Cove.Core`, `Cove.Data`. In-memory/SQLite EF providers included (`Microsoft.EntityFrameworkCore.InMemory`, `.Sqlite`), plus `Microsoft.AspNetCore.Mvc.Testing` for integration tests.
- **Performance suite:** `src/Cove.PerformanceTests/` is a separate project using Postgres (`Npgsql`) with a real DB fixture — kept out of the main unit run.

### Frontend (TypeScript)
- **Runner:** Vitest 4.1.4 (config in `ui/vite.config.ts` under the `test` key).
- **Rendering:** `@testing-library/react` 16, `@testing-library/user-event` 14, matchers from `@testing-library/jest-dom`.
- **Environment:** `jsdom`, `globals: true`, `css: true`.
- **Setup file:** `ui/src/test/setup.ts` — a single line importing `@testing-library/jest-dom/vitest`.

**Run Commands:**
```bash
# Backend — from src/
dotnet test                                   # run all C# tests
dotnet test src/Cove.Tests/Cove.Tests.csproj  # unit + integration only (exclude perf)

# Frontend — from ui/
npm test          # generate:extension-runtime, then vitest run
npm run test:watch # vitest watch mode
```
Note: `npm test` first runs `generate:extension-runtime` (a `tsx` codegen step) — always invoke through the npm script, not `vitest` directly, so generated modules exist.

## Test File Organization

**Backend:**
- Flat layout directly under `src/Cove.Tests/` (e.g. `JobServiceTests.cs`, `ScanServiceTests.cs`, `AuthRbacTests.cs`).
- Integration tests isolated in `src/Cove.Tests/Integration/` (e.g. `AiAndFacesSmokeTests.cs`, `SegmentControllersSmokeTests.cs`).
- Naming: `<TypeUnderTest>Tests.cs`. Feature/phase-scoped suites also exist (`Phase11PlaybackTests.cs`, `Wave1TaggingSmokeTests.cs`, `FeatureGapTests.cs`). Shared fakes/catalogs are un-suffixed classes (`NoOpScanService.cs`, `EntityListSortFilterCatalog.cs`).

**Frontend:**
- All tests centralized in `ui/src/test/` (NOT co-located next to source).
- Naming: `<Subject>.test.tsx` for components, `<subject>.test.ts` for logic/util modules (e.g. `EngagementBar.test.tsx`, `tags.test.ts`, `interactionTracking.test.ts`).

## Test Structure

**Backend (xUnit):** `[Fact]` methods with descriptive PascalCase names encoding scenario + expectation, e.g. `ExclusiveJob_CompletesWithCompletedStatusAndTimestamp`. Setup happens inline (construct the service with fakes); teardown uses `try/finally` for lifecycle-managed services:
```csharp
public class JobServiceTests
{
    [Fact]
    public async Task ExclusiveJob_CompletesWithCompletedStatusAndTimestamp()
    {
        var service = new JobService(new EventBus(), new FakeHubContext(), NullLogger<JobService>.Instance);
        await service.StartAsync(CancellationToken.None);
        try
        {
            var jobId = service.Enqueue("generate", "Generating content", static (progress, _) => { ... });
            var job = await WaitForTerminalStateAsync(service, jobId, TimeSpan.FromSeconds(5));
            Assert.Equal(JobStatus.Completed, job.Status);
        }
        finally { await service.StopAsync(CancellationToken.None); }
    }
}
```
Assertions use xUnit's classic API: `Assert.Equal`, `Assert.NotNull`, `Assert.Equal(1.0, job.Progress, 3)` (precision overload). No fluent-assertions library.

**Frontend (Vitest + RTL):** `describe`/`it` blocks; imports pulled explicitly (`import { describe, expect, it, vi } from "vitest"`). Test the component through user-visible behavior:
```tsx
describe("EngagementBar", () => {
  it("renders the favorite action as an icon-only button with a hover title", async () => {
    const user = userEvent.setup();
    const onFavoriteChange = vi.fn();
    render(<EngagementBar favorite={false} onFavoriteChange={onFavoriteChange} />);
    const favoriteButton = screen.getByRole("button", { name: "Favorite" });
    await user.click(favoriteButton);
    expect(onFavoriteChange).toHaveBeenCalledWith(true);
  });
});
```
Prefer role/accessible-name queries (`getByRole("button", { name: ... })`) over test IDs. Drive interactions with `userEvent.setup()`, not `fireEvent`.

## Mocking

**Backend:** No mocking library (no Moq/NSubstitute). Dependencies are replaced with **hand-written fakes and no-op implementations** committed as source: `FakeHubContext`, `NoOpScanService.cs`, `NoOpUserEngagementService.cs`, `EventBus` (real, lightweight). Logging uses `NullLogger<T>.Instance` from `Microsoft.Extensions.Logging.Abstractions`.

For integration tests, `CoveWebApplicationFactory` (`src/Cove.Tests/Integration/CoveWebApplicationFactory.cs`) swaps real services via `ConfigureTestServices` + `RemoveAll<T>()` and overrides config in-memory (`Cove:Auth:Enabled`, in-memory SQLite connection string). It boots the full app on a reserved loopback port with Kestrel.

**Frontend:** `vi.fn()` for callback spies; `vi.mock(...)` for module mocking where needed. Server calls are exercised against the real `ui/src/api/client.ts` behavior with fetch/query stubs per test rather than a global MSW server.

**What to mock:** external process boundaries, network, and expensive services (scanning, FFmpeg, engagement writes). Prefer no-op fakes over interaction-verifying mocks.

**What NOT to mock:** the EF Core `CoveContext` (use in-memory SQLite instead), the event bus, and pure logic — test these directly.

## Fixtures and Factories

**Backend:** `CoveWebApplicationFactory` is the primary integration fixture (subclass of `WebApplicationFactory<Program>`), exposing constants like `TestUserId = 1` and a fresh in-memory SQLite database per instance (`Data Source=file:cove-{Guid}?mode=memory&cache=shared`). Test data is seeded inline within tests. `IntegrationHttpJson.cs` provides shared HTTP/JSON helpers. Sort/filter catalogs (`EntityListSortFilterCatalog.cs`) act as data-driven test tables.

**Performance:** `PostgresPerformanceFixture.cs` + `PerformanceMeasurement.cs` under `src/Cove.PerformanceTests/Infrastructure/`, grouped by `PerformanceCollection.cs` (xUnit collection fixture).

**Frontend:** Test data constructed inline per test; no central factory module. Provider wrappers (React Query client, routers) are set up within individual tests as needed.

## Coverage

**Requirements:** None enforced in CI gates. `coverlet.collector` is available for local coverage collection but no threshold is configured.

**View Coverage:**
```bash
dotnet test --collect:"XPlat Code Coverage"   # backend, via coverlet
# frontend: vitest coverage not configured by default
```

## Test Types

**Unit Tests (backend):** Service/logic tests constructed with fakes (`JobServiceTests`, `ScanServiceTests`, `IntervalAlgebraTests`, `CustomFieldServiceTests`). The bulk of the suite.

**Integration / smoke tests (backend):** Full HTTP round-trips via `CoveWebApplicationFactory` against in-memory SQLite (`*SmokeTests.cs`, `StartupHealthSmokeTest.cs`, middleware tests). Verify routing, auth, RBAC, and DB wiring end-to-end.

**Performance regression tests:** `src/Cove.PerformanceTests/RepositoryPerformanceRegressionTests.cs` against real Postgres — run separately, not part of the fast feedback loop.

**Component / behavior tests (frontend):** RTL render + user-event interaction on components, hooks, and pages (`ui/src/test/*`). Custom hooks tested via wrapper components (`useMultiSelect.test.tsx`, `useDetailListQuery.test.tsx`).

**E2E:** No dedicated end-to-end/browser-automation framework (no Playwright/Cypress).

## Common Patterns

**Async testing (backend):** `async Task` test methods; poll for eventual state with bounded timeouts via helpers like `WaitForTerminalStateAsync(service, jobId, TimeSpan.FromSeconds(5))` for background/queued work. Always pass `CancellationToken.None` to lifecycle methods in tests.

**Async testing (frontend):** `async` `it` blocks; `await user.click(...)`; use `findBy*`/`waitFor` for async UI (React Query resolutions) rather than arbitrary delays.

**Error / edge testing:** Backend batch tests assert partial-failure aggregation (e.g. `RunBatchAsync_AggregatesUnitProgressAndKeepsParentCompletedWhenSomeUnitsFail` deliberately throws for one unit and asserts the parent job still completes). Follow this: exercise the failure branch inside the unit of work and assert the aggregate/rollback outcome.

---

*Testing analysis: 2026-07-19*
