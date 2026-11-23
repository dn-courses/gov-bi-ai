#!/usr/bin/env bash
# Copy exercise stubs + sandbox scaffolds into the gitignored /workspace/hands-on/ scratch area,
# copy-if-absent so student work is never clobbered on rebuild/restart.
set -euo pipefail
mkdir -p /workspace/hands-on

# Serialize concurrent runs. This script is invoked from BOTH the container's startup command
# (labs/base/init.sh) and on demand (`just check`, and the runtime suite's `compose exec`) — and
# `compose up -d` returns when the container STARTS, not when init.sh finishes, so the two overlap
# routinely.
#
# The lock lives on the CONTAINER filesystem, deliberately NOT under /workspace: /workspace is a
# bind mount, and flock there is a silent no-op (measured — a second holder acquires instantly
# instead of blocking). A lock file sitting next to the data would look correct and protect
# nothing. /run is container-local, where flock genuinely blocks, and that covers the real case:
# two processes inside this one container.
#
# The lock buys callers a guarantee worth having — when this script returns, materialization is
# COMPLETE, not merely started by somebody else. It is not what makes the copy safe, though:
# `install_once` below is correct even when the lock does nothing at all.
exec 9>/run/materialize-hands-on.lock
flock 9

# Claim $dest for $src atomically, or leave whatever is already there untouched.
#
# Copy-if-absent is check-then-act, so it cannot be made safe by testing `-e` harder. Each caller
# instead copies into a private temp dir and renames it into place: rename is atomic, so exactly one
# racer wins and a loser never writes a byte inside the winner's tree. Both failure modes this
# replaces were real, and both were silent:
#   * `cp -R "$src" "$dest"` means "copy the directory TO dest" only while dest is absent; the
#     instant dest exists the very same command means "copy it INSIDE dest", yielding
#     hands-on/<module>/<id>/<id>/ — two identically-named test files, and a pytest "import file
#     mismatch" that aborts collection before a single exercise runs.
#   * Two plain `cp`s writing one tree race per file and die with "cannot create regular file:
#     File exists", failing a run the harness asserts is clean.
install_once() {
  local src="$1" dest="$2" label="$3" parent tmp
  if [ -e "$dest" ]; then echo "skip $label (exists — student work preserved)"; return 0; fi
  parent="$(dirname "$dest")"
  mkdir -p "$parent"
  # Temp dir is a sibling of dest so the rename stays within one filesystem.
  tmp="$(mktemp -d "$parent/.tmp-XXXXXX")"
  # $src ends in `/`, so "$src". is the source's own entries — its contents, not the directory.
  cp -R "$src". "$tmp"/
  if mv -T "$tmp" "$dest" 2>/dev/null; then echo "materialized $label"
  else rm -rf "$tmp"; echo "skip $label (materialized concurrently)"; fi
}

# Exercises are grouped by owning module: /workspace/exercises/<module>/<id> mirrors
# /workspace/materials/<module>/ so hands-on/<module>/<id> is easy to navigate.
for mod in /workspace/exercises/*/; do
  [ -d "$mod" ] || continue
  module="$(basename "$mod")"
  for ex in "$mod"*/; do
    [ -d "$ex" ] || continue
    name="$(basename "$ex")"
    install_once "$ex" "/workspace/hands-on/$module/$name" "$module/$name"
  done
done

# Project stages: /workspace/projects/<project>/<stage> -> hands-on/<project>/<stage>. A stage is
# rolled forward into the repo the student already owns, so this is a convenience copy of the brief +
# the acceptance tests, not the place the work happens.
for proj in /workspace/projects/*/; do
  [ -d "$proj" ] || continue
  project="$(basename "$proj")"
  for st in "$proj"*/; do
    [ -d "$st" ] || continue
    name="$(basename "$st")"
    install_once "$st" "/workspace/hands-on/$project/$name" "$project/$name"
  done
done

# Sandbox scaffolds (course-selected reusable practice projects) land under hands-on/sandbox/<name>.
for sb in /workspace/sandbox/*/; do
  [ -d "$sb" ] || continue
  name="$(basename "$sb")"
  install_once "$sb" "/workspace/hands-on/sandbox/$name" "sandbox/$name"
done
