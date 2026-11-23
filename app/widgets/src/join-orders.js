// join-orders — how fast the number of possible join orders grows with the number of tables, what
// searching all of them costs in planning time, and the two limits at which the planner stops trying.
// Planning times are measured (a full search with both limits lifted); the counts are n factorial.
import { bar, cards, time } from "../lib/cards.js";
import { fmt, scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const MAX = 14, COLLAPSE = 8, GEQO = 12;
const FULL = { 4: 0.07, 6: 0.15, 8: 1.3, 10: 12, 12: 200, 14: 1800 }; // ms to plan, searching every order
const DEFAULT_MS = 1.8; // ms to plan the 14-table query with the limits in place
const WRITTEN = { free: 1560, asWritten: 9400 };
const PRESET = [3, 8, 14, 14];
const orders = (n) => Array.from({ length: n }, (_, i) => i + 1).reduce((a, b) => a * b, 1);

const steps = () => [
  { stop: "A few tables", title: "Three tables can be joined in six orders",
    note: `The order matters: start from the table the filter cuts down, and every later join handles few rows. The planner prices every order and keeps the cheapest.` },
  { stop: "The explosion", title: "Each added table multiplies the orders",
    note: `Eight tables: 40,320 orders. Drag the dial. The planner is clever about not pricing each one from scratch, but the search still grows with every table.` },
  { stop: "The limits", title: "Past a limit, the planner stops searching everything",
    note: `Above <b>${COLLAPSE}</b> tables it searches only within groups and otherwise follows the order the query was written in. From <b>${GEQO}</b> it switches to a randomised, genetic search. Planning stays fast; the plan may no longer be the best one.` },
  { stop: "A worse plan", title: "Following the written order can cost a lot", decisive: true,
    note: `The same four-table query, planned freely and then held to the order it was written in. With many joins, the written order starts to matter.` },
];

const CSS = `
.lw .jo .top2 { display:grid; grid-template-columns:1fr max-content; gap:8px 20px; align-items:center; }
.lw .jo input[type=range] { width:100%; accent-color:var(--accent); height:28px; cursor:pointer; }
.lw .jo .ticks { position:relative; height:34px; font:12px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .jo .ticks span { position:absolute; transform:translateX(-50%); white-space:nowrap; text-align:center; }
.lw .jo .ticks .lim { color:var(--hot); opacity:0; transition:opacity .5s; top:16px; }
.lw .jo[data-at="2"] .ticks .lim, .lw .jo[data-at="3"] .ticks .lim { opacity:1; }
.lw .jo .big { text-align:right; min-width:250px; } .lw .jo .big b { display:block; font:600 26px ui-monospace, Menlo, monospace; color:var(--accent); }
.lw .jo .big small { font-size:13px; color:var(--mute); }
.lw .jo .how { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; min-height:28px; }
.lw .jo .card.st { transition:opacity .6s; }
.lw .jo .swap { display:grid; } .lw .jo .swap > .card { grid-area:1 / 1; }
`;
const at = (n) => `${(100 * (n - 2)) / (MAX - 2)}%`;
const scene = () => `
  <div class="card"><div class="top2">
    <div><input type="range" min="2" max="${MAX}" step="1" value="3" aria-label="tables joined">
      <div class="ticks">${[2, 4, 6, 8, 10, 12, 14].map((n) => `<span style="left:${at(n)}">${n}</span>`).join("")}
        <span class="lim" style="left:${at(COLLAPSE)}">▲ join_collapse_limit</span><span class="lim" style="left:${at(GEQO)}">▲ geqo_threshold</span></div></div>
    <div class="big"><b class="count"></b><small class="tables"></small></div></div>
    <div class="how"></div></div>
  <div class="swap"><div class="card st" data-on="1 2"><h4>Time to plan a 14-table query</h4><div class="bars">
    ${bar({ label: "searching every order", sub: "both limits lifted", share: 1, value: time(FULL[14]), colour: "hot", on: 'data-on="1 2"' })}
    ${bar({ label: "with the limits", sub: "the default", share: DEFAULT_MS / FULL[14], value: time(DEFAULT_MS), colour: "acc", on: 'data-on="2"' })}
  </div></div>
  <div class="card st" data-on="3"><h4>One customer's order lines, across four tables</h4><div class="bars">
    ${bar({ label: "planned freely", sub: "starts from the one customer", share: WRITTEN.free / WRITTEN.asWritten, value: time(WRITTEN.free), colour: "acc", on: 'data-on="3"' })}
    ${bar({ label: "in the written order", sub: "join_collapse_limit = 1", share: 1, value: time(WRITTEN.asWritten), colour: "hot", on: 'data-on="3"' })}
  </div></div></div>`;

function show(root, n, step) {
  root.querySelector(".count").textContent = fmt(orders(n));
  root.querySelector(".tables").textContent = `possible orders for ${n} tables`;
  const full = FULL[n] ? `<span class="chip">searching all of them: ${time(FULL[n])} of planning</span>` : "";
  const how = n >= GEQO ? `<span class="chip hot">genetic search: a good order, not the best</span>`
    : n > COLLAPSE ? `<span class="chip hot">partly the written order</span>` : `<span class="chip ok">every order considered</span>`;
  root.querySelector(".how").innerHTML = (step >= 1 ? full : "") + (step >= 2 ? how : "");
}
function after(root, step) {
  const dial = root.querySelector("input");
  if (!root.dataset.bound) { root.dataset.bound = "1"; dial.addEventListener("input", () => show(root, Number(dial.value), Number(root.dataset.at))); }
  if (root.dataset.step !== String(step)) { root.dataset.step = String(step); dial.value = PRESET[step]; }
  show(root, Number(dial.value), step);
}

export default { render: build({ stepper, key: "jo", label: "How many ways to order the joins", css: cards("jo") + CSS, steps, scene, after }) };
