// stats-freshness — the same table at four moments: just loaded, analyzed, changed, analyzed again.
// At each one, what the planner expects against what is there. Fixed, measured numbers.
import { cards } from "../lib/cards.js";
import { fmt, scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const TABLE = 500000, CHANGED = 40000, DUE = 50 + 0.1 * TABLE;
// Per moment: the questions asked, with the estimate and the real count.
const MOMENTS = [
  { stats: "none", rows: [["status = 'pending'", 1445, 4999], ["amount &lt; 20", 96320, 15214]] },
  { stats: "fresh", rows: [["status = 'pending'", 4517, 4999], ["amount &lt; 20", 15269, 15214]] },
  { stats: "stale", rows: [["status = 'pending'", 4517, 4999], ["status = 'refunded'", 1, 40000]] },
  { stats: "fresh", rows: [["status = 'pending'", 4517, 4999], ["status = 'refunded'", 40950, 40000]] },
];

const steps = () => [
  { stop: "Just loaded", title: "A table that was just loaded has no statistics",
    note: `With nothing to go on the planner falls back on fixed guesses: <b>0.5%</b> of the rows for "equals", <b>a third</b> for "less than". Sometimes close, sometimes far off.` },
  { stop: "ANALYZE", title: "After ANALYZE, the estimates follow the data",
    note: `One command, a few milliseconds on this table.` },
  { stop: "A change", title: `${fmt(CHANGED)} rows arrive with a status the statistics have never seen`,
    note: `The statistics still describe the table as it was. Automatic analyze starts only after <b>10% of the table plus 50 rows</b> changed, and this is under it.` },
  { stop: "ANALYZE again", title: "After a bulk change, run ANALYZE yourself", decisive: true,
    note: `Loads, mass updates and big deletes are exactly when the statistics are wrong and nobody has refreshed them yet.` },
];

const CSS = `
.lw .sf .head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:14px; }
.lw .sf .grid { display:grid; grid-template-columns:1.4fr 1fr 1fr max-content; gap:10px 18px; align-items:center; font:15px ui-monospace, Menlo, monospace; }
.lw .sf .grid .h { font:600 11px system-ui, sans-serif; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); }
.lw .sf .grid .n { text-align:right; font-weight:600; }
.lw .sf .grid .est.off { color:var(--hot); } .lw .sf .grid .est.near { color:var(--ok); }
.lw .sf .meter { position:relative; height:18px; border-radius:9px; background:var(--cell); margin:26px 0 8px; }
.lw .sf .meter i { position:absolute; left:0; top:0; bottom:0; width:${(100 * CHANGED) / (DUE * 1.25)}%; border-radius:9px; background:var(--hot); }
.lw .sf .meter b { position:absolute; left:${100 / 1.25}%; top:-6px; bottom:-6px; width:2px; background:var(--ink); }
.lw .sf .meter span { position:absolute; left:${100 / 1.25}%; top:-26px; transform:translateX(-50%); font-size:12px; color:var(--mute); white-space:nowrap; }
.lw .sf .card.st { transition:opacity .6s; }
`;
const scene = () => `
  <div class="card"><div class="head"><span class="chip">table fresh · <span class="size"></span> rows</span><span class="chip state"></span></div></div>
  <div class="card"><h4>What the plan expects, against what is there</h4><div class="grid"></div></div>
  <div class="card st" data-on="2"><h4>Rows changed since the last analyze</h4>
    <div class="meter"><i></i><b></b><span>automatic analyze starts at ${fmt(DUE)}</span></div>
    <p class="say">${fmt(CHANGED)} changed — not yet enough.</p></div>`;

const STATE = { none: ["hot", "no statistics"], fresh: ["ok", "statistics up to date"], stale: ["hot", `statistics from before the change`] };
function after(root, at) {
  const moment = MOMENTS[at], [colour, text] = STATE[moment.stats];
  root.querySelector(".size").textContent = fmt(at >= 2 ? TABLE + CHANGED : TABLE);
  const state = root.querySelector(".state"); state.className = `chip state ${colour}`; state.textContent = text;
  root.querySelector(".grid").innerHTML = `<span class="h">where</span><span class="h n">estimated</span><span class="h n">actual</span><span class="h">off by</span>` +
    moment.rows.map(([where, est, actual]) => { const off = Math.max(est, actual) / Math.max(1, Math.min(est, actual)), far = off >= 2;
      return `<span>${where}</span><span class="n est ${far ? "off" : "near"}">${fmt(est)}</span><span class="n">${fmt(actual)}</span>
        <span class="chip ${far ? "hot" : "ok"}">${far ? `${fmt(Math.round(off))}×` : "close"}</span>`; }).join("");
}

export default { render: build({ stepper, key: "sf", label: "Statistics, fresh and stale", css: cards("sf") + CSS, steps, scene, after }) };
