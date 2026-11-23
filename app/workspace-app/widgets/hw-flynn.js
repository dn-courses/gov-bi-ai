// hw-flynn — Flynn's four classes as a 2×2 grid (one or many instructions × one or many values), lit
// a cell at a time, each with a small animation of its own: one adder taking one value at a time,
// one instruction adding several values at once, many cores each on their own work, and the empty cell.
import { extra, on, t, widget, zone } from "./col-lib.js";

// The values are bikes_available of rows (600000,1)…(600000,16) of station_status, from this page's
// cell on page 600000 (2026-11-23). The 12 cores and the CPU's SIMD ("asimd") are from this page's
// cells on the postgres lab: nproc 12, DuckDB threads 12, /proc/cpuinfo flags.
const CAPTURED = { a: [11, 12, 11, 11, 11, 13, 11, 12], b: [8, 12, 10, 9, 8, 11, 11, 11], cores: 12, simd: "asimd" };

const steps = (D) => [
  { stop: "The grid", title: "Two questions sort every computer",
    note: "How many <b>instructions</b> run at the same moment, and how many <b>values</b> does each one work on? One or many, twice: four classes, named by Michael Flynn." },
  { stop: "SISD", title: "SISD: one instruction, one value",
    note: `One add, one value at a time: ${D.a.join(" + ")}. Eight values, eight steps. This is how a plain loop works through a column.` },
  { stop: "SIMD", title: "SIMD: one instruction on many values side by side",
    note: `One instruction adds several pairs of values at once: the values sit side by side, and one add handles them all. This CPU's SIMD instructions are called <code>${D.simd}</code>.` },
  { stop: "MIMD", title: "MIMD: many cores, each on its own data",
    note: `${D.cores} cores, each running its own instructions on its own data, at the same time. Many machines on a network are MIMD too. An analytical engine is built to use both: SIMD inside a core, and every core it is given.` },
  { stop: "MISD", title: "MISD exists in name only",
    note: "Many instructions on the same single value: no ordinary computer is built this way. The name is there to complete the grid." },
];

const CSS = extra("hf") + `
.lw .hf text.cap { font-size:12px; }
.lw .hf .cl rect { fill:var(--cell); stroke:var(--line); transition:fill .5s, stroke .5s; }
.lw .hf .cl text.h { fill:var(--mute); transition:fill .5s; }
.lw .hf[data-at="1"] .c1 rect, .lw .hf[data-at="2"] .c2 rect, .lw .hf[data-at="3"] .c3 rect { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .hf[data-at="1"] .c1 text.h, .lw .hf[data-at="2"] .c2 text.h, .lw .hf[data-at="3"] .c3 text.h { fill:var(--accent); }
.lw .hf[data-at="4"] .c4 rect { stroke:var(--mute); stroke-dasharray:5 5; }
.lw .hf .v { transition:opacity .35s; }
.lw .hf .v rect { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; transition:fill .3s, stroke .3s; }
.lw .hf .v text { font:600 15px ui-monospace, Menlo, monospace; }
.lw .hf .v.now rect { fill:var(--accent); } .lw .hf .v.now text { fill:var(--accent-ink); }
.lw .hf .v.done { opacity:.35; }
.lw .hf .feed { fill:none; stroke:var(--accent); stroke-width:2.5; stroke-linecap:round; opacity:0; transition:opacity .2s; }
.lw .hf .feed.on { opacity:1; }
.lw .hf .unit { fill:var(--accent); transition:opacity .3s; } .lw .hf .unit.flash { opacity:.6; }
.lw .hf text.unit-t { fill:var(--accent-ink); font:700 22px system-ui, sans-serif; } .lw .hf text.unit-s { fill:var(--accent-ink); font:700 16px system-ui, sans-serif; }
.lw .hf .res { opacity:0; transition:opacity .4s; } .lw .hf .res.on { opacity:1; }
.lw .hf .res .v rect { fill:var(--ok-bg); stroke:var(--ok); }
.lw .hf .acc-box { fill:var(--ok-bg); stroke:var(--ok); stroke-width:1.5; }
.lw .hf .tcell { fill:var(--cell); stroke:var(--line); transition:fill .25s, stroke .25s; } .lw .hf .tcell.on { fill:var(--accent); stroke:var(--accent); }
.lw .hf .core rect.cr { fill:var(--cell); stroke:var(--line); transition:fill .3s, stroke .3s; }
.lw .hf .core.on rect.cr { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .hf .cb { fill:var(--accent); transform-box:fill-box; transform-origin:left center; transform:scaleX(0); }
.lw .hf .core.on .cb { transform:scaleX(1); transition:transform var(--t) linear; }
.lw .hf .chip { fill:var(--cell); stroke:var(--accent); stroke-width:1.5; } .lw .hf text.chipt { fill:var(--accent); font:600 14px system-ui, sans-serif; }
.lw .hf .ghost { fill:none; stroke:var(--mute); stroke-width:1.5; stroke-dasharray:5 5; }
`;

// The grid: cells c1 SISD, c2 SIMD (one instruction), c4 MISD, c3 MIMD (many instructions).
const CELLS = [["c1", "SISD", 112, 72], ["c2", "SIMD", 214, 72], ["c4", "MISD", 112, 168], ["c3", "MIMD", 214, 168]];
const LONG = ["", "single instruction, single data", "single instruction, multiple data", "multiple instruction, multiple data", "multiple instruction, single data"];
const grid = () => `${zone(14, 14, 320, 312, "FLYNN'S FOUR CLASSES")}
  ${t(160, 56, "one value", "lbl")}${t(262, 56, "many values", "lbl")}
  ${t(64, 108, "one", "lbl")}${t(64, 126, "instruction", "lbl")}${t(64, 204, "many", "lbl")}${t(64, 222, "instructions", "lbl")}
  ${CELLS.map(([c, name, x, y]) => `<g class="cl ${c}"><rect x="${x}" y="${y}" width="96" height="88" rx="10"/>${t(x + 48, y + 44, name, "h")}</g>`).join("")}
  ${LONG.map((s, i) => (s ? on(String(i), t(174, 296, s, "lbl acc")) : "")).join("")}`;

const R = 374; // left edge of the detail panel's drawing
const token = (v, x, y, cls = "v") => `<g class="${cls}" data-x="${x}" data-y="${y}" style="transform:translate(${x}px,${y}px)">
  <rect width="38" height="30" rx="6"/>${t(19, 16, v)}</g>`;
const row8 = (vals, y, cls) => vals.map((v, i) => token(v, R + i * 44, y, cls)).join("");
const chip = (x, y, w, s) => `<rect class="chip" x="${x}" y="${y}" width="${w}" height="28" rx="14"/>${t(x + w / 2, y + 15, s, "chipt")}`;

const intro = () => on("0", `${t(R, 52, "How many instructions at the same moment?", "h l")}
  ${chip(R, 70, 64, "one")}${chip(R + 76, 70, 74, "many")}${t(R + 166, 85, "→ the rows of the grid", "lbl l")}
  ${t(R, 146, "How many values does each one work on?", "h l")}
  ${chip(R, 164, 64, "one")}${chip(R + 76, 164, 74, "many")}${t(R + 166, 179, "→ the columns", "lbl l")}
  ${t(R, 244, "READING THE NAMES", "cap l")}${t(R, 270, "S single · M multiple", "mono l")}${t(R, 294, "I instruction · D data", "mono l")}`);

const sisd = (D) => on("1", `${t(R, 38, "EIGHT VALUES, ONE AT A TIME", "cap l")}
  <g class="sisd">${row8(D.a, 52)}</g>
  <path class="feed" d="M0 0"/><circle class="unit" cx="470" cy="168" r="28"/>${t(470, 169, "+", "unit-t")}${t(470, 214, "one add", "lbl")}
  <path class="edge on" d="M502 168 L566 168"/>
  ${t(644, 132, "running total", "lbl")}<rect class="acc-box" x="572" y="146" width="144" height="44" rx="10"/>${t(644, 169, "0", "huge ok sum")}
  ${t(R, 250, "TIME", "cap l")}${Array.from({ length: 8 }, (_, i) => `<rect class="tcell" x="${R + i * 44}" y="262" width="38" height="16" rx="4"/>`).join("")}
  ${t(R, 302, "step 0 of 8", "lbl l stepn")}`);

// Four values side by side, four more under them, one add for all four pairs.
const four = (vals, y) => vals.slice(0, 4).map((v, i) => token(v, R + 70 + i * 64, y)).join("");
const simd = (D) => on("2", `${t(R, 40, "ONE INSTRUCTION, SEVERAL VALUES", "cap l")}
  <g class="simd">${four(D.a, 62)}${four(D.b, 112)}</g>
  <rect class="unit simd-u" x="${R + 54}" y="164" width="264" height="34" rx="17"/>${t(R + 186, 182, "+  one instruction", "unit-s")}
  <g class="res">${four(D.a.map((v, i) => v + D.b[i]), 216)}</g>
  ${t(R + 186, 284, "four adds, done as one", "lbl")}`);

const OPS = ["+", "max", "<", "count", "×", "min", "+", "=", "max", "−", "count", "<"];
const core = (i) => { const x = R + (i % 4) * 90, y = 52 + Math.floor(i / 4) * 70;
  return `<g class="core" data-i="${i}" style="--t:${600 + ((i * 5) % 7) * 180}ms"><rect class="cr" x="${x}" y="${y}" width="80" height="60" rx="8"/>
    ${t(x + 40, y + 19, OPS[i % OPS.length], "big")}${t(x + 40, y + 38, `data ${i + 1}`, "lbl")}<rect class="cb" x="${x + 8}" y="${y + 49}" width="64" height="4" rx="2"/></g>`; };
const mimd = (D) => on("3", `${t(R, 36, `${D.cores} CORES, EACH ON ITS OWN WORK`, "cap l")}
  ${Array.from({ length: D.cores }, (_, i) => core(i)).join("")}
  ${t(R, 284, "and between machines: each one MIMD again", "lbl l")}`);

const misd = () => on("4", `${t(R, 44, "MANY INSTRUCTIONS, ONE VALUE", "cap l")}
  ${["+", "×", "max", "<"].map((op, i) => `<circle class="ghost" cx="${R + 40 + i * 90}" cy="96" r="26"/>${t(R + 40 + i * 90, 97, op, "big dim")}
    <path class="ghost" d="M${R + 40 + i * 90} 124 L${R + 175} 192"/>`).join("")}
  <rect class="ghost" x="${R + 155}" y="192" width="40" height="30" rx="6"/>${t(R + 175, 208, "11", "big dim")}
  ${t(R + 175, 268, "in name only", "h dim")}`);

const scene = (D) => `<svg viewBox="0 0 760 340">${grid()}${zone(346, 14, 400, 312)}${intro()}${sisd(D)}${simd(D)}${mimd(D)}${misd()}</svg>`;

const later = (root, ms, fn, still) => root._timers.push(setTimeout(fn, still ? 0 : ms));

// Each step's motion runs once when the step is shown; stepping back to it runs it again.
function animate(root, at, D) {
  const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  (root._timers || []).forEach(clearTimeout); root._timers = [];
  root.querySelectorAll(".v").forEach((g) => g.classList.remove("now", "done"));
  root.querySelectorAll(".res, .core, .feed, .tcell").forEach((g) => g.classList.remove("on"));
  root.querySelector(".simd-u").classList.remove("flash");
  root.querySelector(".sum").textContent = "0"; root.querySelector(".stepn").textContent = "step 0 of 8";
  if (at === 1) sisdRun(root, D, still);
  if (at === 2) simdRun(root, still);
  if (at === 3) root.querySelectorAll(".core").forEach((g, i) => later(root, 300 + ((i * 7) % 12) * 140, () => g.classList.add("on"), still));
}

function simdRun(root, still) {
  later(root, 500, () => { root.querySelectorAll(".simd .v").forEach((g) => g.classList.add("now")); root.querySelector(".simd-u").classList.add("flash");
  }, still);
  later(root, 1000, () => { root.querySelector(".simd-u").classList.remove("flash"); root.querySelector(".res").classList.add("on"); }, still);
}

function sisdRun(root, D, still) {
  let sum = 0;
  const feed = root.querySelector(".feed"), vs = [...root.querySelectorAll(".sisd .v")], cells = root.querySelectorAll(".tcell");
  vs.forEach((g, i) => later(root, 400 + i * 420, () => {
    if (i > 0) { vs[i - 1].classList.remove("now"); vs[i - 1].classList.add("done"); }
    g.classList.add("now"); sum += D.a[i]; feed.classList.add("on"); cells[i].classList.add("on");
    feed.setAttribute("d", `M${Number(g.dataset.x) + 19} 84 L470 140`);
    if (i === vs.length - 1) later(root, 420, () => { g.classList.replace("now", "done"); feed.classList.remove("on"); }, still);
    root.querySelector(".sum").textContent = String(sum); root.querySelector(".stepn").textContent = `step ${i + 1} of 8`;
  }, still));
}

export default widget({ key: "hf", label: "Flynn's four classes", css: CSS, steps, scene, captured: CAPTURED, after: (root, at) => animate(root, at, CAPTURED) });
