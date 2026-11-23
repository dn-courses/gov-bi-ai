# Basic Commands

These four commands — `init`, `status`, `add`, `commit` — are the loop you'll run dozens of times a
day. Master them and you can use Git.

## The everyday loop

```
   edit files          git add            git commit
working directory  ──►  staging area  ──►  repository  ──►  (repeat)
```

You **edit** files, **stage** the changes you want to keep, and **commit** them as a snapshot. Then you
do it again.

## Starting a repository — `git init`

Turn any folder into a Git repository:

```bash
mkdir my-project
cd my-project
git init
# Initialized empty Git repository in /path/to/my-project/.git/
```

That created a hidden `.git` folder. It holds the entire history; the rest of the folder is your
working directory. Delete `.git` and you keep your files but lose the history. That's the whole repo.

You can also name the starting branch as you create the repo, in one step:

```bash
git init -b main      # start a repo *and* name its first branch `main`
```

This is the same `main` you'd otherwise get from the `init.defaultBranch` setting in lesson 01 — `-b`
just sets it for this one repo. (Older Git versions without `-b` default the first branch to `master`.)

## Checking state — `git status`

`git status` is the command you'll run most. It always tells you where you are and what to do next.

```bash
git status
# On branch main
#
# No commits yet
#
# nothing to commit (create/copy files and use "git add" to track)
```

Create a file and look again:

```bash
echo "Hello, Git!" > notes.txt
git status
# Untracked files:
#   (use "git add <file>..." to include in what will be committed)
#         notes.txt
```

`notes.txt` exists in your working directory, but Git isn't tracking it yet. **Untracked** means "Git
sees this file but is not recording its history." To start tracking it, you stage it.

> **Tip:** run `git status` constantly — between every step. It removes all guesswork.

## Staging changes — `git add`

Staging is how you choose *exactly* what goes into the next commit:

```bash
git add notes.txt
git status
# Changes to be committed:
#   (use "git restore --staged <file>..." to unstage)
#         new file:   notes.txt
```

The file is now **staged**. Common ways to stage:

```bash
git add notes.txt        # one specific file
git add docs/            # everything in a directory
git add .                # everything new or changed in the current directory and below
```

Why a separate staging step at all? Because you often make several unrelated changes at once but want
to record them as *separate, focused* commits. Staging lets you commit just the part that belongs
together now, and the rest later.

## Recording a snapshot — `git commit`

A commit permanently records whatever is staged, with a message describing it:

```bash
git commit -m "Add project notes"
# [main (root-commit) a3f2b1c] Add project notes
#  1 file changed, 1 insertion(+)
```

You just created your first commit — a snapshot identified by the hash `a3f2b1c`.

### The full cycle

```bash
echo "A second line." >> notes.txt   # 1. edit
git status                           # 2. see "modified: notes.txt"
git add notes.txt                    # 3. stage
git commit -m "Add a second line to notes"   # 4. commit
git status                           # 5. "nothing to commit, working tree clean"
```

"**Working tree clean**" means your working directory matches the last commit — nothing is waiting to
be saved.

### Exercises

1. In an empty folder, run `git init`, then `git status`. Create a file, run `git status` again, and
   describe what the word **untracked** means for that file.
2. Stage the file with `git add`, run `git status`, then commit it. Run `git status` once more and
   explain what changed in the output at each of those three points.
3. Edit the same file, then run `git add` but **don't** commit yet. Run `git status` and identify which
   section the file is listed under. Now make a *second* edit to the same file (without re-staging) and
   run `git status` again — explain why the one file now appears in two sections at once.

## Writing good commit messages

A commit message is a note to your future self and your teammates. Compare:

```bash
# Vague — useless in six months
git commit -m "stuff"
git commit -m "fix"
git commit -m "update"

# Clear — you'll know exactly what each one did
git commit -m "Add input validation to the signup form"
git commit -m "Fix off-by-one error in the date range filter"
git commit -m "Rename config option timeout -> request_timeout"
```

Guidelines that hold up everywhere:

1. **Use the imperative mood** — "Add feature", not "Added feature". (It reads as "this commit will
   *add feature*".)
2. **Keep the summary line short** — aim for ~50 characters.
3. **Say *why*, not just *what*** — the diff already shows what changed; the message explains the
   reason. For anything non-obvious, add a longer body:

```bash
git commit -m "Retry the upload up to three times

The upload failed intermittently on slow networks. Retrying with a short
backoff fixes it without changing the public interface."
```

(Running `git commit` with no `-m` opens your editor so you can write a multi-line message comfortably.)

## Atomic commits — one logical change each

Keep each commit focused on a single idea:

```bash
# Hard to review, hard to undo — four unrelated things in one commit
git commit -m "Add logging, fix a bug, rename files, update docs"

# Easy to review, easy to undo any one piece
git commit -m "Add logging around the import step"
git commit -m "Fix crash on an empty input file"
git commit -m "Update the README with setup steps"
```

Small, focused commits are easier to review, easier to revert, and produce a history that actually
tells the story of the project.

### Exercises

1. Rewrite each of these vague messages into a clear, imperative one (you'll have to invent a plausible
   *why*): `"stuff"`, `"fix"`, `"wip"`, `"changes"`.
2. Make two genuinely unrelated edits in a repo (e.g. add a line to one file and fix a typo in
   another). Stage and commit them as **two separate** commits with focused messages — using `git add`
   on only one path at a time. After each `git commit`, read Git's confirmation line (it echoes your
   message and a short hash), then run `git status` and confirm the tree is clean between commits.
3. Run `git commit` with **no** `-m`. Your editor opens; write a summary line, a blank line, and a
   one-sentence body explaining *why*, then save and close. Explain when a multi-line body is worth the
   extra effort over a one-line `-m`.

## Useful staging shortcuts

```bash
git add -A                 # stage everything: new, modified, and deleted files
git commit -am "message"   # stage all *already-tracked* changes and commit in one step
git diff --staged          # review exactly what you're about to commit (next lesson)
```

`commit -am` is handy but skips your chance to review — and it never includes brand-new files. Use it
only when you're sure.

## Key takeaways

- **`git init`** — start tracking a folder.
- **`git status`** — see the current state; run it constantly.
- **`git add`** — stage the changes you want in the next commit.
- **`git commit -m "…"`** — record a snapshot with a message.
- Write **clear, imperative** commit messages that explain *why*.
- Prefer **atomic** commits: one logical change per commit.

**Next:** Viewing history — read back what you've recorded.
