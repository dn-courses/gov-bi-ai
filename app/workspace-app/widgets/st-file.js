// st-file — the need and the layout: a question about one day reads both of its columns in every
// block of the file; the blocks are row groups; the footer keeps each one's row count and each
// column's minimum and maximum — and in this file every row group's captured_at spans the quarter.
// Measured 2026-11-23 in the postgres lab (DuckDB v2.0.0), on the page's station_status.parquet
// (343,934,929 bytes after page 01 rewrote it; 344 MB), with the page's own cells:
//   one day   EXPLAIN ANALYZE avg(bikes_available) WHERE captured_at in 2026-08-01 -> Row Groups
//             Scanned 211 / 211, 288,000 rows, Data Read 174.4 MB (re-measured 15:30 after page 01 rewrote the file)
//   layout    parquet_metadata -> 211 row groups, 122,880 rows each (the last 115,200), 3,165 chunks
//   footer    captured_at of row groups 0, 1, 2, 210 -> min 2026-07-01 00:00, max 2026-09-28 23:55
import { fmt, scene as build } from "@widget-lib/scene.js";
import { stepper } from "@widget-lib/stepper.js";
import { TABLE_CSS, table } from "@widget-lib/table.js";

const CAPTURED = {
  fileMb: 344, rowGroups: 211, rowsPerGroup: 122880, lastRows: 115200, chunks: 3165,
  rows: 25920000, kept: 288000, readMb: 174.4, first: "Jul 1 00:00", last: "Sep 28 23:55",
  columns: ["station_id", "system_id", "captured_at", "bikes_available", "docks_available", "ebikes_available",
    "bikes_disabled", "docks_disabled", "is_renting", "is_returning", "is_installed", "last_reported",
    "name", "vehicle_types", "legacy_id"],
  needed: ["captured_at", "bikes_available"],
};

const steps = (D) => [
  { stop: "One day", title: "A question about one day reads the whole column",
    note: `One day is ${fmt(D.kept)} rows of ${fmt(D.rows)}: one in ninety. Press <b>Play</b>: the engine still reads both columns the query names, in every block of the file, <b>${D.readMb} MB</b>, and throws away the other 89 days after reading them.` },
  { stop: "Row groups", title: "The file is cut into blocks of rows: row groups",
    note: `The rows are sliced into <b>${fmt(D.rowGroups)} row groups</b> of ${fmt(D.rowsPerGroup)} rows. Each row group holds all ${D.columns.length} columns of its rows, each column as one chunk.` },
  { stop: "Footer", title: "The footer keeps a few numbers about every block", decisive: true,
    note: `At the end of the file, the <b>footer</b> keeps each row group's row count and, for each column, its <b>minimum and maximum</b>. Here every row group's <code>captured_at</code> runs from the first day of the quarter to the last.` },
];

const CSS = TABLE_CSS("sfl") + `
.lw .sfl .cell { fill:var(--cell); stroke:var(--line); stroke-width:1; transition:fill .25s, stroke .4s; }
.lw .sfl[data-at="0"] .cell.need { stroke:var(--accent); }
.lw .sfl[data-at="0"] .cell.need.read { fill:var(--accent); }
.lw .sfl text.h { font:650 16px system-ui, sans-serif; }
.lw .sfl .rg { fill:var(--panel); stroke:var(--line); transition:fill .5s, stroke .5s; }
.lw .sfl[data-at="1"] .rg { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .sfl[data-at="2"] .ft { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .sfl[data-at="0"] .dots.read { fill:var(--accent); }
.lw .sfl .play { cursor:pointer; pointer-events:auto; }
.lw .sfl .st:not(.on) .play { pointer-events:none; }
.lw .sfl .play rect { fill:var(--accent); } .lw .sfl .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .sfl .play.busy { opacity:.45; pointer-events:none; }
.lw .sfl text.sql { font:13px ui-monospace, SFMono-Regular, Menlo, monospace; font-weight:400; text-anchor:start; white-space:pre; }
.lw .sfl text.sql .kw { fill:var(--mute); } .lw .sfl text.sql .col { fill:var(--accent); font-weight:600; }
.lw .sfl text.huge { font:700 26px ui-monospace, Menlo, monospace; }
.lw .sfl text.cap { font-size:12px; }
.lw .sfl text.mono.acc { font-size:12px; font-weight:600; }
.lw .sfl .lead { fill:none; stroke:var(--accent); stroke-width:1.2; }
.lw .sfl .track { fill:var(--cell); } .lw .sfl .fill { fill:var(--accent); transition:width .7s ease; }
.lw .sfl .chunk { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1; }
.lw .sfl .edge { fill:none; stroke:var(--accent); stroke-width:2; stroke-linecap:round; }
`;

const X = 36, CW = 12, W = CW * 15; // the file: fifteen cells of CW across
const ROWS = [[62, "row group 0"], [100, "row group 1"], [138, "row group 2"], [210, "row group 210"]];
const group = (D, y, label) => `<rect class="rg" x="${X - 4}" y="${y}" width="${W + 8}" height="30" rx="5"/>
  ${D.columns.map((c, i) => `<rect class="cell ${D.needed.includes(c) ? "need" : ""}" x="${X + i * CW + 1}" y="${y + 4}" width="${CW - 2}" height="22" rx="2"/>`).join("")}
  <g class="st" data-from="1"><text class="lbl l" x="${X + W + 14}" y="${y + 15}">${label}</text></g>`;

// Step 0 names the two chunks the query reads, with a leader down to each column of the strip.
const named = () => `<g class="st" data-on="0">
  <path class="lead" d="M${X + 2.5 * CW} 58 V34 H${X + 5 * CW}"/><text class="mono l acc" x="${X + 5 * CW + 6}" y="34">captured_at</text>
  <path class="lead" d="M${X + 3.5 * CW} 58 V50 H${X + 5 * CW}"/><text class="mono l acc" x="${X + 5 * CW + 6}" y="50">bikes_available</text></g>`;

const file = (D) => `<text class="cap" x="${X - 4}" y="16">STATION_STATUS.PARQUET — ${D.fileMb} MB</text>${named()}
  ${ROWS.map(([y, label]) => group(D, y, label)).join("")}
  <text class="lbl dots" x="${X + W / 2}" y="186">· · · ${D.rowGroups - 4} more · · ·</text>
  <g class="st" data-on="0"><text class="lbl l" x="${X + W + 14}" y="186">blocks of rows</text></g>
  <g class="st" data-from="2"><rect class="box ft" x="${X - 4}" y="262" width="${W + 8}" height="44" rx="5"/>
    <text x="${X + W / 2}" y="284">footer</text></g>`;

const sql = () => [
  `<tspan class="kw">SELECT</tspan> avg(<tspan class="col">bikes_available</tspan>)`,
  `<tspan class="kw">FROM</tspan>   'station_status.parquet'`,
  `<tspan class="kw">WHERE</tspan>  <tspan class="col">captured_at</tspan> &gt;= '2026-08-01'`,
  `  <tspan class="kw">AND</tspan>  <tspan class="col">captured_at</tspan> &lt;  '2026-08-02';`,
].map((s, i) => `<text class="sql" xml:space="preserve" x="346" y="${62 + i * 20}">${s}</text>`).join("");

const MW = 380; // the meter: the whole file's width
const oneDay = (D) => `<text class="cap" x="346" y="40">ONE DAY OF NINETY</text>${sql()}
  <g class="play"><rect x="346" y="148" width="96" height="32" rx="16"/><text x="394" y="165">▶ Play</text></g>
  <text class="lbl l now" x="458" y="165">not started</text>
  <text class="huge l acc" x="346" y="214"><tspan class="mb">0</tspan> MB read</text>
  <rect class="track" x="346" y="234" width="${MW}" height="8" rx="4"/><rect class="fill" x="346" y="234" width="0" height="8" rx="4"/>
  <text class="lbl r" x="${346 + MW}" y="256">of the ${D.fileMb} MB file</text>
  <text class="l" x="346" y="280">${fmt(D.kept)} rows kept</text>
  <text class="lbl l" x="346" y="300">of ${fmt(D.rows)} read through</text>
  <text class="lbl l hot" x="346" y="324">a filter cuts the answer, not the reading</text>`;

const blocks = (D) => `<text class="cap" x="346" y="40">ROWS, CUT INTO BLOCKS</text>
  <text class="huge l acc" x="346" y="94">${fmt(D.rowGroups)} row groups</text>
  <text class="l" x="346" y="134">${fmt(D.rowsPerGroup)} rows in each</text>
  <text class="lbl l" x="346" y="158">the last one ${fmt(D.lastRows)}</text>
  <text class="l" x="346" y="214">${D.columns.length} column chunks in each</text>
  <text class="lbl l" x="346" y="238">${fmt(D.rowGroups)} × ${D.columns.length} = ${fmt(D.chunks)} chunks in the file</text>
  <text class="cap" x="346" y="276">ONE ROW GROUP, ONE CHUNK PER COLUMN</text>
  ${D.columns.map((c, i) => `<rect class="chunk" x="${346 + i * 25.4}" y="290" width="22" height="30" rx="4"/>`).join("")}`;

const FOOT = ["group", "rows", "min", "max"];
const entries = (D) => [["0", fmt(D.rowsPerGroup), [D.first, "rep"], [D.last, "rep"]], ["1", fmt(D.rowsPerGroup), [D.first, "rep"], [D.last, "rep"]],
  ["2", fmt(D.rowsPerGroup), [D.first, "rep"], [D.last, "rep"]], ["…", "…", "…", "…"], [`${D.rowGroups - 1}`, fmt(D.lastRows), [D.first, "rep"], [D.last, "rep"]]];

const footer = (D) => `${table(346, 64, FOOT, entries(D), { cap: "footer — captured_at, one entry per row group" })}
  <path class="edge" d="M${X + W + 6} 284 L336 284"/>
  <text class="h l hot" x="346" y="262">every row group spans the whole quarter</text>
  <text class="lbl l" x="346" y="300">the same two numbers are kept for every column,</text>
  <text class="lbl l" x="346" y="320">for all ${fmt(D.rowGroups)} row groups: ${fmt(D.chunks)} pairs</text>`;

const scene = (D) => `<svg viewBox="0 0 760 344">${file(D)}
  <rect class="zone" x="330" y="22" width="414" height="314" rx="12"/>
  <g class="st" data-on="0">${oneDay(D)}</g>
  <g class="st" data-on="1">${blocks(D)}</g>
  <g class="st" data-on="2">${footer(D)}</g>
</svg>`;

// One run of the reading: the two needed chunks of each drawn row group light up in turn (the
// dots stand for the 207 groups not drawn), and the megabytes count up to the measured total.
function play(root, D) {
  const button = root.querySelector(".play"), now = root.querySelector(".now"), mb = root.querySelector(".mb");
  const chunks = ROWS.map(([y]) => [...root.querySelectorAll(".cell.need")].filter((c) => Number(c.getAttribute("y")) === y + 4));
  const share = (n) => ((D.readMb * n) / D.rowGroups).toFixed(1), fill = root.querySelector(".fill");
  const show = (v) => { mb.textContent = v; fill.style.width = `${(MW * Number(v)) / D.fileMb}px`; };
  const beats = [
    ...[0, 1, 2].map((g) => [`block ${g + 1}: both chunks, all ${fmt(D.rowsPerGroup)} rows`, () => { chunks[g].forEach((c) => c.classList.add("read")); show(share(g + 1)); }]),
    [`blocks 4 to ${D.rowGroups - 1}: the same`, () => { root.querySelector(".dots").classList.add("read"); show(share(D.rowGroups - 1)); }],
    [`block ${D.rowGroups}: done, every block read`, () => { chunks[3].forEach((c) => c.classList.add("read")); show(D.readMb); }],
  ];
  reset(root);
  button.classList.add("busy");
  beats.forEach(([say, act], i) => setTimeout(() => { now.textContent = say; act(); if (i === beats.length - 1) button.classList.remove("busy"); }, 150 + i * 800));
}

function reset(root) {
  root.querySelectorAll(".read").forEach((e) => e.classList.remove("read"));
  root.querySelector(".mb").textContent = "0";
  root.querySelector(".fill").style.width = "0px";
  root.querySelector(".now").textContent = "not started";
}

function after(root, at, D) {
  if (!root.dataset.bound) { root.dataset.bound = "1"; root.querySelector(".play").addEventListener("click", () => root.dataset.at === "0" && play(root, D)); }
  if (at === 0) reset(root);
}

export default { render: build({ stepper, key: "sfl", label: "Row groups and the footer", css: CSS, steps, scene, captured: CAPTURED, after: (root, at) => after(root, at, CAPTURED) }) };
