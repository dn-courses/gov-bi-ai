# Foundations: Git & Version Control

**Git** is the version-control system used by virtually every software and engineering team in the
world. It records the history of your project, lets you undo mistakes, work on several ideas in
parallel, and collaborate with other people without overwriting each other's work. This module
teaches Git from zero — no prior experience and no particular programming language required. Every
example runs with just `git` and a terminal.

## Before you start (pre-work)

Install Git and tell it who you are (your name and email are stamped onto every commit):

- **Windows:** install [Git for Windows](https://git-scm.com/download/win), or `winget install --id Git.Git -e`.
- **macOS:** `xcode-select --install` (ships with the Xcode command-line tools) or `brew install git`.
- **Linux:** `sudo apt-get install git` (Debian/Ubuntu) or `sudo dnf install git` (Fedora).

Then verify and configure:

```bash
git --version                                  # 2.30 or newer is ideal
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main    # name the first branch `main`
```

## What you'll learn

The module is built in three layers — start at the top and go as deep as your course takes you.

### Core (everyone)

1. **Introduction** — what version control is, Git's mental model (the three
   areas, snapshots vs. diffs), and first-time setup.
2. **[Basic commands](02-basic-commands.md)** — `init`, `status`, `add`, `commit`: the everyday loop,
   and how to write a good commit message.
3. **Viewing history** — `log`, `diff`, and `show`: see what changed, when,
   and why.
4. **Ignoring files** — `.gitignore`: keep secrets, build output, and large files
   out of version control.
5. **Undoing changes** — `restore`, `commit --amend`, and `revert`: fix
   mistakes safely.
6. **Branching** — work on an idea in isolation with `branch` and `switch`.
7. **Merging & conflicts** — combine branches with `merge` and resolve
   conflicts when they happen.
8. **Remotes** — `clone`, `push`, `pull`, `fetch`: back up your work and sync with a
   server like GitHub.

### Working with others

9. **Collaboration & pull requests** — the branch → PR → review → merge
   workflow teams use every day.
10. **History & search** — search and format the log, and understand how
    the three-way merge actually works.
11. **Git in your editor** — the Source Control panel, inline diffs, and
    visual conflict resolution in an IDE.

### Power user

12. **Recovery & rebase** — `reset`, `reflog`, `rebase`, and tags:
    rewrite and recover history without losing work.
13. **Workflows at scale** — branching strategies, CI/CD, protected
    branches, and commit conventions used by real teams.

> **Do it:** Git is learned by typing it. Every lesson ends with inline **Exercises**, and after each
> group of lessons a dedicated *exercises* lesson recaps the concepts with a longer hands-on workout —
> e.g. branching & merging walks you through building a small
> repository's history (commit → branch → commit → merge). There's nothing to grade: you run the
> commands in a terminal and confirm the result by reading Git's own output (`git status`, `git log
> --oneline --graph`, …).
