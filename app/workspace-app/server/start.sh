#!/usr/bin/env bash
# How the container starts: bring the built pages in step with the mounted sources (server/pages.ts,
# a no-op when the image was built from them), then serve them and run cells.
set -euo pipefail
source "$(dirname "$0")/google-project.sh"
pnpm exec tsx server/pages.ts
exec pnpm exec tsx server/index.ts
