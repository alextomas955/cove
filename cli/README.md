# Cove CLI

Cove CLI is an experimental command-line client for Cove's REST API.

> [!WARNING]
> This is an alpha-quality tool. Expect incomplete features and breaking changes, and do not rely on it for critical workflows. It is not distributed through package managers or as a prebuilt release; build it from source.

## Build and install

Building requires [Bun](https://bun.sh/) 1.4 or newer. From the repository checkout:

```sh
cd cli
bun install --frozen-lockfile
mkdir -p ~/bin
bun build src/index.ts --compile --outfile="$HOME/bin/cove-cli"
chmod +x ~/bin/cove-cli
```

Ensure `~/bin` is on your `PATH`. For the current shell:

```sh
export PATH="$HOME/bin:$PATH"
```

Add that export to your shell configuration to make it persistent, then verify the installation:

```sh
cove-cli --version
cove-cli --help
```

## Use

The built-in help is the command reference:

```sh
cove-cli --help
cove-cli help <command>
cove-cli help <command> <subcommand>
```

For example, use `cove-cli help videos list` to see the available video filters, sorting, pagination, and output options.

Create and update a video worklist:

```sh
cove-cli videos filters add-ids "Selected videos" 42 67 91
cove-cli videos list --saved-filter "Selected videos"
cove-cli videos filters remove-ids "Selected videos" 42
```

Removing the last video ID deletes the saved filter.

Organize tags into tag groups by name or ID:

```sh
cove-cli tag-groups create Season --color "#6ee7b7"
cove-cli tags set-group Season Summer Winter
cove-cli tags clear-group Winter
cove-cli tag-groups update Season --name Seasons --description ""
cove-cli tag-groups delete Seasons --yes
```

An empty `--description` or `--color` clears it. Deleting a tag group keeps its tags and leaves them ungrouped.

Create a group by name and delete it by ID:

```sh
cove-cli groups create "Road Trip" --description "Summer drive" --date 2026-07
cove-cli groups delete 42 --yes
```

Deleting a group keeps the videos and other records it held.

Add records to a static group by type and ID, then reorder or remove them by their group item ID:

```sh
cove-cli groups items add 42 video 7 8 9
cove-cli groups items add 42 image 15 --first
cove-cli groups items list 42
cove-cli groups items move 42 103 --to-position 2
cove-cli groups items remove 42 103
```

New items go at the end unless `--first` or `--to-position` is given. Every ID is checked before anything is added or removed, so an unknown ID leaves the group unchanged. Removing an item keeps the record itself in the library.

Authenticate interactively with a Cove server:

```sh
cove-cli auth login --server https://cove.example --username user
```

For automation, provide an API token without saving a profile:

```sh
COVE_SERVER=https://cove.example COVE_TOKEN=... cove-cli auth status --json
```

Run `cove-cli help auth login` for all authentication options. Configuration is stored in the platform configuration directory. Set `COVE_CONFIG_DIR` to override its location.

Issue API tokens for the signed-in identity, optionally scoping one below your own permissions:

```sh
cove-cli tokens create agent --scope viewer
cove-cli tokens create ci --scope videos.read,images.read --expires 2026-12-31T00:00:00Z
cove-cli tokens list
cove-cli tokens revoke agent
```

A token acts as its owner. Its effective permissions are the intersection of the owner's current permissions and the token's scope, so a scope can only remove access relative to its owner, never add it; Cove refuses to issue a token whose scope exceeds its owner. `--scope viewer` is a read-only preset, and `--scope` otherwise takes permission keys, repeated or comma-separated. The plaintext token is shown once at creation and never again.

Cove expands implied permissions, so a scope key also grants what it implies: `--scope images.delete.file` reaches `images.delete` and `images.read` as well. List read keys only when a token should stay read-only. A scope that includes a permission the current identity does not hold is reported before the request is sent; in `--json` and `--jsonl` output a preset is never narrowed silently, so name the permissions explicitly when the identity holds only part of a preset.

## Develop

Run the CLI directly from the checkout:

```sh
cd cli
bun install
bun run src/index.ts --help
```

Available checks:

```sh
bun run typecheck
bun test
bun run build
bun run test:compiled
```
