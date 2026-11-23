// one-plan — two differently written queries arriving at the same plan.
//
// The plan is drawn the way pgAdmin draws one, with pgAdmin's own node icons. It draws at once from
// CAPTURED — measured on PostgreSQL 18 and the lab's `shop` database with parallel workers off —
// then asks the lab to plan both queries, compares the two plans node by node, counts the rows each
// returns, and redraws from the answer. If the lab's plans differ from each other, or are not the
// four nodes drawn here, the widget keeps what it captured. It only reads.

import { live } from "../lib/kernel.js";
import { HASH, HASH_SEMI_JOIN, SCAN } from "../lib/pgadmin-icons.js";
import { stepper } from "../lib/stepper.js";

const DB = "shop";
const QUERY_A = "SELECT email FROM customers WHERE customer_id IN (SELECT customer_id FROM orders WHERE status = 'pending')";
const QUERY_B = `SELECT email FROM customers c WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id AND o.status = 'pending')`;

const CAPTURED = { cost: 132617.77, rows: 50000, customers: 100000 };

// What makes two plan nodes the same node: everything but the names the query gave its tables.
const shape = (node) => ({
  type: node["Node Type"],
  join: node["Join Type"] ?? null,
  table: node["Relation Name"] ?? null,
  cost: node["Total Cost"],
  rows: node["Plan Rows"],
  inputs: (node.Plans ?? []).map(shape),
});

async function load(kernel) {
  const [, [[[a]]], [[[b]]], [[rowsA]], [[rowsB]]] = await kernel.sql(
    [
      "SET LOCAL max_parallel_workers_per_gather = 0",
      `EXPLAIN (FORMAT JSON) ${QUERY_A}`,
      `EXPLAIN (FORMAT JSON) ${QUERY_B}`,
      `SELECT count(*)::int FROM (${QUERY_A}) a`,
      `SELECT count(*)::int FROM (${QUERY_B}) b`,
    ],
    { dbname: DB, rollback: true },
  );
  const plan = shape(a.Plan);
  const [orders, hash] = plan.inputs;
  const customers = hash?.inputs[0];
  // The scene draws one plan of four nodes; two different plans, or another plan, stay captured.
  const fits =
    JSON.stringify(plan) === JSON.stringify(shape(b.Plan)) && rowsA === rowsB &&
    plan.type === "Hash Join" && plan.join === "Right Semi" && plan.inputs.length === 2 &&
    orders.type === "Seq Scan" && orders.table === "orders" && hash.type === "Hash" &&
    customers?.type === "Seq Scan" && customers.table === "customers";
  if (!fits) throw new Error("the live plans do not have the shape this scene draws");
  return { cost: plan.cost, rows: rowsA, customers: customers.rows };
}

const n = (x, d = 0) => x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

const steps = (d) => [
  { stop: "Question", title: "One question, written two ways",
    note: `Which customers have a pending order? One query asks with <code>IN</code>, the other with <code>EXISTS</code>.` },
  { stop: "Query A", title: "The plan for the IN query", produces: "plan, cost " + n(d.cost, 2),
    note: `Scan <code>orders</code> for pending ones, hash the customers, and keep each customer that has a match.` },
  { stop: "Query B", title: "The plan for the EXISTS query", produces: "plan, cost " + n(d.cost, 2),
    note: `Node for node, cost for cost, the <b>same plan</b>. The planner saw the same question behind two spellings.` },
  { stop: "So", title: "The spelling is not the lever", decisive: true,
    note: `Both return ${n(d.rows)} customers at the same cost. What <i>does</i> move a plan is what the planner has to work with.` },
];
const CSS = `
.lw .body { container-type:inline-size; }
.lw .op { display:grid; grid-template-columns: 1fr 1fr; gap:14px 18px; }
.lw .q { background:var(--panel); border:2px solid var(--line); border-radius:10px; padding:10px 14px; transition:border-color .5s, opacity .5s; }
.lw .q h4 { margin:0 0 6px; font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); }
.lw .q pre { margin:0; font:14px/1.55 ui-monospace, Menlo, monospace; white-space:pre-wrap; }
.lw .q mark { background:var(--hot-bg); color:var(--hot); border-radius:4px; padding:0 3px; }
.lw .op[data-at="1"] .q.a, .lw .op[data-at="2"] .q.b { border-color:var(--accent); }
.lw .op[data-at="1"] .q.b { opacity:.4; }
.lw .tree { grid-column:1 / -1; }
.lw .tree svg { width:100%; height:auto; display:block; }
.lw .tree .feed { stroke:var(--accent); stroke-width:4; fill:none; stroke-linecap:round; marker-end:url(#op-feed); opacity:0; transition:opacity .5s; }
.lw .tree #op-feed path { fill:var(--accent); }
.lw .tree .frame { fill:var(--panel); stroke:var(--line); stroke-width:1.5; }
.lw .tree text.cap { font:600 11px system-ui, sans-serif; letter-spacing:.09em; fill:var(--mute); }
.lw .op[data-at="1"] .feed.a, .lw .op[data-at="2"] .feed.b, .lw .op[data-at="3"] .feed { opacity:1; }
.lw .tree .n rect { fill:transparent; stroke:transparent; stroke-width:2; rx:10; transition:stroke .5s, fill .5s; }
.lw .tree .n text { fill:var(--ink); font:600 14px system-ui, sans-serif; text-anchor:middle; }
.lw .tree .n text.s { fill:var(--mute); font:13px system-ui, sans-serif; }
.lw .tree .edge { stroke:var(--mute); stroke-width:2.5; fill:none; marker-end:url(#op-arrow); }
.lw .tree #op-arrow path { fill:var(--mute); }
.lw .tree .plan { opacity:0; transition:opacity .6s; }
.lw .op:not([data-at="0"]) .plan { opacity:1; }
.lw .op[data-at="2"] .n rect { animation: same .9s 2; }
.lw .op[data-at="3"] .n rect { stroke:var(--ok); }
@keyframes same { 50% { stroke:var(--ok); fill:var(--ok-bg); } }
.lw .levers { grid-column:1 / -1; display:flex; gap:10px; flex-wrap:wrap; min-height:38px; }
.lw .levers span { padding:6px 14px; border-radius:999px; background:var(--accent-bg); color:var(--accent); font-size:14px;
      font-weight:600; animation: lw-in .4s both; }
@container (max-width: 760px) { .lw .op { grid-template-columns:1fr; } }
`;
// A plan node the way pgAdmin draws it: its icon, the node name beneath, one line of detail.
const node = (x, y, icon, t, sub) => `<g class="n"><rect x="${x - 85}" y="${y - 6}" width="170" height="112"/>
  <image href="${icon}" x="${x - 28}" y="${y}" width="56" height="56"/>
  <text x="${x}" y="${y + 76}">${t}</text><text class="s" x="${x}" y="${y + 96}">${sub}</text></g>`;
const scene = (d) => `
  <div class="q a"><h4>Query A — IN</h4><pre>SELECT email FROM customers
WHERE customer_id <mark>IN</mark> (
  SELECT customer_id FROM orders
  WHERE status = 'pending');</pre></div>
  <div class="q b"><h4>Query B — EXISTS</h4><pre>SELECT email FROM customers c
WHERE <mark>EXISTS</mark> (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.customer_id
    AND o.status = 'pending');</pre></div>
  <div class="tree"><svg viewBox="0 0 760 330">
    <defs><marker id="op-feed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z"/></marker><marker id="op-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z"/></marker></defs>
    <rect class="frame" x="8" y="36" width="744" height="288" rx="12"/><text class="cap" x="24" y="56">THE PLAN</text>
    <path class="feed a" d="M190 2 L190 30"/><path class="feed b" d="M570 2 L570 30"/>
    <g class="plan">
      <path class="edge" d="M333 100 L219 166"/><path class="edge" d="M333 250 L219 204"/><path class="edge" d="M568 250 L509 250"/>
      ${node(130, 134, HASH_SEMI_JOIN, "Hash Right Semi Join", "cost " + n(d.cost, 2))}
      ${node(420, 50, SCAN, "Seq Scan on orders", "status = 'pending'")}
      ${node(420, 200, HASH, "Hash", "by customer_id")}
      ${node(655, 200, SCAN, "Seq Scan on customers", n(d.customers) + " rows")}
    </g></svg></div>
  <div class="levers"></div>`;

function render({ model, el }) {
  let data = CAPTURED;
  let built = null;
  let root;
  const ui = stepper({
    el, model, label: "Two queries, one plan", css: CSS, steps: () => steps(data),
    draw({ at, body }) {
      if (built !== data) { body.innerHTML = `<div class="op">${scene(data)}</div>`; root = body.querySelector(".op"); built = data; }
      root.dataset.at = at;
      root.querySelector(".levers").innerHTML = at === 3
        ? ["the data and its size", "the structures on disk", "the statistics", "memory settings"].map((l, i) => `<span style="animation-delay:${i * 0.25}s">${l}</span>`).join("") : "";
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
