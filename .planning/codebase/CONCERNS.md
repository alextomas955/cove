# Codebase Concerns

**Analysis Date:** 2026-07-19

> **Overall health:** This is a well-maintained codebase. CI is present (`.github/workflows/ci.yml`), test coverage is substantial (77 backend test files, 70 UI test files), and inline debt markers are rare (only 2 `TODO`s in C#, 1 in TS). The concerns below are concentrated in the **extension trust boundary**, **auth defaults**, and **file-size / maintainability** rather than pervasive rot.

## Tech Debt

**Oversized "god" files (backend):**
- Issue: Several service and data files far exceed a maintainable size, mixing many responsibilities in one file. Hard to navigate, review, and test in isolation.
- Files:
  - `src/Cove.Api/Services/ScanService.cs` (3671 lines)
  - `src/Cove.Api/Services/DownloaderService.cs` (2916 lines)
  - `src/Cove.Api/Services/MetadataServerService.cs` (2855 lines)
  - `src/Cove.Data/Repositories/Repositories.cs` (2792 lines — all repositories in one file)
  - `src/Cove.Api/Services/ScraperService.cs` (2563 lines)
  - `src/Cove.Api/Services/ScrapeAttemptService.cs` (2557 lines)
  - `src/Cove.Core/DTOs/DTOs.cs` (2439 lines — all DTOs in one file)
  - `src/Cove.Data/CoveContext.cs` (2258 lines)
  - `src/Cove.Plugins/ExtensionManager.cs` (2172 lines)
- Impact: High cognitive load, merge-conflict hotspots, slow to onboard, difficult to unit-test individual concerns.
- Fix approach: Split by responsibility. `Repositories.cs` → one file per aggregate (partial classes or per-entity files). `DTOs.cs` → group by domain (Video, Gallery, Auth, Config). Extract cohesive sub-services from `ScanService`/`DownloaderService` (e.g. zip handling, dimension extraction, dedup).

**Oversized "god" files (frontend):**
- Issue: Page and component files with thousands of lines combine data fetching, state, and rendering.
- Files:
  - `ui/src/pages/SettingsPage.tsx` (7323 lines — by far the largest source file)
  - `ui/src/api/types.ts` (3408 lines)
  - `ui/src/pages/GroupDetailPage.tsx` (2432 lines)
  - `ui/src/pages/VideoDetailPage.tsx` (2386 lines)
  - `ui/src/components/FilterDialog.tsx` (2323 lines)
  - `ui/src/components/EntityCards.tsx` (2045 lines)
- Impact: `SettingsPage.tsx` in particular is unmaintainable at 7k lines; small changes risk wide regressions and slow editor/type-check performance.
- Fix approach: Decompose `SettingsPage.tsx` into per-section components (many already exist under `ui/src/pages/settings/`, e.g. `AdminSections.tsx` — continue extracting each panel). Split `api/types.ts` per domain if not generated (verify whether it is hand-maintained vs generated in `ui/src/generated/`).

**TypeScript type-safety erosion:**
- Issue: ~244 uses of `any` / `as any` across 62 files in `ui/src`, undercutting the value of TypeScript at module boundaries.
- Files: widespread across `ui/src` (run `grep -rn ": any\b\|as any" ui/src`).
- Impact: Type errors slip past the compiler, especially around API responses and extension interop.
- Fix approach: Prefer `unknown` + narrowing; lean on the generated types in `ui/src/generated/` and `ui/src/api/types.ts` for API payloads.

**Legacy-config migration shims:**
- Issue: One-time legacy field reads guarded by `#pragma warning disable CS0618`.
- Files: `src/Cove.Api/Services/ConfigService.cs` (lines 57, 337).
- Impact: Low — intentional and scoped, but the obsolete fields and migration path linger indefinitely.
- Fix approach: Track a removal version for the legacy config fields once the migration window has passed.

## Known Bugs

**Zip-gallery images stored with zero dimensions:**
- Symptoms: Images extracted from zip galleries are persisted with `Width = 0, Height = 0`; any UI relying on aspect ratio / dimensions will be wrong for these images.
- Files: `src/Cove.Api/Services/ScanService.cs:2364` (`// TODO: Extract dimensions using image processing library`).
- Trigger: Scan a zip-based gallery.
- Workaround: None in code. Dimensions must be backfilled once extraction is implemented (the app already depends on ImageSharp — `Image<Rgba32>` is used in `FfmpegProcessFrameExtractor.cs`, so the capability exists but is not wired here).

## Security Considerations

**Extensions run in-process with full trust (no sandbox):**
- Risk: Extensions are loaded as .NET assemblies via `AssemblyLoadContext.LoadFromAssemblyPath` and execute in the host process with the same privileges as Cove itself. There is no sandbox, permission scoping, or capability isolation.
- Files: `src/Cove.Plugins/ExtensionManager.cs:184`, `:2005`, `:2018`, `:2146`; `src/Cove.Plugins/IExtension.cs`; `src/Cove.Plugins/ExtensionServiceExchange.cs`.
- Current mitigation: This is a deliberate design choice (extensions are a "core part of the app"). Install is user-initiated.
- Recommendations: Make the trust boundary explicit in install UX ("this extension can run arbitrary code / access your library and database"). Consider a signed-publisher model and an allowlist for the registry.

**Extension source-pack installs are fetched without checksum/signature verification:**
- Risk: Source-pack installs pull the current source files straight from a GitHub repo with "no release zips, checksums, or CI" (per in-file comment). Combined with in-process assembly loading, installing/updating an extension equals remote code execution from whatever the branch currently contains.
- Files: `src/Cove.Plugins/GitHubExtensionRegistry.cs:139` (comment), `DownloadSourcePackAsync` (~line 435), vs. the zip path which *does* enforce a checksum (`:324`).
- Current mitigation: Zip-based installs validate a checksum/downloadUrl; source-pack installs do not.
- Recommendations: Pin to a commit SHA or tag rather than a mutable branch; add integrity verification for source-pack installs comparable to the zip path.

**Extension-authored SQL executed verbatim:**
- Risk: Extension migrations run through `db.Database.ExecuteSqlRawAsync(migration.UpSql, ct)` — the raw SQL string comes from the extension. A malicious or buggy extension can run arbitrary DDL/DML against the Cove database.
- Files: `src/Cove.Plugins/ExtensionManager.cs:1476` (and the migrations-tracking block ~1440–1490).
- Current mitigation: The `INSERT` into `extension_migrations` is parameterized; the migration body is not (and cannot be, being arbitrary DDL). Failures stop that extension's migration chain.
- Recommendations: Same trust-boundary framing as above. Consider running extension migrations under a restricted DB role/schema so an extension cannot alter core tables.

**Unsanitized HTML injected from extension slots:**
- Risk: Extension HTML slots are rendered via `dangerouslySetInnerHTML={{ __html: slot.html! }}` with no sanitization, unlike user text content which is passed through `DOMPurify.sanitize(...)`.
- Files: `ui/src/extensions/ExtensionLoader.tsx:472` (unsanitized) vs. `ui/src/components/TextViewer.tsx:88,110` (sanitized with DOMPurify).
- Current mitigation: None for the extension-slot path (it relies entirely on extension trust).
- Recommendations: If extension trust is meant to be full, document it; otherwise run slot HTML through DOMPurify like `TextViewer`.

**Authentication disabled by default:**
- Risk: `Cove.Auth.Enabled` defaults to `false` (`src/Cove.Api/appsettings.json`). When disabled, `AuthBypassPrincipalProvider` runs every request as the owner/system user. On a shared LAN a default-open instance exposes the full library and admin actions to anyone who can reach the port (`Host: 0.0.0.0`).
- Files: `src/Cove.Api/appsettings.json`; `src/Cove.Api/Services/AuthBypassPrincipalProvider.cs`; `src/Cove.Api/Middleware/CurrentPrincipalMiddleware.cs:37`.
- Current mitigation: Local-first product posture; `EnforceDefaultDeny` and `AllowAnonymousShareLinks` exist as guards; a warning is logged if bypass is requested with no owner user (`AuthBypassPrincipalProvider.cs:61`).
- Recommendations: Ensure first-run setup steers network-exposed deployments to enable auth. Consider defaulting `Enabled` to `true` (or gating bypass to loopback only) for non-localhost binds.

**ffmpeg argument construction via string interpolation:**
- Risk: ffmpeg args are built by interpolating paths inside double quotes, e.g. `-i \"{videoPath}\" ... \"{framePath}\"`. `UseShellExecute = false` prevents shell injection, but a path containing a `"` could still break out of the quoted argument and inject ffmpeg options.
- Files: `src/Cove.Api/Services/FfmpegProcessFrameExtractor.cs:107` (`BuildExtractFrameArguments`); similar patterns in `src/Cove.Api/Services/ThumbnailService.cs` and `src/Cove.Api/Services/FingerprintService.cs`.
- Current mitigation: `UseShellExecute = false` everywhere (no shell); paths originate from the scanned library rather than direct network input.
- Recommendations: Use `ProcessStartInfo.ArgumentList` (per-arg, no manual quoting) instead of a single `Arguments` string.

## Performance Bottlenecks

**FFmpeg subprocess-per-operation for thumbnails/fingerprints:**
- Problem: Thumbnail generation, frame extraction, and fingerprinting each spawn ffmpeg processes; on large scans this is process-spawn heavy.
- Files: `src/Cove.Api/Services/ThumbnailService.cs`, `src/Cove.Api/Services/FfmpegProcessFrameExtractor.cs`, `src/Cove.Api/Services/FingerprintService.cs`.
- Cause: External-tool invocation is inherently per-file; frame extractor already pins `-threads 1`.
- Improvement path: Ensure work is bounded by a concurrency limiter (config exposes `MaxConcurrentDownloads`; confirm an equivalent gate exists for thumbnail/fingerprint fan-out) and batch frame extraction where possible.

**Large denormalized context / repository layer:**
- Problem: `CoveContext.cs` (2258 lines) and `Repositories.cs` (2792 lines) suggest heavy denormalization (there are dedicated tests for denormalized id-arrays and derived metrics).
- Files: `src/Cove.Data/CoveContext.cs`, `src/Cove.Data/Repositories/Repositories.cs`; see `src/Cove.Tests/CoveContextDenormalizedIdArrayTests.cs`, `CoveContextDerivedMetricsTests.cs`.
- Cause: Denormalized arrays/metrics must be kept in sync on writes, which can make writes expensive and correctness-sensitive.
- Improvement path: Confirm write-path maintenance of denormalized fields is covered by tests (it appears to be) and profile bulk operations.

## Fragile Areas

**Extension manager (loading, migrations, host-service exchange):**
- Files: `src/Cove.Plugins/ExtensionManager.cs` (2172 lines), `src/Cove.Plugins/ExtensionServiceExchange.cs`, `src/Cove.Plugins/DynamicEndpointDataSource.cs`, `ui/src/extensions/ExtensionLoader.tsx`.
- Why fragile: Assembly load contexts, dynamic endpoint registration, dynamic DB migrations, and a service-exchange overlay interact; ordering (`GetInitializationOrder`) and enable/disable state (`IsEnabled`) gate behavior. Small changes can break load order or leave dynamic endpoints/services registered after uninstall.
- Safe modification: Preserve init/shutdown ordering and always pair `Publish`/`WithdrawAll` in the service exchange. Exercise install → enable → migrate → disable → uninstall end-to-end.
- Test coverage: Present but this is the highest-surface subsystem; verify uninstall-cleanup paths are covered.

**Config migration path:**
- Files: `src/Cove.Api/Services/ConfigService.cs` (legacy `CS0618` reads at lines 57, 337).
- Why fragile: One-time migration logic reading obsolete fields; behaves differently on first upgrade vs. steady state.
- Safe modification: Do not remove the legacy read paths until confident all instances have migrated; keep them covered by a migration test.

## Scaling Limits

**Single embedded Postgres instance:**
- Current capacity: Ships with a managed Postgres (`Postgres.Managed: true`, port 5433) intended for a single-machine, single-library deployment.
- Limit: Designed for personal/LAN scale, not multi-node or high-concurrency multi-tenant use.
- Scaling path: Point at an external Postgres (config supports it) for larger deployments; the instance manager (`src/Cove.InstanceManager`) handles multiple *separate* libraries rather than scaling one.

## Dependencies at Risk

**External binary dependency on ffmpeg:**
- Risk: Thumbnails, frame extraction, and fingerprinting all shell out to ffmpeg; there is a dedicated `.github/workflows/mirror-ffmpeg.yml` to supply it.
- Impact: If the bundled/mirrored ffmpeg is missing or an incompatible version, media processing silently degrades (cleanup `catch {}` blocks swallow process failures).
- Migration plan: Keep the ffmpeg mirror pinned and version-checked at startup; surface a clear error when ffmpeg is unavailable rather than swallowing.

**Pre-release UI framework versions:**
- Risk: `ui/package.json` pins React 19, react-router (TanStack) v1, Vite 6, Vitest 4, Tailwind 4 — several are recent-major/fast-moving.
- Impact: Ecosystem churn; some plugins may lag these majors.
- Migration plan: Watch for breaking minor releases; the lockfile (`ui/package-lock.json`) is committed, which mitigates drift.

## Missing Critical Features

**Image dimension extraction for zip galleries:**
- Problem: See Known Bugs — zip-gallery images have no width/height.
- Blocks: Correct aspect-ratio layout and any dimension-based filtering/sorting for zip-sourced images.

## Test Coverage Gaps

**Test/production database divergence:**
- What's not tested: Behavior tests use `UseSqlite` / `UseInMemory` EF providers, while production runs Postgres (`UseNpgsql`). Postgres-specific behavior (denormalized array columns, pgvector, JSON operators, collation/sort semantics) is not exercised by the bulk of unit tests.
- Files: ~40 test files use Sqlite/InMemory (e.g. `src/Cove.Tests/VideoFilterBehaviorTests.cs`, `EntityListSortBehaviorHarnessTests.cs`); production uses Npgsql (`src/Cove.Data/DataServiceExtensions.cs`). Only `src/Cove.Tests/Phase12SchemaParityTests.cs` and `src/Cove.PerformanceTests/Infrastructure/PostgresPerformanceFixture.cs` target Postgres parity directly.
- Risk: Queries and sort orders can pass on Sqlite/InMemory yet behave differently on Postgres (collation, null ordering, array containment), escaping unit tests.
- Priority: Medium — mitigated by the schema-parity and performance suites, but the main behavioral suites do not run against Postgres.

**Extension uninstall / cleanup paths:**
- What's not tested: Full lifecycle cleanup — dynamic endpoints withdrawn, service-exchange entries removed, and no residual state after `OnUninstallAsync`.
- Files: `src/Cove.Plugins/ExtensionManager.cs`, `src/Cove.Plugins/ExtensionServiceExchange.cs` (`WithdrawAll`), `src/Cove.Plugins/DynamicEndpointDataSource.cs`.
- Risk: Leaked endpoints/services or dangling assembly load contexts after uninstall.
- Priority: Medium.

**Swallowed cleanup failures:**
- What's not tested: The many `try { ... } catch { }` cleanup blocks (temp-file deletes, process kills) intentionally ignore failures, so leaked temp files / orphaned processes under error conditions go undetected.
- Files: `src/Cove.Api/Services/ThumbnailService.cs` (numerous), `FingerprintService.cs`, `FfmpegProcessFrameExtractor.cs`, `MetadataController.cs:771`.
- Risk: Temp-dir growth and orphaned ffmpeg processes accumulate silently.
- Priority: Low — individually harmless, collectively worth a periodic temp-dir sweep and (at minimum) debug-level logging in the catch blocks.

---

*Concerns audit: 2026-07-19*
