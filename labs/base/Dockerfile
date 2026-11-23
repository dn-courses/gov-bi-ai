FROM python:3.13-slim

# System deps + Docker CLI + JRE
# gnupg/ca-certificates: required to verify and trust the Docker apt repo signing key
# curl: used to download the Docker GPG key
# git, build-essential, nodejs, npm: toolchain for MyST and native Python extensions
# openjdk-21-jre-headless: required by any JVM-backed Python package (pyspark, etc.)
#                          — used by the streaming lab; harmless overhead (~250MB) elsewhere.
#                          21 is the current LTS and what Trixie's main repo ships
#                          (17 was dropped). Spark 4 supports Java 17 / 21.
#
# Docker CLI setup (docker-ce-cli only — no daemon, no containerd):
#   install -m 0755 -d /etc/apt/keyrings   — creates the keyrings dir with correct permissions
#   curl ... | gpg --dearmor               — downloads and converts Docker's GPG key to binary format
#   echo "deb ..."                         — registers the official Docker apt repo for this arch/distro
#   apt-get install docker-ce-cli          — installs only the CLI; the actual daemon runs on the host
#                                            and is reached via the /var/run/docker.sock volume mount,
#                                            allowing `docker exec` into other lab containers from workspace
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential \
    nodejs \
    npm \
    gnupg \
    ca-certificates \
    openjdk-21-jre-headless \
    postgresql-client \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor \
        -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/debian bookworm stable" \
        > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# just — the task runner every course command goes through. Students run it on the host, but the
# in-container agent drives the same recipes over the mounted docker socket, so it belongs in the image
# too. Debian bookworm's main repo has no `just` (it lives in backports), so this takes the upstream
# prebuilt binary, pinned: an unpinned installer would silently change the tool between image builds.
ARG JUST_VERSION=1.57.0
RUN curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh \
    | bash -s -- --tag "${JUST_VERSION}" --to /usr/local/bin \
    && just --version

# Install MyST CLI (Node-based). Pinned: the site theme is pinned to a commit verified against this
# version (BOOK_THEME in scripts/builder/myst.py), and the two must be bumped together.
ARG MYSTMD_VERSION=1.11.0
RUN npm install -g "mystmd@${MYSTMD_VERSION}"

# Claude Code CLI — the in-container agent surface for live coding and exercises.
# Auth happens at runtime, by interactive login against the student's own subscription, inside the
# container. No credential is ever baked into the image and none is read from the host.
# Master builds track `latest`; per-cohort exports pin CLAUDE_CODE_VERSION as part of the
# toolchain-freeze so a course re-run later still resolves the same tool.
ARG CLAUDE_CODE_VERSION=latest
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

# Install uv for fast Python package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /workspace

# Install base Python deps (Jupyter) from labs/base/pyproject.toml
COPY labs/base/pyproject.toml /tmp/base-deps/pyproject.toml
RUN uv pip install --system /tmp/base-deps/

# Per-lab extension axis. LAB is set by the lab's compose.yml (workspace.build.args.LAB) and
# defaults to "base". We bake it into the image as ENV so init.sh can dispatch to the lab's runtime
# hook (labs/<LAB>/init.sh) at startup.
ARG LAB=base
ENV LAB=${LAB}

# Pull the lab's optional build inputs into /tmp/lab/:
#   * pyproject.toml — per-lab Python deps (every lab has one; base's is the no-op default).
#   * setup.sh       — OPTIONAL build-time hook (extra apt packages, etc). A lab that needs nothing
#                      extra ships no setup.sh; the `setup.sh*` glob then matches nothing, which is
#                      allowed only because pyproject.toml is a guaranteed match in the same COPY
#                      (Docker fails a COPY only when NO source resolves).
COPY labs/${LAB}/pyproject.toml labs/${LAB}/setup.sh* /tmp/lab/
RUN uv pip install --system /tmp/lab/ 2>/dev/null || true
RUN [ -f /tmp/lab/setup.sh ] && bash /tmp/lab/setup.sh || true

# Register Jupyter kernel
RUN python -m ipykernel install --sys-prefix --name python3 --display-name "Python 3"

# Allow Jupyter servers to run as root. The container runs as root, and MyST's headless cell
# executor (`myst build --execute`) launches its OWN managed Jupyter server WITHOUT passing
# `--allow-root`, so without this config that server refuses to start and every executable cell
# is skipped. `procps` (`ps`) is required by MyST to track that child server process.
RUN apt-get update && apt-get install -y --no-install-recommends procps \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /root/.jupyter \
    && echo "c.ServerApp.allow_root = True" > /root/.jupyter/jupyter_server_config.py
