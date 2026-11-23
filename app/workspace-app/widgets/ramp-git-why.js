// ramp-git-why — what Git is and why a course is handed out with it: one repository on a server,
// a full copy on every laptop, commits as snapshots, updates that reach everyone, and experiments
// that reach no one. A drawing of the idea: the commits are numbered, not real ids, and nothing here
// is measured. The commands themselves are in ramp-git-loop.
import { CSS, arrow, chip, node, on, svg, t, widget, zone } from "./ramp-lib.js";

const steps = () => [
  { stop: "Copies", title: "Without it: copies that drift apart",
    note: `Course files sent as an archive are out of date the moment one is corrected. Everyone holds a different copy, and nobody can say which is current or what changed.` },
  { stop: "Repository", title: "A repository is a folder that remembers",
    note: `Git keeps the files <b>and their history</b> together. The history is a chain of <b>commits</b>. This is <b>version control</b>: any earlier state can be seen again, and any two can be compared.` },
  { stop: "Commit", title: "A commit is a snapshot, read as a change",
    note: `Each commit records every file as it was at that moment, with who, when and why. Because each one points at the one before, Git can show a commit as a <b>diff</b>: the lines that changed since.` },
  { stop: "Remote", title: "The remote: one copy everyone agrees on",
    note: `A repository kept on a server is a <b>remote</b>. The course's is on GitHub, and its address is all you need. It is the reference copy.` },
  { stop: "Clone", title: "Clone: your own complete copy",
    note: `<code>git clone</code> copies the files and the whole history to your laptop. From then on you work in <b>your</b> copy. Nothing you do there is sent anywhere.` },
  { stop: "Play", title: "Break it freely: it is yours alone", decisive: true,
    note: `Edit cells, delete files, try things. Your changes stay on your laptop, and GitHub lets participants <b>read</b> the course repository, not write to it. Nobody else's copy can be affected.` },
  { stop: "Update", title: "A correction reaches everyone",
    note: `When the materials change, the change is one new commit on the remote. <code>git pull</code> brings it to your copy, and every laptop is on the same version again.` },
  { stop: "Branches", title: "A branch is a name on a commit",
    note: `A <b>branch</b> is a second line of work that starts from a commit and grows on its own, so an idea can be tried without touching the main line. This course uses one branch, <code>main</code>.` },
];

// A chain of numbered commits, oldest on the left, each newer one pointing back at the one before.
function chain(x, y, ids, cls = "") {
  return ids.map((id, i) => {
    const at = x + i * 62;
    const back = i ? arrow(at - 2, y + 18, at - 16, y + 18, "") : "";
    return `${back}${chip(at, y, 46, 36, id, typeof cls === "function" ? cls(id) : cls, "mono")}`;
  }).join("");
}

const LAPTOPS = [["LAPTOP 1", 20], ["YOUR LAPTOP", 152], ["LAPTOP 3", 284]];
const laptop = ([caption, y]) => zone(430, y, 306, 112, caption);

const drift = `${zone(24, 130, 250, 150, "THE INSTRUCTOR")}${node(54, 180, 190, 44, "course-v3.zip", "hit", "mono")}${t(149, 250, "corrected twice since", "lbl")}
  ${LAPTOPS.map(laptop).join("")}
  ${node(488, 54, 190, 44, "course-v1.zip", "", "mono")}${node(488, 186, 190, 44, "course-v2.zip", "", "mono")}${node(488, 318, 190, 44, "course-v1 (edited)", "warm", "mono")}
  ${arrow(278, 190, 426, 80, "dash")}${arrow(278, 205, 426, 208, "dash")}${arrow(278, 220, 426, 336, "dash")}
  ${t(352, 380, "which copy is current?", "h hot")}`;

const repository = `${zone(24, 40, 712, 340, "A REPOSITORY")}
  ${node(60, 110, 200, 40, "lessons/", "", "mono")}${node(60, 160, 200, 40, "labs/", "", "mono")}${node(60, 210, 200, 40, "README.md", "", "mono")}
  ${t(160, 280, "the files, as they are now", "lbl")}
  ${chain(400, 160, ["1", "2", "3"], (id) => (id === "3" ? "hit" : ""))}
  ${t(485, 130, "the history", "h")}${t(485, 230, "oldest → newest", "lbl")}${t(485, 280, "every earlier state is still there", "lbl")}`;

const commit = `${zone(24, 20, 712, 110, "THE HISTORY")}${chain(290, 60, ["1", "2", "3"], (id) => (id === "2" ? "hit" : ""))}
  ${zone(24, 146, 340, 250, "COMMIT 2 — A SNAPSHOT")}
  ${t(48, 196, "who", "lbl l")}${t(120, 196, "the instructor", "l")}
  ${t(48, 232, "when", "lbl l")}${t(120, 232, "the date and time", "l")}
  ${t(48, 268, "why", "lbl l")}${t(120, 268, "\"Fix the start command\"", "l")}
  ${t(48, 304, "before", "lbl l")}${t(120, 304, "commit 1", "mono l")}
  ${t(48, 356, "plus every file, as it was then", "lbl l")}
  ${zone(396, 146, 340, 250, "…READ AS A DIFF AGAINST COMMIT 1")}
  ${t(420, 200, "README.md", "mono dim l")}
  ${t(420, 244, "- Start it with: just up", "code minus")}${t(420, 272, "+ Start it with: just present agents", "code plus")}
  ${t(420, 330, "one line removed, one added", "lbl l")}${t(420, 356, "everything else unchanged", "lbl l")}`;

const remote = (ids, cls) => `${zone(24, 130, 300, 160, "GITHUB — THE REMOTE")}${chain(54, 186, ids, cls)}`;
const copies = (ids, cls) => LAPTOPS.map(([caption, y]) => `${laptop([caption, y])}${chain(458, y + 48, ids, cls)}`).join("");
const wires = (label, cls = "on") => `${arrow(328, 190, 426, 80, cls)}${arrow(328, 210, 426, 208, cls)}${arrow(328, 230, 426, 336, cls)}${t(377, 262, label, "mono acc")}`;
const fresh = (id) => (id === "4" ? "ok" : "");

const branches = `${zone(24, 40, 712, 340, "ONE REPOSITORY, TWO LINES OF WORK")}
  ${chain(120, 140, ["1", "2", "3", "4"])}${chip(300, 86, 58, 30, "main", "hit", "mono")}${arrow(329, 118, 329, 138, "")}
  ${arrow(304, 262, 276, 180, "")}${chip(306, 250, 46, 36, "5", "warm", "mono")}${arrow(366, 268, 354, 268, "")}${chip(368, 250, 46, 36, "6", "warm", "mono")}
  ${chip(440, 253, 110, 30, "experiment", "warm", "mono")}${arrow(438, 268, 416, 268, "")}
  ${t(560, 158, "the main line", "lbl")}${t(380, 330, "starts at commit 3 and grows on its own", "lbl")}`;

const scene = () => svg(760, 420, `
  ${on("0", drift)}${on("1", repository)}${on("2", commit)}${on("7", branches)}
  ${on("3 4 5", remote(["1", "2", "3"]))}${on("3", `${t(174, 260, "one address", "lbl")}${t(560, 210, "the reference copy of the course", "h")}`)}
  ${on("4 5", `${copies(["1", "2", "3"])}`)}${on("4", wires("clone"))}
  ${on("4", t(174, 260, "files + history", "lbl"))}
  ${on("5", `${chip(644, 200, 70, 36, "yours", "warm", "mono")}${arrow(642, 218, 630, 218, "")}
    ${arrow(426, 226, 330, 250, "hot dash")}${t(366, 282, "write: refused", "mono hot")}${t(174, 260, "read: everyone", "lbl")}
    ${t(670, 86, "untouched", "lbl")}${t(670, 350, "untouched", "lbl")}`)}
  ${on("6", `${remote(["1", "2", "3", "4"], fresh)}${copies(["1", "2", "3", "4"], fresh)}${wires("pull")}${t(174, 260, "one new commit", "lbl")}`)}
`);

const css = CSS("gw") + `
.lw .gw text.minus { fill:var(--hot); } .lw .gw text.plus { fill:var(--ok); }
`;

export default widget({ key: "gw", label: "What Git is for", css, steps, scene, captured: {} });
