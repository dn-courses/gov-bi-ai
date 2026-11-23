# Why Containers

## The "it works on my machine" problem

Software depends on its environment — the OS, installed libraries, versions, and configuration. When
those differ between your laptop, a teammate's machine, and production, the same code behaves
differently:

```bash
# Your laptop
$ python --version   # Python 3.13.1
$ pip show pandas    # 2.2.0

# Production server
$ python --version   # Python 3.10.6
$ pip show pandas    # 1.5.3   -> code that worked locally now breaks
```

Documentation ("install X, then Y, then set these env vars…") drifts and is easy to get wrong. We want
the environment itself to be **reproducible and shared**, not described in a README.

### Exercises

1. Run `python --version` (or `node --version`) on your machine and write down the exact version. Find
   a teammate's, a CI config's, or a production setting's version for the same tool. Name one library
   whose behavior could plausibly differ between those two versions.
2. Find a project README you've used that lists manual setup steps ("install X, set env var Y…"). Count
   the steps and flag any that are ambiguous or have already drifted out of date.
3. In two sentences, describe a time code behaved differently across two environments (or, if you
   haven't hit this yet, predict where it's most likely to bite you) and identify which part of the
   environment caused it.

## Containers: a reproducible, shared environment

A **container** packages an application together with everything it needs to run — runtime, libraries,
and dependencies — so it behaves the same everywhere. For this course that means: one definition of the
environment, and every student runs exactly that. No "which Python do you have?" — the answer is baked in.

Containers achieve isolation using Linux kernel features (namespaces and cgroups) rather than emulating
a whole machine. That makes them **fast** to start, **small** (megabytes, not gigabytes), and **dense**
(many on one host).

### Exercises

1. List three things a container packages alongside your application. For each, explain in a few words
   why leaving it out would reintroduce the "works on my machine" problem.
2. Containers isolate processes using Linux **namespaces** and **cgroups**. Write one sentence on what
   gets *isolated* from the host and one sentence on what gets *shared* with it.
3. Explain why "the environment is baked in" matters for a course where dozens of students run the same
   labs. What would go wrong without it?

## Containers vs. virtual machines

A virtual machine runs a *full guest operating system* on top of a hypervisor. A container *shares the
host's kernel* and isolates only the process.

| Aspect | Virtual machine | Container |
|---|---|---|
| Isolation | Full OS per instance | Process-level (shared kernel) |
| Startup | Minutes | Seconds |
| Size | Gigabytes | Megabytes |
| Portability | Large, hypervisor-specific | Small, runs anywhere Docker runs |

```
Virtual machines                     Containers
┌───────────────────────┐            ┌───────────────────────┐
│ App A │ App B │ App C  │            │ App A │ App B │ App C  │
│ Guest │ Guest │ Guest  │            │  libs │  libs │  libs  │
│  OS   │  OS   │  OS    │            ├───────┴───────┴────────┤
├───────┴───────┴────────┤            │   Container runtime    │
│      Hypervisor        │            ├────────────────────────┤
├────────────────────────┤            │  Host OS (one kernel)  │
│       Host OS          │            └────────────────────────┘
└────────────────────────┘
```

VMs still have their place (running a different OS, hardware-level security boundaries), and in practice
clouds often run containers *inside* VMs. But for reproducible dev environments and data pipelines,
containers are the standard.

### Exercises

1. Reproduce the four rows of the VM-vs-container table from memory (isolation, startup, size,
   portability), then check yourself against the lesson.
2. A container starts in seconds while a VM takes minutes. Explain the architectural reason, referring
   to the kernel.
3. Give one scenario where you would still choose a VM over a container, and justify it in one sentence.

## Why this matters for data engineering

A data pipeline typically wires together several services — a database, a message queue, a processing
engine, an API. Containers let you:

- **run production-like services locally** (Postgres, Redis, Kafka) without installing them permanently;
- **version your environment in Git** alongside the code (the container definition is just a file);
- **deploy consistently** — the image that passed testing is the image that runs in production.

That is exactly how this course is built: every lab is a container (or a few), brought up with one
command, identical for everyone.

### Exercises

1. Pick a data pipeline you've seen or can imagine and list the services it wires together (e.g.
   database, queue, processing engine, API). Mark the ones you'd rather not install permanently on your
   laptop.
2. Explain what "version your environment in Git" means, and why it's only possible because the container
   definition is a file.
3. Confirm your own setup is reproducible: run `docker version` and `docker run hello-world` (the
   pre-work in the module README). Note the success message — you'll rely on this working all course.

## Key takeaways

- Containers solve "works on my machine" by shipping the environment, not a description of it.
- They share the host kernel — far lighter than VMs (seconds to start, megabytes in size).
- For data engineering they make local development and production reproducible and shareable.

**Next:** Images & containers
