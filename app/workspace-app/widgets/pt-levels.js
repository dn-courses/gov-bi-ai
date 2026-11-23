// pt-levels — two levels of skipping under one filter: the folder names skip whole parts, then the
// statistics of the files that are left skip row groups inside them (Play). The same in the
// warehouse: partitions by day, then blocks clustered by system.
// Numbers: the page's own cells, run on 2026-11-23 through the lab. DuckDB 2.0.0, one week and
// station 42 on partitioning_by_day: 7 / 90 files, 7 / 21 row groups, 797.5 kB (re-run 2026-11-23 on page 01's station-sorted file). BigQuery dry runs
// on gbfs.station_status_partitioned: one day 218.7 MB, the same day and system lyft_nyc 97.9 MB
// (also in day1-reference/_measurements.md; the run read 3,765,364 rows).
import { SEP1, arrow, dayTiles, extra, on, t, widget, zone } from "./col-lib.js";
import { AUG1, bind, calendar, code, playButton, playCss, ptCss, run, stop } from "./pt-lib.js";

const CAPTURED = { days: 90, week: 7, groups: 21, read: 7, kb: 797.5, flat: "27.5 GB", day: "218.7 MB", system: "97.9 MB", share: 97.9 / 218.7 };

const steps = (D) => [
  { stop: "Two levels", title: "One filter, two levels of skipping", decisive: true,
    note: `Press <b>Play</b>. The day range is compared with the folder names: ${D.week} of ${D.days} parts are left. Inside each, the file is sorted by station, so its statistics skip the row groups that cannot hold station 42.` },
  { stop: "In a warehouse", title: "Partitions, then clustered blocks",
    note: `The warehouse table is partitioned by day and clustered by system and station. The day picks 1 partition of 127; inside it, the system picks only its own blocks.` },
];

const CSS = (k) => extra(k) + ptCss(k) + playCss(k) + `
.lw .${k} .rg { transition:fill .35s, stroke .35s, opacity .35s; }
.lw .${k} .rg.x { opacity:.18; }
.lw .${k} .rg.d { fill:var(--accent-bg); stroke:var(--accent); stroke-width:2; }
.lw .${k}[data-at="1"] .day { opacity:.25; }
.lw .${k}[data-at="1"] .day.d { opacity:1; fill:var(--accent-bg); stroke:var(--accent); stroke-width:2; }
.lw .${k} .cb.hit { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .${k} .cb:not(.hit) { opacity:.35; }
`;

const READY = "level 1: the folder names · level 2: the statistics";

// The seven files of the week, three row groups each; station 42 is in the first of each.
const files = (D) => Array.from({ length: D.week }, (_, f) => {
  const x = 30 + f * 100;
  return `<rect class="card" x="${x}" y="278" width="90" height="60" rx="8"/>${t(x + 45, 293, `08-0${f + 1}`, "mono dim")}`
    + [0, 1, 2].map((g) => `<rect class="box rg ${g === 0 ? "s42" : "other"}" x="${x + 8 + g * 26}" y="306" width="22" height="24" rx="3"/>`).join("");
}).join("");

const duck = (D) => on("0", zone(14, 10, 732, 188, `partitioning_by_day/ — ${D.days} PARTS`)
  + calendar({ y: 50, h: 20, cls: (i) => (i >= AUG1 && i < AUG1 + D.week ? "wk" : "out") })
  + code(30, 218, "WHERE day >= '2026-08-01' AND day < '2026-08-08' AND station_id = 42", "acc")
  + zone(14, 244, 732, 174, "INSIDE THE PARTS THAT ARE LEFT — 3 ROW GROUPS EACH") + files(D)
  + playButton(30, 350) + t(140, 367, READY, "lbl l now")
  + `<g class="res">${t(30, 400, `${D.week} of ${D.days} files · ${D.read} of ${D.groups} row groups · ${D.kb} kB`, "big l acc")}</g>`);

const blocks = (D) => Array.from({ length: 20 }, (_, i) =>
  `<rect class="box cb ${i < Math.round(20 * D.share) ? "hit" : ""}" x="${30 + i * 35}" y="256" width="31" height="30" rx="4"/>`).join("");

// The three sizes of the same day, as cards with arrows between them.
const funnel = (D) => [[D.flat, "no layout", "hot"], [D.day, "the day", ""], [D.system, "and the system", "acc"]]
  .map(([v, l, tone], i) => `<rect class="card ${tone}" x="${30 + i * 240}" y="322" width="214" height="74" rx="10"/>`
    + t(137 + i * 240, 350, v, `kpi ${tone}`) + t(137 + i * 240, 378, l, "lbl")
    + (i < 2 ? arrow(248 + i * 240, 359, 266 + i * 240, 359) : "")).join("");

const warehouse = (D) => on("1", zone(14, 10, 732, 136, "gbfs.station_status_partitioned — 127 DAILY PARTITIONS") + dayTiles((i) => (i === SEP1 ? "d" : ""))
  + zone(14, 158, 732, 252, "INSIDE 2026-09-01 — BLOCKS CLUSTERED BY SYSTEM, THEN STATION")
  + `<rect class="code acc" x="30" y="192" width="${Math.round(64 * 7.8 + 24)}" height="50" rx="7"/>`
  + t(42, 208, "WHERE captured_at >= '2026-09-01' AND captured_at < '2026-09-02'", "mono l acc") + t(42, 228, "  AND system_id = 'lyft_nyc'", "mono l acc")
  + blocks(D) + t(30, 304, "lyft_nyc's blocks", "lbl l acc") + t(730, 304, "the other systems' blocks, skipped", "lbl r")
  + funnel(D));

const scene = (D) => `<svg viewBox="0 0 760 428">${duck(D)}${warehouse(D)}</svg>`;

const reset = (root) => {
  stop(root);
  root.querySelectorAll(".dy, .rg").forEach((el) => el.classList.remove("x", "d"));
  root.querySelector(".res").classList.remove("show");
  root.querySelector(".now").textContent = READY;
};

// One run: the parts outside the week go dark, then inside each file left, all but one row group.
function play(root, button) {
  reset(root);
  const now = root.querySelector(".now"), all = (sel) => [...root.querySelectorAll(sel)];
  run(root, [[0, () => { now.textContent = "level 1: the day range against the folder names"; }],
    [500, () => { all(".dy.out").forEach((el) => el.classList.add("x")); all(".dy.wk").forEach((el) => el.classList.add("d")); }],
    [1200, () => { now.textContent = "level 2: each file's statistics on station_id"; }],
    [700, () => { all(".rg.other").forEach((el) => el.classList.add("x")); all(".rg.s42").forEach((el) => el.classList.add("d")); }],
    [700, () => { now.textContent = "done: only what both levels left is read"; root.querySelector(".res").classList.add("show"); }]], button);
}

function after(root, at) {
  bind(root, { 0: play });
  if (at !== 0 || !root._timers?.length) reset(root);
}

export default widget({ key: "ptl", label: "Two levels of skipping", css: CSS("ptl"), steps, scene, captured: CAPTURED, after });
