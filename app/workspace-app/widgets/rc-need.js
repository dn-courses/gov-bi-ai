// rc-need — the need: a question about a few rows is answered from a few pages through an index; the
// monthly average wants every row, so every page is read and the index is left unused.
// Measured 2026-11-23 on the Day-1 lab (PostgreSQL 18, `station_status`, 90 days):
//   size        this Scene's first cell: count(*), pg_relation_size / 8192, pg_size_pretty -> 25,920,000
//               rows, 777,600 pages, 6075 MB (re-measured 2026-11-23; rows sit on pages 0–777,594)
//   per page    25,920,000 / 777,600 = 33.3 rows (page 0 holds 35)
//   one station EXPLAIN (ANALYZE, BUFFERS) avg(bikes_available), station 42 on 2026-08-01:
//               Index Scan, 288 rows, Buffers 16 (hit 10, read 6), 0.12 ms (1.4 ms when read cold)
//   every row   EXPLAIN (ANALYZE, BUFFERS) the monthly average: Parallel Seq Scan, Buffers hit 1,791 + read 775,809 = 777,600 at the
//               scan node, 18 rows out, the index present and unused
import { arrow, extra, fmt, on, t, widget } from "./col-lib.js";

const CAPTURED = { rows: 25920000, pages: 777600, mb: 6075, perPage: 33, dayRows: 288, dayPages: 16, dayMs: "0.1", out: 18 };

const steps = (D) => [
  { stop: "The table", title: `The table: ${fmt(D.pages)} pages`,
    note: `<code>station_status</code>: ${fmt(D.rows)} readings, one per station per poll, in ${fmt(D.pages)} pages, ${fmt(D.mb)} MB. The business question is about every one of them.` },
  { stop: "A few rows", title: "One station, one day: the index skips the rest",
    note: `${D.dayRows} rows. The index says which pages hold them, so ${D.dayPages} pages of ${fmt(D.pages)} are read, in about ${D.dayMs} ms.` },
  { stop: "Every row", title: "The monthly average: there is nothing to skip", decisive: true,
    note: `The business question, the average per month and system, is about every row. Press <b>Play</b>: the scan reads every page, ${fmt(D.mb)} MB, to return ${D.out} rows. The index is still there and unused: it skips rows, and here no row can be skipped.` },
];

const CSS = `
.lw .rn text.cap { font-size:12px; }
.lw .rn .pg { fill:var(--cell); stroke:var(--line); stroke-width:1; transition:fill .35s, stroke .35s, opacity .5s; }
.lw .rn .rw { stroke:var(--mute); stroke-width:1.5; stroke-linecap:round; opacity:.5; }
.lw .rn[data-at="1"] .pg { opacity:.35; }
.lw .rn[data-at="1"] .pg.lit { opacity:1; stroke:var(--accent); stroke-width:2; fill:var(--accent-bg); }
.lw .rn[data-at="0"] .pg.zm { stroke:var(--accent); stroke-width:2; fill:var(--accent-bg); }
.lw .rn .pg.read { fill:var(--hot-bg); stroke:var(--hot); }
.lw .rn .slv { fill:var(--accent); opacity:0; transition:opacity .5s; }
.lw .rn[data-at="1"] .slv { opacity:1; }
.lw .rn .lens { fill:var(--accent); opacity:.07; }
.lw .rn .lens-edge { stroke:var(--accent); stroke-width:1; opacity:.55; fill:none; }
.lw .rn .card { fill:var(--cell); stroke:var(--accent); stroke-width:1.5; filter:drop-shadow(0 4px 10px rgba(0,0,0,.25)); }
.lw .rn .seg { fill:var(--panel); stroke:var(--mute); stroke-opacity:.6; stroke-width:1; }
.lw .rn .st.on .rec { animation:rn-in .45s cubic-bezier(.3,.7,.3,1) both; }
@keyframes rn-in { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:none; } }
.lw .rn .pill.dim { opacity:.45; }
.lw .rn .track { fill:var(--cell); }
.lw .rn .prog { fill:var(--hot); transform-box:fill-box; transform-origin:left; transform:scaleX(0); transition:transform .25s linear; }
.lw .rn .done { opacity:0; transition:opacity .6s; } .lw .rn .done.shown { opacity:1; }
.lw .rn .play { cursor:pointer; } .lw .rn .st.on .play { pointer-events:auto; }
.lw .rn .play rect { fill:var(--accent); stroke:none; } .lw .rn .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .rn .play.busy { opacity:.45; pointer-events:none; }
`;

// The table as 56 tiles, 28 to a line; each tile stands for about 13,900 pages.
const TILES = 56, tx = (i) => 42 + (i % 28) * 24, ty = (i) => 40 + Math.floor(i / 28) * 40;
const LIT = 37; // the tile that holds station 42's day
const ZOOM = 28; // the tile drawn large on the first step
const tile = (i) => `<rect class="pg ${i === LIT ? "lit" : ""} ${i === ZOOM ? "zm" : ""}" x="${tx(i)}" y="${ty(i)}" width="20" height="32" rx="4"/>
  ${[49, 56, 63].map((d) => `<path class="rw" d="M${tx(i) + 5} ${ty(i) + d - 40} h10"/>`).join("")}`;

// One row as its 15 columns. Widths are a sketch of each column's share of the 234 bytes of a row.
const SHARE = [6, 6, 10, 4, 4, 4, 4, 4, 6, 10, 34, 100, 36, 6, 6];
const record = (x, y, i) => {
  let at = x;
  const segs = SHARE.map((w) => { const s = `<rect class="seg" x="${at}" y="${y}" width="${w * 1.2}" height="14" rx="2"/>`; at += w * 1.2; return s; });
  return `<g class="rec" style="animation-delay:${0.15 + i * 0.08}s">${segs.join("")}</g>`;
};

// A magnifying wedge from the small tile to the large page card.
const lens = (x, y, cx, cy, cw) => `<path class="lens" d="M${x} ${y} L${x + 20} ${y} L${cx + cw} ${cy} L${cx} ${cy} Z"/>
  <path class="lens-edge" d="M${x} ${y} L${cx} ${cy} M${x + 20} ${y} L${cx + cw} ${cy}"/>`;

const stats = (big, sub, mid, foot, cls = "") => `${t(430, 196, big, "huge l " + cls)}${t(430, 224, sub, "lbl l")}
  ${t(430, 264, mid, "h l")}${t(430, 290, foot, "lbl l")}`;

const page = (D) => on("0", `<rect class="zone" x="26" y="140" width="708" height="190" rx="12"/>
  ${lens(tx(ZOOM), ty(ZOOM) + 32, 44, 156, 344)}
  <rect class="card" x="44" y="156" width="344" height="162" rx="10"/>${t(62, 176, "ONE PAGE", "cap")}
  ${[192, 212, 232, 252, 272].map((y, i) => record(62, y, i)).join("")}
  ${t(216, 302, "· · · about " + D.perPage + " whole rows", "lbl")}
  ${stats(fmt(D.rows) + " rows", "one per station per poll", fmt(D.pages) + " pages · " + fmt(D.mb) + " MB", "each row whole: all 15 columns side by side")}`);

const few = (D) => on("1", `<rect class="zone" x="26" y="140" width="708" height="190" rx="12"/>${t(42, 159, "ONE STATION, ONE DAY", "cap")}
  <rect class="pill hit" x="118" y="204" width="300" height="44" rx="22"/>${t(268, 227, "index (station_id, captured_at)", "acc")}
  ${arrow(tx(LIT) + 10, 202, tx(LIT) + 10, 118)}
  ${t(268, 276, "it points straight at the pages", "lbl")}${t(268, 298, "that hold station 42's day", "lbl")}
  ${stats(D.dayPages + " pages", "of " + fmt(D.pages) + ", found through the index", D.dayRows + " rows · about " + D.dayMs + " ms", "every other page is never opened", "acc")}`);

const every = (D) => on("2", `<rect class="zone" x="26" y="140" width="708" height="190" rx="12"/>${t(42, 159, "GROUP BY month, system_id — EVERY ROW", "cap")}
  <g class="play"><rect x="42" y="178" width="100" height="34" rx="17"/><text x="92" y="196">▶ Play</text></g>
  <text class="huge l hot" x="170" y="194"><tspan class="n">0</tspan></text>${t(170, 222, "of " + fmt(D.pages) + " pages read", "lbl l")}
  <g class="done">${t(718, 194, fmt(D.mb) + " MB read", "h r hot")}${t(718, 222, "for an answer of " + D.out + " rows", "lbl r")}</g>
  <rect class="track" x="42" y="240" width="676" height="8" rx="4"/><rect class="prog" x="42" y="240" width="676" height="8" rx="4"/>
  <rect class="pill dim" x="42" y="270" width="270" height="38" rx="19"/>${t(177, 290, "index (station_id, captured_at)", "dim")}
  ${t(330, 290, "still there, unused: every row is wanted", "lbl l")}`);

const scene = (D) => `<svg viewBox="0 0 760 340">
  <rect class="zone" x="26" y="10" width="708" height="118" rx="12"/>${t(42, 26, `station_status — ${fmt(D.pages)} PAGES, ${fmt(D.mb)} MB`, "cap")}
  ${t(718, 26, "a tile: about 13,900 pages", "lbl r")}
  ${Array.from({ length: TILES }, (_, i) => tile(i)).join("")}<rect class="slv" x="${tx(LIT)}" y="${ty(LIT) + 12}" width="20" height="4" rx="1"/>
  ${page(D)}${few(D)}${every(D)}</svg>`;

// One run of the scan: the tiles are read left to right, the page count and the bar rising with them.
function play(root, D) {
  const tiles = [...root.querySelectorAll(".pg")], n = root.querySelector(".n"), button = root.querySelector(".play");
  const prog = root.querySelector(".prog");
  reset(root);
  const run = root.dataset.run;
  button.classList.add("busy");
  tiles.forEach((tile, i) => setTimeout(() => {
    if (root.dataset.run !== run) return;
    tile.classList.add("read");
    n.textContent = fmt(Math.round((D.pages * (i + 1)) / tiles.length));
    prog.style.transform = `scaleX(${(i + 1) / tiles.length})`;
    if (i < tiles.length - 1) return;
    button.classList.remove("busy"); root.querySelector(".done").classList.add("shown");
  }, 200 + i * 55));
}

function reset(root) {
  root.dataset.run = String(Number(root.dataset.run || 0) + 1);
  root.querySelectorAll(".read").forEach((e) => e.classList.remove("read"));
  root.querySelector(".done").classList.remove("shown");
  root.querySelector(".play").classList.remove("busy");
  root.querySelector(".n").textContent = "0";
  root.querySelector(".prog").style.transform = "scaleX(0)";
}

function after(root, at) {
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.querySelector(".play").addEventListener("click", () => root.dataset.at === "2" && play(root, CAPTURED));
  }
  if (root.dataset.shown !== String(at)) { root.dataset.shown = String(at); reset(root); }
}

export default widget({ key: "rn", label: "The need: an aggregation reads every page", css: extra("rn") + CSS, steps, scene, captured: CAPTURED, after });
