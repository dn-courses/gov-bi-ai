#!/usr/bin/env bash
# Idempotently fetch the Pagila dataset (schema + data) into ./seed/ so the postgres
# container can auto-load it via /docker-entrypoint-initdb.d/ on first boot.
# Skips files already present with the pinned checksum.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED="$HERE/seed"

# PINNED, never `master`. Upstream retargeted Pagila at PostgreSQL 18 in July 2026 (uuidv7()
# defaults, virtual generated columns, a pgvector table), so a `master` fetch aborts initdb on
# this lab's postgres:16 with `function uuidv7() does not exist` — and the container then comes
# up "healthy" on a half-loaded database. 5ba5a57 (2024-12-01) is the dataset the lessons were
# authored against. Bumping it means re-checking every lesson that reads Pagila.
REV="5ba5a57aeb159f75f02aca2432d3c262186d13d3"
RAW="https://raw.githubusercontent.com/devrimgunduz/pagila/$REV"

mkdir -p "$SEED"

# file  upstream-name  sha256 — a file whose hash differs (e.g. cached from an unpinned
# fetch) is re-downloaded rather than trusted for merely existing.
fetch() {
  local dest="$SEED/$1" src="$RAW/$2" want="$3"
  if [ -f "$dest" ] && [ "$(shasum -a 256 "$dest" | cut -d' ' -f1)" = "$want" ]; then
    return
  fi
  echo "Fetching $1..."
  curl -fsSL "$src" -o "$dest.part"
  if [ "$(shasum -a 256 "$dest.part" | cut -d' ' -f1)" != "$want" ]; then
    rm -f "$dest.part"
    echo "checksum mismatch for $src" >&2
    exit 1
  fi
  mv "$dest.part" "$dest"
}

fetch 01-pagila-schema.sql pagila-schema.sql 8ce358e4c8014087b85296694a0893887bd7a4190e3ce407f2721b86b98e5707
fetch 02-pagila-data.sql   pagila-data.sql   880580fb2cd4daaa99f290ced264988cdd657b3158be63cd281466f796f6dbf2

echo "Pagila seed ready in $SEED/"
