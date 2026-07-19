# Codebase Structure

**Analysis Date:** 2026-07-19

## Directory Layout

```
cove/
├── src/                        # .NET solution (backend + extension host)
│   ├── Cove.slnx               # Solution file (XML slnx format)
│   ├── Cove.Core/              # Domain layer (entities, DTOs, interfaces)
│   ├── Cove.Data/              # EF Core persistence (CoveContext, repos, migrations)
│   ├── Cove.Api/               # ASP.NET Core host (controllers, services, hubs)
│   ├── Cove.Plugins/           # Extension host runtime
│   ├── Cove.Sdk/               # Author-facing extension base classes
│   ├── Cove.InstanceManager/   # Standalone multi-instance launcher
│   ├── Cove.Tests/             # Unit/integration tests (xUnit)
│   └── Cove.PerformanceTests/  # Performance/benchmark tests
├── ui/                         # React 19 + Vite SPA
│   ├── src/                    # Frontend source
│   ├── public/                 # Static assets
│   ├── scripts/                # Build helpers (extension runtime codegen)
│   ├── vite.config.ts          # Vite config + dev proxy to :5073
│   ├── tsconfig.json
│   └── package.json
├── sdk/frontend/               # Published TS SDK for extension frontends
├── docker/                     # Dockerfiles + compose files + s6 init
├── docs/                       # Screenshots and contributing docs
├── scripts/                    # PowerShell packaging scripts (pgvector payload)
├── Directory.Build.props       # Shared MSBuild item excludes
├── Directory.Build.targets     # Git-derived version stamping
├── CHANGELOG.md
├── CONTRIBUTING.md
└── README.md
```

## Directory Purposes

**src/Cove.Core:**
- Purpose: dependency-free domain layer.
- Contains: `Entities/` (32 POCOs), `Interfaces/` (repository/service contracts), `DTOs/`, `Enums/`, `Events/`, `Auth/` (permissions, auth contracts), `Common/` (paths, JSON, version, query parsing), `Media/`, `Helpers/`.
- Key files: `Entities/Video.cs`, `Interfaces/IRepository.cs`, `Auth/Permissions.cs`.

**src/Cove.Data:**
- Purpose: EF Core mapping and data access.
- Contains: `CoveContext.cs` (+ partials like `CoveContext.Authorization.cs`), `Repositories/`, `Migrations/`, `Services/`, `Auth/`, `Configuration/`, `DataServiceExtensions.cs`.
- Key files: `CoveContext.cs`, `DataServiceExtensions.cs` (DI registration), `Repositories/Repositories.cs`, `PostgresManagerService.cs`.

**src/Cove.Api:**
- Purpose: HTTP host and application services.
- Contains: `Controllers/` (47), `Services/` (business logic + ffmpeg/scan/scrape/migration), `Hubs/` (SignalR), `Middleware/`, `Extensions/` (built-in extensions), `Properties/`, `wwwroot/` (compiled SPA), `appsettings*.json`.
- Key files: `Program.cs` (composition root), `Controllers/VideosController.cs`, `Services/JobService.cs`, `Hubs/JobHub.cs`.

**src/Cove.Plugins:**
- Purpose: load and wire extensions into the running app.
- Key files: `ExtensionManager.cs`, `IExtension.cs`, `IExtensionRegistry.cs`, `DynamicEndpointDataSource.cs`, `GitHubExtensionRegistry.cs`.

**src/Cove.Sdk:**
- Purpose: base classes extension authors subclass.
- Key files: `CoveExtensionBase.cs`, `FullExtensionBase.cs`, `DataExtensionBase.cs`, `JobExtensionBase.cs`, `EventExtensionBase.cs`, `UIManifestBuilder.cs`.

**ui/src:**
- Purpose: SPA source.
- Contains: `pages/` (route-level screens), `components/` (reusable UI), `hooks/`, `state/` (React context), `api/` (`client.ts`, `types.ts`), `router/` (`location.ts`, `RouteRegistry.tsx`), `auth/`, `extensions/` (`ExtensionLoader.tsx`), `generated/` (codegen output), `keyboard/`, `utils/`, `test/`.
- Key files: `main.tsx`, `App.tsx`, `api/client.ts`.

**sdk/frontend:**
- Purpose: versioned TS package (`api`, `define`, `hooks`, `types`) consumed by extension frontends; ships prebuilt `dist/`.

**docker:**
- Purpose: deployment. `Dockerfile`, `Dockerfile.app`, `docker-compose.yml` (app + Postgres), `docker-compose.allinone.yml`, `s6/` supervision.

## Key File Locations

**Entry Points:**
- `src/Cove.Api/Program.cs`: backend host bootstrap and DI composition.
- `src/Cove.InstanceManager/Program.cs`: multi-instance launcher.
- `ui/src/main.tsx`: SPA bootstrap; `ui/src/App.tsx`: root component.

**Configuration:**
- `src/Cove.Api/appsettings.json` / `appsettings.Development.json`: backend config (overridable by `COVE__*` env vars).
- `Directory.Build.props` / `Directory.Build.targets`: solution-wide MSBuild config and git version stamping.
- `ui/vite.config.ts`, `ui/tsconfig.json`: frontend build.
- Runtime data/config lives under `COVE_HOME` (not in repo); `.env` files are configuration only — never read.

**Core Logic:**
- `src/Cove.Core/Entities/`: domain model.
- `src/Cove.Data/Repositories/`: query/persistence.
- `src/Cove.Api/Services/`: business services.
- `src/Cove.Plugins/ExtensionManager.cs`: extensibility core.

**Testing:**
- `src/Cove.Tests/`: xUnit tests (one file per controller/service/behavior area).
- `src/Cove.PerformanceTests/`: performance suites.
- `ui/src/test/` and co-located `*.test.ts(x)`: frontend tests (Vitest).

## Naming Conventions

**Files (backend):**
- Entities: singular PascalCase — `Video.cs`, `Performer.cs`.
- Controllers: `<Plural>Controller.cs` — `VideosController.cs`.
- Services: `<Name>Service.cs` — `ScanService.cs`; interfaces `I<Name>.cs`.
- Repositories: `<Entity>Repository.cs`.
- Partial classes split by concern with a dotted suffix — `CoveContext.Authorization.cs`, `StashMigrationService.Scenes.cs`.

**Files (frontend):**
- Pages: `<Name>Page.tsx`; edit surfaces `<Name>EditModal.tsx` / `<Name>EditPanel.tsx`.
- Components: PascalCase `.tsx` — `EntityCardGrid.tsx`.
- Hooks: `use<Name>.ts(x)` — `useDetailListQuery.ts`.
- Context/state: `<Name>Context.tsx`, `<Name>Store.ts`.

**Directories:**
- Backend projects: `Cove.<Area>` (PascalCase, dot-separated).
- Frontend folders: lowercase (`pages`, `components`, `hooks`, `api`).

## Where to Add New Code

**New API endpoint / feature:**
- Controller: `src/Cove.Api/Controllers/<Plural>Controller.cs`.
- Business logic: `src/Cove.Api/Services/<Name>Service.cs` (register in `Program.cs`).
- Domain contract: interface in `src/Cove.Core/Interfaces/`.

**New persisted entity:**
- Entity: `src/Cove.Core/Entities/<Name>.cs`; add `DbSet<>` in `src/Cove.Data/CoveContext.cs`.
- Mapping: `src/Cove.Data/Configuration/EntityConfigurations.cs`.
- Repository: interface in `Cove.Core/Interfaces/`, impl in `src/Cove.Data/Repositories/`, register in `DataServiceExtensions.cs`.
- Migration: add to `src/Cove.Data/Migrations/` (EF tooling).

**New frontend page:**
- Page component: `ui/src/pages/<Name>Page.tsx`.
- API calls: extend `ui/src/api/client.ts` and `ui/src/api/types.ts`.
- Route/nav registration: via `ui/src/router/RouteRegistry.tsx` / `location.ts`.

**New reusable UI component / hook:**
- Component: `ui/src/components/`.
- Hook: `ui/src/hooks/use<Name>.ts`.

**New extension (plugin):**
- Subclass an SDK base in a separate package (`src/Cove.Sdk/*Base.cs`); declare metadata in `extension.json`.
- Frontend contributions use the `sdk/frontend` package and a `UIManifest`.

**Tests:**
- Backend: `src/Cove.Tests/<Area>Tests.cs`.
- Frontend: co-located `*.test.tsx` or `ui/src/test/`.

## Special Directories

**src/Cove.Api/wwwroot:**
- Purpose: compiled React SPA (`assets/`, `index.html`, `manual/`) served by the API.
- Generated: Yes (built from `ui/` via `npm run build`).
- Committed: build artifact — treat as generated, not hand-edited.

**ui/src/generated:**
- Purpose: codegen output (`generate:extension-runtime` script) for the extension runtime.
- Generated: Yes.
- Committed: regenerated on `dev`/`build`/`test`; do not hand-edit.

**ui/node_modules & */bin, */obj, artifacts:**
- Purpose: dependencies / build output.
- Generated: Yes. Committed: No (excluded via `.gitignore` and `Directory.Build.props`).

**sdk/frontend/dist:**
- Purpose: prebuilt SDK output shipped for extension authors.
- Generated: Yes (checked in for distribution).

---

*Structure analysis: 2026-07-19*
