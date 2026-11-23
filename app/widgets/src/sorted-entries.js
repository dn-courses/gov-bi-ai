// sorted-entries — what a sorted index serves: one value, a range, an order; and what it does not.
// Captured data only for now: measured in the lab, not yet read live.
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const KEYS = 16; // the first entries of the index, drawn as chips
// Per step: the three figures its plan reports — [label, value].
const STEPS = [
  { stop: "Equal", title: "One value: go straight to it", query: "customer_id = 1",
    note: `Descend to the entry and read its addresses.`, stats: [["pages read", "53"], ["time", "0.05 ms"], ["rows", "50"]] },
  { stop: "Range", title: "A range: go to its start, then walk", query: "customer_id BETWEEN 1 AND 20",
    note: `Values that are close are neighbours in the index, so a range is one descent and a short walk to the right.`, stats: [["pages read", "1,003"], ["time", "0.8 ms"], ["rows", "1,000"]] },
  { stop: "Order", title: "An order: it is already sorted", query: "ORDER BY customer_id LIMIT 5",
    note: `Start at the left edge, take five rows, stop. Nothing is sorted at query time.`, stats: [["pages read", "8"], ["time", "0.01 ms"], ["sorting", "none"]] },
  { stop: "Not served", title: "Another column: no help", decisive: true, query: "amount = 470.00",
    note: `The index is ordered by <code>customer_id</code>; amounts are scattered all through it. An index serves the access pattern it was built for.`, stats: [["pages read", "66,657"], ["plan", "Seq Scan"], ["index used", "no"]] },
];
const steps = () => STEPS;

const CSS = `
.lw .se { display:grid; gap:14px; }
.lw .se .card { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px 16px; }
.lw .se h4 { margin:0 0 12px; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .se .strip { display:flex; gap:5px; align-items:center; }
.lw .se .strip i { flex:1 1 0; padding:9px 0; text-align:center; border-radius:8px; background:var(--cell); border:1px solid transparent;
      font:600 14px ui-monospace, Menlo, monospace; font-style:normal; transition:background .35s, color .35s, border-color .35s; }
.lw .se .strip .more { flex:none; padding-left:6px; color:var(--mute); font-size:13px; white-space:nowrap; }
.lw .se[data-at="0"] .strip i:first-child, .lw .se[data-at="2"] .strip i:first-child { background:var(--accent); color:var(--accent-ink); }
.lw .se[data-at="1"] .strip i { background:var(--accent); color:var(--accent-ink); transition-delay:calc(var(--i) * 45ms); }
.lw .se[data-at="3"] .strip i { border-color:var(--hot); background:var(--hot-bg); color:var(--hot); }
.lw .se .walk { position:relative; height:26px; margin-top:8px; font-size:13px; color:var(--mute); }
.lw .se .walk span { position:absolute; left:0; top:4px; white-space:nowrap; }
.lw .se .ask { display:flex; flex-wrap:wrap; align-items:stretch; gap:12px; }
.lw .se .q { flex:1 1 260px; position:relative; min-height:64px; }
.lw .se .q code { position:absolute; inset:0; display:flex; align-items:center; padding:0 16px; border-radius:12px; background:var(--code);
      font:600 15px ui-monospace, Menlo, monospace; }
.lw .se .stat { flex:1 1 130px; position:relative; min-height:64px; border-radius:12px; background:var(--panel); border:1px solid var(--line); }
.lw .se .stat div { position:absolute; inset:0; padding:9px 14px; }
.lw .se .stat small { display:block; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--mute); }
.lw .se .stat b { display:block; margin-top:3px; font:600 20px ui-monospace, Menlo, monospace; color:var(--accent); }
.lw .se[data-at="3"] .stat b { color:var(--hot); }
`;
const HINTS = ["one entry", "entries 1 to 20, side by side: read left to right", "the first five rows all come from the first entry", "an amount of 470.00 could be under any entry"];
const per = (html) => STEPS.map((s, i) => `<div class="st" data-on="${i}">${html(s, i)}</div>`).join("");
const scene = () => `
  <div class="card"><h4>The index's entries, in order of customer_id</h4>
    <div class="strip">${Array.from({ length: KEYS }, (_, i) => `<i style="--i:${i}">${i + 1}</i>`).join("")}<span class="more">… 100,000</span></div>
    <div class="walk">${HINTS.map((h, i) => `<span class="st" data-on="${i}">${h}</span>`).join("")}</div></div>
  <div class="ask"><div class="q">${STEPS.map((s, i) => `<code class="st" data-on="${i}">${s.query}</code>`).join("")}</div>
    ${[0, 1, 2].map((k) => `<div class="stat">${per((s) => `<small>${s.stats[k][0]}</small><b>${s.stats[k][1]}</b>`)}</div>`).join("")}</div>`;

export default { render: build({ stepper, key: "se", label: "What a sorted index serves", css: CSS, steps, scene }) };
