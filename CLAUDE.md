# Cloud Data & AI Agents for BI Developers — agent orientation

This is a **generated, self-contained course** (built from a master content repo). There is no build
pipeline here — everything you need is in this repo.

## Modules
- **Foundations: Docker** — level *minimal*
- **Foundations: Git & Version Control** — level *minimal*
- **Cloud Concepts: Why the Cloud** — level *minimal*
- **Cloud Data Services vs On-Prem Databases** — level *advanced*
- **Data Warehousing & Dimensional Modeling** — level *moderate*
- **Columnar Storage & MPP** — level *moderate*
- **AI Agent Development** — level *advanced*

## Two surfaces
- **Read:** `just docs` → MyST site at http://localhost:3000 (Jupyter at :8888).
- **Do:** your code lives in **`/workspace/hands-on/`** (gitignored scratch). Exercise stubs are
  copied there on container start. Never edit files under `materials/` — that's the generated read
  surface.

## Labs
Bring a lab up from the shell (the single source of truth): `just lab agents`, `just lab postgres`. Each lab ships a
`labs/<lab>/CLAUDE.md` with its connection details. Run exercise tests with `just check`.

## Auth
Claude Code signs in interactively, inside the container, against your own subscription — run it and
follow the prompt. Nothing reads a key for it, and the host's own Claude Code config is never
touched. Re-auth after a rebuild is expected.

Provider keys that exercises need (e.g. `OPENAI_API_KEY`) go in `.env` and are forwarded to the
workspace. A variable you leave unset stays unset in the container rather than arriving empty.
