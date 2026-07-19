# Coding Conventions

**Analysis Date:** 2026-07-19

Cove is a two-language codebase: a **C# / .NET 10** backend under `src/` and a **TypeScript / React 19** frontend under `ui/` (plus a small extension SDK under `sdk/frontend/` and `src/Cove.Sdk/`). Conventions differ by language; both sections below are prescriptive.

## Naming Patterns

### C# (`src/`)

**Files:**
- One primary type per file, filename matches the type: `JobService.cs`, `BookmarksController.cs`, `IRepository.cs`.
- Controllers end in `Controller` (`VideosController.cs`), services end in `Service` (`ScanService.cs`), interfaces are `I`-prefixed (`IJobService.cs`, `IBlobService.cs`).
- Large services are split into `partial class` files by concern using a dotted suffix: `StashMigrationService.cs`, `StashMigrationService.Galleries.cs`, `StashMigrationService.Performers.cs` (all in `src/Cove.Api/Services/`).

**Types:** PascalCase. DTOs suffixed `Dto` (`VideoDto`, `BookmarkStateDto`), requests suffixed `Request` (`BookmarkBatchRequestDto`, `FilteredQueryRequest<TFilter>`), entities are bare nouns (`Video`, `Performer`) inheriting `BaseEntity` (`src/Cove.Core/Entities/BaseEntity.cs`).

**Methods:** PascalCase; async methods end in `Async` (`GetByIdAsync`, `FindByRemoteIdAsync`). Boolean-returning helpers read as predicates (`IsWeakJwtSecret`, `HostExistsAsync`).

**Fields / locals:** private fields are `_camelCase` (`_eventBus`, `_lock`, `_exclusiveQueue`); locals and parameters are camelCase. Constants are PascalCase (`MaxHistory`, `TestUserId`).

**Namespaces:** file-scoped, mirror the folder path — `namespace Cove.Api.Controllers;`, `namespace Cove.Core.Interfaces;`.

### TypeScript / React (`ui/`)

**Files:**
- Components: PascalCase `.tsx` (`BookmarkButton.tsx`, `EngagementBar.tsx`) in `ui/src/components/`.
- Hooks: camelCase `use`-prefixed (`useDetailListQuery.ts`, `useEntityEngagement.ts`) in `ui/src/hooks/`.
- Plain modules / utilities: camelCase `.ts` (`client.ts`, `types.ts`, `authStore.ts`).
- Pages live in `ui/src/pages/`, API layer in `ui/src/api/`.

**Components:** named `export function ComponentName(...)` (no default exports for components). Props typed via a local `interface Props { ... }` immediately above the component.

**Variables / functions:** camelCase. Types and interfaces PascalCase; DTO-mirroring types drop the `Dto` suffix used server-side (`BookmarkDto` server → `BookmarkState` / `Bookmark` client types).

## Code Style

**Formatting:**
- No repository-level `.editorconfig`, ESLint, Prettier, or Biome config is present. Style is enforced by convention and reviewer discretion (see `CONTRIBUTING.md`), not tooling.
- TypeScript compiler is the strictness gate: `ui/tsconfig.json` sets `"strict": true`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`. `noUnusedLocals`/`noUnusedParameters` are intentionally **off**.
- C# uses `<Nullable>enable</Nullable>` and `<ImplicitUsings>enable</ImplicitUsings>` across all projects (`src/**/*.csproj`), so nullable-reference annotations (`T?`) are mandatory and common `System.*` usings are implicit.

**Indentation:** 4 spaces in C#, 2 spaces in TS/TSX (observed consistently).

**Strings:** C# uses raw string literals (`"""..."""`) for embedded SQL/JSON (see `src/Cove.Api/Program.cs`). TS uses double quotes and template literals for className composition.

## Import Organization

### C#
Observed order (e.g. `BookmarksController.cs`, `Program.cs`):
1. Third-party / framework usings (`Microsoft.AspNetCore.*`, `Microsoft.EntityFrameworkCore`, `Serilog`)
2. Project usings grouped by assembly (`Cove.Core.*`, `Cove.Data`, `Cove.Api.*`, `Cove.Plugins`)

Implicit usings mean common namespaces (`System`, `System.Linq`, `System.Threading.Tasks`) are omitted.

### TypeScript
Observed order (e.g. `BookmarkButton.tsx`, `client.ts`):
1. React / external packages (`react`, `@tanstack/react-query`, `lucide-react`, `@microsoft/signalr`)
2. Internal relative imports (`../api/client`, `./types`)

**Path Aliases:** `@/*` maps to `ui/src/*` (configured in both `ui/tsconfig.json` and `ui/vite.config.ts`). Both `@/...` and relative `../...` imports appear; relative imports dominate in `components/`.

## Error Handling

### C#
- Controllers return `ActionResult<T>` and use built-in result helpers: `Ok(...)`, `Forbid()`, `NotFound()`, `BadRequest(...)`. `BadRequest`/`Problem`/`ProblemDetails` usage is heavy (~166 occurrences across `src/Cove.Api/Controllers/`).
- Authorization guards are early-return checks at the top of actions: `if (principalAccessor.Current?.UserId is not int userId) return Forbid();` (pattern-matched null checks with `is`/`is not`).
- Cross-cutting failures are handled by middleware/filters in `src/Cove.Api/Middleware/` (`AuthExceptionFilter.cs`, `DatabaseUnavailableMiddleware.cs`, `PermissionAuthorizationFilter.cs`) rather than per-action try/catch.
- Background work swallows expected cancellation explicitly: `try { await _processorTask; } catch (OperationCanceledException) { }` (`JobService.cs`).

### TypeScript
- Server errors surface through the shared `authStore`-aware fetch wrapper in `ui/src/api/client.ts`, which transparently retries once via `tryRefresh()` on auth expiry.
- React Query mutations use optimistic updates with rollback: `onMutate` snapshots previous cache, `onError` restores it, `onSuccess` writes the server result (see `BookmarkButton.tsx`).
- Defensive `try/catch` around hook calls that may throw outside a provider (e.g. `useQueryClient()` in `BookmarkButton.tsx` falls back to a disabled button).
- UI resilience via `ErrorBoundary.tsx` and `ExtensionErrorBoundary.tsx` components.

## Logging

**C#:** Serilog is the framework (configured in `src/Cove.Api/Program.cs`; `SignalRLogSink.cs` streams logs to the UI). Services inject `ILogger<T>` (~23 services in `src/Cove.Api/Services/`) and use structured message templates with named placeholders: `_logger.LogInformation("Job {JobId} enqueued ({Mode}): {Type} - {Description}", ...)`. Never string-interpolate log messages — use templates.

**TypeScript:** No logging framework; `console` used sparingly. User-facing status flows through SignalR hubs and React Query state.

## Comments

- **C#:** XML doc comments (`/// <summary>`) on public interface members and non-obvious DTOs (see `IRepository.cs`, `DTOs.cs`). Inline comments explain *why*, especially around performance decisions (e.g. the denormalized `TagIds`/`PerformerIds` GIN-index comment block in `Entities/Video.cs`).
- **TypeScript:** Block comments explain non-obvious build/runtime wiring (e.g. the `changelogPlugin` and import-map rationale in `ui/vite.config.ts`, the "Lazy import to avoid circular deps" note in `client.ts`).
- Prefer explaining rationale over restating code. Section banner comments (`// ===== VIDEO DTOs =====`) group large files.

## Function & Type Design

**C# controllers:** Use **primary constructors** for dependency injection — `public class BookmarksController(CoveContext db, ICurrentPrincipalAccessor principalAccessor, IUserEngagementService engagement) : ControllerBase`. Actions are `async Task<ActionResult<T>>` and always accept a trailing `CancellationToken ct`. Thread the token through every EF Core call (`ToListAsync(ct)`, `FirstOrDefaultAsync(..., ct)`).

**C# services:** Classic constructor injection with `_field` assignment is used where the class also holds state (e.g. `JobService`). Both primary-constructor and classic-constructor styles coexist — match the surrounding file.

**DTOs:** Prefer `record` with positional parameters and default values for optional fields (`VideoDto(..., int? ParentVideoId = null, ...)`). Use `record` for immutable transfer shapes; `class` with `get; set;` for entities and mutable request bodies.

**EF Core queries:** Read queries use `.AsNoTracking()`. Filtering/projection is expressed with LINQ method syntax and lambda parameters named after the row (`.Where(bookmark => bookmark.UserId == userId)`), not single-letter names.

**React components:** Functional components with hooks only. Co-locate `interface Props`. Use `@tanstack/react-query` (`useQuery`/`useMutation`/`useQueryClient`) for all server state; keep query keys as arrays (`["bookmark-state", hostType, hostId]`) and invalidate related keys on success. Tailwind CSS v4 utility classes composed inline via template strings; semantic color tokens (`border-border`, `bg-card`, `text-accent`) rather than raw colors.

## Module Design

**C#:** Project boundaries enforce layering — `Cove.Core` (entities, DTOs, interfaces, no infra deps beyond DI abstractions + Pgvector), `Cove.Data` (EF Core `CoveContext`, migrations), `Cove.Api` (controllers, services, hubs, middleware), `Cove.Plugins` / `Cove.Sdk` (extension contracts). Depend inward toward `Cove.Core`; never reference `Cove.Api` from `Cove.Core`.

**TypeScript:** No barrel-file convention for components (import directly from the component file). The API layer is centralized in `ui/src/api/client.ts` (a single large module exporting grouped namespaces like `bookmarks.toggle(...)`) with types in `ui/src/api/types.ts`. Extension SDK types/hooks are the exception, re-exported via `sdk/frontend/src/index.ts`.

---

*Convention analysis: 2026-07-19*
