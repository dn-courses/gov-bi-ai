// plan-reader — a plan read from the leaves up, then checked against what really happened.
// Captured data only for now: measured in the lab, not yet read live.
import { ICON } from "./pgadmin-icons-l03.js";
import { stepper } from "@widget-lib/stepper.js";

// One entry per plan node. est/actual are rows; self is the time spent in the node itself, in ms.
const D = {
  total: "288.8",
  nodes: {
    agg: { line: "HashAggregate  (cost=132591.91..132592.16 rows=20 width=35)", est: "20", actual: "20", self: 8.9 },
    join: { line: "Hash Join  (cost=3074.00..132355.25 rows=47333 width=9)", est: "47,333", actual: "50,000", self: 25.3 },
    orders: { line: "Seq Scan on orders o  (cost=0.00..129157.00 rows=47333 width=10)", est: "47,333", actual: "50,000", self: 234.9 },
    hash: { line: "Hash  (cost=1824.00..1824.00 rows=100000 width=7)", est: "100,000", actual: "100,000", self: 12.7 },
    cust: { line: "Seq Scan on customers c  (cost=0.00..1824.00 rows=100000 width=7)", est: "100,000", actual: "100,000", self: 6.9 },
  },
};
const ORDER = ["cust", "hash", "orders", "join", "agg"]; // the order rows actually move in
const NAME = { agg: "HashAggregate", join: "Hash Join", orders: "Seq Scan on orders", hash: "Hash", cust: "Seq Scan on customers" };
const OUT = { cust: "100,000 rows", hash: "100,000 rows, by customer_id", orders: "50,000 rows", join: "50,000 rows", agg: "20 rows" };

const SHORT = { cust: "100,000 rows", hash: "100,000 rows", orders: "50,000 rows", join: "50,000 rows", agg: "20 rows" };

const STEPS = [
  { stop: "The plan", title: "A plan is a tree",
    note: `Every <code>-&gt;</code> is a <b>node</b>. A node takes rows from the nodes indented beneath it and hands rows to the node above. The top node's rows are the answer.` },
  { stop: "Leaf", title: "Start at the deepest node", produces: OUT.cust,
    note: `<b>Seq Scan on customers</b> has nothing beneath it. It reads the table and hands every customer up.` },
  { stop: "Hash", title: "Keep them where they can be found", produces: OUT.hash,
    note: `<b>Hash</b> stores those customers in memory, filed by <code>customer_id</code>, so that one can be found without searching.` },
  { stop: "Leaf", title: "The other input", produces: OUT.orders,
    note: `<b>Seq Scan on orders</b> visits 5,000,000 orders and hands up only the pending ones.` },
  { stop: "Join", title: "Two inputs become one", produces: OUT.join,
    note: `<b>Hash Join</b> takes each pending order and looks up its customer in the stored set. One row out per order, now carrying a country.` },
  { stop: "Root", title: "The top node produces the answer", produces: OUT.agg,
    note: `<b>HashAggregate</b> keeps one running total per country. Its 20 rows are what the query returns.` },
  { stop: "Really", title: "Estimated beside actual",
    note: `<code>EXPLAIN</code> only planned. <code>EXPLAIN ANALYZE</code> <b>runs</b> the query and counts the rows each node really handed up, next to what the planner expected.` },
  { stop: "Time", title: "Where the time went", decisive: true,
    note: `It also times every node. Run the cell: the bars redraw from each run. Almost all of the time goes to visiting the orders. That is the node to look at.` },
];

const CSS = `
.lw .pr { display:grid; gap:12px; }
.lw .pr pre.txt { margin:0; padding:10px 14px; background:var(--panel); border:1.5px solid var(--line); border-radius:10px;
      font:13px/1.6 ui-monospace, Menlo, monospace; overflow-x:auto; }
.lw .pr pre.txt span { display:block; white-space:pre; border-radius:4px; transition:background .4s, color .4s, opacity .4s; }
.lw .pr pre.txt span.wait { opacity:.4; }
.lw .pr pre.txt span.cur { background:var(--accent-bg); color:var(--accent); font-weight:600; }
.lw .pr svg { width:100%; height:auto; display:block; }
.lw .pr .frame { fill:var(--panel); stroke:var(--line); stroke-width:1.5; }
.lw .pr text.cap { font:600 11px system-ui, sans-serif; letter-spacing:.09em; fill:var(--mute); }
.lw .pr .edge { stroke:var(--mute); stroke-width:2; fill:none; stroke-linecap:round; marker-end:url(#pr-arrow); transition:opacity .4s; }
.lw .pr #pr-arrow path { fill:var(--mute); }
.lw .pr .n { transition:opacity .4s; }
.lw .pr .n rect { fill:transparent; stroke:transparent; stroke-width:2; rx:10; transition:stroke .4s, fill .4s; }
.lw .pr .n text { fill:var(--ink); font:600 14px system-ui, sans-serif; text-anchor:middle; }
.lw .pr .n text.out { fill:var(--mute); font:13px ui-monospace, Menlo, monospace; transition:fill .4s; }
.lw .pr .n.wait, .lw .pr .edge.wait { opacity:.3; }
.lw .pr .n.cur rect { stroke:var(--accent); fill:var(--accent-bg); }
.lw .pr .n.cur text.out { fill:var(--accent); font-weight:600; }
.lw .pr[data-at="6"] .n text.out { fill:var(--accent); }
.lw .pr .times { display:none; background:var(--panel); border:1.5px solid var(--line); border-radius:10px; padding:10px 14px; }
.lw .pr[data-at="7"] pre.txt, .lw .pr[data-at="7"] svg { display:none; }
.lw .pr[data-at="7"] .times { display:grid; grid-template-columns:max-content 1fr max-content; gap:6px 12px; align-items:center; animation: lw-in .4s both; }
.lw .pr .times h4 { grid-column:1 / -1; margin:0 0 4px; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); }
.lw .pr .times h4 span { margin-left:10px; font:12px ui-monospace, Menlo, monospace; letter-spacing:0; text-transform:none; }
.lw .pr .times .bar { transition:width .5s; }
.lw .pr .times .nm { font-size:15px; }
.lw .pr .times .bar { height:18px; border-radius:7px; background:var(--mute); min-width:2px; }
.lw .pr .times .bar.top { background:var(--hot); }
.lw .pr .times .ms { font:13px ui-monospace, Menlo, monospace; text-align:right; }
`;

const INDENT = { agg: "", join: "  ->  ", orders: "        ->  ", hash: "        ->  ", cust: "              ->  " };
const DETAIL = { agg: "  Group Key: c.country", join: "        Hash Cond: (o.customer_id = c.customer_id)", orders: "              Filter: (status = 'pending'::text)" };
const text = () => ["agg", "join", "orders", "hash", "cust"].map((k) =>
  `<span data-n="${k}">${INDENT[k]}${D.nodes[k].line}${DETAIL[k] ? "\n" + DETAIL[k] : ""}</span>`).join("");

// A plan node the way pgAdmin draws it: its icon, the node name beneath, one line under that.
const POS = { agg: [95, 134, "aggregate"], join: [280, 134, "join"], orders: [475, 50, "scan"], hash: [475, 200, "hash"], cust: [665, 200, "scan"] };
const node = (k) => { const [x, y, icon] = POS[k]; return `<g class="n" data-n="${k}"><rect x="${x - 88}" y="${y - 6}" width="176" height="130"/>
  <image href="${ICON[icon]}" x="${x - 28}" y="${y}" width="56" height="56"/>
  <text x="${x}" y="${y + 76}">${NAME[k]}</text><text class="out" x="${x}" y="${y + 96}"></text><text class="out more" x="${x}" y="${y + 114}"></text></g>`; };
const scene = () => `
  <pre class="txt">${text()}</pre>
  <svg viewBox="0 0 760 352">
    <defs><marker id="pr-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z"/></marker></defs>
    <rect class="frame" x="4" y="4" width="752" height="344" rx="12"/><text class="cap" x="20" y="24">THE PLAN — ROWS FLOW LEFT, TOWARD THE ANSWER</text>
    <path class="edge" data-n="join" d="M222 172 L186 172"/>
    <path class="edge" data-n="orders" d="M400 100 L330 150"/>
    <path class="edge" data-n="hash" d="M400 240 L330 194"/>
    <path class="edge" data-n="cust" d="M576 240 L566 240"/>
    ${Object.keys(POS).map(node).join("")}
  </svg>
  <div class="times"></div>`;

// The run the time bars show: captured at first, then every run of the page's EXPLAIN ANALYZE cell.
let shown = { total: Number(D.total), self: Object.fromEntries(ORDER.map((k) => [k, D.nodes[k].self])), runs: 0 };

const times = () => {
  const top = Math.max(...ORDER.map((k) => shown.self[k]));
  const rows = ORDER.slice().reverse().map((k) =>
    `<span class="nm">${NAME[k]}</span><span><span class="bar${shown.self[k] === top ? " top" : ""}" style="display:block;width:${Math.max(0, (shown.self[k] / shown.total) * 100)}%"></span></span><span class="ms">${shown.self[k].toFixed(1)} ms</span>`).join("");
  const which = shown.runs ? `run ${shown.runs} of the cell below` : "a run measured earlier — run the cell below";
  return `<h4>Time spent in each node itself <span>${which} · ${shown.total.toFixed(1)} ms in all</span></h4>${rows}`;
};

// Which of the drawn nodes a line of EXPLAIN ANALYZE text is.
const KEY = [[/^HashAggregate/, "agg"], [/^Hash Join/, "join"], [/^Seq Scan on orders/, "orders"], [/^Hash\b/, "hash"], [/^Seq Scan on customers/, "cust"]];
const NODE_LINE = /^(\s*(?:->\s+)?)(\S.*?)\s+\(cost=.*\(actual time=[\d.]+\.\.([\d.]+) rows=[\d.]+ loops=(\d+)\)/;

// Read a plan as EXPLAIN ANALYZE prints it: each node's own time is its total minus its inputs'.
// Returns null unless the text is this widget's plan, complete.
export function ownTimes(plan) {
  const open = []; // the nodes above the current line, by indentation
  const self = {};
  for (const line of plan.split("\n")) {
    const m = NODE_LINE.exec(line);
    if (!m) continue;
    const node = { depth: m[1].length, total: Number(m[3]) * Number(m[4]), inputs: 0, key: KEY.find(([re]) => re.test(m[2]))?.[1] };
    while (open.length && open.at(-1).depth >= node.depth) open.pop();
    if (open.length) open.at(-1).inputs += node.total;
    open.push(node);
    self[node.key] = node; // own time is settled once every input line has been read
  }
  const total = /Execution Time: ([\d.]+) ms/.exec(plan);
  if (!total || !ORDER.every((k) => self[k])) return null;
  return { total: Number(total[1]), self: Object.fromEntries(ORDER.map((k) => [k, Math.max(0, self[k].total - self[k].inputs)])) };
}

function render({ model, el }) {
  let root;
  // A run of the page's EXPLAIN ANALYZE cell: if it is this plan, the time bars follow it.
  const onCell = (e) => {
    const run = ownTimes(String(e.detail?.out ?? ""));
    if (!run) return;
    shown = { ...run, runs: shown.runs + 1 };
    if (root) root.querySelector(".times").innerHTML = times();
  };
  window.addEventListener("lab:cell", onCell);
  const ui = stepper({
    el, model, label: "Reading a plan, from the leaves up", css: CSS, steps: () => STEPS,
    draw({ at, body }) {
      if (!root) { body.innerHTML = `<div class="pr">${scene()}</div>`; root = body.querySelector(".pr"); }
      root.dataset.at = at;
      root.querySelector(".times").innerHTML = times();
      const walking = at >= 1 && at <= 5;
      for (const k of ORDER) {
        const i = ORDER.indexOf(k) + 1; // the step at which this node is reached
        const state = !walking ? "" : i === at ? "cur" : i > at ? "wait" : "";
        for (const e of root.querySelectorAll(`[data-n="${k}"]`)) { e.classList.remove("cur", "wait"); if (state) e.classList.add(state); }
        // Rows handed up while walking the plan; estimated and actual on two lines once it has run.
        const [out, more] = root.querySelectorAll(`g[data-n="${k}"] text.out`);
        out.textContent = at >= 6 ? `est ${D.nodes[k].est}` : at === 0 || i > at ? "" : SHORT[k];
        more.textContent = at >= 6 ? `actual ${D.nodes[k].actual}` : "";
      }
    },
  });
  ui.show(Number(model?.get?.("start") ?? 0));
  return () => { window.removeEventListener("lab:cell", onCell); ui.destroy(); };
}
export default { render };
