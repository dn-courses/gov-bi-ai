// hw-pages — data moves between disk and memory in pages of 8 KB, never a value at a time: one page
// drawn with its rows; one row costs its whole page; a hundred pages are read, then found in memory;
// and reading a table is pages into memory, then the CPU working through their rows.
import { arrow, extra, fmt, on, t, widget, zone } from "./col-lib.js";

// Measured 2026-11-23 from this page's cells, in the lesson app on the postgres lab, in this order:
// block_size 8192; station_status 777,595 pages, 25,920,000 rows; page 600000 holds 32 rows of 244
// bytes ((600000,1) station 772, DC, 2026-09-05 15:15, 11 bikes). Tid Scan of (600000,1): shared
// read=1. Pages 600000–600099: hit=1 read=99, 3,200 rows; again: hit=100. Pages 0–9,999: read=9,983
// hit=17, 336,670 rows.
const CAPTURED = {
  block: 8192, pages: 777595, rows: 25920000, pageRows: 32, rowBytes: 244, first: "station 772, 15:15, 11 bikes",
  last: "station 772, 17:50, 7 bikes", range: [99, 1, 3200], again: [0, 100, 3200],
  big: [9983, 17, 336670], bigPages: 10000, bufferPages: 16384,
};

const steps = (D) => [
  { stop: "A page", title: "A table is stored in pages",
    note: `PostgreSQL stores a table in blocks of ${fmt(D.block)} bytes called <b>pages</b>. Page 600000 of <code>station_status</code> holds ${D.pageRows} whole rows; the table is ${fmt(D.pages)} such pages.` },
  { stop: "One row", title: "One row costs a whole page",
    note: `Press <b>Play</b>. The query asks for one row of ${D.rowBytes} bytes. Disk and memory trade only whole pages, so the page holding it travels into memory, ${fmt(D.block)} bytes, and the row is picked out there.` },
  { stop: "100 pages", title: "A hundred pages travel as a hundred blocks",
    note: `Press <b>Play</b>. ${fmt(D.range[0] + D.range[1])} pages, ${fmt(D.range[2])} rows. One of them was already in memory from the last query; the other ${D.range[0]} are read from the disk.` },
  { stop: "Again", title: "The second time, they are already in memory",
    note: `Press <b>Play</b>. Nothing comes from the disk: all ${D.again[1]} pages are found in memory. That memory holds ${fmt(D.bufferPages)} pages, about 2% of this table, and starts empty when PostgreSQL starts.` },
  { stop: "A table", title: "Reading a table: pages in, then the CPU", decisive: true,
    note: `Press <b>Play</b>. The pages are brought into memory and the CPU works through the rows on them: ${fmt(D.bigPages)} pages, ${fmt(D.big[2])} rows. The whole table is ${fmt(D.pages)} pages and ${fmt(D.rows)} rows. A query's time is these two things: the bytes it moves, and the work it does on every value.` },
];

const CSS = extra("hp") + `
.lw .hp text.cap { font-size:12px; }
.lw .hp .tk { transition:transform .45s cubic-bezier(.4,0,.2,1), opacity .4s; }
.lw .hp .tk rect, .lw .hp .dk { fill:var(--cell); stroke:var(--line); stroke-width:1; transition:fill .3s, stroke .3s; }
.lw .hp .tk.want rect, .lw .hp .tk.moved rect, .lw .hp .sw.read { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .hp .tk.hit rect, .lw .hp .sw.hit { fill:var(--ok-bg); stroke:var(--ok); stroke-width:1.5; }
.lw .hp .tk.used rect { fill:var(--accent); stroke:var(--accent); opacity:.5; }
.lw .hp .tk.want rect { fill:var(--accent); }
.lw .hp .ms { fill:none; stroke:var(--line); stroke-dasharray:3 3; }
.lw .hp .zone.z-cpu { fill:var(--panel); }
.lw .hp text.zh { font:700 14px system-ui, sans-serif; letter-spacing:.08em; text-anchor:start; }
.lw .hp .ico { fill:none; stroke:var(--mute); stroke-width:1.5; }
.lw .hp .rowl { fill:var(--mute); opacity:.3; } .lw .hp .rowl.alt { opacity:.18; } .lw .hp .rowl.on { fill:var(--accent); opacity:1; }
.lw .hp .pg1 { fill:var(--cell); stroke:var(--accent); stroke-width:1.5; } .lw .hp .pgh { fill:var(--accent-bg); }
.lw .hp .strip { fill:var(--cell); stroke:var(--line); } .lw .hp .mark { fill:var(--accent); }
.lw .hp .play { cursor:pointer; } .lw .hp .st.on .play { pointer-events:auto; }
.lw .hp .play rect { fill:var(--accent); } .lw .hp .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .hp .play.busy { opacity:.45; pointer-events:none; }
.lw .hp text.now { font:500 15px system-ui, sans-serif; fill:var(--ink); text-anchor:start; }
.lw .hp .pill.work { fill:var(--cell); stroke:var(--line); transition:fill .3s, stroke .3s; }
.lw .hp .pill.work.on { fill:var(--accent-bg); stroke:var(--accent); }
.lw .hp text.plan { font:14px ui-monospace, Menlo, monospace; fill:var(--ink); text-anchor:start; }
.lw .hp tspan.pr { fill:var(--accent); font-weight:700; } .lw .hp tspan.ph { fill:var(--ok); font-weight:700; }
.lw .hp .sp { opacity:0; fill:var(--accent); } .lw .hp .sp.fly { animation:hpFly .42s ease-in 1 both; }
@keyframes hpFly { from { transform:translate(var(--x),var(--y)); opacity:1 } to { transform:translate(634px,141px); opacity:0 } }
`;

// Step 0's own layout: one page drawn large, its 32 rows as bars, beside the table's numbers.
const onePage = (D) => on("0", `${zone(14, 14, 732, 354, "ONE PAGE OF station_status")}
  <rect class="pg1" x="40" y="44" width="300" height="310" rx="8"/><path class="pgh" d="M41 75 V53 a8 8 0 0 1 8 -8 H331 a8 8 0 0 1 8 8 V75 Z"/>
  ${t(190, 61, `page 600000 · ${fmt(D.block)} bytes`, "mono acc")}
  ${Array.from({ length: D.pageRows }, (_, i) => `<rect class="rowl ${i % 2 ? "alt" : ""} ${i === 0 || i === D.pageRows - 1 ? "on" : ""}" x="54" y="${84 + i * 8.4}" width="272" height="5" rx="2"/>`).join("")}
  <path class="edge on" d="M330 86 L370 86 M330 346 L370 346"/>
  ${t(378, 86, `(600000,1)  ${D.first}`, "mono l")}${t(378, 346, `(600000,${D.pageRows}) ${D.last}`, "mono l")}
  ${t(378, 134, "rows on this page", "lbl l")}${t(378, 162, `${D.pageRows} rows of ${D.rowBytes} bytes`, "huge l acc")}
  ${t(378, 210, "the whole table", "lbl l")}${t(378, 238, `${fmt(D.pages)} pages`, "huge l")}${t(378, 266, `${fmt(D.rows)} rows`, "big l dim")}
  <rect class="strip" x="378" y="290" width="352" height="12" rx="6"/>
  <rect class="mark" x="${378 + Math.round(352 * 600000 / D.pages) - 2}" y="284" width="4" height="24" rx="2"/>
  ${t(378 + Math.round(352 * 600000 / D.pages), 320, "this page", "lbl acc")}`);

// Steps 1–4: disk, memory and CPU side by side; 100 tiles stand for pages.
const N = 100, COLS = 10;
const at = (x0, i) => [x0 + (i % COLS) * 20, 132 + Math.floor(i / COLS) * 16.5];
const DISK = (i) => at(28, i), MEM = (i) => at(282, i);
const tile = (i) => { const [x, y] = DISK(i);
  return `<g class="tk" data-i="${i}" style="transform:translate(${x}px,${y}px)"><rect width="16" height="13" rx="3"/></g>`; };
const spark = (i) => { const [x, y] = MEM(i); return `<circle class="sp" r="5" cx="0" cy="0" style="--x:${x + 8}px;--y:${y + 6}px"/>`; };
const grid = (fn, cls) => Array.from({ length: N }, (_, i) => { const [x, y] = fn(i); return `<rect class="${cls}" x="${x}" y="${y}" width="16" height="13" rx="3"/>`; }).join("");

const ICON = {
  disk: (x, y) => `<ellipse class="ico" cx="${x + 8}" cy="${y - 5}" rx="8" ry="3"/><path class="ico" d="M${x} ${y - 5} v11 a8 3 0 0 0 16 0 v-11"/>`,
  mem: (x, y) => `<rect class="ico" x="${x}" y="${y - 7}" width="18" height="13" rx="2"/><path class="ico" d="M${x + 5} ${y - 4} v7 M${x + 9} ${y - 4} v7 M${x + 13} ${y - 4} v7"/>`,
  cpu: (x, y) => `<rect class="ico" x="${x + 2}" y="${y - 7}" width="14" height="14" rx="2"/><path class="ico" d="M${x + 6} ${y - 10} v3 M${x + 12} ${y - 10} v3 M${x + 6} ${y + 7} v3 M${x + 12} ${y + 7} v3"/>`,
};
const head = (x, ico, name, sub) => `${ICON[ico](x + 16, 92)}${t(x + 42, 93, name, "zh")}${t(x + 16, 114, sub, "lbl l")}`;

const stat = (y, sw, label, cls) => `${sw ? `<rect class="sw ${sw}" x="538" y="${y - 7}" width="16" height="13" rx="3"/>` : ""}
  ${t(sw ? 564 : 538, y, label, "l")}${t(730, y, "0", `big r ${cls}`)}`;

const parts = (D) => on("1 2 3 4", `
  <g class="play"><rect x="14" y="18" width="104" height="34" rx="17"/>${t(66, 36, "▶ Play")}</g>${t(136, 36, "", "now")}
  ${zone(14, 68, 224, 232)}${head(14, "disk", "DISK", `${fmt(D.pages)} pages of the table`)}${grid(DISK, "dk")}
  ${zone(268, 68, 224, 232)}${head(268, "mem", "MEMORY", `room for ${fmt(D.bufferPages)} pages`)}${grid(MEM, "ms")}
  ${zone(522, 68, 224, 232)}${head(522, "cpu", "CPU", "works on rows in memory")}
  ${arrow(242, 184, 264, 184)}${arrow(496, 184, 518, 184)}
  <rect class="pill work" x="538" y="128" width="192" height="30" rx="15"/>${t(634, 144, "works through the rows", "lbl")}
  ${stat(194, "read", "read from disk", "acc n-read")}${stat(228, "hit", "found in memory", "ok n-hit")}${stat(262, "", "rows", "n-rows")}
  ${zone(14, 312, 732, 56, "WHAT POSTGRESQL REPORTS — EXPLAIN (ANALYZE, BUFFERS)")}${t(730, 331, "each tile is one page", "lbl r")}
  <text class="plan" x="30" y="353"></text>
  ${Array.from({ length: N }, (_, i) => tile(i)).join("")}${Array.from({ length: N }, (_, i) => spark(i)).join("")}`);

const scene = (D) => `<svg viewBox="0 0 760 380">${onePage(D)}${parts(D)}</svg>`;

const place = (tk, [x, y]) => { tk.style.transform = `translate(${x}px,${y}px)`; };
const DONE = (D) => ({ 1: `${fmt(D.block)} bytes moved for ${D.rowBytes} bytes asked`, 2: `${D.range[0]} pages read, ${D.range[1]} already in memory`,
  3: "nothing read from the disk", 4: `…and so on: ${fmt(D.bigPages)} pages in all` });
const buf = (hit, read) => [hit && `<tspan class="ph">hit=${fmt(hit)}</tspan>`, read && `<tspan class="pr">read=${fmt(read)}</tspan>`].filter(Boolean).join(" ");
const PLANS = (D) => ({ 1: `Tid Scan · Buffers: shared ${buf(0, 1)}`, 2: `Buffers: shared ${buf(D.range[1], D.range[0])} · rows=${fmt(D.range[2])}`,
  3: `Buffers: shared ${buf(D.again[1], 0)} · rows=${fmt(D.again[2])}`, 4: `Buffers: shared ${buf(D.big[1], D.big[0])} · rows=${fmt(D.big[2])}` });

// Where each tile starts on a step: on the disk, or (step 3, and tile 0 on step 2) in memory.
function reset(root, step) {
  (root._timers || []).forEach(clearTimeout); root._timers = [];
  root.querySelectorAll(".tk").forEach((tk, i) => {
    const inMem = step === 3 || (step === 2 && i === 0);
    tk.classList.remove("want", "moved", "hit", "used"); tk.style.opacity = step === 1 && i > 0 ? ".35" : "";
    place(tk, inMem ? MEM(i) : DISK(i)); if (inMem) tk.classList.add("moved");
  });
  root.querySelectorAll(".sp").forEach((s) => s.classList.remove("fly"));
  root.querySelector(".work").classList.remove("on");
  root.querySelector(".play").classList.remove("busy");
  root.querySelector(".now").textContent = "Press ▶ Play to run the query"; root.querySelector(".plan").innerHTML = "";
  root.querySelectorAll(".n-read, .n-hit, .n-rows").forEach((n) => { n.textContent = "0"; });
}

// The beats of one run: [wait before the next, what the status line says, what changes].
function beats(root, D, step) {
  const tks = [...root.querySelectorAll(".tk")], c = { read: 0, hit: 0, rows: 0 }, out = [];
  const add = (k, n) => { c[k] += n; }, per = step === 4 ? D.big[2] / N : D.pageRows;
  if (step === 1) return [[700, "the query asks for row (600000,1)", () => tks[0].classList.add("want")],
    [900, "the whole page it sits on is read into memory", () => { tks[0].classList.replace("want", "moved"); place(tks[0], MEM(0)); add("read", 1); }],
    [600, "…and the one row is picked out of 32", () => { root.querySelector(".work").classList.add("on"); add("rows", 1); }]].map((b) => [...b, c]);
  tks.forEach((tk, i) => {
    if (step === 3 || (step === 2 && i === 0)) out.push([30, `page ${i + 1}: already in memory`, () => { tk.classList.add("hit"); add("hit", 1); add("rows", per); }, c]);
    else out.push([step === 4 ? 45 : 35, `page ${i + 1}: read from disk`, () => { place(tk, MEM(i)); tk.classList.add("moved"); add("read", 1); if (step !== 4) add("rows", per); }, c]);
    if (step === 4) out.push([i === N - 1 ? 450 : 0, `page ${i + 1}: the CPU works through its rows`, () => cpuTake(root, tk, i, () => add("rows", per)), c]);
  });
  return out;
}

// Step 4: once a page is in memory, its rows fly on to the CPU; the page stays in memory.
function cpuTake(root, tk, i, then) {
  root._timers.push(setTimeout(() => { tk.classList.add("used"); root.querySelectorAll(".sp")[i].classList.add("fly");
    root.querySelector(".work").classList.add("on"); then(); }, 320));
}

function play(root, D, step) {
  const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  reset(root, step);
  const button = root.querySelector(".play"), now = root.querySelector(".now");
  const show = (c) => { root.querySelector(".n-read").textContent = fmt(Math.round(c.read));
    root.querySelector(".n-hit").textContent = fmt(Math.round(c.hit)); root.querySelector(".n-rows").textContent = fmt(Math.round(c.rows)); };
  const list = beats(root, D, step), plan = PLANS(D)[step];
  const fin = step === 4 ? { read: D.big[0], hit: D.big[1], rows: D.big[2] } : list[0][3];
  list.push([400, DONE(D)[step], () => { root.querySelector(".plan").innerHTML = plan; button.classList.remove("busy"); }, fin]);
  button.classList.add("busy");
  let t0 = 150;
  list.forEach(([wait, say, act, c]) => {
    root._timers.push(setTimeout(() => { now.textContent = say; act(); show(c); }, still ? 0 : t0)); t0 += wait;
  });
}

function after(root, step, D) {
  if (!root.dataset.bound) { root.dataset.bound = "1";
    root.querySelector(".play").addEventListener("click", () => { const s = Number(root.dataset.at); if (s >= 1) play(root, D, s); }); }
  if (step >= 1) reset(root, step);
}

export default widget({ key: "hp", label: "Pages between disk and memory", css: CSS, steps, scene, captured: CAPTURED, after: (root, s) => after(root, s, CAPTURED) });
