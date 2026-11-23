#!/usr/bin/env bash
# ADK's dev UI over the agents folder the lesson cells write to. Each agent is a folder there with
# an agent.py that defines `root_agent`; a new or changed one is picked up without a restart.
set -euo pipefail
source "$(dirname "$0")/google-project.sh"
mkdir -p "$AGENTS_DIR"
cd "$AGENTS_DIR"
exec adk web --host 0.0.0.0 --port 8000 --reload_agents .
