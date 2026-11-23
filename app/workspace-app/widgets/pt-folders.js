// pt-folders — partitioning: the rows written as one folder per day; a filter on the day is answered from the folder names (Play), and a
// filter on the column the day was made from opens every file again.
// Numbers: the page's own cells, run on 2026-11-23 through the lab (DuckDB 2.0.0, EXPLAIN ANALYZE and
// parquet_file_metadata): partitioning_by_day 90 files, 45.4 MB; day = … 1 / 90 files, 214.3 kB; captured_at range on the
// folder 90 files read, 3 / 270 row groups, 1.6 MB; the one file's 174.4 MB is page 04's one-day query, quoted (not re-run here) and drawn with its SQL;
// re-measured 2026-11-23: Data Read 174.4 MB, 211 / 211 row groups.
import { extra, on, t, widget, zone } from "./col-lib.js";
import { AUG1, bind, calendar, code, meter, playButton, playCss, ptCss, run, stat, stop } from "./pt-lib.js";
import { sql, sqlCss } from "./cost-lib.js";

const CAPTURED = {
  oneFileMb: 174.4, days: 90, folderMb: 45.4, dayKb: 214.3, dayRows: "288,000",
  keyless: { files: 90, groupsRead: 3, groupsAll: 270, mb: 1.6 },
};

const steps = (D) => [
  { stop: "Folders", title: "The same rows, one folder per day",
    note: `The table is split into <b>${D.days} parts</b> by one column, the day. Each part is a folder with one file in it, and the day is written in the folder's <b>name</b>.` },
  { stop: "Prune", title: "A filter on the day is answered from the names", decisive: true,
    note: `Press <b>Play</b>. The filter is compared with the ${D.days} folder names before any file is opened, and only one folder matches. This is <b>partitioning</b>; skipping whole parts is called <b>pruning</b>.` },
  { stop: "Not the key", title: "A filter on another column opens every file",
    note: `The same day, written on <code>captured_at</code>. The reader does not know that <code>day</code> was made from it, so it opens all ${D.days} files to read their footers, and only then skips row groups.` },
];

const CSS = (k) => extra(k) + ptCss(k) + playCss(k) + sqlCss(k) + `
.lw .${k}[data-at="0"] .dy[data-i="${AUG1}"] rect { fill:var(--accent-bg); stroke:var(--accent); stroke-width:2; }
.lw .${k}[data-at="0"] .dy[data-i="${AUG1}"] text { fill:var(--accent); font-weight:700; }
.lw .${k}[data-at="2"] .dy rect { fill:var(--hot-bg); stroke:var(--hot); }
.lw .${k}[data-at="2"] .dy text { fill:var(--hot); }
.lw .${k} tspan.dm { fill:var(--mute); } .lw .${k} tspan.ac { fill:var(--accent); font-weight:700; }
`;

const READY = "Press Play: the filter meets each folder name in turn.";
const dayName = (i) => new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10);

const grid = (D) => `<g class="st" data-on="0 1 2">${zone(14, 10, 732, 198, `partitioning_by_day/ — ${D.days} FOLDERS, ONE FILE IN EACH — ${D.folderMb} MB`)}
  ${calendar({ y: 50 })}</g>`;

const folder = (D) => on("0", zone(14, 220, 732, 174, "ONE FOLDER, ONE FILE")
  + `<rect class="code" x="30" y="262" width="${Math.round(49 * 7.8 + 24)}" height="28" rx="7"/>`
  + `<text class="mono l" x="42" y="276"><tspan class="dm">partitioning_by_day/</tspan><tspan class="ac">day=2026-08-01</tspan>/data_0.parquet</text>`
  + t(30, 316, `${D.dayRows} rows: one day of every station.`, "l")
  + t(30, 346, "The file holds no day column. The folder's name is the value,", "lbl l")
  + t(30, 368, "so the day of every file is known without opening it.", "lbl l"));

const ONE_FILE = "SELECT avg(bikes_available) FROM 'station_status.parquet'\nWHERE captured_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00'\n  AND captured_at <  TIMESTAMPTZ '2026-08-02 00:00:00+00';";
const prune = (D) => on("1", zone(14, 220, 732, 274, "THE FILTER, AGAINST THE FOLDER NAMES")
  + t(30, 410, `THE ONE FILE'S ${D.oneFileMb} MB: THIS QUERY, ON THE PAGE STATISTICS AND SKIPPING`, "cap") + sql(30, 434, ONE_FILE)
  + code(30, 274, "WHERE day = DATE '2026-08-01'", "acc") + playButton(634, 258)
  + t(30, 312, READY, "lbl l now")
  + `<g class="res">${meter({ x: 200, y: 334, w: 400, full: 400, label: "the one file", value: `${D.oneFileMb} MB`, cls: "warm", tone: "hot" })
  + meter({ x: 200, y: 364, w: 400 * D.dayKb / 1000 / D.oneFileMb, full: 400, label: `1 of ${D.days} folders`, value: `${D.dayKb} kB` })}</g>`);

const keyless = (D) => on("2", zone(14, 220, 732, 174, "THE SAME DAY, WRITTEN ON captured_at")
  + code(30, 274, "WHERE captured_at >= '2026-08-01' AND captured_at < '2026-08-02'", "hot")
  + stat(30, 324, `${D.keyless.files} of ${D.days}`, "files opened, each one to read its footer", "hot")
  + stat(390, 324, `${D.keyless.groupsRead} of ${D.keyless.groupsAll}`, `row groups then read: ${D.keyless.mb} MB`)
  + t(30, 382, "The statistics work, inside every file. Only a filter on the key itself is compared with the folder names.", "lbl l"));

const HEIGHT = [404, 504, 404]; // the Prune step also shows the one file's query
const scene = (D) => `<svg viewBox="0 0 760 404">${grid(D)}${folder(D)}${prune(D)}${keyless(D)}</svg>`;

const reset = (root) => {
  stop(root);
  root.querySelectorAll(".dy").forEach((el) => el.classList.remove("x", "d"));
  root.querySelector(".res").classList.remove("show");
  root.querySelector(".now").textContent = READY;
};

// One run: every folder name is checked in turn and all but one go dark, then the bytes appear.
function play(root, button) {
  reset(root);
  const now = root.querySelector(".now");
  const each = [...root.querySelectorAll(".dy")].map((el, i) => [22, () => {
    el.classList.add(i === AUG1 ? "d" : "x");
    now.textContent = `day=${dayName(i)}? ${i === AUG1 ? "yes" : "no"}`;
  }]);
  run(root, [...each,
    [300, () => { now.textContent = "1 folder matches: day=2026-08-01. The other 89 are never opened."; }],
    [500, () => root.querySelector(".res").classList.add("show")]], button);
}

function after(root, at) {
  root.querySelector("svg").setAttribute("viewBox", `0 0 760 ${HEIGHT[at]}`);
  bind(root, { 1: play });
  if (at !== 1 || !root._timers?.length) reset(root);
}

export default widget({ key: "ptf", label: "Partitioning: one folder per day", css: CSS("ptf"), steps, scene, captured: CAPTURED, after });
