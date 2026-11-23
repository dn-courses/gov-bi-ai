// vx-batch — what a batch of one column buys inside an operator: one instruction over a lane of
// values (SIMD) against one instruction per value, tied to the measured time per value; then what
// the size of a batch does to the time, because every call has a fixed cost.
import { fmt, scene as build } from "@widget-lib/scene.js";
import { stepper } from "@widget-lib/stepper.js";

// Re-measured 2026-11-23 on the 346 MB file page 01 writes (ORDER BY station_id, captured_at), from this page's own Python cells, in the lesson app on the postgres lab
// (columnar-mpp/06-vectorized-execution), three runs each in one held lab call. Per value over the
// 25,920,000 values: one row per call 40.89 ns, batches of 2,048 5.91 ns, one pyarrow sum over the
// whole column 0.22 ns. Whole query by batch size: rows 1.06–1.26 s, batches of 64
// 3.86–4.10 s, of 2,048 0.14–0.16 s, of 65,536 0.02–0.03 s. `lane` is bikes[182:190] (sum 14).
const CAPTURED = {
  values: 25920000, lane: [2, 1, 4, 0, 3, 2, 2, 0],
  perValue: [["one row per call", 40.89, ""], ["2,048 per call", 5.91, ""], ["one call for the whole column", 0.22, "on"]],
  sizes: [["one row per call", "25,920,000 rows", 1.1, ""], ["batches of 64", "405,000 batches", 3.9, "warm"],
    ["batches of 2,048", "12,657 batches", 0.15, "on"], ["batches of 65,536", "396 batches", 0.02, ""]],
};

const steps = () => [
  { stop: "One instruction", title: "One instruction, many values",
    note: `Press <b>Play</b>. A batch holds values of one type side by side, so the compiled loop can load eight 2-byte values into one 128-bit register and add all eight with <b>one instruction</b> (SIMD). Fed one value at a time, the CPU spends an instruction on each.` },
  { stop: "Batch size", title: "Every call has a fixed cost",
    note: `Batches of 64 are slower than rows: every batch pays a few pyarrow calls, each far dearer than a step of a Python loop, and 405,000 batches pay them 405,000 times. Larger batches pay that fixed cost less often. The limit is memory: a batch is as large as stays comfortably in the fast memory beside the CPU while every operator works on it.` },
];

const CSS = `
.lw .vxb .cellv { fill:var(--cell); stroke:var(--line); stroke-width:1; transition:fill .25s, stroke .25s, transform .25s; }
.lw .vxb .cellv.hit { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .vxb .cellv.done { fill:var(--ok-bg); stroke:var(--ok); }
.lw .vxb .lane { fill:none; stroke:var(--line); stroke-width:1.5; stroke-dasharray:4 4; transition:stroke .25s; }
.lw .vxb .lane.hit { stroke:var(--accent); stroke-dasharray:none; stroke-width:2.5; }
.lw .vxb text.huge { font:650 26px ui-monospace, Menlo, monospace; fill:var(--ink); }
.lw .vxb text.huge.acc { fill:var(--accent); } .lw .vxb text.huge.hot { fill:var(--hot); }
.lw .vxb .chip { fill:var(--cell); }
.lw .vxb .rule { stroke:var(--line); stroke-width:1; }
.lw .vxb .tagbg { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1; }
.lw .vxb .tagbg.hot { fill:var(--hot-bg); stroke:var(--hot); }
.lw .vxb text.tg { font:600 12px system-ui, sans-serif; fill:var(--accent); }
.lw .vxb text.tg.hot { fill:var(--hot); }
.lw .vxb .play { cursor:pointer; pointer-events:auto; }
.lw .vxb .st:not(.on) .play { pointer-events:none; }
.lw .vxb .play rect { fill:var(--accent); stroke:none; transition:opacity .2s; } .lw .vxb .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .vxb .play:hover rect { opacity:.85; }
.lw .vxb .play.busy { opacity:.45; pointer-events:none; }
`;

// A small rounded tag: a label in a tinted pill, `w` wide, centred on x.
const tag = (x, y, w, label, cls = "") => `<rect class="tagbg ${cls}" x="${x - w / 2}" y="${y - 11}" width="${w}" height="22" rx="11"/>
  <text class="tg ${cls}" x="${x}" y="${y + 1}">${label}</text>`;

// One side of the race: eight value cells, optionally inside a lane, a running total and a count.
const side = (D, x, cap, wide) => { const W = wide ? 366 : 352, R = x + W - 20;
  return `<rect class="zone" x="${x}" y="56" width="${W}" height="184" rx="12"/>
  <text class="cap" x="${x + 20}" y="80">${cap}</text>
  ${wide ? `<rect class="lane" x="${x + 14}" y="96" width="334" height="48" rx="10"/>` : ""}
  ${D.lane.map((v, i) => `<rect class="cellv c${i}" x="${x + 20 + i * 40}" y="104" width="34" height="32" rx="7"/>
    <text class="mono" x="${x + 37 + i * 40}" y="121">${v}</text>`).join("")}
  <text class="lbl l" x="${x + 20}" y="162">${wide ? "8 × 2-byte values = one 128-bit register" : "8 values, 8 separate adds"}</text>
  <line class="rule" x1="${x + 20}" y1="178" x2="${R}" y2="178"/>
  <text class="l" x="${x + 20}" y="200">total</text><text class="huge r n-tot" x="${R}" y="200">0</text>
  <text class="l" x="${x + 20}" y="226">add instructions</text><text class="huge r ${wide ? "acc" : "hot"} n-ins" x="${R}" y="226">0</text>`; };

// A horizontal bar off a thin axis, with its value at the bar's end.
const bar = (x, y, w, full, cls, label) => `<line class="rule" x1="${x - 1}" y1="${y - 6}" x2="${x - 1}" y2="${y + 24}"/>
  <rect class="bar ${cls}" x="${x}" y="${y}" width="${w}" height="18" rx="5"/>
  <text class="big l ${cls === "on" ? "acc" : cls === "warm" ? "hot" : ""}" x="${x + w + 10}" y="${y + 10}">${label}</text>`;

const perValue = (D) => { const scale = 360 / D.perValue[0][1];
  return `<rect class="zone" x="14" y="254" width="732" height="148" rx="12"/>
  <text class="cap" x="34" y="280">MEASURED IN THE CELLS · TIME PER VALUE · ${fmt(D.values)} VALUES</text>
  ${D.perValue.map(([label, ns, cls], i) => { const y = 310 + i * 30;
    return `<text class="l ${cls ? "acc" : ""}" x="34" y="${y}">${label}</text>${bar(270, y - 9, Math.max(3, ns * scale), 360, cls, `${ns} ns`)}`; }).join("")}`; };

const bars = (D) => { const max = Math.max(...D.sizes.map((s) => s[2])), scale = 400 / max;
  return `<g class="st" data-on="1"><rect class="zone" x="14" y="14" width="732" height="386" rx="12"/>
  <text class="cap" x="34" y="44">THE SAME THREE OPERATORS · ${fmt(D.values)} VALUES · TIME BY VALUES PER CALL</text>
  ${D.sizes.map(([label, calls, s, cls], i) => { const y = 98 + i * 78;
    return `<text class="l ${cls === "on" ? "acc" : cls === "warm" ? "hot" : ""}" x="34" y="${y}">${label}</text><text class="lbl l" x="34" y="${y + 22}">${calls}</text>
      ${bar(216, y - 9, Math.max(3, s * scale), 400, cls, `${s} s`)}`; }).join("")}
  ${tag(330, 98 + 78 + 30, 190, "slower than one row per call", "hot")}
  ${tag(330, 98 + 2 * 78 + 30, 172, "fewer calls, less fixed cost")}
  </g>`; };

const scene = (D) => `<svg viewBox="0 0 760 414">
  <g class="st" data-on="0">
    <g class="play"><rect x="14" y="8" width="96" height="34" rx="17"/><text x="62" y="26">▶ Play</text></g>
    <rect class="chip" x="122" y="9" width="372" height="32" rx="8"/>
    <text class="lbl l now" x="136" y="26">both sides add the same eight values</text>
    <g class="one">${side(D, 14, "ONE VALUE PER INSTRUCTION", false)}</g>
    <g class="simd">${side(D, 380, "ONE INSTRUCTION, A LANE OF EIGHT", true)}</g>
    ${perValue(D)}</g>
  ${bars(D)}
</svg>`;

function reset(root) {
  (root._timers || []).forEach(clearTimeout);
  root._timers = [];
  root.querySelectorAll(".cellv, .lane").forEach((c) => c.classList.remove("hit", "done"));
  root.querySelectorAll(".n-tot, .n-ins").forEach((n) => { n.textContent = "0"; });
  root.querySelector(".play").classList.remove("busy");
  root.querySelector(".now").textContent = "both sides add the same eight values";
}

// One run: the lane adds all eight in one beat; the other side adds one value per beat.
function play(root, D) {
  const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const one = root.querySelector(".one"), simd = root.querySelector(".simd"), now = root.querySelector(".now");
  const at = (ms, fn) => root._timers.push(setTimeout(fn, still ? 0 : ms));
  reset(root);
  root.querySelector(".play").classList.add("busy");
  now.textContent = "the lane: one add, eight values";
  at(150, () => { simd.querySelector(".lane").classList.add("hit"); simd.querySelectorAll(".cellv").forEach((c) => c.classList.add("hit")); });
  at(600, () => { simd.querySelectorAll(".cellv").forEach((c) => c.classList.add("done")); simd.querySelector(".n-tot").textContent = D.lane.reduce((a, b) => a + b, 0); simd.querySelector(".n-ins").textContent = "1"; });
  let total = 0;
  D.lane.forEach((v, i) => at(150 + i * 520, () => {
    total += v;
    const cells = one.querySelectorAll(".cellv");
    if (i > 0) cells[i - 1].classList.replace("hit", "done");
    cells[i].classList.add("hit");
    one.querySelector(".n-tot").textContent = total; one.querySelector(".n-ins").textContent = i + 1;
    if (i > 0) now.textContent = `one at a time: add ${i + 1} of 8`;
  }));
  at(150 + D.lane.length * 520, () => { one.querySelectorAll(".cellv")[D.lane.length - 1].classList.replace("hit", "done"); now.textContent = "the same total: 1 instruction against 8"; root.querySelector(".play").classList.remove("busy"); });
}

function after(root, at, D) {
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.querySelector(".play").addEventListener("click", () => root.dataset.at === "0" && play(root, D));
  }
  reset(root);
}

export default { render: build({ stepper, key: "vxb", label: "One instruction over a lane of values", css: CSS, steps, scene, captured: CAPTURED, after: (root, at) => after(root, at, CAPTURED) }) };
