#!/bin/bash
# Authored initdb step (NOT a vendored download). Loads the data a PRESENTED course needs on top of
# `shop`: every seed/talk/*.sql, in filename order.
#
# It runs only when SEED_TALK_DATA=1, which compose.app.yml sets — the file `just present` merges
# for a course shown from the lesson app. A lab started any other way skips it, so the courses that
# only need Pagila and `shop` do not pay for it (about 2 more minutes at first boot, about 6 GB).
#
# The entrypoint runs this file if it is executable and sources it if not; the first line below
# leaves quietly either way.
[ "${SEED_TALK_DATA:-0}" = 1 ] || { return 0 2>/dev/null || exit 0; }
for file in /docker-entrypoint-initdb.d/talk/*.sql; do
  echo "60-talk.sh: running $file"
  psql -v ON_ERROR_STOP=1 -X -q -U "$POSTGRES_USER" -d shop -f "$file"
done
