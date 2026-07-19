<!-- refreshed: 2026-07-19 -->
# Architecture

**Analysis Date:** 2026-07-19

## System Overview

Cove is a self-hosted media organizer: a single ASP.NET Core process serves a
REST + SignalR API and hosts the compiled React SPA, backed by PostgreSQL
(with pgvector). A first-class extension system lets plugins contribute
entities, endpoints, background jobs, event handlers, and UI. A separate
`Cove.InstanceManager` executable launches and supervises multiple library
instances.

```text
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React 19 SPA)                    │
│   `ui/src/main.tsx` → `ui/src/App.tsx`                        │
│   TanStack Query · custom router · SignalR client            │
└──────────────────┬────────────────────┬─────────────────────┘
        REST/JSON  │        WebSocket    │ (JWT bearer)
                   ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cove.Api (ASP.NET Core host)                 │
│  Composition root `src/Cove.Api/Program.cs`                  │
├──────────────────┬────────────────────┬─────────────────────┤
│   Controllers    │   Services          │   Hubs / Middleware │
│ `Controllers/`   │ `Services/`         │ `Hubs/` `Middleware/`│
└────────┬─────────┴──────────┬──────────┴──────────┬──────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│  Cove.Core (domain)      │   │  Cove.Plugins (extension host)│
│  Entities · DTOs ·       │◄──│  `ExtensionManager.cs`        │
│  Interfaces · Auth       │   │  AssemblyLoadContext loading  │
│  `src/Cove.Core/`        │   │  `src/Cove.Plugins/`          │
└────────────┬─────────────┘   └───────────────┬───────────────┘
             │                                  │ contributes
             ▼                                  │ entities/endpoints
┌─────────────────────────────────────────────────────────────┐
│              Cove.Data (EF Core persistence)                  │
│  `CoveContext.cs` · Repositories · Migrations                │
│  `src/Cove.Data/`                                            │
└──────────────────────────┬────────────────────────────────────┘
                           │ Npgsql + pgvector
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       PostgreSQL                              │
│   Managed (`PostgresManagerService`) or external             │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Cove.Api | HTTP host, composition root, controllers, business services, SignalR, middleware | `src/Cove.Api/Program.cs` |
| Cove.Core | Domain layer: entities, DTOs, interfaces, enums, events, auth contracts (no infra deps) | `src/Cove.Core/` |
| Cove.Data | EF Core `DbContext`, repositories, migrations, auth persistence, PostgreSQL management | `src/Cove.Data/CoveContext.cs` |
| Cove.Plugins | Extension host: discovery, load contexts, lifecycle, dynamic endpoints, registry | `src/Cove.Plugins/ExtensionManager.cs` |
| Cove.Sdk | Author-facing extension base classes and capability interfaces | `src/Cove.Sdk/CoveExtensionBase.cs` |
| Cove.InstanceManager | Standalone launcher supervising multiple library instances | `src/Cove.InstanceManager/Program.cs` |
| ui | React SPA served from the API's `wwwroot` | `ui/src/App.tsx` |
| sdk/frontend | Published TS SDK for extension frontend authors | `sdk/frontend/src/index.ts` |

## Pattern Overview

**Overall:** Layered monolith (Domain / Persistence / API) with a
plugin-based extensibility core, fronted by a decoupled SPA.

**Key Characteristics:**
- Clean dependency direction: `Cove.Api` → `Cove.Core` ← `Cove.Data`; core has no infrastructure dependencies.
- Repository pattern over EF Core; controllers stay thin and delegate to services and repositories.
- Extensions are treated as a core feature, not an add-on: they can extend the EF model, HTTP routing, jobs, events, and the UI at runtime.
- Frontend is a pure SPA that talks to the backend only through `ui/src/api/client.ts`; it is compiled and served as static files by the API.
- Real-time updates (jobs, logs) pushed over SignalR hubs.

## Layers

**Domain (Cove.Core):**
- Purpose: entities, DTOs, service/repository interfaces, enums, domain events, auth contracts.
- Location: `src/Cove.Core/`
- Contains: `Entities/` (32 entity types), `Interfaces/`, `DTOs/`, `Enums/`, `Events/`, `Auth/`, `Common/`, `Media/`.
- Depends on: nothing project-internal (leaf of the dependency graph).
- Used by: `Cove.Api`, `Cove.Data`, `Cove.Plugins`, `Cove.Sdk`.

**Persistence (Cove.Data):**
- Purpose: EF Core mapping and data access against PostgreSQL.
- Location: `src/Cove.Data/`
- Contains: `CoveContext.cs` (partial class), `Repositories/`, `Migrations/`, `Services/`, `Auth/`, `Configuration/`, `DataServiceExtensions.cs` (DI registration).
- Depends on: `Cove.Core`, `Cove.Plugins` (for `IDataExtension` model contributions).
- Used by: `Cove.Api`.

**API / Host (Cove.Api):**
- Purpose: HTTP endpoints, SignalR, application services, request pipeline, app composition.
- Location: `src/Cove.Api/`
- Contains: `Controllers/` (47), `Services/` (business logic), `Hubs/`, `Middleware/`, `Extensions/` (built-in extensions), `Program.cs`.
- Depends on: `Cove.Core`, `Cove.Data`, `Cove.Plugins`.
- Used by: launched directly or by `Cove.InstanceManager`.

**Extension host (Cove.Plugins):**
- Purpose: load, isolate, and wire extensions into the running app.
- Location: `src/Cove.Plugins/`
- Contains: `ExtensionManager.cs`, `IExtension.cs`, `IExtensionRegistry.cs`, `DynamicEndpointDataSource.cs`, `ExtensionServiceExchange.cs`, `GitHubExtensionRegistry.cs`.
- Depends on: `Cove.Core`.
- Used by: `Cove.Api` (host), `Cove.Sdk` (base classes implement its interfaces).

**Frontend (ui):**
- Purpose: browser SPA.
- Location: `ui/src/`
- Contains: `pages/`, `components/`, `hooks/`, `state/` (React context), `api/` (client + types), `router/`, `auth/`, `extensions/`, `generated/`.
- Depends on: backend REST/SignalR API only.
- Used by: compiled into `src/Cove.Api/wwwroot/` and served by the API.

## Data Flow

### Primary Request Path (read/write an entity)

1. React component/hook calls a typed function in `ui/src/api/client.ts`, attaching the JWT bearer token (`ui/src/auth/authStore.ts`).
2. Request enters the ASP.NET Core pipeline in `src/Cove.Api/Program.cs` (compression → CORS → output cache → rate limiter → extension middleware chain → authN/authZ → current-principal middleware).
3. A controller action in `src/Cove.Api/Controllers/*.cs` (e.g. `VideosController.cs`) validates input and delegates.
4. Application service in `src/Cove.Api/Services/*.cs` applies business rules.
5. Repository in `src/Cove.Data/Repositories/*.cs` (e.g. `VideoRepository.cs`) builds an EF query against `CoveContext` (`src/Cove.Data/CoveContext.cs`).
6. `Npgsql` executes against PostgreSQL; results map back to DTOs and return as JSON.

### Real-time Updates (jobs / logs)

1. Background work runs via `JobService` (`src/Cove.Api/Services/JobService.cs`, a hosted service).
2. Progress is pushed through `JobHub` (`src/Cove.Api/Hubs/JobHub.cs`) mapped at `/hubs/jobs`; logs via `LogHub` at `/hubs/logs`.
3. The SPA subscribes with `@microsoft/signalr` and updates TanStack Query caches.

### Extension Contribution Flow

1. `ExtensionManager` (`src/Cove.Plugins/ExtensionManager.cs`) discovers extension packages, loads each into its own `AssemblyLoadContext`, and resolves dependencies.
2. Data extensions (`IDataExtension`) contribute entity types; `CoveContext.SetDataExtensions` bumps `ModelGeneration` and `CoveModelCacheKeyFactory` forces EF to rebuild the model — install/uninstall takes effect with no app restart (`src/Cove.Data/DataServiceExtensions.cs`).
3. Endpoint extensions register routes through `DynamicEndpointDataSource.cs`; middleware runs via `extensionManager.InvokeMiddlewareChainAsync` in the pipeline.
4. UI contributions are declared as a JSON `UIManifest`; the SPA fetches it in `ui/src/extensions/ExtensionLoader.tsx` and registers routes/slots/tabs/themes into `ui/src/router/RouteRegistry.tsx`.

**State Management:**
- Backend: stateless request scope over EF `CoveContext`; module-level statics only for the EF model generation token.
- Frontend: TanStack Query for server state; React context (`ui/src/state/`, `ui/src/auth/`) for app config, auth, and video queue.

## Key Abstractions

**Entity / BaseEntity:**
- Purpose: persisted domain objects (video, performer, tag, studio, gallery, image, audio, text, group, segment, face, …).
- Examples: `src/Cove.Core/Entities/BaseEntity.cs`, `Video.cs`, `Performer.cs`.
- Pattern: POCO entities mapped by EF Core; shared base for common fields.

**Repository (`IRepository<T>` + per-entity interfaces):**
- Purpose: encapsulate query/persistence logic per aggregate.
- Examples: `src/Cove.Core/Interfaces/IRepository.cs`, `src/Cove.Data/Repositories/VideoRepository.cs`.
- Pattern: interface in Core, implementation in Data, registered scoped in `DataServiceExtensions.cs`.

**IExtension + capability interfaces:**
- Purpose: contract every plugin implements, plus optional capabilities (data, events, jobs, endpoints, UI).
- Examples: `src/Cove.Plugins/IExtension.cs`, SDK base classes `src/Cove.Sdk/FullExtensionBase.cs`, `DataExtensionBase.cs`, `JobExtensionBase.cs`, `EventExtensionBase.cs`.
- Pattern: metadata sourced from `extension.json` via `IManifestAware`; capabilities discovered by interface implementation.

**IEventBus / domain events:**
- Purpose: decoupled in-process eventing for entity changes.
- Examples: `src/Cove.Core/Events/Events.cs`, registered in `Program.cs` as singleton `EventBus`.
- Pattern: publish/subscribe; `ExtensionEventBridge` forwards events to extensions.

**RouteRegistry / SlotEntry (frontend):**
- Purpose: runtime registry for pages and extension UI slots.
- Examples: `ui/src/router/RouteRegistry.tsx`, `ui/src/router/location.ts`.
- Pattern: context provider with register/unregister for routes and named slots.

## Entry Points

**API host:**
- Location: `src/Cove.Api/Program.cs` (~859 lines; single top-level composition root).
- Triggers: process start (native app, Docker, or via InstanceManager).
- Responsibilities: config load, logging (Serilog), DI registration, EF migration bootstrap, JWT auth, SignalR, extension load, static SPA serving, pipeline wiring.

**Instance Manager:**
- Location: `src/Cove.InstanceManager/Program.cs`.
- Triggers: user launches the manager (GUI-subsystem exe on Windows).
- Responsibilities: parse options, allocate ports, launch/supervise per-library Cove.Api processes, expose a management endpoint guarded by an access token.

**SPA:**
- Location: `ui/src/main.tsx` → `ui/src/App.tsx`.
- Triggers: browser loads `index.html` served from `wwwroot`.
- Responsibilities: mount React tree, providers (QueryClient, AppConfig, Auth, RouteRegistry, ExtensionLoader), gesture/zoom guards, route resolution.

## Architectural Constraints

- **Threading:** ASP.NET Core async request pipeline; `Program.cs` raises `ThreadPool.SetMinThreads` to `ProcessorCount * 4` for concurrent async I/O. EF thread-safety checks disabled in production for throughput.
- **DbContext lifetime:** `CoveContext` is **not** pooled by design — pooled contexts pin their EF model, which would break runtime data-extension install/uninstall. Non-pooled contexts resolve the current model per scope (`src/Cove.Data/DataServiceExtensions.cs`).
- **Global state:** static `CoveContext._dataExtensions` / `_modelGeneration` (monotonic token) drive model rebuilds; `ExtensionLoadContext.HostAssemblyBundledWarning` static hook. Otherwise state is request-scoped.
- **Extension isolation:** each extension loads into its own `AssemblyLoadContext`; host-provided assemblies always win to avoid type-identity mismatches.
- **Migrations:** core migrations are applied at startup; extension-owned schema is excluded from the core migration snapshot (`PendingModelChangesWarning` suppressed) — extensions own their own migrations.

## Anti-Patterns

### Bypassing `ui/src/api/client.ts` for backend calls

**What happens:** Ad-hoc `fetch()` calls scattered in components.
**Why it's wrong:** `client.ts` centralizes base URL, JWT attachment, error handling, and typed responses; bypassing it drops auth headers and type safety.
**Do this instead:** Add or reuse a typed function in `ui/src/api/client.ts` and consume it via a TanStack Query hook.

### Putting query logic in controllers

**What happens:** Controllers building EF `IQueryable` directly against `CoveContext`.
**Why it's wrong:** Duplicates filter/search logic and couples the HTTP layer to persistence details.
**Do this instead:** Delegate to the matching repository in `src/Cove.Data/Repositories/` (see the search/criteria helpers in `Repositories.cs`, `FilterHelpers.cs`).

### Re-declaring extension metadata in code

**What happens:** Hard-coding `Id`/`Name`/`Version` in an extension class.
**Why it's wrong:** Duplicates the `extension.json` manifest and drifts from the single source of truth.
**Do this instead:** Implement via the SDK base classes that honor `IManifestAware` (`src/Cove.Sdk/CoveExtensionBase.cs`).

## Error Handling

**Strategy:** Middleware-based cross-cutting handling plus guard middleware for degraded states.

**Patterns:**
- `DatabaseUnavailableMiddleware` short-circuits requests when the DB is down; a `/health` endpoint reports readiness.
- `AuthExceptionFilter` (`src/Cove.Api/Middleware/`) translates auth exceptions to HTTP responses; `AuthExceptions.cs` in Core defines the types.
- `OutsideIpFailsafeMiddleware` and `AuthDisabledRequestGuard` protect against misconfiguration/exposure.
- Startup guards fail fast with actionable stderr messages (e.g. `EnsureDataRootWriteable`, weak-JWT detection in `Program.cs`).
- Frontend: `ErrorBoundary` and `ExtensionErrorBoundary` isolate render failures (`ui/src/components/`).

## Cross-Cutting Concerns

**Logging:** Serilog on the backend (file sink under the data root + SignalR `LogHub` sink `SignalRLogSink.cs`); runtime-adjustable log level switch.
**Validation:** DTO-level validation in controllers; repository/service guards; permission checks via filters.
**Authentication:** JWT bearer (`Program.cs` `AddAuthentication`); `PermissionAuthorizationFilter` + `RequiresPermissionAttribute` enforce RBAC; `CurrentPrincipalMiddleware` establishes the request principal. Auth services live in `src/Cove.Data/Auth/` and contracts in `src/Cove.Core/Auth/`.

---

*Architecture analysis: 2026-07-19*
