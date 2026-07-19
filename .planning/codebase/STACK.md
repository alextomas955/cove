# Technology Stack

**Analysis Date:** 2026-07-19

Cove is a self-hosted media organizer: an ASP.NET Core backend serving a React SPA, packaged as a single-file native executable, a Docker image, and an Instance Manager launcher. It runs entirely locally with no cloud dependency.

## Languages

**Primary:**
- C# (.NET 10) - Entire backend: API, data layer, extension/plugin contracts, SDK, instance manager. All `src/Cove.*` projects target `net10.0`.
- TypeScript ~5.8 - Frontend SPA (`ui/`) and the extension frontend SDK (`sdk/frontend/`). `strict` mode enabled (`ui/tsconfig.json`).

**Secondary:**
- PowerShell - Build/packaging scripts (`scripts/package-pgvector-payload.ps1`, `scripts/stage-pgvector-payload.ps1`), invoked from MSBuild targets.
- MSBuild XML - `Directory.Build.props`, `Directory.Build.targets` (git-tag-derived versioning), `*.csproj`.
- YAML - Scraper packs consumed by `ScraperService` (`.yml`/`.yaml`), GitHub Actions workflows.

## Runtime

**Environment:**
- .NET 10 (ASP.NET Core, Kestrel). No `global.json`; CI pins `10.0.x` (`.github/workflows/ci.yml`).
- Node.js 22 for building the frontend (`docker/Dockerfile.app`, `release.yml`). Browser runtime is React 19.
- Backend listens on `http://0.0.0.0:5073` by default (`Cove:Port`, `src/Cove.Api/Program.cs`).

**Package Managers:**
- NuGet for .NET dependencies (per-project `<PackageReference>`; no central `Directory.Packages.props`).
- npm for frontend. Lockfile: `ui/package-lock.json` present (committed).

## Frameworks

**Backend Core:**
- ASP.NET Core (`Microsoft.NET.Sdk.Web`) - Web host, controllers, middleware, static SPA serving.
- Entity Framework Core 10.0.5 - ORM over PostgreSQL (`Cove.Data`).
- MediatR 14.1.0 - In-process request/notification dispatch (`Cove.Api`); `MediatR.Contracts` 2.0.1 in `Cove.Core`.
- SignalR (`Microsoft.AspNetCore.SignalR`) - Real-time hubs for jobs and logs.

**Frontend Core:**
- React 19.2 + React DOM 19.2 (`ui/package.json`).
- TanStack Router 1.98 (routing), TanStack Query 5.80 (server state/caching), TanStack Virtual 3.13 (list virtualization).
- Tailwind CSS 4.1 (via `@tailwindcss/vite`), PostCSS, autoprefixer.
- `@microsoft/signalr` 9.0 - SignalR client (jobs/logs hubs).
- `lucide-react` (icons), `react-markdown` + `dompurify` (safe markdown rendering), `d3-force` (graph layout).

**Testing:**
- Backend: xUnit 2.9.3, `Microsoft.NET.Test.Sdk` 17.14.1, `Microsoft.AspNetCore.Mvc.Testing` 10.0.6, coverlet. EF Core InMemory + Sqlite providers for tests (`src/Cove.Tests`). Separate `Cove.PerformanceTests` project uses raw Npgsql.
- Frontend: Vitest 4.1 (jsdom), Testing Library (`@testing-library/react` 16.3, `jest-dom`, `user-event`).

**Build/Dev:**
- Vite 6.4 - Frontend dev server + build; outputs to `src/Cove.Api/wwwroot` (`ui/vite.config.ts`).
- tsx 4.23 - Runs the extension-runtime code generator (`ui/scripts/generate-extension-runtime.ts`) before dev/build/test.
- MSBuild single-file publish - Self-contained executable with `wwwroot` embedded as managed resources and pgvector payload embedded (`src/Cove.Api/Cove.Api.csproj`).

## Key Dependencies

**Backend (Cove.Api):**
- `Microsoft.AspNetCore.Authentication.JwtBearer` 10.0.5 - JWT auth.
- `BCrypt.Net-Next` 4.1.0 + `Konscious.Security.Cryptography.Argon2` 1.3.1 (in `Cove.Data`) - Password hashing.
- `System.IdentityModel.Tokens.Jwt` 8.3.0 - JWT token issuing (`Cove.Data`).
- `Serilog.AspNetCore` 10.0.0 + `Serilog.Sinks.File` 7.0.0 - Structured logging (console, rolling file, custom SignalR sink).
- `Swashbuckle.AspNetCore` 10.2.3 + `Microsoft.AspNetCore.OpenApi` 10.0.9 - OpenAPI/Swagger (dev only).
- `SixLabors.ImageSharp` 3.1.12 - Image processing/thumbnails.
- `FFmpeg.AutoGen.Abstractions` / `Bindings.DynamicallyLoaded` 8.0.0.1 - In-process FFmpeg bindings for video transcode/thumbnails.
- `PdfPig` 0.1.14, `VersOne.Epub` 3.3.6, `HtmlAgilityPack` 1.12.2 - Text extraction (PDF/EPUB) and HTML scraping.
- `YamlDotNet` 16.3.0 - YAML scraper pack parsing.

**Data / Vector search (Cove.Data, Cove.Core):**
- `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.1 - PostgreSQL EF provider (the sole application DB).
- `Pgvector` 0.3.2 + `Pgvector.EntityFrameworkCore` 0.3.0 - Vector column support for embeddings/face/perceptual-hash similarity.
- `Microsoft.Data.Sqlite` 9.0.5 + `SQLitePCLRaw.bundle_e_sqlite3` 3.0.3 - SQLite (referenced in `Cove.Api`, plus EF Sqlite in tests).

**Infrastructure:**
- `Microsoft.Extensions.FileProviders.Embedded` 10.0.5 - Serve embedded SPA from the single-file binary.
- Extension/plugin system: custom (`Cove.Plugins`, `Cove.Sdk`) with runtime DLL discovery and per-extension DI overlay containers.

## Project Layout (Solution)

`src/Cove.slnx` composes seven projects:
- `Cove.Api` - Web host, controllers, middleware, hubs, application services (main executable, `AssemblyName=Cove`).
- `Cove.Core` - Entities, DTOs, interfaces, config, events, auth registries. Packable NuGet (`Cove.Core`).
- `Cove.Data` - EF Core `CoveContext`, repositories, migrations, managed-Postgres + auth bootstrap.
- `Cove.Plugins` - Extension contracts + `GitHubExtensionRegistry` + `ExtensionManager`. Packable (`Cove.Plugins`).
- `Cove.Sdk` - Extension author SDK, base classes, packaging targets. Packable (`Cove.Sdk`).
- `Cove.InstanceManager` - Windows GUI/CLI launcher for running multiple local libraries (`WinExe`).
- `Cove.Tests`, `Cove.PerformanceTests` - xUnit test suites.

Frontend: `ui/` (main SPA) and `sdk/frontend/` (`@cove/extension-sdk`, published npm package for UI extension authors).

## Configuration

**Layered config (`src/Cove.Api/Program.cs`):**
1. `appsettings.json` / `appsettings.Development.json` - Base defaults under the `Cove` section (`Port`, `Auth`, `Postgres`, paths).
2. Environment variables prefixed `COVE__` (double-underscore for nesting), e.g. `COVE__Postgres__ConnectionString`, `COVE__GeneratedPath`.
3. `COVE_HOME` - Data/config root directory; `cove-config.json` saved there is loaded at startup and applied over appsettings (`ConfigService`).

**Key config keys** (bound to `CoveConfiguration`, `AuthConfig`, `PostgresConfig`):
- `Cove:Port` (5073), `Cove:Host`, `Cove:CovePaths`, `Cove:MaxConcurrentDownloads`, `Cove:CachePath`, `Cove:GeneratedPath`, `Cove:BackupPath`, `Cove:ExtensionPaths`, `Cove:LogLevel`.
- `Cove:Auth:Enabled`, `JwtSecret`, `AccessTokenMinutes` (15), `RefreshTokenDays` (30), `AllowAnonymousShareLinks`, `EnforceDefaultDeny`, `KnownProxies`, `TrustedHosts`.
- `Cove:Postgres:Managed` (default true), `Port` (5433), `Database`, `ConnectionString`.

**Build config:**
- `Directory.Build.props` - Excludes `bin/obj/artifacts` from globbing.
- `Directory.Build.targets` - Derives version from git tag (`v0.0.x` -> `0.0.x`, dev builds append `-dev`).
- `docker/Dockerfile`, `docker/Dockerfile.app` - Multi-stage frontend + backend builds.

## Platform Requirements

**Development:**
- .NET 10 SDK, Node.js 22, npm.
- PowerShell (`pwsh` on non-Windows) for pgvector staging when publishing single-file.
- A pgvector-enabled PostgreSQL, or rely on managed Postgres (auto-download, dev only).

**Production / Deployment targets:**
- Native single-file self-contained executable for Windows, macOS, Linux (embeds SPA + pgvector payload; auto-downloads FFmpeg and PostgreSQL on first run).
- Docker: `ghcr.io/yourcove/cove` (all-in-one: PostgreSQL + FFmpeg + Cove) and `ghcr.io/yourcove/cove-app` (app-only, external Postgres). Compose files in `docker/`.
- License: GNU AGPL v3.

---

*Stack analysis: 2026-07-19*
