// index-cost — what an index charges: every new row is written to the table and to every index,
// and each index takes room of its own.
// Fixed, measured numbers: loading half a million rows on every page view is too heavy to do live.
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const D = { rows: "500,000", runs: [["no index", 0.29], ["1 index", 0.52], ["5 indexes", 4.1]], table: 52, indexes: 49,
  columns: ["order_id", "customer_id", "created_at", "status", "amount"] };
const slower = (D.runs[2][1] / D.runs[0][1]).toFixed(0);

const steps = () => [
  { stop: "No index", title: `Loading ${D.rows} orders into an empty table`, produces: `${D.runs[0][1]} s`,
    note: `With no index, a new row is appended to the pile and that is all.` },
  { stop: "One", title: "One index: every new row is also filed in it", produces: `${D.runs[1][1]} s`,
    note: `The row's value has to be put in its sorted place in the index, as well as in the table.` },
  { stop: "Five", title: "Five indexes: five more structures to keep up to date", produces: `${D.runs[2][1]} s`,
    note: `The same rows, about ${slower} times slower to load. Every insert, and every update of an indexed column, pays for every index.` },
  { stop: "Space", title: "And they take room", decisive: true, produces: `${D.indexes} MB of indexes`,
    note: `Five indexes on this table are nearly as large as the table itself: more pages competing for memory. An index earns its place only if queries use it.` },
];

const CSS = `
.lw .ic { display:grid; gap:14px; }
.lw .ic .card { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px 16px; }
.lw .ic h4 { margin:0 0 12px; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .ic .writes { display:flex; flex-wrap:wrap; align-items:center; gap:8px; min-height:38px; }
.lw .ic .writes .row { padding:7px 14px; border-radius:999px; background:var(--accent-bg); color:var(--accent); font-weight:600; font-size:14px; }
.lw .ic .writes .to { color:var(--mute); font-size:18px; }
.lw .ic .writes .t { padding:7px 14px; border-radius:10px; background:var(--cell); font:13px ui-monospace, Menlo, monospace; transform:translateY(6px); transition:opacity .5s, transform .5s; }
.lw .ic .writes .t.on { transform:none; }
.lw .ic .writes .t.heap { font:600 14px system-ui, sans-serif; }
.lw .ic .writes .t.ix { border:1px solid var(--hot); background:var(--hot-bg); color:var(--hot); }
.lw .ic .bars { display:grid; grid-template-columns:max-content 1fr max-content; gap:10px 14px; align-items:center; font-size:14px; }
.lw .ic .bars .r { display:contents; }
.lw .ic .track { height:16px; border-radius:8px; background:var(--cell); overflow:hidden; }
.lw .ic .track b { display:block; height:100%; width:0; border-radius:8px; background:var(--accent); transition:width .9s ease-out; }
.lw .ic .r.on .track b { width:var(--w); }
.lw .ic .track b.hot { background:var(--hot); } .lw .ic .track b.mute { background:var(--mute); }
.lw .ic .v { font:600 16px ui-monospace, Menlo, monospace; min-width:70px; }
.lw .ic .v.hot { color:var(--hot); } .lw .ic .v.acc { color:var(--accent); }
`;
const max = D.runs[2][1], big = Math.max(D.table, D.indexes);
const run = ([name, seconds], i) => `<div class="r st" data-from="${i}"><span>${name}</span><div class="track"><b class="${i === 2 ? "hot" : ""}" style="--w:${(100 * seconds) / max}%"></b></div><span class="v ${i === 2 ? "hot" : "acc"}">${seconds.toFixed(2)} s</span></div>`;
const scene = () => `
  <div class="card"><h4>Where one new row has to be written</h4>
    <div class="writes"><span class="row">a new order</span><span class="to">→</span><span class="t heap st on" data-from="0">the table</span>
      ${D.columns.map((c, i) => `<span class="t ix st" data-from="${i === 0 ? 1 : 2}">index on ${c}</span>`).join("")}</div></div>
  <div class="card"><h4>Time to load ${D.rows} rows</h4><div class="bars">${D.runs.map(run).join("")}</div></div>
  <div class="card st" data-from="3"><h4>Space on disk</h4><div class="bars">
    <div class="r st" data-from="3"><span>the table</span><div class="track"><b class="mute" style="--w:${(100 * D.table) / big}%"></b></div><span class="v">${D.table} MB</span></div>
    <div class="r st" data-from="3"><span>its 5 indexes</span><div class="track"><b class="hot" style="--w:${(100 * D.indexes) / big}%"></b></div><span class="v hot">${D.indexes} MB</span></div></div></div>`;

export default { render: build({ stepper, key: "ic", label: "What an index charges", css: CSS, steps, scene }) };
