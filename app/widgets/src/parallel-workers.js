// parallel-workers — one aggregate over 15,000,000 rows, run by one process and then by several:
// what the workers share (the work on rows), what they do not (the pages), and what each one adds.
// Fixed, measured numbers; the dial walks through the measured worker counts.
import { cards, time } from "../lib/cards.js";
import { fmt, scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

// Measured with this Postgres held to 3 CPUs: past two workers every process only takes turns.
const D = { rows: 15000000, pages: 95542, cpuCost: 150000, divisor: 2.4, cpus: 3,
  runs: [[0, 2940], [1, 1410], [2, 970], [3, 1130], [4, 1530], [5, 1360]] }; // [workers, ms]
const PRESET = [0, 2, 2, 4]; // index into runs that each step opens on
const cost = (n) => Math.round(n).toLocaleString("en-US");

const steps = () => [
  { stop: "One process", title: `One process works through ${fmt(D.rows)} rows`,
    note: `Units sold per product. Every row is needed, and almost none of the time is spent waiting for pages: the query is CPU-bound.` },
  { stop: "Workers", title: "A Gather node hands the scan to helpers", produces: "Gather · Parallel Seq Scan",
    note: `Each process takes the next free block of pages, aggregates its own rows, and passes one small result up. The leader works too, then combines.` },
  { stop: "What is divided", title: "The work on rows is divided. The pages are not.",
    note: `The planner's own arithmetic: the cost of reading pages stays whole, the cost of handling rows is divided by ${D.divisor} for two workers. The same ${fmt(D.pages)} pages are read either way.` },
  { stop: "More workers", title: "Past the CPUs the server has, a worker buys nothing", decisive: true,
    note: `This Postgres has ${D.cpus} CPUs. The leader and two workers already use them all, so a fourth and a fifth process only take turns with the others, and the query gets slower again. Drag the dial. And while this query holds every CPU, every other query on the server waits.` },
];

const CSS = `
.lw .pw .top2 { display:grid; grid-template-columns:1fr max-content; gap:8px 20px; align-items:center; }
.lw .pw input[type=range] { width:100%; accent-color:var(--accent); height:28px; cursor:pointer; }
.lw .pw .ticks { display:flex; justify-content:space-between; font:12px ui-monospace, Menlo, monospace; color:var(--mute); padding:0 2px; }
.lw .pw .dialbox { transition:opacity .5s; } .lw .pw:not([data-at="3"]) .dialbox { opacity:.35; pointer-events:none; }
.lw .pw .big { text-align:right; } .lw .pw .big b { display:block; font:600 26px ui-monospace, Menlo, monospace; color:var(--accent); }
.lw .pw .big small { font-size:13px; color:var(--mute); }
.lw .pw .lanes { display:flex; gap:8px; min-height:62px; }
.lw .pw .lane { flex:1 1 0; min-width:0; padding:9px 10px; border-radius:10px; background:var(--accent-bg); border:1px solid var(--accent); text-align:center; }
.lw .pw .lane .who { display:block; font-weight:600; font-size:14px; color:var(--accent); }
.lw .pw .lane .n { display:block; font:13px ui-monospace, Menlo, monospace; color:var(--mute); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lw .pw .card.st { transition:opacity .6s; }
.lw .pw .costs { display:grid; grid-template-columns:max-content 1fr max-content; gap:12px 14px; align-items:center; font-size:14px; }
.lw .pw .costs .track { position:relative; overflow:visible; }
.lw .pw .costs .track i { position:absolute; left:0; top:0; bottom:0; }
.lw .pw .costs .track i.was { background:var(--cell); border:1px dashed var(--mute); box-sizing:border-box; }
`;
const scene = () => `
  <div class="card"><div class="top2">
    <div class="dialbox"><input type="range" min="0" max="${D.runs.length - 1}" step="1" value="0" aria-label="workers">
      <div class="ticks">${D.runs.map(([w]) => `<span>${w === 0 ? "no workers" : `${w} worker${w > 1 ? "s" : ""}`}</span>`).join("")}</div></div>
    <div class="big"><b class="ms"></b><small class="gain"></small></div></div></div>
  <div class="card"><h4>Who handles the rows · ${fmt(D.pages)} pages read in every case</h4><div class="lanes"></div></div>
  <div class="card st" data-on="2"><h4>The planner's cost for the scan, one process against two workers</h4><div class="costs">
    <span class="lab">reading the pages<small>not divided</small></span><div class="track"><i style="width:${(100 * D.pages) / D.cpuCost}%"></i></div>
      <span class="v">${cost(D.pages)}<small>stays ${cost(D.pages)}</small></span>
    <span class="lab">handling the rows<small>divided by ${D.divisor}</small></span><div class="track"><i class="was" style="width:100%"></i><i class="acc" style="width:${100 / D.divisor}%"></i></div>
      <span class="v acc">${cost(D.cpuCost / D.divisor)}<small>was ${cost(D.cpuCost)}</small></span>
  </div></div>`;

function show(root, i) {
  const [workers, ms] = D.runs[i], hands = workers + 1, each = D.rows / hands;
  root.querySelector(".ms").textContent = time(ms);
  root.querySelector(".gain").textContent = workers ? `${(D.runs[0][1] / ms).toFixed(1)}× faster with ${hands} processes` : "one process";
  root.querySelector(".lanes").innerHTML = Array.from({ length: hands }, (_, n) => `<div class="lane ${n ? "" : "leader"}">
    <span class="who">${n ? `worker ${n}` : workers ? "leader" : "the one process"}</span><span class="n">${fmt(Math.round(each))} rows</span></div>`).join("");
}
function after(root, at) {
  const dial = root.querySelector("input");
  if (!root.dataset.bound) { root.dataset.bound = "1"; dial.addEventListener("input", () => show(root, Number(dial.value))); }
  if (root.dataset.step !== String(at)) { root.dataset.step = String(at); dial.value = PRESET[at]; }
  show(root, Number(dial.value));
}

export default { render: build({ stepper, key: "pw", label: "What parallel workers share", css: cards("pw") + CSS, steps, scene, after }) };
