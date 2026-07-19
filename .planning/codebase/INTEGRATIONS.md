# External Integrations

**Analysis Date:** 2026-07-19

Cove is a local-first application: no user accounts in the cloud, no telemetry, no SaaS backend. Its external interactions are (1) a required local/self-hosted PostgreSQL, (2) optional on-demand binary downloads (FFmpeg, PostgreSQL, pgvector), (3) the GitHub-backed extension registry, and (4) optional user-configured Stash-box-style metadata servers and web scrapers/downloaders that run through the extension system.

## APIs & External Services

**Metadata servers (Stash-box / StashDB compatible, GraphQL):**
- Configured by the user; queried via `MetadataServerService` (`src/Cove.Api/Services/MetadataServerService.cs`), exposed to extensions through `IMetadataServerService` (`src/Cove.Core/Interfaces/IMetadataServerService.cs`).
- Protocol: GraphQL POST to a user-supplied endpoint. Queries include `searchPerformer`, `findPerformer`, `searchStudio`, `searchTag`, `Me` (auth validation). Matches performers/studios/tags and imports metadata + images.
- Uses perceptual-hash (phash) matching (hamming distance threshold 8) to reconcile content.
- Auth: per-server API key stored in Cove config/DB (validated via the `Me` query).
- HTTP client registered via `AddHttpClient<MetadataServerService>` (`Program.cs`).

**Extension registry (GitHub):**
- `GitHubExtensionRegistry` (`src/Cove.Plugins/GitHubExtensionRegistry.cs`) reads `index.json` + `extensions/{id}.json` from `https://raw.githubusercontent.com/yourcove/officialextensionregistry/main/...`.
- Extension packages are downloaded from each extension's own GitHub Releases. Index cached 5 minutes; metadata fetched with bounded concurrency (16).
- HTTP client `"ExtensionRegistry"` with `User-Agent: Cove/1.0` (`Program.cs`).

**Web scrapers & downloaders (extension-driven):**
- `ScraperService` (`src/Cove.Api/Services/ScraperService.cs`) runs YAML scraper packs (StashDB-style scraper config) against arbitrary sites using `HtmlAgilityPack`.
- `DownloaderService` (`src/Cove.Api/Services/DownloaderService.cs`) dispatches to downloader-provider extensions; built-in `DirectFileDownloaderExtension` fetches direct file URLs. Downloads staged under the OS temp dir, capped by `Cove:MaxConcurrentDownloads`.
- Shared scraping `HttpClient` named `"scraper"` with a browser User-Agent, cookie container, auto-redirect, and decompression (`Program.cs`).

**Binary downloads (on-demand, first run):**
- FFmpeg - `FfmpegManagerService` (`src/Cove.Api/Services/FfmpegManagerService.cs`) downloads GPL builds from `github.com/BtbN/FFmpeg-Builds` (Windows/Linux/Linux-arm64) and `evermeet.cx` (macOS) if not on PATH.
- PostgreSQL - `PostgresManagerService` (`src/Cove.Data/PostgresManagerService.cs`) downloads portable PostgreSQL 18.3 from EnterpriseDB (Windows/macOS) and PGDG `.deb` packages on Debian/Ubuntu Linux.
- pgvector 0.8.2 - Bundled/embedded in single-file builds, or downloaded from `apt.postgresql.org` on Debian/Ubuntu.

## Data Storage

**Primary database:**
- PostgreSQL (the only application database). EF Core via `Npgsql.EntityFrameworkCore.PostgreSQL`, registered by `AddCoveData` (`src/Cove.Data/DataServiceExtensions.cs`).
- pgvector extension required (`UseVector()`) for embedding / face / perceptual-hash similarity search.
- Two operating modes: **managed** (`Cove:Postgres:Managed=true`, default) auto-downloads and runs a local PG instance on port 5433 via `PostgresManagerService`; **external** (`Managed=false`) uses `Cove:Postgres:ConnectionString` (e.g. the Docker `db` service, `pgvector/pgvector:pg18`).
- Connection string built in `Program.cs`; pool 2–100, command timeout 30s.
- Schema managed by EF Core migrations (`Cove.Data`); baseline auto-applied on empty DB, pending migrations logged and gated at startup.

**Embedded/secondary storage:**
- SQLite (`Microsoft.Data.Sqlite`) referenced in `Cove.Api`; EF Core Sqlite + InMemory used for tests.

**File storage (all local filesystem, no cloud object storage):**
- Media library: user-mounted read paths (`Cove:CovePaths`; Docker `/media`).
- Generated assets (`Cove:GeneratedPath` -> `/generated`), cache (`Cove:CachePath` -> `/cache`), backups (`Cove:BackupPath` -> `/backups`), config + extensions (`COVE_HOME` -> `/config`).
- `IBlobService` / `BlobService` manages binary blobs (covers, thumbnails) on disk.

**Caching:**
- In-process `IMemoryCache` for POST query results; ASP.NET Core output caching (`ShortCache` 1s) for read-heavy endpoints. No external cache (Redis etc.).

## Authentication & Identity

**Auth provider:** Custom, self-contained (no external IdP/OAuth).
- JWT bearer tokens (`Microsoft.AspNetCore.Authentication.JwtBearer`), issuer/audience `"Cove"`, HS256 with `Cove:Auth:JwtSecret`. A weak/placeholder secret is auto-replaced with a random 32-byte secret at startup (`Program.cs`).
- Access tokens 15 min, refresh tokens 30 days (configurable).
- Password hashing: BCrypt + Argon2 (`Konscious.Security.Cryptography.Argon2`).
- Bootstrap: `BootstrapAuthService` (`src/Cove.Data/Auth`) seeds the initial user/roles and refreshes the permission catalog.
- Auth is **disabled by default** (`Cove:Auth:Enabled=false` in `appsettings.json`); when disabled, requests are treated as anonymous-allowed. Roles, permissions, and per-entity access control enforced via MVC filters (`PermissionAuthorizationFilter`, `EntityAccessActionFilter`) plus `IPermissionRegistry` / `ContentPolicyRegistry`.
- Share links: anonymous access to specific content via `X-Share-Token` / `X-Share-Password` headers (`Cove:Auth:AllowAnonymousShareLinks`).
- SignalR authenticates via `access_token` query string on `/hubs/*`.

## Monitoring & Observability

**Error tracking:** None external. Failures logged via Serilog; fatal startup errors also written to stderr.

**Logs:**
- Serilog to console + daily rolling file (`{dataRoot}/logs/cove-.log`, 30-day retention) and a custom `SignalRLogSink` that streams logs to the UI over the `/hubs/logs` hub.
- Runtime-adjustable level via `Cove:LogLevel` (`LoggingLevelSwitch`).

**Health:** `GET /health` checks DB connectivity (anonymous, returns 503 when DB unreachable).

## CI/CD & Deployment

**Hosting:** Self-hosted only — native desktop executable or Docker on the user's machine/network. No managed hosting.

**Container registry:** GitHub Container Registry (`ghcr.io/yourcove/cove`, `cove-app`).

**CI pipeline (GitHub Actions, `.github/workflows/`):**
- `ci.yml` - Restore/build the solution, build the native Instance Manager, run xUnit non-integration + integration smoke tests; performance job uses a `pgvector/pgvector:pg16` service container.
- `release.yml` - Tag-triggered (`v*`): builds the UI, publishes single-file binaries and Docker images.
- `build-pgvector-payload.yml` - Builds pgvector payloads bundled into single-file releases.
- `mirror-ffmpeg.yml` - Mirrors FFmpeg builds.
- `publish-plugins-package.yml` - Publishes the `Cove.Plugins` / SDK NuGet packages.

## Environment Configuration

**Notable env vars (Docker / runtime):**
- `COVE_HOME` - Config + extensions directory (`/config`).
- `COVE__Postgres__Managed`, `COVE__Postgres__ConnectionString` - External Postgres wiring.
- `COVE__GeneratedPath`, `COVE__CachePath`, `COVE__BackupPath` - Storage locations.
- `COVE_DATA_DIR` - Host bind-mount root in compose files.
- `ASPNETCORE_ENVIRONMENT` - Standard ASP.NET environment (`Development`, `IntegrationTest`, `IntegrationStartup`).

**Secrets location:**
- No `.env` files in the repo. Secrets (JWT secret, per-server metadata API keys, DB credentials) live in `cove-config.json` under `COVE_HOME` and/or environment variables. Docker compose files ship default demo Postgres credentials (`cove`/`cove`) intended for local override.

## Webhooks & Callbacks

**Incoming:** None. No inbound webhook endpoints.

**Outgoing:** None (no outbound webhook dispatch). Real-time client updates use SignalR hubs, not HTTP webhooks:
- `/hubs/jobs` (`JobHub`) - Background job progress/status.
- `/hubs/logs` (`LogHub`) - Live application log stream.

---

*Integration audit: 2026-07-19*
