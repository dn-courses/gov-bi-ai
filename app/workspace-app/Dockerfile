# The workspace app: lesson pages with runnable SQL, Python and shell cells, served on one port.
# Build from materials/ (the pages embed widgets from materials/widgets):
#   docker build -f workspace-app/Dockerfile -t workspace-app .
FROM node:24-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Python for the cells, at the version the labs' workspace image runs (labs/base/Dockerfile), so a
# lesson's code behaves the same in either. uv brings it: this base image's own Python is older.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
ENV UV_PYTHON_INSTALL_DIR=/opt/python VIRTUAL_ENV=/opt/cells PATH=/opt/cells/bin:$PATH
RUN uv python install 3.13 && uv venv --python 3.13 /opt/cells

WORKDIR /app/workspace-app
# What cells import: the app's own list, and the packages of the course's labs
# (requirements-labs.txt, written by the build from each lab's pyproject.toml; absent on the
# source tree).
COPY workspace-app/requirements*.txt ./
# `set -e`: a list that fails to install (a download that times out) fails the build, not just that list.
RUN set -e; for list in requirements*.txt; do uv pip install --no-cache -r "$list"; done

# pnpm at the version package.json pins. Installed with npm because Corepack no longer ships with
# Node from 25 on, so `corepack enable` would break on the next base-image bump.
RUN npm install -g pnpm@10.34.9
COPY workspace-app/package.json workspace-app/pnpm-lock.yaml workspace-app/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY widgets /app/widgets
COPY workspace-app ./
# Builds the pages and records which sources they were built from (server/pages.ts).
RUN pnpm exec tsx server/pages.ts

# Where cells run: the lab's database comes from PG* variables set when the container starts.
ENV PORT=3000 WORKSPACE_DIR=/work
RUN mkdir -p /work
EXPOSE 3000
CMD ["bash", "server/start.sh"]
