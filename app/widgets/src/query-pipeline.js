// query-pipeline — one query travelling from SQL text to rows: parser, rewriter, planner, executor.
//
// The top row is the artefact each stage hands to the next; the panel under it shows what the
// current stage does. It draws at once from CAPTURED — measured on PostgreSQL 18 and the lab's
// `shop` database with parallel workers off — then asks the lab for the same facts and redraws:
// the plan the planner chose and what running it read and took, the plan it rejected (the same
// query with index access switched off for one transaction) and its cost and time, and the row.
// The parser and rewriter steps are fixed text: PostgreSQL does not expose those stages.
// It only reads, and the transaction it sets its switches in is rolled back.

import { live } from "../lib/kernel.js";
import { stepper } from "../lib/stepper.js";

const DB = "shop";
const ID = 4200000;
const QUERY = `SELECT order_id, customer_id, status, amount FROM orders WHERE order_id = ${ID}`;
const MEASURE = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${QUERY}`;

const CAPTURED = {
  tableSize: "521 MB", tableRows: 5000000,
  seqCost: 129157.0, idxCost: 8.45, readKb: 32,
  fastMs: 0.011, slowMs: 200,
  row: { order_id: 4200000, customer_id: 1, status: "delivered", amount: "470.00" },
};

async function load(kernel) {
  // The row is fetched before the plan is timed, so the timing is not that of a connection's first
  // query, which also pays for loading the table's definition.
  const [, [row], [[[chosen]]], [[tableSize, blockSize]], , , [[[rejected]]]] = await kernel.sql(
    [
      "SET LOCAL max_parallel_workers_per_gather = 0",
      QUERY,
      MEASURE,
      "SELECT pg_size_pretty(pg_relation_size('orders')), current_setting('block_size')::int",
      "SET LOCAL enable_indexscan = off",
      "SET LOCAL enable_bitmapscan = off",
      MEASURE,
    ],
    { dbname: DB, rollback: true },
  );
  const [idx, seq] = [chosen.Plan, rejected.Plan];
  const blocks = idx["Shared Hit Blocks"] + idx["Shared Read Blocks"];
  // The scene draws an index scan of three lookup steps and one read of the table's file, beside
  // a scan of the whole table; any other pair of plans stays captured.
  const fits =
    idx["Node Type"] === "Index Scan" && idx["Index Name"] === "orders_pkey" && blocks === 4 &&
    seq["Node Type"] === "Seq Scan" && idx["Total Cost"] < seq["Total Cost"] && row?.length === 4 &&
    chosen["Execution Time"] < rejected["Execution Time"];
  if (!fits) throw new Error("the live plans do not have the shape this scene draws");
  return {
    tableSize,
    tableRows: seq["Actual Rows"] + seq["Rows Removed by Filter"],
    seqCost: seq["Total Cost"],
    idxCost: idx["Total Cost"],
    readKb: (blocks * blockSize) / 1024,
    fastMs: Number(chosen["Execution Time"].toFixed(3)),
    slowMs: Math.round(rejected["Execution Time"]),
    row: { order_id: row[0], customer_id: row[1], status: row[2], amount: row[3] },
  };
}

const n = (x, d = 0) => x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

const steps = (D) => [
  { stop: "SQL", title: "You state the result — not the method",
    note: `Which order, which columns. Nothing about opening a file, looping or testing rows.` },
  { stop: "Parse", title: "The parser turns text into a tree", produces: "query tree",
    note: `Is this valid SQL? Does <code>orders</code> exist, and these columns? Then the text becomes a structure: <b>what</b> to return, <b>from</b> where, under which <b>condition</b>.` },
  { stop: "Rewrite", title: "The rewriter applies stored rules", produces: "query tree",
    note: `A view is replaced by the query behind it. This query touches a plain table, so the tree passes through unchanged.` },
  { stop: "Plan", title: "The planner prices every way to get the rows", produces: "plan", decisive: true,
    badge: "the only stage that chooses between fast and slow",
    note: `Two ways to find one order among ${n(D.tableRows)}. Each gets an estimated cost; the cheapest wins — here by a factor of <b>${n(Math.round(D.seqCost / D.idxCost))}</b>.` },
  { stop: "Execute", title: "The executor runs the chosen plan",  produces: "rows",
    note: `It reads <b>${D.readKb} kB</b> — three small steps through the lookup structure, then one into the table's file — out of ${D.tableSize}.` },
  { stop: "Rows", title: "One row comes back",
    note: `About <b>${D.fastMs} ms</b> with the plan it chose. The plan it rejected takes about <b>${D.slowMs} ms</b> for the same row.` },
];

const CSS = `
/* Laid out by the widget's own width, not the window's: the lesson column is narrower than the page. */
.lw .qp { display:grid; gap:16px; container-type:inline-size; }
.lw .flow { display:grid; grid-template-columns: 1.7fr auto 1.2fr auto 1fr auto 1.1fr; align-items:stretch; gap:8px; }
.lw .art { background:var(--panel); border:2px solid var(--line); border-radius:10px; padding:10px 12px;
      opacity:.18; transition:opacity .5s, border-color .5s, transform .5s; min-width:0; }
.lw .art.made { opacity:1; }
.lw .art.now { border-color:var(--accent); transform:translateY(-3px); }
.lw .art h4 { margin:0 0 6px; font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); }
.lw .sql { font:14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; white-space:pre; }
.lw .sql span { border-radius:4px; padding:1px 3px; transition:background .5s, color .5s; }
.lw .qp[data-at="1"] .sql .t, .lw .qp[data-at="1"] .node.t { background:var(--accent-bg); color:var(--accent); }
.lw .qp[data-at="1"] .sql .f, .lw .qp[data-at="1"] .node.f { background:var(--ok-bg); color:var(--ok); }
.lw .qp[data-at="1"] .sql .w, .lw .qp[data-at="1"] .node.w { background:var(--hot-bg); color:var(--hot); }
.lw .node { display:block; font-size:13px; padding:4px 8px; margin:4px 0; border-radius:6px; background:var(--cell);
      transition:background .5s, color .5s; }
.lw .node b { font-weight:600; }
.lw .via { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
      font-size:12px; color:var(--mute); min-width:64px; text-align:center; transition:color .4s; }
.lw .via i { font-style:normal; font-size:22px; line-height:1; }
.lw .via.now { color:var(--accent); font-weight:700; }
.lw .via.now.hot { color:var(--hot); }
.lw .via .loop { display:block; opacity:0; transition:opacity .4s; }
.lw .qp[data-at="2"] .via .loop { opacity:1; }
.lw .planline { font:13px/1.5 ui-monospace, Menlo, monospace; }
.lw .planline small { color:var(--mute); display:block; }
.lw .rowout { font:13px/1.5 ui-monospace, Menlo, monospace; }
.lw .rowout div { display:flex; justify-content:space-between; gap:8px; }
.lw .rowout span { color:var(--mute); }

.lw .stage { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px 16px; min-height:168px; }
.lw .stage > div { animation: lw-in .45s both; }
.lw .stage.still, .lw .stage.still * { animation-duration:0s !important; animation-delay:0s !important; transition:none !important; }
.lw .stage h5 { margin:0 0 10px; font-size:14px; color:var(--mute); font-weight:600; }
.lw .checks { display:flex; gap:10px; flex-wrap:wrap; }
.lw .checks span { padding:6px 12px; border-radius:999px; background:var(--ok-bg); color:var(--ok); font-size:14px;
      animation: lw-in .4s both; }
.lw .nots span { background:var(--cell); color:var(--mute); text-decoration:line-through; }
.lw .cand { display:grid; grid-template-columns: 250px 1fr 120px; gap:12px; align-items:center; margin:10px 0; }
.lw .cand .name b { display:block; font-size:16px; }
.lw .cand .name span { font-size:13px; color:var(--mute); }
.lw .track { height:26px; border-radius:6px; background:var(--cell); overflow:hidden; }
.lw .bar { height:100%; width:0; background:var(--mute); border-radius:6px; transition:width 1.3s cubic-bezier(.2,.7,.2,1); }
.lw .cand .cost { font:600 16px ui-monospace, Menlo, monospace; text-align:right; }
.lw .cand.win .bar { background:var(--ok); min-width:4px; }
.lw .cand.win .name b, .lw .cand.win .cost { color:var(--ok); }
.lw .cand.lose { opacity:.55; transition:opacity .6s 1.4s; }
.lw .verdict { margin:6px 0 0; font-size:14px; color:var(--ok); font-weight:600; opacity:0; animation: lw-in .5s 1.5s both; }
.lw .reads { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
.lw .rd { width:54px; height:64px; border-radius:6px; border:2px solid var(--line); display:grid; place-items:center;
      font-size:11px; color:var(--mute); text-align:center; animation: rd-hit .45s both; }
.lw .rd.idx { animation-name: rd-hit-a; }
@keyframes rd-hit { to { border-color:var(--hot); background:var(--hot-bg); color:var(--hot); } }
@keyframes rd-hit-a { to { border-color:var(--accent); background:var(--accent-bg); color:var(--accent); } }
.lw .hop { color:var(--mute); font-size:20px; }
.lw .table { flex:1; min-width:220px; }
.lw .table .strip { height:22px; border-radius:5px; background:repeating-linear-gradient(90deg, var(--cell) 0 3px, transparent 3px 5px);
      position:relative; }
.lw .table .strip::after { content:""; position:absolute; left:84%; top:-4px; width:3px; height:30px; background:var(--hot);
      border-radius:2px; animation: lw-in .4s 1.5s both; }
.lw .table small { color:var(--mute); font-size:12px; }
.lw .timing { display:grid; gap:10px; }
.lw .timing .t { display:grid; grid-template-columns: 250px 1fr 90px; gap:12px; align-items:center; }
.lw .timing .t .cost { font:600 15px ui-monospace, Menlo, monospace; text-align:right; }
@container (max-width: 820px) { .lw .flow { grid-template-columns:1fr; } .lw .via { flex-direction:row; }
  .lw .cand, .lw .timing .t { grid-template-columns:1fr; } }
`;

const flow = (D) => `
  <div class="flow">
    <div class="art" data-from="0" data-now="0"><h4>SQL text</h4><div class="sql"><span class="t">SELECT order_id,</span>
<span class="t">       customer_id,</span>
<span class="t">       status, amount</span>
<span class="f">FROM orders</span>
<span class="w">WHERE order_id = ${ID}</span></div></div>
    <div class="via" data-now="1,2"><span>parser</span><i>→</i><span class="loop">↻ rewriter</span></div>
    <div class="art" data-from="1" data-now="1,2"><h4>Query tree</h4>
      <span class="node t"><b>return</b> 4 columns</span><span class="node f"><b>from</b> orders</span><span class="node w"><b>where</b> order_id = ${ID}</span></div>
    <div class="via hot" data-now="3"><span>planner</span><i>→</i></div>
    <div class="art" data-from="3" data-now="3"><h4>Plan</h4><div class="planline">Index Scan<small>using orders_pkey</small><small>cost ${n(D.idxCost, 2)}</small></div></div>
    <div class="via" data-now="4"><span>executor</span><i>→</i></div>
    <div class="art" data-from="5" data-now="5"><h4>Rows</h4><div class="rowout">${Object.entries(D.row).map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div></div>
  </div><div class="stage"></div>`;

const STAGE = [
  (D) => `<div><h5>The steps of the Python loop — none of them is in the query</h5><div class="checks nots"><span>open the file</span><span>loop over every row</span><span>split it into columns</span><span>test the condition</span><span>keep the columns</span></div></div>`,
  (D) => `<div><h5>Checked before anything runs</h5><div class="checks">${["grammar is valid", "table <code>orders</code> exists", "its 4 columns exist", "types match: integer = integer"].map((c, i) => `<span style="animation-delay:${i * 0.25}s">✓ ${c}</span>`).join("")}</div></div>`,
  (D) => `<div><h5>Rules to apply</h5><div class="checks nots"><span>no view to expand</span><span>no rule on this table</span></div></div>`,
  (D) => `<div><h5>Two candidate plans for the same row</h5>
     <div class="cand lose"><div class="name"><b>Seq Scan</b><span>the loop: read the whole ${D.tableSize} file, keep one row</span></div><div class="track"><div class="bar" data-w="100"></div></div><div class="cost">${n(D.seqCost, 2)}</div></div>
     <div class="cand win"><div class="name"><b>Index Scan</b><span>follow a lookup structure to the row</span></div><div class="track"><div class="bar" data-w="${(D.idxCost / D.seqCost) * 100}"></div></div><div class="cost">${n(D.idxCost, 2)}</div></div>
     <p class="verdict">✓ cheapest estimated cost wins — the bars are drawn to scale</p></div>`,
  (D) => `<div><h5>What it actually reads</h5><div class="reads">
     ${["lookup<br>step 1", "lookup<br>step 2", "lookup<br>step 3"].map((l, i) => `<div class="rd idx" style="animation-delay:${0.2 + i * 0.4}s">${l}</div><span class="hop">→</span>`).join("")}
     <div class="rd" style="animation-delay:1.5s">table<br>file</div>
     <div class="table"><div class="strip"></div><small>the orders file — ${D.tableSize}; one small piece of it is read</small></div></div></div>`,
  (D) => `<div><h5>Same row, two plans</h5><div class="timing">
     <div class="t cand win"><div class="name"><b>Index Scan</b><span>the plan it chose</span></div><div class="track"><div class="bar" data-w="${(D.fastMs / D.slowMs) * 100}"></div></div><div class="cost">${D.fastMs} ms</div></div>
     <div class="t cand"><div class="name"><b>Seq Scan</b><span>the plan it rejected</span></div><div class="track"><div class="bar" data-w="100"></div></div><div class="cost">≈ ${D.slowMs} ms</div></div></div></div>`,
];

function render({ model, el }) {
  let data = CAPTURED;
  let built = null;
  let scene, stage, shown;
  const ui = stepper({
    el, model, label: "The journey of a query, from SQL text to rows", css: CSS, steps: () => steps(data),
    draw({ at, body }) {
      if (built !== data) {
        body.innerHTML = `<div class="qp">${flow(data)}</div>`;
        scene = body.querySelector(".qp");
        stage = body.querySelector(".stage");
        built = data;
      }
      scene.dataset.at = at;
      scene.querySelectorAll(".art").forEach((a) => {
        a.classList.toggle("made", at >= Number(a.dataset.from));
        a.classList.toggle("now", a.dataset.now.split(",").includes(String(at)));
      });
      scene.querySelectorAll(".via").forEach((v) => v.classList.toggle("now", v.dataset.now.split(",").includes(String(at))));
      // Live data arriving on a step it does not change must not replay that step's entrance.
      const html = STAGE[at](data);
      stage.classList.toggle("still", html === shown);
      stage.innerHTML = shown = html;
      requestAnimationFrame(() => requestAnimationFrame(() => stage.querySelectorAll(".bar").forEach((b) => (b.style.width = `${b.dataset.w}%`))));
    },
  });
  ui.refresh();

  ui.setSource("loading");
  live(load, model?.get?.("jupyter")).then((fresh) => {
    ui.setSource(fresh ? "live" : "captured");
    if (!fresh || JSON.stringify(fresh) === JSON.stringify(data)) return;
    data = fresh;
    ui.refresh();
  });
  return () => ui.destroy();
}
export default { render };
