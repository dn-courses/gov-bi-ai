// vx-calls — why the work through the values is what costs, and the plan that does it two ways:
// the column read into memory (cheap), then the same three operators (scan → filter → average)
// handing on one row per call, then one batch per call (drawn as batches of 3; the real one is 2,048).
import { fmt, scene as build } from "@widget-lib/scene.js";
import { stepper } from "@widget-lib/stepper.js";

// Re-measured 2026-11-23 on the 346 MB file page 01 writes (ORDER BY station_id, captured_at), from this page's own Python cells, in the lesson app on the postgres lab
// (columnar-mpp/06-vectorized-execution), three runs each in one held lab call: the read of
// bikes_available from station_status.parquet 0.02–0.17 s (0.17 the first, cold); one row per call 1.06–1.26 s; batches
// of 2,048 0.14–0.15 s (6.9–7.6 times faster). `handful` is bikes[182:190]; the first three
// 2,048-value batches keep 2,002, 2,014 and 2,006 values > 0; 25,431,214 of all values are > 0.
const CAPTURED = {
  values: 25920000, kept: 25431214, mb: 51.8, batch: 2048, batches: 12657,
  handful: [2, 1, 4, 0, 3, 2, 2, 0], firstKept: [2002, 2014, 2006],
  readS: "0.03", rowS: "1.1", batchS: "0.15", times: 7,
};

const steps = (D) => [
  { stop: "The need", title: "Reading is now the cheap part",
    note: `Laid out by column, encoded and skipped, the file gives up <code>bikes_available</code> in about <b>${D.readS} s</b>: ${fmt(D.values)} values, ${D.mb} MB, in memory. What remains is going through them.` },
  { stop: "The plan", title: "A query is a chain of operators",
    note: `A scan feeds a filter, the filter feeds an average. Each operator takes values from the one below and hands what it produces to the one above.` },
  { stop: "Rows", title: "One row per call: a hand-off for every value",
    note: `Press <b>Play</b>. Each value climbs alone, and every climb is a call that does nothing to the value itself. All ${fmt(D.values)} values take about <b>${D.rowS} s</b>, many times the read.` },
  { stop: "Batches", title: "One batch per call: a hand-off for every 2,048 values", decisive: true,
    note: `Press <b>Play</b>. The same operators, but each call carries <b>${fmt(D.batch)} values</b> of the one column, and each operator works through them in one compiled loop. The same answer in about <b>${D.batchS} s</b>, about ${D.times} times faster. This is <b>vectorized execution</b>.` },
];

const CSS = `
.lw .vxc .tk { transition:transform .38s cubic-bezier(.3,.7,.3,1), opacity .35s; }
.lw .vxc .tk rect { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; transition:fill .3s, stroke .3s; }
.lw .vxc .tk text { font:600 14px ui-monospace, Menlo, monospace; fill:var(--ink); }
.lw .vxc .tk.drop rect { fill:var(--hot-bg); stroke:var(--hot); }
.lw .vxc .tk.gone { opacity:0; }
.lw .vxc .tk .grp { fill:none; stroke:var(--accent); stroke-width:1.5; stroke-dasharray:none; opacity:.8; }
.lw .vxc .tk .cv { transition:opacity .35s; } .lw .vxc .tk .cv.drop rect { fill:var(--hot-bg); stroke:var(--hot); } .lw .vxc .tk .cv.gone { opacity:0; }
.lw .vxc .slot { fill:none; stroke:var(--line); stroke-width:1; stroke-dasharray:3 3; }
.lw .vxc .op.hit { fill:var(--accent-bg); stroke:var(--accent); }
.lw .vxc .badge { fill:var(--panel); stroke:var(--line); stroke-width:1; transition:fill .3s, stroke .3s; }
.lw .vxc .op.hit + .badge { fill:var(--accent); stroke:var(--accent); }
.lw .vxc .op.hit + .badge + .bn { fill:var(--accent-ink); }
.lw .vxc text.bn { font:650 12px system-ui, sans-serif; fill:var(--mute); }
.lw .vxc .lnk { fill:none; stroke:var(--line); stroke-width:2; stroke-linecap:round; stroke-linejoin:round; transition:stroke .25s; }
.lw .vxc .lnk.on { stroke:var(--accent); stroke-width:2.5; }
.lw .vxc .trk { fill:var(--cell); }
.lw .vxc .unk { fill:none; stroke:var(--mute); stroke-width:1.5; stroke-dasharray:5 5; opacity:.7; }
.lw .vxc .chip { fill:var(--cell); } .lw .vxc .win { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1; }
.lw .vxc .rule { stroke:var(--line); stroke-width:1; }
.lw .vxc .code { fill:var(--cell); stroke:var(--line); stroke-width:1; }
.lw .vxc text.huge { font:650 34px ui-monospace, Menlo, monospace; text-anchor:start; fill:var(--accent); letter-spacing:-.02em; }
.lw .vxc text.ask { font:650 22px system-ui, sans-serif; fill:var(--mute); }
.lw .vxc text.tag { font:600 12px system-ui, sans-serif; fill:var(--mute); text-anchor:end; }
.lw .vxc .play { cursor:pointer; pointer-events:auto; }
.lw .vxc .st:not(.on) .play { pointer-events:none; }
.lw .vxc .play rect { fill:var(--accent); stroke:none; transition:opacity .2s; } .lw .vxc .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .vxc .play:hover rect { opacity:.85; }
.lw .vxc .play.busy { opacity:.45; pointer-events:none; }
.lw .vxc text.sql { font:13px ui-monospace, SFMono-Regular, Menlo, monospace; text-anchor:start; white-space:pre; }
.lw .vxc text.sql .kw { fill:var(--accent); font-weight:600; }
`;

// The plan, bottom up: the column at the bottom, then scan, filter, average. Pills span x 40–340.
const PX = 40, PW = 300, PH = 44;
const OPS = [["scan", "scan", 208, "1"], ["filter", "filter · bikes &gt; 0", 124, "2"], ["avg", "average", 40, "3"]]; // key, label, y, badge
const STRIP_Y = 296, CELL = 36, CX = 46; // eight cells of 36 across, x 46–334
const ROW_TX = 296, BAT_N = 3, BAT_W = 2 * CELL + 32, BAT_TX = PX + PW - BAT_W - 12; // where a token sits inside a pill
// The batch run is a picture: the same eight values drawn in batches of 3 (the real batch is 2,048).
const LINKS = [["cs", 252, STRIP_Y - 4], ["sf", 168, 208], ["fa", 84, 124]]; // the links into scan, filter, average
const INTO = { scan: "cs", filter: "sf", avg: "fa" };

// An upward link with its chevron: values climb from `lo` to `hi`.
const link = ([k, hi, lo]) => `<path class="lnk l-${k}" d="M190 ${lo} L190 ${hi + 2} M183 ${hi + 9} L190 ${hi + 2} L197 ${hi + 9}"/>`;

// Step 0: the file, the column in memory, and the two costs: the read (measured) and the work (open).
const need = (D) => { const w = Math.max(4, (D.readS / D.rowS) * 400);
  return `<g class="st" data-on="0"><rect class="zone" x="14" y="14" width="732" height="334" rx="12"/>
  <text class="cap" x="34" y="42">ONE COLUMN, FROM THE FILE INTO MEMORY</text>
  <rect class="pill" x="34" y="62" width="236" height="48" rx="12"/>
  <path class="lnk on" d="M50 74 h12 l7 7 v19 h-19 z M62 74 v7 h7"/>
  <text class="mono l" x="80" y="87">station_status.parquet</text>
  <path class="lnk on" d="M278 86 L294 86 M288 80 L294 86 L288 92"/>
  ${D.handful.map((v, i) => `<rect class="box hit" x="${304 + i * 40}" y="70" width="34" height="32" rx="7"/><text class="mono" x="${321 + i * 40}" y="87">${v}</text>`).join("")}
  <text class="big l dim" x="626" y="86">…</text>
  <text class="lbl l" x="304" y="128">bikes_available · ${fmt(D.values)} values · ${D.mb} MB</text>
  <line class="rule" x1="34" y1="160" x2="726" y2="160"/>
  <text class="cap" x="34" y="190">WHAT THE QUERY COSTS</text>
  <text class="l" x="34" y="230">read the column</text>
  <rect class="trk" x="290" y="220" width="410" height="20" rx="5"/>
  <rect class="bar on" x="290" y="220" width="${w}" height="20" rx="5"/>
  <text class="big l acc" x="${302 + w}" y="231">${D.readS} s</text>
  <text class="lbl l" x="34" y="252">measured</text>
  <text class="l" x="34" y="290">go through ${fmt(D.values)} values</text>
  <rect class="unk" x="290" y="280" width="410" height="20" rx="5"/>
  <text class="ask" x="495" y="291">?</text>
  <text class="lbl l" x="34" y="312">not measured yet</text></g>`; };

const plan = () => `<g class="st" data-on="1 2 3">
  ${LINKS.map(link).join("")}
  ${OPS.map(([k, label, y, n]) => `<rect class="pill op op-${k}" x="${PX}" y="${y}" width="${PW}" height="${PH}" rx="22"/>
    <circle class="badge" cx="${PX + 22}" cy="${y + PH / 2}" r="11"/><text class="bn" x="${PX + 22}" y="${y + PH / 2 + 1}">${n}</text>
    <text class="l" x="${PX + 42}" y="${y + PH / 2}">${label}</text>`).join("")}</g>`;

const rowToken = (v, i) => `<g class="tk row" data-i="${i}" style="transform:translate(${CX + i * CELL}px,${STRIP_Y}px)">
  <rect x="0" y="0" width="32" height="28" rx="7"/><text x="16" y="15">${v}</text></g>`;
const batchOf = (D, b) => D.handful.slice(b * BAT_N, b * BAT_N + BAT_N);
const batchCount = (D) => Math.ceil(D.handful.length / BAT_N);
const batchToken = (D, b) => `<g class="tk bat" data-i="${b}" style="transform:translate(${CX + b * BAT_N * CELL}px,${STRIP_Y}px)">
  <rect class="grp" x="-4" y="-4" width="${(batchOf(D, b).length - 1) * CELL + 40}" height="36" rx="10"/>
  ${batchOf(D, b).map((v, j) => `<g class="cv"><rect x="${j * CELL}" y="0" width="32" height="28" rx="7"/><text x="${j * CELL + 16}" y="15">${v}</text></g>`).join("")}</g>`;

const counters = (cap) => `
  <text class="cap" x="396" y="42">${cap}</text>
  <g class="play"><rect x="634" y="24" width="96" height="34" rx="17"/><text x="682" y="42">▶ Play</text></g>
  <rect class="chip" x="396" y="70" width="334" height="32" rx="8"/>
  <text class="lbl l now" x="410" y="87">not started</text>
  <text class="lbl l" x="396" y="128">hand-offs between operators</text>
  <text class="huge n-all" x="396" y="164">0</text>
  <line class="rule" x1="396" y1="188" x2="730" y2="188"/>
  <text class="l" x="396" y="210">scan → filter</text><text class="mono r n-sf" x="730" y="210">0</text>
  <text class="l" x="396" y="236">filter → average</text><text class="mono r n-fa" x="730" y="236">0</text>
  <text class="lbl l" x="396" y="262">values through</text><text class="mono r dim n-in" x="730" y="262">0</text>
  <rect class="win" x="396" y="284" width="334" height="46" rx="10"/>
  <text class="l" x="412" y="308">time for all, measured</text><text class="big r acc n-t" x="716" y="308">—</text>`;

const sqlCard = (D) => `<g class="st" data-on="1"><text class="cap" x="396" y="42">THE QUERY, AS THREE OPERATORS</text>
  <rect class="code" x="396" y="58" width="334" height="92" rx="10"/>
  <text class="sql" xml:space="preserve" x="410" y="82"><tspan class="kw">SELECT</tspan> avg(bikes_available)</text><text class="tag" x="718" y="82">3 average</text>
  <text class="sql" xml:space="preserve" x="410" y="104"><tspan class="kw">FROM</tspan>   station_status</text><text class="tag" x="718" y="104">1 scan</text>
  <text class="sql" xml:space="preserve" x="410" y="126"><tspan class="kw">WHERE</tspan>  bikes_available &gt; 0;</text><text class="tag" x="718" y="126">2 filter</text>
  <line class="rule" x1="396" y1="180" x2="730" y2="180"/>
  <text class="lbl l" x="396" y="206">the column below the plan, in memory</text>
  <text class="huge" x="396" y="246">${fmt(D.values)}</text>
  <text class="lbl l" x="396" y="280">values, ${D.mb} MB of 2-byte integers</text></g>`;

const scene = (D) => `<svg viewBox="0 0 760 362">
  ${need(D)}
  <g class="st" data-on="1 2 3"><rect class="zone" x="14" y="14" width="352" height="334" rx="12"/></g>
  ${plan()}
  <g class="st" data-on="1 2">
    ${D.handful.map((_, i) => `<rect class="slot" x="${CX + i * CELL}" y="${STRIP_Y}" width="32" height="28" rx="7"/>`).join("")}
    <text class="lbl" x="190" y="${STRIP_Y + 40}">bikes_available — 8 of ${fmt(D.values)} values</text></g>
  <g class="st" data-on="1 2">${D.handful.map(rowToken).join("")}</g>
  <g class="st" data-on="3">
    ${D.handful.map((_, i) => `<rect class="slot" x="${CX + i * CELL}" y="${STRIP_Y}" width="32" height="28" rx="7"/>`).join("")}
    <text class="lbl" x="190" y="${STRIP_Y + 40}">drawn with batches of 3; the real batch is ${fmt(D.batch)}</text>
    ${Array.from({ length: batchCount(D) }, (_, b) => batchToken(D, b)).join("")}</g>
  <rect class="zone st" data-on="1 2 3" x="380" y="14" width="366" height="334" rx="12"/>
  ${sqlCard(D)}
  <g class="st rows" data-on="2">${counters("ONE ROW PER CALL")}</g>
  <g class="st bats" data-on="3">${counters(`ONE BATCH OF ${fmt(D.batch)} PER CALL`)}</g>
</svg>`;

const opY = (k) => OPS.find((o) => o[0] === k)[2] + (PH - 28) / 2;
const move = (tk, x, y) => { tk.style.transform = `translate(${x}px,${y}px)`; };

// The beats of one token's climb: [wait ms, what the panel says, what changes], counting into `c`.
// A row and a drawn batch of 3 climb at the same pace: one beat per hand-off.
function climb(D, mode, tk, i, c, act) {
  const row = mode === "row", tx = row ? ROW_TX : BAT_TX, vals = row ? [D.handful[i]] : batchOf(D, i);
  const kept = vals.filter((v) => v > 0).length, w = row && i >= 2 ? 280 : 650, n = vals.length;
  const out = [
    [w, row ? `row ${i + 1}: the scan reads ${vals[0]}` : `batch ${i + 1}: the scan reads ${n} values at once`,
      () => { act.light("scan"); move(tk, tx, opY("scan")); c.through += n; act.set(c); }],
    [w, row ? "…and hands it to the filter" : "…and hands the whole batch to the filter",
      () => { act.light("filter"); move(tk, tx, opY("filter")); c.sf += 1; act.set(c); }],
  ];
  if (row && !kept) return out.concat([[w, "0 is not > 0: dropped, nothing handed on", () => tk.classList.add("drop")], [180, null, () => tk.classList.add("gone")]]);
  const cells = row ? [] : [...tk.querySelectorAll(".cv")];
  if (!row && kept < n) out.push([w, `${kept} of ${n} values are > 0: the 0 drops out`, () => cells.forEach((cv, j) => vals[j] > 0 || cv.classList.add("drop"))],
    [180, null, () => cells.forEach((cv, j) => vals[j] > 0 || cv.classList.add("gone"))]);
  out.push([w, row ? "…which hands it to the average" : `…which hands ${kept} values to the average in one call`,
    () => { act.light("avg"); move(tk, tx, opY("avg")); c.fa += 1; act.set(c); }]);
  return out.concat([[180, null, () => tk.classList.add("gone")]]);
}

// Light one operator and the link that just handed it something (null: none).
const lighter = (root) => (k) => {
  root.querySelectorAll(".op").forEach((p) => p.classList.toggle("hit", p.classList.contains("op-" + k)));
  LINKS.forEach(([e]) => root.querySelector(".l-" + e).classList.toggle("on", INTO[k] === e));
};

// One run: tokens climb an operator at a time, the counters follow, and a last beat jumps to the
// whole column and its measured time. With reduced motion every beat lands at once.
function play(root, D, mode) {
  const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const panel = root.querySelector(mode === "row" ? ".rows" : ".bats");
  const button = panel.querySelector(".play"), now = panel.querySelector(".now"), q = (s) => panel.querySelector(s);
  const act = {
    set: (c) => { q(".n-sf").textContent = fmt(c.sf); q(".n-fa").textContent = fmt(c.fa); q(".n-in").textContent = fmt(c.through); q(".n-all").textContent = fmt(c.sf + c.fa); },
    light: lighter(root),
  };
  reset(root, D);
  const c = { sf: 0, fa: 0, through: 0 };
  const tokens = [...root.querySelectorAll(mode === "row" ? ".tk.row" : ".tk.bat")];
  const beats = tokens.flatMap((tk, i) => climb(D, mode, tk, i, c, act));
  const all = mode === "row" ? { sf: D.values, fa: D.kept } : { sf: D.batches, fa: D.batches };
  beats.push([1100, `all ${fmt(D.values)} values`, () => { act.light(null); act.set({ ...all, through: D.values }); q(".n-t").textContent = `${mode === "row" ? D.rowS : D.batchS} s`; }]);
  button.classList.add("busy");
  let t = 150;
  beats.forEach(([wait, say, fn], i) => {
    root._timers.push(setTimeout(() => { if (say) now.textContent = say; fn(); if (i === beats.length - 1) button.classList.remove("busy"); }, still ? 0 : t));
    t += wait;
  });
}

function reset(root, D) {
  (root._timers || []).forEach(clearTimeout);
  root._timers = [];
  lighter(root)(null);
  root.querySelectorAll(".tk.row").forEach((tk, i) => { tk.classList.remove("drop", "gone"); move(tk, CX + i * CELL, STRIP_Y); });
  root.querySelectorAll(".tk.bat").forEach((tk, b) => { tk.classList.remove("gone"); move(tk, CX + b * BAT_N * CELL, STRIP_Y); });
  root.querySelectorAll(".tk .cv").forEach((cv) => cv.classList.remove("drop", "gone"));
  root.querySelectorAll(".rows, .bats").forEach((panel) => {
    panel.querySelector(".play").classList.remove("busy"); panel.querySelector(".now").textContent = "not started";
    panel.querySelectorAll(".n-sf, .n-fa, .n-in, .n-all").forEach((n) => { n.textContent = "0"; });
    panel.querySelector(".n-t").textContent = "—";
  });
}

function after(root, at, D) {
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.querySelector(".rows .play").addEventListener("click", () => root.dataset.at === "2" && play(root, D, "row"));
    root.querySelector(".bats .play").addEventListener("click", () => root.dataset.at === "3" && play(root, D, "bat"));
  }
  reset(root, D);
}

export default { render: build({ stepper, key: "vxc", label: "One row per call, one batch per call", css: CSS, steps, scene, captured: CAPTURED, after: (root, at) => after(root, at, CAPTURED) }) };
