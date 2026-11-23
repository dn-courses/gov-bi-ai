// mp-join — a join on many machines. To join a poll with its system's row in a second table, both
// must be on one worker; both tables are split by arrival, so the matches are scattered. Shuffle
// join: both tables are re-sent to the owner of the key. Broadcast join: the small table is copied
// to every worker and the polls stay. Colocated: both tables already split by the key, nothing moves.
// Steps 1 and 2 have Play. The pictures are in mp-join-draw.js.
// Numbers: the page's own Python cells (the mp-join scene), run 2026-11-23 in the lesson app on the
// postgres lab: 300,000 of 1,200,000 polls joined where they are; shuffle join 900,000 polls and 4
// station counts sent, joined per worker 120,000 / 60,000 / 300,000 / 720,000; broadcast 0 polls and
// 12 station counts, 300,000 per worker, the same rows: True; break-even 400,000 rows; colocated 0
// and 0, the same rows: True. The share mix (180,000 / 75,000 / 30,000 / 15,000) is the cells'
// generator: 300 minutes of 600, 250, 100 and 50 stations.
import { LOOK, beats, bindPlays, countUp, fmt, move, snap, stop, widget } from "./mp-lib.js";
import { TABLE_CSS } from "@widget-lib/table.js";
import { SYS, chipFrom, chipTo, scene, segFrom, segTo } from "./mp-join-draw.js";

const CAPTURED = {
  rows: 1200000, share: 300000, found: 300000, mix: { NYC: 180000, CHI: 75000, BOS: 30000, PDX: 15000 },
  pollsShuffle: 900000, countsShuffle: 4, joinedShuffle: [120000, 60000, 300000, 720000],
  countsBroadcast: 12, breakEven: 400000, pollsColocated: 0, countsColocated: 0, same: true,
};

const steps = (D) => [
  { stop: "Rows apart", title: "To join, a poll and its row must be on the same worker",
    note: `Each poll is joined with its system's number of stations, from the small table <b>station_counts</b>. Both tables are split by arrival, not by system: every worker holds polls of all four systems and the count of one. Joined where they are, only <b>${fmt(D.found)}</b> of ${fmt(D.rows)} polls find their row.` },
  { stop: "Shuffle join", title: "Shuffle join: both tables go to the owner of the key", decisive: true,
    note: `Press <b>Play</b>: both tables are shuffled by system, so a system's polls and its count meet on its owner, which joins them there. <b>${fmt(D.pollsShuffle)}</b> polls and ${D.countsShuffle} station counts cross the network, and NYC's ${fmt(D.joinedShuffle[3])} land on one worker.` },
  { stop: "Broadcast", title: "Broadcast join: copy the small table to every worker", decisive: true,
    note: `Press <b>Play</b>: each worker sends its count to the three others, <b>${D.countsBroadcast}</b> rows in all, and no poll moves. It pays while the small side's rows times the workers stay below what the shuffle sends: here under ${fmt(D.breakEven)} rows. Past that the "small" side is not small, and the engine shuffles.` },
  { stop: "Colocated", title: "Colocated: split by the key ahead of time, nothing moves",
    note: `Stored split by system, both tables already have each system's rows on its owner: the shuffle was done when they were written. <b>${D.pollsColocated + D.countsColocated}</b> rows cross the network, and the joined rows are the same.` },
];

const CSS = LOOK("jn") + TABLE_CSS("jn") + `
.lw .jn .seg { fill:var(--k); transition:opacity .4s; } .lw .jn .seg.off { opacity:.22; }
.lw .jn text.v { fill:var(--ink); }
.lw .jn .track { fill:var(--cell); }
.lw .jn .fill { fill:var(--accent); } .lw .jn .fill.hotf { fill:var(--hot); }
.lw .jn .net { fill:var(--accent-bg); stroke:var(--accent); stroke-opacity:.5; }
.lw .jn .netfill { fill:var(--accent); opacity:.18; transform:scaleX(0); }
.lw .jn.lv1 .netfill { transform:scaleX(1); transition-duration:2.6s; }
.lw .jn .aft { opacity:0; transition:opacity .5s; } .lw .jn.lv1 .aft { opacity:1; transition-delay:2.4s; }
.lw .jn .sg, .lw .jn .cg { transition:transform 1.4s cubic-bezier(.5,0,.25,1); }
.lw .jn .dock { fill:none; stroke:var(--line); stroke-width:1.5; stroke-dasharray:4 4; }
.lw .jn .cp { opacity:0; transform:translate(var(--dx), 0); }
.lw .jn.lv2 .cp { opacity:1; transform:none; transition:transform 1s cubic-bezier(.45,0,.2,1), opacity .3s; transition-delay:var(--d); }
`;

// Step 1's pieces: at lv 0 each where it arrived, at lv 1 in the inbox of its system's owner.
function place(root, lv) {
  root.classList.toggle("lv1", lv > 0);
  root.querySelectorAll(".sg").forEach((g) => {
    const w = +g.dataset.w, s = g.dataset.s;
    g.style.transitionDelay = lv ? `${w * 160 + SYS.indexOf(s) * 90}ms` : "0ms";
    move(g, ...(lv ? segTo(w, s) : segFrom(CAPTURED, w, s)));
  });
  root.querySelectorAll(".cg").forEach((g) => { const w = +g.dataset.w;
    g.style.transitionDelay = lv ? `${900 + w * 120}ms` : "0ms";
    move(g, ...(lv ? chipTo(w) : chipFrom(w))); });
}

const counter = (root) => root.querySelector(".moved-n");
const plays = {
  1: (root, b) => beats(root, [[60, () => place(root, 1)], ...countUp(counter(root), 0, CAPTURED.pollsShuffle, 2600, 16), [300, () => {}]], b),
  2: (root, b) => beats(root, [[60, () => root.classList.add("lv2")], [1400, () => {}]], b),
};

function reset(root) {
  root.classList.remove("lv2");
  place(root, 0);
  const c = counter(root);
  if (c) c.textContent = "0";
}

function after(root) {
  bindPlays(root, plays);
  stop(root);
  snap(root, () => reset(root));
}

export default widget({ key: "jn", label: "A join on many machines", css: CSS, steps, scene, captured: CAPTURED, after });
