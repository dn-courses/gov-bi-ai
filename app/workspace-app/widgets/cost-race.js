// cost-race — the column store on its own ground: the monthly average on the same 25,920,000 rows,
// PostgreSQL and DuckDB one core each (Play: the bars fill at the speed of the measured runs), then
// DuckDB on every core; then each gap attributed to what changed, and BigQuery's fan-out measured
// per worker. Adapted from col-exec-race.
// Measured 2026-11-23 through the app's /api/cell, this page's cells, inside one semaphore call each,
// three or four runs (Postgres capped at 3 CPUs, the app's DuckDB on 12 threads):
// Re-measured 2026-11-23 after page 01 rewrote station_status.parquet sorted by (station_id, captured_at),
// 346,091,490 bytes, in one semaphore call:
//   Postgres, max_parallel_workers_per_gather = 0, Seq Scan: 3.47-3.99 s warm (6.6 s cold),
//   777,595 pages of 8 kB (6 GB)
//   DuckDB threads = 1 on station_status.parquet: 1.30-1.45 s, Data Read 174.4 MB
//   DuckDB, every thread: 0.246-0.305 s
// BigQuery on 1,803,699,574 rows: 46.1 GB, about 2 s elapsed, 2,281 slot-seconds (about 38 slot-minutes), 3,060 parallel
// inputs (day1-reference/_measurements.md). Rates: 25.92M / 1.33 s = 19.5M rows a second;
// 1.8037B / 2,281 slot-seconds = 0.79M.
import { extra, fmt, on, t, widget, zone } from "./col-lib.js";

const CAPTURED = {
  rows: 25920000, bqRows: 1803699574, inputs: 3060,
  lanes: [
    { name: "PostgreSQL", how: "heap table, one core", read: "6 GB read", s: 3.6, label: "about 3.6 s", cls: "warm" },
    { name: "DuckDB", how: "Parquet file, threads = 1", read: "174 MB read", s: 1.33, label: "about 1.3 s", cls: "on" },
    { name: "DuckDB", how: "the same file, every core", read: "174 MB read", s: 0.27, label: "about 0.3 s", cls: "on" },
  ],
  bqS: 2, max: 4, coreRate: 19.5, slotRate: 0.79,
};

const steps = (D) => [
  { stop: "One core each", title: "The monthly average, one core each", decisive: true,
    note: `Press <b>Play</b>: the bars fill at the speed of the measured runs. ${fmt(D.rows)} rows, three columns used, nothing changed: the column store's ground.` },
  { stop: "Every core", title: "Then DuckDB gets every core of the laptop",
    note: `<b>${D.lanes[2].label}</b> for 26 million rows on one laptop. Data this size needs no cluster.` },
  { stop: "Attributed", title: "What each second was spent on",
    note: `Each gap has a cause: the column file and its batches took 3.6 s to 1.3 s, the cores took 1.3 s to 0.3 s. BigQuery reads 70 times the rows in about ${D.bqS} s by fanning out.` },
  { stop: "Per worker", title: "Fan-out buys time, not efficiency",
    note: `One laptop core gets through about <b>${D.coreRate} million</b> rows a second; one BigQuery slot about <b>${D.slotRate} million</b>. The warehouse is fast because it uses thousands of slots, and you pay for them.` },
];

const CSS = extra("crc") + `
.lw .crc text.cap { font-size:12px; }
.lw .crc .fill { transform-box:fill-box; transform-origin:left center; transform:scaleX(0); transition:transform 0s linear; }
.lw .crc .track { fill:var(--cell); }
.lw .crc .rule { stroke:var(--line); stroke-width:1; }
.lw .crc .play { cursor:pointer; pointer-events:none; }
.lw .crc .st.on .play { pointer-events:auto; }
.lw .crc .play rect { fill:var(--accent); } .lw .crc .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .crc .play.busy { opacity:.45; pointer-events:none; }
.lw .crc .tm { opacity:0; transition:opacity .4s; } .lw .crc .tm.done { opacity:1; }
.lw .crc text.clock { font:700 20px ui-monospace, Menlo, monospace; fill:var(--ink); }
.lw .crc text.cause { font:13px ui-monospace, Menlo, monospace; fill:var(--accent); text-anchor:start; }
.lw .crc text.inbar { font:700 18px ui-monospace, Menlo, monospace; fill:var(--accent-ink); }
.lw .crc text.giant { font:700 40px ui-monospace, Menlo, monospace; }
`;

// ── steps 0-1: the race ────────────────────────────────────────────────────────────────────────
const TX = 236, TW = 360, laneY = (i) => 90 + i * 74;
const lane = (D, l, i) => { const w = (TW * l.s) / D.max, tone = l.cls === "on" ? "acc" : "hot";
  return t(30, laneY(i) - 4, l.name, `l h ${tone}`) + t(30, laneY(i) + 18, l.how, "lbl l") + t(30, laneY(i) + 38, l.read, "mono l dim")
    + `<rect class="track" x="${TX}" y="${laneY(i) - 15}" width="${TW}" height="26" rx="13"/>`
    + `<rect class="bar fill ${l.cls}" data-i="${i}" x="${TX}" y="${laneY(i) - 15}" width="${w}" height="26" rx="${Math.min(13, w / 2)}"/>`
    + `<text class="big l tm ${tone}" data-i="${i}" x="${TX + 12 + w}" y="${laneY(i) - 1}">${l.label}</text>`; };
const race = (D) => on("0 1", zone(14, 10, 732, 310, `MONTHLY AVERAGE PER SYSTEM — ${fmt(D.rows)} ROWS — ONE LAPTOP`)
  + `<g class="play"><rect x="634" y="18" width="96" height="30" rx="15"/><text x="682" y="34">▶ Play</text></g>`
  + t(652, 302, "elapsed", "lbl r") + t(730, 302, "0.0 s", "clock r")
  + lane(D, D.lanes[0], 0) + lane(D, D.lanes[1], 1) + on("1", lane(D, D.lanes[2], 2)));

// ── step 2: the attribution ────────────────────────────────────────────────────────────────────
const BILL = (D) => [
  ["PostgreSQL, one core", "the start: whole rows, one at a time", D.lanes[0].s, D.lanes[0].label, "warm"],
  ["DuckDB, one core", "column file: 174 MB read, batches of values", D.lanes[1].s, D.lanes[1].label, "on"],
  ["DuckDB, every core", "the cores of one machine", D.lanes[2].s, D.lanes[2].label, "on"],
  ["BigQuery, 70 × the rows", `fan-out: ${fmt(D.inputs)} parallel inputs`, D.bqS, `about ${D.bqS} s`, "on"],
];
const billRow = ([what, cause, s, label, cls], i, D) => { const y = 58 + i * 62, w = Math.max(6, (s / D.max) * 230);
  return (i ? `<path class="rule" d="M30 ${y - 26} L730 ${y - 26}"/>` : "") + t(30, y, what, "l") + t(30, y + 20, cause, "cause")
    + `<rect class="bar ${cls}" x="400" y="${y - 3}" width="${w}" height="22" rx="${Math.min(11, w / 2)}"/>` + t(412 + w, y + 9, label, `big l ${cls === "warm" ? "hot" : "acc"}`); };
const bill = (D) => on("2", zone(14, 10, 732, 310, "THE SAME QUESTION — ELAPSED TIME, TO SCALE")
  + BILL(D).map((row, i) => billRow(row, i, D)).join("")
  + t(30, 302, "on one machine: the layout and the batches, then the cores; beyond it, more machines", "lbl l"));

// ── step 3: rows a second, one worker each ─────────────────────────────────────────────────────
const RX = 340, RW = 390;
const rate = (D) => on("3", zone(14, 10, 732, 310, "ROWS A SECOND, FOR ONE WORKER")
  + t(30, 74, "one laptop core", "l h") + t(30, 96, `${fmt(D.rows)} rows in ${D.lanes[1].s} s`, "lbl l")
  + `<rect class="bar on" x="${RX}" y="66" width="${RW}" height="32" rx="16"/>` + t(RX + RW - 16, 83, `${D.coreRate} M`, "inbar r")
  + t(30, 154, "one BigQuery slot", "l h") + t(30, 176, "1.8 billion rows in 2,281 slot-seconds", "lbl l")
  + `<rect class="bar warm" x="${RX}" y="146" width="${(RW * D.slotRate) / D.coreRate}" height="32" rx="8"/>` + t(RX + 30, 163, `${D.slotRate} M`, "big l hot")
  + `<path class="rule" d="M30 212 L730 212"/>`
  + t(30, 262, `${Math.round(D.coreRate / D.slotRate)}×`, "giant l acc")
  + t(130, 254, "more rows a second on the laptop core;", "l") + t(130, 276, "the warehouse wins by having thousands of slots", "lbl l"));

const scene = (D) => `<svg viewBox="0 0 760 330">${race(D)}${bill(D)}${rate(D)}</svg>`;

function play(root, D) {
  const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, at = Number(root.dataset.at);
  reset(root);
  const lanes = D.lanes.filter((_, i) => i < 2 || at === 1), button = root.querySelector(".play"), clock = root.querySelector(".clock");
  const end = Math.max(...lanes.map((l) => l.s)), start = performance.now();
  button.classList.add("busy");
  requestAnimationFrame(() => lanes.forEach((l, i) => {
    const bar = root.querySelector(`.fill[data-i="${i}"]`);
    bar.style.transitionDuration = still ? "0s" : `${l.s}s`;
    bar.style.transform = "scaleX(1)";
    root._timers.push(setTimeout(() => root.querySelector(`.tm[data-i="${i}"]`).classList.add("done"), still ? 0 : l.s * 1000));
  }));
  root._clock = setInterval(() => {
    const s = still ? end : Math.min(end, (performance.now() - start) / 1000);
    clock.textContent = `${s.toFixed(1)} s`;
    if (s >= end) { clearInterval(root._clock); button.classList.remove("busy"); }
  }, 100);
}

function reset(root) {
  (root._timers || []).forEach(clearTimeout);
  clearInterval(root._clock);
  root._timers = [];
  root.querySelectorAll(".fill").forEach((b) => { b.style.transitionDuration = "0s"; b.style.transform = "scaleX(0)"; });
  root.querySelectorAll(".tm").forEach((x) => x.classList.remove("done"));
  root.querySelector(".play").classList.remove("busy");
  root.querySelector(".clock").textContent = "0.0 s";
}

function after(root) {
  if (!root.dataset.bound) { root.dataset.bound = "1"; root.querySelector(".play").addEventListener("click", () => Number(root.dataset.at) < 2 && play(root, CAPTURED)); }
  reset(root);
}

export default widget({ key: "crc", label: "The column store's ground", css: CSS, steps, scene, captured: CAPTURED, after });
