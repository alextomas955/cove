# PostgreSQL payload

Cove's managed PostgreSQL downloads its binaries on first run. They come from a release on this
repository, not from EDB or PGDG directly: both delete superseded builds, and once a pinned version
disappeared upstream every fresh install failed until a Cove release pointed at a new one.

Two workflows publish the pieces, each as a release whose assets are one `.tar.gz` per runtime
identifier plus a manifest with the URL and SHA-256 of each:

| Workflow | Release tag | What it holds | How Cove gets it |
|---|---|---|---|
| Build PostgreSQL Payload | `postgres-payload-v<version>` (e.g. `postgres-payload-v18.3`) | `bin/`, `lib/`, `share/` of the server and client tools | Downloaded at first run by `PostgresManagerService`, verified against the manifest's SHA-256, extracted to `<cove home>/pgsql` |
| Build pgvector Payload | `pgvector-payload-v<pgvector>-pg<major>` | the pgvector extension built against that major | Embedded into the published binary by `scripts/stage-pgvector-payload.ps1` |

Both workflows are `workflow_dispatch` only. The repack does not build PostgreSQL; it downloads the
EDB Windows and macOS binaries zips and, for Linux, installs the PGDG packages in an Ubuntu 22.04
container and copies out the binaries together with every shared library they need except glibc.
That container is the oldest glibc the Linux payload supports (2.35, so Ubuntu 22.04 and Debian 12 or
later); pick it deliberately when changing it. The Linux payload drops `llvmjit.so`, and Cove runs
PostgreSQL with `jit = off`.

## Moving to a new PostgreSQL version

1. Find the EDB "binaries" zip file ids for the new version on
   <https://www.enterprisedb.com/download-postgresql-binaries> and run **Build PostgreSQL Payload**
   with the version and both URLs. The Linux job fails if PGDG no longer ships that exact version, in
   which case use the version it does ship.
2. Run **Build pgvector Payload** for the same major if the pgvector version or major changed.
3. Set `PgFullVersion` (and `PgMajor` if it changed) in `src/Cove.Data/PostgresManagerService.cs`;
   the release tag Cove downloads from is derived from `PgFullVersion`. The pgvector version lives in
   the defaults of `scripts/stage-pgvector-payload.ps1`, `scripts/package-pgvector-payload.ps1` and
   the pgvector workflow.
4. Test the payload before anyone else downloads it: point a fresh Cove home at the new manifest with
   `Cove__Postgres__PayloadManifestUrl=https://github.com/<repo>/releases/download/<tag>/postgres-payload-manifest.json`
   and start Cove.

A new major also needs the usual `pg_upgrade` story for existing data directories, which neither
workflow covers.
