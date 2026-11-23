# Foundations: Docker

Everything in this course runs in **containers** so that everyone — on Windows, macOS, or Linux —
works in the exact same, reproducible environment. This module gives you just enough Docker to be
productive in that shared environment for the rest of the course. The Linux command line you use *inside*
those containers is its own short module (**Linux**), taught right after this one.

## Before you start (pre-work)

Install Docker so the labs can run on your machine:

- **Windows:** install **WSL2** first (`wsl --install` in an admin PowerShell, then reboot), then
  install **Docker Desktop** and enable the WSL2 backend.
- **macOS:** install **Docker Desktop** (Apple-silicon or Intel build to match your chip).
- **Linux:** install **Docker Engine** + the **Compose** plugin from your distro's instructions.

Verify it works:

```bash
docker version          # client + server (daemon) both reported
docker run hello-world   # pulls a tiny image and prints a success message
```

## What you'll learn

1. **[Why containers](01-why-containers.md)** — the "works on my machine" problem, and how containers
   give a reproducible, shared environment (and how they differ from virtual machines).
2. **Images & containers** — pull, run, and `exec` into a container;
   the container lifecycle.
3. **Volumes & ports** — persisting data and exposing services on the network.
4. **Building images** — writing a Dockerfile and `docker build`-ing your own
   image, with layers and the build cache.
5. **Docker Compose** — the multi-service, reproducible dev environment we use
   all course.

> **Do it:** each lesson ends each concept with a short set of **exercises** — run them against your own
> Docker install as you read. They're hands-on by design; there's no separate grader to run.
