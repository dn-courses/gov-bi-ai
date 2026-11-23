// rc-layout — the same three readings stored two ways: whole rows in a page, and each column together.
// A query of three columns reads every byte of the rows but only three strips of the columns; one row
// by its key is one record in the first and one value from every strip in the second.
// The three rows are real: station 42, 43 and 44 at 2026-08-01 12:00 (names cut short), five of the 15
// columns and a cell that stands for the other ten. Measured 2026-11-23 on the Day-1 lab, the page's cells:
//   row bytes   the cell: pg_column_size over TABLESAMPLE SYSTEM (0.1) REPEATABLE (1) -> 13 of 234 bytes
//               are the three columns (over every row: 233.7)
//   row store   EXPLAIN (ANALYZE, BUFFERS) monthly average, a cell of step 2 -> every page, 777,600 (6075 MB)
//   readings    the cell of step 0: stations 42–44 at 2026-08-01 12:00+00 -> NYC 2, JC 7, BOS 13
//   column      DuckDB EXPLAIN ANALYZE, same query, on station_status.parquet -> Data Read 174.4 MB (file sorted by station, time; re-run 2026-11-23)
//   one row     Postgres, through the index: Buffers 5, 0.006–0.02 ms; DuckDB: 2 / 211 row groups,
//               Data Read 3.9 MB, 5–8 ms
//   one change  Postgres UPDATE of one value (rolled back): 0.6 ms, 6 pages dirtied;
//               rewriting the Parquet file: 2.6–2.7 s (day1-reference/_measurements.md)
import { extra, fmt, from, on, t, widget } from "./col-lib.js";

const CAPTURED = { rowBytes: 234, needBytes: 13, rowMb: 6075, colMb: 174, columns: 15 };

const COLS = [["station_id", 34], ["system_id", 42], ["captured_at", 54], ["bikes_available", 34], ["name", 172], ["10 more columns", 40]];
const ROWS = [
  ["42", "NYC", "12:00", "2", "Station 42 — Broadway…", "…"],
  ["43", "JC", "12:00", "7", "Station 43 — Grove St…", "…"],
  ["44", "BOS", "12:00", "13", "Station 44 — Harvard…", "…"],
];
const WANTED = [1, 2, 3]; // system_id, captured_at, bikes_available
const off = (k) => COLS.slice(0, k).reduce((s, [, w]) => s + w, 0);
const HEIGHT = [262, 236, 480, 480]; // each step's drawing is only as tall as what it shows

// Where cell (r, k) sits: in a page of whole rows, or in column k's strip (top, or below the rows).
const inRows = (r, k) => [58 + off(k), 50 + r * 30];
const inCols = (top) => (r, k) => [176 + r * (COLS[k][1] + 8), (top ? 50 : 196) + k * 28];

const steps = (D) => [
  { stop: "Rows", title: "A row store keeps whole rows in a page",
    note: `Three readings as a row store writes them: one record whole, then the next, in the same page. The monthly average needs three columns, ${D.needBytes} bytes of each ${D.rowBytes}-byte row, and the page brings all of it.` },
  { stop: "Columns", title: "A column store keeps each column together",
    note: `The same values, nothing added and nothing lost, written column by column: all the stations, then all the systems, then all the times. Each column is stored apart from the others.` },
  { stop: "Three columns", title: "A query reads only the columns it names", decisive: true,
    note: `Press <b>Play</b>. To reach three columns the row store reads every page: ${fmt(D.rowMb)} MB. The column store reads those three columns and nothing else: ${D.colMb} MB. Reading only the columns a query names is <b>projection</b>.` },
  { stop: "One row", title: "The price: one row touches every column",
    note: `Station 42 at noon is one record in the row store, found through its index. In the column store it is one value from each of the ${D.columns} columns, put back together, and changing it means writing the column file again: it is written whole, not edited in place. Neither layout is a defect: one row, read or changed, belongs to the row store; many rows of a few columns to the column store.` },
];

const CSS = `
.lw .ry text.cap { font-size:12px; }
.lw .ry .c { transition:transform .9s cubic-bezier(.4,0,.2,1), opacity .6s; }
.lw .ry .c rect { fill:var(--cell); stroke:var(--line); stroke-width:1; transition:fill .4s, stroke .4s, opacity .4s; }
.lw .ry .c text { font:400 12px ui-monospace, SFMono-Regular, Menlo, monospace; }
.lw .ry .c.k5 text { fill:var(--mute); }
.lw .ry .B { opacity:0; } .lw .ry[data-at="2"] .B, .lw .ry[data-at="3"] .B { opacity:1; }
.lw .ry[data-at="0"] .c.w rect { stroke:var(--accent); stroke-width:2; }
.lw .ry .c.read rect { fill:var(--hot-bg); stroke:var(--hot); }
.lw .ry .c.pick rect { fill:var(--accent-bg); stroke:var(--accent); stroke-width:2; }
.lw .ry .c.dim { opacity:.35; }
.lw .ry .page { fill:var(--cell); fill-opacity:.45; stroke:var(--line); }
.lw .ry .strip { fill:var(--cell); fill-opacity:.4; stroke:var(--line); stroke-width:1; }
.lw .ry .ruler { transform-box:fill-box; transform-origin:left; }
.lw .ry .st.on .ruler { animation:ry-grow .8s cubic-bezier(.4,0,.2,1) both; }
.lw .ry .st.on .ruler.need { animation-delay:.5s; }
@keyframes ry-grow { from { transform:scaleX(0); } to { transform:scaleX(1); } }
.lw .ry .rest { fill:var(--hot-bg); stroke:var(--hot); stroke-width:1; }
.lw .ry .need { fill:var(--accent); }
.lw .ry .meter { transform-box:fill-box; transform-origin:left; transform:scaleX(0); transition:transform 1.4s cubic-bezier(.4,0,.2,1); }
.lw .ry .meter.go { transform:scaleX(1); }
.lw .ry .track { fill:var(--cell); }
.lw .ry .rule { stroke:var(--line); stroke-width:1; }
.lw .ry .play { cursor:pointer; } .lw .ry .st.on .play { pointer-events:auto; }
.lw .ry .play rect { fill:var(--accent); stroke:none; } .lw .ry .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .ry .play.busy { opacity:.45; pointer-events:none; }
`;

const cell = (set, r, k) => {
  const [x, y] = set === "B" ? inRows(r, k) : inCols(false)(r, k);
  return `<g class="c ${set} r${r} k${k} ${WANTED.includes(k) ? "w" : ""}" data-r="${r}" data-k="${k}" style="transform:translate(${x}px, ${y}px)">
  <rect width="${COLS[k][1] - 2}" height="24" rx="4"/><text x="${(COLS[k][1] - 2) / 2}" y="13">${ROWS[r][k]}</text></g>`;
};
const cells = (set) => ROWS.map((_, r) => COLS.map((_, k) => cell(set, r, k)).join("")).join("");

const rowZone = (cap) => `<rect class="zone" x="26" y="10" width="708" height="136" rx="12"/>${t(42, 29, cap, "cap")}
  <rect class="page" x="44" y="40" width="${off(6) + 28}" height="100" rx="8"/>`;

// The column store: one name and one strip per column, the strips drawn apart from each other.
const strips = (top, mark) => COLS.map(([c, w], k) => {
  const y = (top ? 50 : 196) + k * 28, acc = mark && WANTED.includes(k) ? "acc" : "";
  return `<rect class="strip" x="168" y="${y - 1}" width="${3 * (w + 8) + 8}" height="26" rx="7"/>${t(42, y + 12, c, `mono l ${acc}`)}`;
}).join("");
const colZone = (y, h) => `<rect class="zone" x="26" y="${y}" width="708" height="${h}" rx="12"/>${t(42, y + 19, "COLUMN STORE — EACH COLUMN TOGETHER", "cap")}`;

// One row of 234 bytes drawn to scale: the 13 the query needs, and the rest the page brings anyway.
const ruler = (D) => {
  const x = 42, w = 676, need = Math.round((w * D.needBytes) / D.rowBytes);
  return `<rect class="zone" x="26" y="156" width="708" height="98" rx="12"/>${t(42, 175, `ONE ROW, DRAWN TO SCALE — ${D.rowBytes} BYTES`, "cap")}
  <rect class="ruler rest" x="${x}" y="190" width="${w}" height="24" rx="5"/>
  <rect class="ruler need" x="${x}" y="190" width="${need}" height="24" rx="5"/>
  ${t(x, 236, D.needBytes + " bytes the query needs", "lbl l acc")}${t(x + w, 236, "the rest of the row, brought anyway", "lbl r hot")}`;
};

const rowsStep = (D) => on("0", `${rowZone("ROW STORE — A PAGE OF WHOLE ROWS")}
  ${t(472, 66, D.needBytes + " of " + D.rowBytes, "huge l acc")}${t(472, 94, "bytes of each row the query needs", "lbl l")}
  ${t(472, 118, "the page brings the whole row", "lbl l")}${ruler(D)}`);

const meters = (D) => on("2", `<rect class="zone" x="26" y="376" width="708" height="96" rx="12"/>${t(42, 395, "BYTES READ — THE MONTHLY AVERAGE, 25.9 MILLION ROWS", "cap")}
  <g class="play"><rect x="618" y="382" width="100" height="32" rx="16"/><text x="668" y="399">▶ Play</text></g>
  ${t(42, 427, "row store", "l")}<rect class="track" x="170" y="418" width="400" height="18" rx="4"/>
  <rect class="bar warm meter m0" x="170" y="418" width="400" height="18" rx="4"/>
  <g class="done d0" opacity="0">${t(584, 428, fmt(D.rowMb) + " MB", "big l hot")}</g>
  ${t(42, 455, "column store", "l acc")}<rect class="track" x="170" y="446" width="400" height="18" rx="4"/>
  <rect class="bar on meter m1" x="170" y="446" width="${Math.max(4, Math.round((400 * D.colMb) / D.rowMb))}" height="18" rx="4"/>
  <g class="done d1" opacity="0">${t(584, 456, D.colMb + " MB", "big l acc")}${t(190, 456, "three columns only", "lbl l acc")}</g>`);

const ROW_PRICE = () => [["one row: find it, change it", ["fast: one record, one page", "acc"], ["slow: a value in every column", "hot"]],
  ["many rows, a few columns", ["slow: every page, whole", "hot"], ["fast: those columns only", "acc"]]];
const price = (D) => on("3", `<rect class="zone" x="26" y="376" width="708" height="96" rx="12"/>
  ${t(270, 395, "ROW STORE", "cap")}${t(500, 395, "COLUMN STORE", "cap")}<path class="rule" d="M42 408 H718 M42 438 H718"/>
  ${ROW_PRICE().map(([what, [a, ca], [b, cb]], i) => `${t(42, 424 + i * 30, what, "l")}${t(270, 424 + i * 30, a, "l " + ca)}${t(500, 424 + i * 30, b, "l " + cb)}`).join("")}`);

const rowNotes = () => `${on("2", t(718, 29, "every record is read whole", "lbl r hot"))}${on("3", t(718, 29, "one record, read whole", "lbl r acc"))}`;

const scene = (D) => `<svg viewBox="0 0 760 ${HEIGHT[0]}">
  ${rowsStep(D)}
  ${on("1", `${colZone(10, 216)}${strips(true, false)}`)}
  ${from(2, `${rowZone("ROW STORE — WHOLE ROWS")}${colZone(156, 210)}${strips(false, true)}`)}${rowNotes()}
  ${meters(D)}${price(D)}
  ${cells("A")}${cells("B")}</svg>`;

// Set A moves: rows in a page (step 0), columns on top (1), columns under the rows (2, 3).
function place(root, at) {
  root.querySelectorAll(".c.A").forEach((g) => {
    const [r, k] = [Number(g.dataset.r), Number(g.dataset.k)];
    const [x, y] = at === 0 ? inRows(r, k) : inCols(at === 1)(r, k);
    g.style.transform = `translate(${x}px, ${y}px)`;
  });
  root.querySelector("svg").setAttribute("viewBox", `0 0 760 ${HEIGHT[at]}`);
}

const mark = (root, sel, cls) => root.querySelectorAll(sel).forEach((e) => e.classList.add(cls));

function reset(root) {
  root.dataset.run = String(Number(root.dataset.run || 0) + 1);
  root.querySelectorAll(".c").forEach((e) => e.classList.remove("read", "pick", "dim"));
  root.querySelectorAll(".meter").forEach((e) => e.classList.remove("go"));
  root.querySelectorAll(".done").forEach((e) => { e.style.opacity = 0; e.style.transition = "opacity .6s"; });
  root.querySelector(".play").classList.remove("busy");
}

// One run: the row store reads every record whole, then the column store reads three strips.
function play(root) {
  reset(root);
  const run = root.dataset.run, button = root.querySelector(".play");
  const later = (ms, act) => setTimeout(() => root.dataset.run === run && act(), ms);
  button.classList.add("busy");
  later(150, () => root.querySelector(".m0").classList.add("go"));
  ROWS.forEach((_, r) => later(200 + r * 380, () => mark(root, `.c.B.r${r}`, "read")));
  later(1600, () => { root.querySelector(".d0").style.opacity = 1; });
  later(2000, () => { mark(root, ".c.A.w", "pick"); mark(root, ".c.A:not(.w)", "dim"); root.querySelector(".m1").classList.add("go"); });
  later(3300, () => { root.querySelector(".d1").style.opacity = 1; button.classList.remove("busy"); });
}

function after(root, at) {
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.querySelector(".play").addEventListener("click", () => root.dataset.at === "2" && play(root));
  }
  place(root, at);
  if (root.dataset.shown === String(at)) return;
  root.dataset.shown = String(at);
  reset(root);
  if (at === 3) { mark(root, ".c.r0", "pick"); mark(root, ".c.A:not(.r0)", "dim"); }
}

export default widget({ key: "ry", label: "Rows in a page, columns together", css: extra("ry") + CSS, steps, scene, captured: CAPTURED, after });
