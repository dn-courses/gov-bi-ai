// ramp-git-loop — the everyday loop (edit, add, commit) as a file crossing Git's three areas, with
// the terminal that goes with each move. Every terminal line is real output: git 2.47.3 in a clean
// container, commands run in this order on 2026-11-21. Blank lines are dropped; nothing is reworded.
// The two commit hashes are that run's; everyone's own run prints different ones.
import { CSS, arrow, chip, node, on, svg, t, widget, zone } from "./ramp-lib.js";

const CAPTURED = { first: "29fe4fd", second: "989aff4" };

const TERM = (D) => [
  ["$ git init -b main", "Initialized empty Git repository in /tmp/my-project/.git/", "$ git status", "On branch main", "No commits yet",
    "nothing to commit (create/copy files and use \"git add\" to track)"],
  ["$ echo \"Hello, Git!\" > notes.txt", "$ git status", "On branch main", "No commits yet", "Untracked files:",
    "  (use \"git add <file>...\" to include in what will be committed)", "        notes.txt"],
  ["$ git add notes.txt", "$ git status", "On branch main", "No commits yet", "Changes to be committed:",
    "  (use \"git rm --cached <file>...\" to unstage)", "        new file:   notes.txt"],
  ["$ git commit -m \"Add project notes\"", `[main (root-commit) ${D.first}] Add project notes`, " 1 file changed, 1 insertion(+)",
    " create mode 100644 notes.txt", "$ git status", "On branch main", "nothing to commit, working tree clean"],
  ["$ echo \"A second line.\" >> notes.txt", "$ git status", "On branch main", "Changes not staged for commit:",
    "  (use \"git add <file>...\" to update what will be committed)", "  (use \"git restore <file>...\" to discard changes in working directory)",
    "        modified:   notes.txt"],
  ["$ git add notes.txt", "$ git commit -m \"Add a second line to notes\"", `[main ${D.second}] Add a second line to notes`,
    " 1 file changed, 1 insertion(+)", "$ git log --oneline", `${D.second} Add a second line to notes`, `${D.first} Add project notes`],
  ["$ git clone /tmp/my-project copy", "Cloning into 'copy'...", "done.", "$ cd copy", "$ git log --oneline",
    `${D.second} Add a second line to notes`, `${D.first} Add project notes`, "$ git pull", "Already up to date."],
];

const steps = (D) => [
  { stop: "init", title: "<code>git init</code> — a folder becomes a repository",
    note: `Git adds one hidden folder, <code>.git</code>, which will hold the whole history. Without <code>-b main</code>, most Git 2 installs still name the first branch <code>master</code>.` },
  { stop: "edit", title: "A new file is untracked",
    note: `The file exists in the working directory. Git sees it and records nothing about it yet. <code>git status</code> always says where things stand and what to type next.` },
  { stop: "add", title: "<code>git add</code> — choose what goes into the next commit",
    note: `The change is copied to the <b>staging area</b>: the draft of the next commit. The hint says <code>git rm --cached</code> only because there is no commit yet to restore from; later it says <code>git restore --staged</code>.` },
  { stop: "commit", title: "<code>git commit</code> — the draft becomes a snapshot", decisive: true,
    note: `Whatever was staged is recorded permanently, under an id (<code>${D.first}</code>) and a message. "Working tree clean" means the folder matches the last commit.` },
  { stop: "edit", title: "Change the file: it is now modified",
    note: `Git compares the working directory with the last commit and reports the difference. Nothing is staged, so a commit now would record nothing.` },
  { stop: "again", title: "The loop again: add, commit",
    note: `A second snapshot, pointing back at the first. That chain is the history, and <code>git log</code> reads it newest first.` },
  { stop: "clone", title: "<code>git clone</code> — what you do in this course",
    note: `The course repository already exists, so you never run <code>init</code>: <code>clone</code> copies the files <b>and the whole history</b> into a new folder, and <code>git pull</code> fetches whatever was added since.` },
];

const term = (D) => TERM(D).map((lines, at) => on(String(at), lines.map((l, i) =>
  `<text class="code ${l.startsWith("$") ? "cmd" : ""}" x="44" y="${234 + i * 20}">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`).join(""))).join("");

const FILE_STATE = [[1, "untracked", "warm", "hot"], [2, "staged", "", "dim"], [3, "clean", "", "dim"], [4, "modified", "warm", "hot"], [5, "clean", "", "dim"]];

const scene = (D) => svg(760, 420, `
  ${on("0 1 2 3 4 5", `${zone(24, 12, 230, 170, "WORKING DIRECTORY")}${zone(266, 12, 230, 170, "STAGING AREA")}${zone(508, 12, 228, 170, "REPOSITORY — .git")}
    ${arrow(222, 58, 296, 58, "")}${t(259, 44, "git add", "mono dim")}${arrow(464, 58, 538, 58, "")}${t(501, 44, "git commit", "mono dim")}`)}
  ${on("0", `${t(139, 104, "empty", "lbl")}${t(381, 104, "empty", "lbl")}${t(622, 104, "no commits yet", "lbl")}`)}
  ${FILE_STATE.map(([at, state, cls, tcls]) => on(String(at), `${node(54, 84, 170, 44, "notes.txt", cls || "hit", "mono")}${t(139, 150, state, `h ${tcls}`)}`)).join("")}
  <g class="fly">${node(296, 84, 170, 44, "notes.txt", "hit", "mono")}${t(381, 150, "in the next commit", "lbl")}</g>
  ${on("1 4", t(381, 104, "empty", "lbl"))}${on("3 5", t(381, 104, "empty again", "lbl"))}
  ${on("1 2", t(622, 104, "no commits yet", "lbl"))}
  ${on("3 4 5", `${chip(540, 84, 80, 40, D.first, "hit", "mono")}`)}
  ${on("5", `${arrow(650, 104, 624, 104)}${chip(652, 84, 80, 40, D.second, "ok", "mono")}${t(622, 150, "each points at the one before", "lbl")}`)}
  ${on("3 4", t(622, 150, "one snapshot", "lbl"))}
  ${on("6", `${zone(24, 12, 330, 170, "THE COURSE REPOSITORY — ON A SERVER")}${chip(60, 80, 100, 40, D.first, "", "mono")}${arrow(196, 100, 164, 100, "")}${chip(198, 80, 100, 40, D.second, "", "mono")}
    ${t(189, 150, "files + history", "lbl")}${arrow(358, 97, 402, 97)}${t(380, 76, "clone", "mono acc")}
    ${zone(406, 12, 330, 170, "YOUR LAPTOP — copy/")}${chip(442, 80, 100, 40, D.first, "hit", "mono")}${arrow(578, 100, 546, 100)}${chip(580, 80, 100, 40, D.second, "hit", "mono")}
    ${t(571, 150, "the same files, the same history", "lbl")}`)}
  <rect class="term" x="24" y="196" width="712" height="216" rx="10"/>${t(40, 214, "TERMINAL", "cap")}
  ${term(D)}
`);

const css = CSS("rg") + `
.lw .rg text.cmd { fill:var(--accent); font-weight:700; }
.lw .rg .fly { opacity:0; transition:opacity .5s, transform .7s; transform:translateX(-242px); }
.lw .rg[data-at="2"] .fly { opacity:1; transform:none; }
.lw .rg[data-at="3"] .fly, .lw .rg[data-at="4"] .fly, .lw .rg[data-at="5"] .fly, .lw .rg[data-at="6"] .fly { opacity:0; transform:translateX(242px); }
`;

export default widget({ key: "rg", label: "The Git loop", css, steps, scene, captured: CAPTURED });
