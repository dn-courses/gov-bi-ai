// rc-lake — a database owns its files; an open file format is read by any engine; the files sit in
// cheap storage and an engine is brought to them for one query; raw files are kept and derived ones
// are written beside them (raw → ETL → derived, from col-lake's "Keep it raw").
// Measured 2026-11-23 on the Day-1 lab, the page's cells:
//   pg_relation_filepath('station_status')  -> base/16385/16657, 6075 MB  (the number changes whenever the table is rebuilt)
//   ls -l --si station_status.parquet       -> 346,091,490 bytes = 346 MB (file sorted by station, time)
//   avg(bikes_available) per system, DuckDB on the file and pyarrow on the file: the same six numbers
//   the daily summary COPY                  -> 540 rows, 1,940 bytes (ls -l)
//   the three raw readings shown in the file: station 42, 43, 44 at 2026-08-01 12:00 (as in rc-layout)
import { table, TABLE_CSS } from "@widget-lib/table.js";
import { extra, on, t, widget } from "./col-lib.js";

const CAPTURED = {
  pgFile: "base/16385/…", pgMb: "6,075", file: "station_status.parquet", size: "346 MB",
  avg: [["BOS", "9.997"], ["CHI", "9.999"], ["DC", "9.998"], ["JC", "10.000"], ["NYC", "10.001"], ["SF", "9.999"]],
  dailyRows: 540, dailySize: "1,940 bytes",
  readings: [["42", "NYC", "12:00", "2"], ["43", "JC", "12:00", "7"], ["44", "BOS", "12:00", "13"]],
};

const steps = (D) => [
  { stop: "Owned", title: "A database owns its files",
    note: `In PostgreSQL, <code>station_status</code> is the file <code>${D.pgFile}</code> in the server's data folder, ${D.pgMb} MB in the server's own page format. Only this engine reads it, and only while the server runs.` },
  { stop: "Any engine", title: "An open file format: any engine reads it",
    note: `<code>${D.file}</code> is one file in an open format, with its columns stored apart. DuckDB reads it, and so does a Python program with no database in it at all. Same numbers.` },
  { stop: "Apart", title: "Storage and compute apart: the lake", decisive: true,
    note: `Files kept in cheap storage, and engines brought to them only while a query runs: that is a <b>data lake</b>. In a cloud the folder is an object store, paid for by the gigabyte, and the engine is a machine rented for the query. Press <b>Play</b>.` },
  { stop: "Keep it raw", title: "Keep everything raw, and write more files beside it",
    note: `Storage this cheap changes the habit. Data is kept <b>as it arrived</b> and never edited. A pipeline (ETL) reads the raw files and writes summarised versions as <b>more files beside them</b>: raw → ETL → derived. When the business asks a question nobody planned for, the history is still there.` },
];

const CSS = `
.lw .rk text.cap { font-size:12px; }
.lw .rk .fused { fill:none; stroke:var(--hot); stroke-width:1.5; stroke-dasharray:5 5; }
.lw .rk .pill.eng { fill:var(--accent-bg); stroke:var(--accent); }
.lw .rk .file { fill:var(--cell); stroke:var(--line); stroke-width:1; filter:drop-shadow(0 2px 5px rgba(0,0,0,.2)); }
.lw .rk .file.open { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .rk .file.ghost { fill:none; stroke:var(--mute); stroke-dasharray:4 5; filter:none; }
.lw .rk .fold { fill:none; stroke:var(--line); stroke-width:1; } .lw .rk .open + .fold { stroke:var(--accent); }
.lw .rk .slot { fill:none; stroke:var(--mute); stroke-width:1.5; stroke-dasharray:4 6; opacity:.6; }
.lw .rk .sheet { fill:var(--cell); fill-opacity:.5; stroke:var(--line); }
.lw .rk .lock { fill:none; stroke:var(--accent); stroke-width:1.6; stroke-linecap:round; }
.lw .rk .pipe { fill:none; stroke:var(--accent); stroke-width:8; stroke-linecap:round; opacity:.35; stroke-dasharray:180; }
.lw .rk .st.on .pipe { animation:rk-draw .9s ease-out both; }
@keyframes rk-draw { from { stroke-dashoffset:180; } to { stroke-dashoffset:0; } }
.lw .rk .gear { transform-box:view-box; transform-origin:380px 176px; }
.lw .rk .st.on .gear { animation:rk-turn 1.4s cubic-bezier(.3,.7,.3,1) both; }
@keyframes rk-turn { from { transform:rotate(-90deg); } to { transform:none; } }
.lw .rk .stage { fill:var(--accent-bg); stroke:var(--accent); stroke-width:2; }
.lw .rk .tooth { stroke:var(--accent); stroke-width:6; stroke-linecap:round; }
.lw .rk .hub { fill:var(--accent); }
.lw .rk .visit { opacity:0; transform:translateY(-14px); transition:opacity .6s, transform .6s; }
.lw .rk .visit.in { opacity:1; transform:none; }
.lw .rk .link { stroke:var(--line); transition:stroke .4s; } .lw .rk .link.on { stroke:var(--accent); stroke-width:2.5; }
.lw .rk .fade { opacity:0; transition:opacity .5s; } .lw .rk .fade.shown { opacity:1; }
.lw .rk .play { cursor:pointer; } .lw .rk .st.on .play { pointer-events:auto; }
.lw .rk .play rect { fill:var(--accent); stroke:none; } .lw .rk .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .rk .play.busy { opacity:.45; pointer-events:none; }
`;

// A file: a card with its top-right corner folded.
const sheet = (x, y, w, h, cls) => `<path class="file ${cls}" d="M${x + 8} ${y} H${x + w - 16} L${x + w} ${y + 16} V${y + h - 8}
  Q${x + w} ${y + h} ${x + w - 8} ${y + h} H${x + 8} Q${x} ${y + h} ${x} ${y + h - 8} V${y + 8} Q${x} ${y} ${x + 8} ${y} Z"/>
  <path class="fold" d="M${x + w - 16} ${y} V${y + 16} H${x + w}"/>`;
const file = (x, y, w, name, sub, cls = "") => `${sheet(x, y, w, 52, cls)}
  ${t(x + w / 2, sub ? y + 19 : y + 27, name, "mono")}${sub ? t(x + w / 2, y + 38, sub, "lbl") : ""}`;

const owned = (D) => on("0", `<rect class="zone" x="150" y="12" width="460" height="340" rx="12"/>${t(166, 31, "ONE SERVER — THE DATABASE", "cap")}
  <rect class="fused" x="176" y="46" width="408" height="220" rx="10"/>
  <rect class="pill eng" x="206" y="64" width="348" height="44" rx="22"/>${t(380, 87, "PostgreSQL — the engine", "acc")}
  <path class="edge on" d="M380 110 L380 140"/>
  ${sheet(206, 142, 348, 104, "")}
  ${t(380, 166, D.pgFile, "mono")}${t(380, 194, D.pgMb + " MB", "big")}${t(380, 222, "the server's own page format", "lbl")}
  <rect class="pill" x="26" y="68" width="104" height="36" rx="18"/>${t(78, 87, "a query")}
  <path class="edge on" d="M132 86 L202 86"/>
  ${t(380, 290, "kept together, sized together, running together", "lbl")}
  ${t(380, 316, "the only way to the data is through this engine", "lbl")}`);

const answer = (x, who, D) => table(x, 184, ["system_id", "avg_bikes"], D.avg, { cap: `answer — ${who}`, rowH: 22 });
const engines = (D) => on("1", `${file(260, 14, 240, D.file, D.size + " · one file", "open")}
  <path class="edge on" d="M300 68 L210 102"/><path class="edge on" d="M460 68 L550 102"/>
  <rect class="pill eng" x="80" y="104" width="220" height="40" rx="20"/>${t(190, 125, "DuckDB", "acc")}
  <rect class="pill eng" x="460" y="104" width="220" height="40" rx="20"/>${t(570, 125, "Python · pyarrow", "acc")}
  ${answer(100, "DuckDB", D)}${answer(480, "pyarrow", D)}
  ${t(380, 262, "=", "huge acc")}${t(380, 294, "the same numbers", "lbl acc")}`);

const apart = (D) => on("2", `<rect class="zone" x="26" y="12" width="708" height="162" rx="12"/>${t(42, 31, "COMPUTE — THERE ONLY WHILE A QUERY RUNS", "cap")}
  <g class="play"><rect x="618" y="22" width="100" height="32" rx="16"/><text x="668" y="39">▶ Play</text></g>
  <rect class="pill" x="60" y="66" width="130" height="38" rx="19"/>${t(125, 86, "a query")}
  <path class="edge" d="M192 85 L266 85"/><path class="edge" d="M494 85 L566 85"/>
  <rect class="slot" x="270" y="63" width="220" height="44" rx="22"/>${t(380, 86, "nothing running", "lbl")}
  <g class="visit"><rect class="pill eng" x="270" y="63" width="220" height="44" rx="22"/>${t(380, 86, "an engine, for one query", "acc")}</g>
  <g class="fade ans"><rect class="pill hit" x="570" y="66" width="140" height="38" rx="19"/>${t(640, 86, "the answer", "acc")}</g>
  ${t(42, 150, "no engine running", "lbl l now")}
  <path class="link edge" d="M380 109 L380 236"/>
  <rect class="zone" x="26" y="196" width="708" height="160" rx="12"/>${t(42, 215, "STORAGE — FILES, KEPT CHEAPLY", "cap")}
  ${file(260, 238, 240, D.file, D.size, "open")}${file(60, 238, 170, "more tables…", "")}${file(530, 238, 170, "more tables…", "")}
  ${t(380, 322, "always there · paid for by the gigabyte · grows without touching compute", "lbl")}`);

// A pipeline, as an icon: three stages on one pipe, the middle one a gear.
const GEAR = Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4;
  return `M${(380 + 15 * Math.cos(a)).toFixed(1)} ${(176 + 15 * Math.sin(a)).toFixed(1)} L${(380 + 22 * Math.cos(a)).toFixed(1)} ${(176 + 22 * Math.sin(a)).toFixed(1)}`; }).join(" ");
const pipeline = () => `<path class="pipe" d="M290 176 L470 176"/><path class="edge on" d="M460 168 L470 176 L460 184"/>
  <circle class="stage" cx="326" cy="176" r="11"/><circle class="stage" cx="434" cy="176" r="11"/>
  <g class="gear"><path class="tooth" d="${GEAR}"/><circle class="stage" cx="380" cy="176" r="15"/><circle class="hub" cx="380" cy="176" r="5"/></g>
  ${t(380, 134, "ETL", "acc")}${t(380, 222, "a pipeline:", "lbl")}${t(380, 242, "read raw, write new files", "lbl")}${t(380, 270, "run again at will", "lbl")}`;

// Inside the raw file: three of its readings, exactly as they were polled.
const READ_X = [[60, "station", "l"], [118, "system", "l"], [172, "time", "l"], [246, "bikes", "r"]];
const readings = (D) => `<rect class="sheet" x="44" y="114" width="220" height="96" rx="8"/>
  ${READ_X.map(([x, h, a]) => t(x, 130, h, `lbl ${a}`)).join("")}
  ${D.readings.map((row, i) => row.map((v, k) => t(READ_X[k][0], 154 + i * 22, v, `mono ${READ_X[k][2]}`)).join("")).join("")}`;

const lock = (x, y) => `<rect class="lock" x="${x}" y="${y}" width="12" height="9" rx="2"/><path class="lock" d="M${x + 3} ${y} v-3 a3 3 0 0 1 6 0 v3"/>`;

const rawZone = (D) => `<rect class="zone" x="26" y="12" width="256" height="344" rx="12"/>${t(42, 31, "RAW — AS IT ARRIVED", "cap")}
  ${file(44, 50, 220, D.file, "every reading, 25.9 M rows")}${readings(D)}
  ${t(154, 234, "· · · every day since", "lbl")}
  ${lock(100, 282)}${t(120, 286, "never edited", "l acc")}
  ${t(154, 314, "cheap enough to keep all of it,", "lbl")}${t(154, 334, "in a format any engine reads", "lbl")}`;

const DERIVED = [["daily averages", "open"], ["a cleaned copy", ""], ["next year's question", "ghost"]];
const derivedZone = (D) => `<rect class="zone" x="478" y="12" width="256" height="344" rx="12"/>${t(494, 31, "DERIVED — REBUILT AT WILL", "cap")}
  ${DERIVED.map(([name, c], i) => file(494, 50 + i * 66, 224, name, i === 0 ? `the cell's file: ${D.dailyRows} rows, ${D.dailySize}` : "", c)).join("")}
  ${t(606, 286, "more files beside the raw ones", "acc")}
  ${t(606, 314, "a new question is answered", "lbl")}${t(606, 334, "from the raw history", "lbl")}`;

const raw = (D) => on("3", `${rawZone(D)}${pipeline()}${derivedZone(D)}`);

const scene = (D) => `<svg viewBox="0 0 760 364">${owned(D)}${engines(D)}${apart(D)}${raw(D)}</svg>`;

function reset(root) {
  root.dataset.run = String(Number(root.dataset.run || 0) + 1);
  root.querySelector(".visit").classList.remove("in");
  root.querySelector(".link").classList.remove("on");
  root.querySelector(".ans").classList.remove("shown");
  root.querySelector(".play").classList.remove("busy");
  root.querySelector(".now").textContent = "no engine running";
}

// One run: an engine arrives, reads the file, answers, and is gone; the file stays.
function play(root) {
  reset(root);
  const run = root.dataset.run, q = (s) => root.querySelector(s), now = q(".now");
  const later = (ms, act) => setTimeout(() => root.dataset.run === run && act(), ms);
  q(".play").classList.add("busy");
  later(150, () => { q(".visit").classList.add("in"); now.textContent = "an engine is started"; });
  later(1000, () => { q(".link").classList.add("on"); now.textContent = "it reads the columns it needs from the file"; });
  later(2000, () => { q(".ans").classList.add("shown"); now.textContent = "it answers"; });
  later(3200, () => { q(".visit").classList.remove("in"); q(".link").classList.remove("on"); now.textContent = "the engine is gone; the file stays"; });
  later(3700, () => q(".play").classList.remove("busy"));
}

function after(root, at) {
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.querySelector(".play").addEventListener("click", () => root.dataset.at === "2" && play(root));
  }
  if (root.dataset.shown !== String(at)) { root.dataset.shown = String(at); reset(root); }
}

export default widget({ key: "rk", label: "The lake: open files, storage apart from compute", css: extra("rk") + TABLE_CSS("rk") + CSS, steps, scene, captured: CAPTURED, after });
