# Cloud Data & AI Agents for BI Developers — generated course. Edit the master repo, not this file.

# Isolated compose project per course, derived from this course repo's own dir name. Without it, docker
# compose derives the project from the compose file's parent dir (labs/base -> "base"), so EVERY course's
# workspace stack shares one project named "base" — a second course collides on it and `up
# --remove-orphans` tears the other stack down. Deriving from the repo dir is the SAME rule the `./lab`
# and `measure` scripts use, so all three entry points drive one stack (override by exporting
# COMPOSE_PROJECT_NAME). Independent stacks then only contend on host ports, themselves overridable
# (MYST_PORT / MYST_SERVER_PORT / JUPYTER_PORT).
export COMPOSE_PROJECT_NAME := env_var_or_default('COMPOSE_PROJECT_NAME', file_name(justfile_directory()))

# Compose resolves `.env` from the PROJECT directory, and that directory defaults to the parent of
# the first `-f` file — `labs/base/`, not this repo root. So the `.env` you are told to create next
# to `.env.example` is never read, and a bare-passthrough variable like OPENAI_API_KEY reaches the
# container UNSET: every live cell dies on "Missing credentials" with a working key sitting two
# directories up. `--env-file` points compose at the root file without moving the project directory
# — moving it (`--project-directory .`) would re-resolve `context: ../..` and the /workspace bind
# mount against the wrong tree, which is a worse bug that fails later and less clearly.
#
# Conditional because compose exits 1 on an `--env-file` that does not exist, and a student who has
# not written one yet must still be able to read the lessons.
DOTENV := justfile_directory() / '.env'
ENV_FILE := if path_exists(DOTENV) == 'true' { '--env-file ' + DOTENV } else { '' }

BASE := ENV_FILE + ' -f labs/base/compose.yml'

# The same justfile is reachable from two places: the host (where a recipe drives docker) and the
# workspace container itself, which bind-mounts this repo at /workspace (the devcontainer, `just
# shell`, and the in-container agent all land there). Inside, `docker compose exec workspace …` is
# both a pointless round trip and broken — COMPOSE_PROJECT_NAME would derive from /workspace, naming
# a project that does not exist, and the student gets `service "workspace" is not running`. So
# recipes that only need a command run in the workspace run it directly when they are already there.
INSIDE := if path_exists('/.dockerenv') == 'true' { 'yes' } else { '' }

[private]
default:
    @just --list

# Guard for the recipes that manage the stack rather than run something in it. From inside the
# container these reach the host daemon over the mounted socket but resolve build contexts against
# the wrong filesystem — and `down` would tear down the very container you are typing in.
[private]
host-only:
    @test -z "{{INSIDE}}" || { echo "run this on the host — you are inside the workspace container" >&2; exit 1; }

# Read the lessons: MyST docs + Jupyter, no database.
docs: host-only
    docker compose {{BASE}} up -d --build --remove-orphans
    @echo "MyST docs: http://localhost:${MYST_PORT:-3000}   Jupyter: http://localhost:${JUPYTER_PORT:-8888}"

# Bring up a lab stack — one of: agents, postgres
lab name: host-only
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{name}}" in
      agents) bash labs/agents/fetch-seed.sh ;;
      postgres) bash labs/postgres/fetch-seed.sh ;;
      *) echo "unknown lab '{{name}}' — this course has: agents, postgres" >&2; exit 2 ;;
    esac
    docker compose {{BASE}} -f "labs/{{name}}/compose.yml" up -d --build --remove-orphans
    echo "lab {{name}} up"

# Present the course from the lesson app, beside one lab — one of: agents, postgres
present lab: host-only
    #!/usr/bin/env bash
    set -euo pipefail
    export SEED_TALK_DATA=0
    case "{{lab}}" in
      agents) files="-f labs/agents/compose.yml -f labs/agents/compose.app.yml"; bash labs/agents/fetch-seed.sh; ;;
      postgres) files="-f labs/postgres/compose.yml -f labs/postgres/compose.app.yml"; bash labs/postgres/fetch-seed.sh; ;;
      *) echo "unknown lab '{{lab}}' — this course has: agents, postgres" >&2; exit 2 ;;
    esac
    export APP_LAB={{lab}}
    export APP_IMAGE=me-west1-docker.pkg.dev/enjoytech-bq-lab/courses/gov-bi-ai:latest
    docker compose {{BASE}} $files -f labs/base/compose.app.yml pull workspace || echo "could not check for a newer image: using the one on this machine"
    docker compose {{BASE}} $files -f labs/base/compose.app.yml up -d --no-build --remove-orphans --force-recreate workspace
    echo "Lesson app: http://localhost:${APP_PORT:-3000}   lab: {{lab}}"

# (Re)materialize exercise stubs into /workspace/hands-on/.
hands-on:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -n "{{INSIDE}}" ]; then bash scripts/materialize-hands-on.sh
    else docker compose {{BASE}} exec -T workspace bash scripts/materialize-hands-on.sh; fi

# Non-destructive focus pointer: hands-on/_current -> <module>. Nothing is moved or deleted;
# every module's work stays in place. hands-on/ is bind-mounted, so the relative symlink resolves
# identically on the host and inside the container.

# Point hands-on/_current at a module, e.g. `just focus python`.
focus module:
    @test -d hands-on/{{module}} || { echo "no hands-on/{{module}} — run 'just hands-on' first?"; exit 1; }
    ln -sfn {{module}} hands-on/_current
    @echo 'focused: hands-on/_current -> {{module}}'

# Run the exercise tests against the live lab. Name one to run just that: `just check <exercise>`.
check target='':
    #!/usr/bin/env bash
    set -euo pipefail
    # No argument grades everything, which is the right answer for "am I done?" and the wrong one
    # while you are on the first of eight exercises — the one result you care about arrives buried
    # in every later exercise's failures. So a target narrows it, by exact name or by suffix.
    path=hands-on
    if [ -n "{{target}}" ]; then
        hits=$(ls -d hands-on/{{target}} hands-on/*/{{target}} hands-on/*/*{{target}} 2>/dev/null | sort -u || true)
        n=$(printf '%s' "$hits" | grep -c . || true)
        if [ "$n" != 1 ]; then
            # `|| true` twice over: with pipefail a `ls` that matches nothing fails the pipeline,
            # and set -e would kill the recipe here with a bare exit 1 — before the message that
            # explains what went wrong ever printed.
            echo "'{{target}}' matched $n hands-on targets. Pick one of:" >&2
            { ls -d hands-on/*/*/ 2>/dev/null || echo "  (nothing yet — run 'just hands-on')"; } |
                sed 's|^hands-on|  hands-on|' >&2 || true
            exit 2
        fi
        path=$hits
    fi
    if [ -n "{{INSIDE}}" ]; then pytest -q "/workspace/$path"
    else docker compose {{BASE}} -f labs/agents/compose.yml -f labs/postgres/compose.yml exec -T workspace pytest -q "/workspace/$path"; fi

# Stop the stack, keeping data.
down: host-only
    docker compose {{BASE}} -f labs/agents/compose.yml -f labs/postgres/compose.yml down

# Stop the stack and delete its data volumes.
reset: host-only
    docker compose {{BASE}} -f labs/agents/compose.yml -f labs/postgres/compose.yml down -v --remove-orphans

# Open a shell in the workspace container.
shell:
    #!/usr/bin/env bash
    # One shell for the whole recipe, deliberately: just runs each line of a plain recipe in its
    # OWN shell, so a guard line that calls `exit` ends only that line and the next one runs anyway.
    if [ -n "{{INSIDE}}" ]; then echo "you are already in the workspace container"; exit 0; fi
    exec docker compose {{BASE}} exec workspace bash
