# Cloud Data & AI Agents for BI Developers

## Start the lesson app

This course is taught from the lesson app: pages with pictures you step through and cells you run.
It needs **Docker Desktop** (running) and **Git**, and nothing else.

1. Put the key file you were given into this folder as `secrets/bigquery-key.json`, and a `.env`
   too if you were given one.
2. Start the app beside the lab the lesson uses:

   ```
   .\present agents          Windows (Command Prompt or PowerShell)
   just present agents        macOS or Linux, with `just` installed
   ```

Labs: agents, postgres. One runs at a time; starting another replaces it.

3. Open <http://localhost:3000>.

The first start downloads the app (about 400 MB); later ones take seconds. To get new or
corrected pages: `git pull`, then the same command again. To stop: `docker compose -p gov-bi-ai down`.

The rest of this page is the course's other way in: the lessons as a MyST site, with Jupyter.

## Prerequisites

Docker, VS Code, and [`just`](https://just.systems) — the task runner every command below goes
through. These run from your own machine, so `just` is installed there, not in the container:

```bash
brew install just                  # macOS
sudo apt install just              # Debian/Ubuntu
winget install --id Casey.Just     # Windows
```

## Start

Open in VS Code and **Reopen in Container**, then:

```bash
just docs            # read the lessons (http://localhost:3000)
just lab agents
just lab postgres            # start the database lab
just check           # run the exercise tests
```

`just --list` shows everything else this course can do.

Your work goes in `/workspace/hands-on/` (gitignored). See `CLAUDE.md` for agent guidance.
