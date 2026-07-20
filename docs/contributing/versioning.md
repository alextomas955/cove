# Extension versioning and deprecation policy

This document is the authoritative reference for how Cove versions the contracts that extensions
depend on, and how compatibility is negotiated and eventually deprecated. It applies to extension
authors and to anyone changing the host-facing contracts. The goal is simple: an extension should
know, from versions alone, whether it will load and run against a given Cove release.

## The two version axes

Cove exposes two independent contracts to extensions, and they are versioned separately.

- **Host contract version.** The semver `major.minor.patch` value reported by `CoveVersion`
  (baked into the build from the release tag). This is the single source of truth for backend
  compatibility. An extension declares the oldest host it supports through its `min-host-version`
  requirement, and Cove reports the current value on `GET /api/system/status` (the
  `contractVersion` field) so tooling can compare the two without guessing.
- **Frontend runtime contract version.** The `v1` / `v2` string that identifies the shape of the
  browser runtime import map (the set of shared modules the host provides to extension bundles,
  such as the UI framework and data-fetching client). A frontend bundle targets one runtime
  contract version; the host serves the import map for the versions it still supports.

A backend-only extension pins only the host contract version. An extension that ships a frontend
bundle pins both: the host contract version for its server-side code and the runtime contract
version for its bundle.

## `@cove/types` versioning

`@cove/types` is generated only — it is produced from the host's DTOs and enums and is never
hand-edited. It tracks the host contract version: a host release `x.y.z` publishes
`@cove/types@x.y.*`, so choosing the types package for a host version is unambiguous.

- **Additive changes are non-breaking.** A new optional DTO field or a new enum member is a minor
  change; existing extensions keep compiling and running.
- **Breaking changes bump the version accordingly.** Removing or renaming a field, changing a
  field's type, or removing an enum member is a breaking change and is reflected in the semver
  bump of both the host contract version and the matching `@cove/types` release.

Extensions should depend on the `@cove/types` line that matches the oldest host they support, and
rely on additive-only changes within that line.

## `@cove/extension-sdk` versioning

`@cove/extension-sdk` is the author-facing SDK. Its public surface is gated in continuous
integration (the exported API is extracted and compared, so an unintended change to the public
surface fails the build). The SDK's major and minor versions track the host contract version, and
each SDK release depends on the matching `@cove/types` release.

- The SDK never widens its public API silently; any addition or removal is an intentional,
  reviewed version change.
- Pinning an SDK version therefore pins a known host-contract baseline and a known `@cove/types`
  baseline together.

## Support window and deprecation

Cove supports the **current and the immediately previous** frontend runtime contract version. When
a runtime contract version is scheduled for removal, it first enters a deprecation window:

- The version to be removed is announced as deprecated for at least **one minor release** before it
  is dropped. During that window it continues to load.
- While a version is deprecated (that is, it is the previous supported version, `N-1`), the host
  still serves it, and negotiation emits a **warning** so authors have time to migrate.
- Once a version falls below the minimum supported runtime contract version, negotiation
  **rejects** bundles that target it; they no longer load.

The host contract version follows ordinary semver expectations: additive backend changes are
minor, breaking backend changes are major, and an extension's `min-host-version` is honored against
the reported contract version.

## How negotiation surfaces to authors

Compatibility is checked at two points, and both quote the host version and the required floor so
the fix is obvious:

- **Install time.** Installing an extension whose `min-host-version` is above the host's contract
  version is refused with a clear error stating the required minimum and the current host version.
- **Load time.** On a released host, an installed extension whose `min-host-version` exceeds the
  host contract version is disabled at startup with an actionable message naming both the host
  version and the required floor, rather than being allowed to initialize in an unsupported state.
  On a development build of the host, the same mismatch is reported as a warning only and the
  extension still loads, so work against a not-yet-released host is never blocked. An unparseable
  requirement is treated as unsatisfied and never crashes the host.

In short: match your `@cove/types` and `@cove/extension-sdk` versions to the oldest host you intend
to support, set `min-host-version` to that host's contract version, and target a currently
supported frontend runtime contract version. Negotiation will then either load your extension or
tell you exactly which version to change.
