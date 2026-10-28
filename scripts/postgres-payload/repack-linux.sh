#!/usr/bin/env bash
# Repacks the PGDG PostgreSQL packages into the portable payload Cove downloads on Linux.
#
# Runs inside the oldest distribution Cove supports (see build-postgres-payload.yml), so the
# binaries and every shared library they need, except glibc itself, come from that one baseline
# and the payload runs on any later glibc. The layout matches what PostgresManagerService expects
# under <cove home>/pgsql: bin/, lib/ (pkglibdir plus runtime libraries) and share/.
#
# Usage: repack-linux.sh <pg major> <pg version> <rid> <output dir>
set -euo pipefail

PG_MAJOR="$1"
PG_VERSION="$2"
RID="$3"
OUTPUT_DIR="$(mkdir -p "$4" && cd "$4" && pwd)"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl gnupg lsb-release

install -d -m 0755 /usr/share/postgresql-common/pgdg
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
codename="$(lsb_release -cs)"
# apt.postgresql.org keeps only the newest few builds of each major. apt-archive.postgresql.org keeps
# every build ever published, signed with the same key, so the pinned version stays installable
# after PGDG moves on (the Windows and macOS payloads pin their EDB builds the same way).
{
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${codename}-pgdg main"
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt-archive.postgresql.org/pub/repos/apt ${codename}-pgdg-archive main"
} > /etc/apt/sources.list.d/pgdg.list
apt-get update

# The Debian package version for the requested PostgreSQL version, e.g. 18.3 -> 18.3-1.pgdg22.04+1.
deb_version="$(apt-cache madison "postgresql-${PG_MAJOR}" | awk -v want="${PG_VERSION}-" 'index($3, want) == 1 { print $3 }' | sort -V | tail -1)"
if [[ -z "$deb_version" ]]; then
  echo "PGDG has no postgresql-${PG_MAJOR} ${PG_VERSION} build for $(lsb_release -ds). Available versions:" >&2
  apt-cache madison "postgresql-${PG_MAJOR}" | awk '{ print "  " $3 }' | sort -uV >&2
  exit 1
fi

# postgresql-common would otherwise create a cluster in the container during install.
mkdir -p /etc/postgresql-common
echo "create_main_cluster = false" > /etc/postgresql-common/createcluster.conf
# libpq5 is built from the same source package; pin it too so the bundled libpq matches the server.
apt-get install -y --no-install-recommends "postgresql-${PG_MAJOR}=${deb_version}" "postgresql-client-${PG_MAJOR}=${deb_version}" "libpq5=${deb_version}"

installed="$(dpkg-query -W -f='${Version}' "postgresql-${PG_MAJOR}")"
case "$installed" in
  "${PG_VERSION}-"*) ;;
  *) echo "Installed postgresql-${PG_MAJOR} ${installed} but ${PG_VERSION} was requested." >&2; exit 1 ;;
esac

work="$(mktemp -d)"
payload="$work/payload"
mkdir -p "$payload/lib"
cp -a "/usr/lib/postgresql/${PG_MAJOR}/bin" "$payload/bin"
cp -a "/usr/lib/postgresql/${PG_MAJOR}/lib/." "$payload/lib/"
cp -a "/usr/share/postgresql/${PG_MAJOR}" "$payload/share"

# JIT needs libLLVM (over 100 MB); Cove runs PostgreSQL with jit = off.
rm -f "$payload/lib/llvmjit.so" "$payload/lib/llvmjit_types.bc"
rm -rf "$payload/lib/bitcode"

# Every shared library the binaries and extension modules need, except what glibc itself provides.
# The dynamic loader is part of glibc too, so the payload loads against the host's libc.
is_glibc() {
  case "$(basename "$1")" in
    libc.so.*|libm.so.*|libdl.so.*|libpthread.so.*|librt.so.*|libresolv.so.*|libutil.so.*|libnsl.so.*|libanl.so.*|libnss_*.so.*|libBrokenLocale.so.*|ld-linux*.so.*|linux-vdso.so.*) return 0 ;;
    *) return 1 ;;
  esac
}

declare -A copied=()
queue=()
while IFS= read -r -d '' file; do queue+=("$file"); done < <(find "$payload/bin" "$payload/lib" -type f \( -perm -u+x -o -name '*.so*' \) -print0)
while ((${#queue[@]})); do
  file="${queue[0]}"; queue=("${queue[@]:1}")
  while IFS= read -r dep; do
    [[ -n "$dep" ]] || continue
    name="$(basename "$dep")"
    if is_glibc "$dep" || [[ -n "${copied[$name]:-}" ]] || [[ -e "$payload/lib/$name" ]]; then
      copied[$name]=1
      continue
    fi
    # Copy the resolved file under the soname so the loader finds it, then follow its own deps.
    cp -L "$dep" "$payload/lib/$name"
    copied[$name]=1
    queue+=("$payload/lib/$name")
  done < <(ldd "$file" 2>/dev/null | awk '/=> \// { print $3 }')
done

chmod -R u+rwX,go+rX "$payload"
archive="$OUTPUT_DIR/postgres-${PG_VERSION}-${RID}.tar.gz"
tar -C "$payload" --owner=0 --group=0 --numeric-owner -czf "$archive" .
(cd "$OUTPUT_DIR" && sha256sum "$(basename "$archive")" > "$(basename "$archive").sha256")

echo "Created $archive ($(du -h "$archive" | cut -f1)) with $(ls "$payload/lib" | wc -l) files in lib/"
echo "Baseline: $(lsb_release -ds), glibc $(ldd --version | head -1 | awk '{print $NF}'), postgresql-${PG_MAJOR} ${installed}"
