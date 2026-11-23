// cost-receipt — a plan's cost itemised like a receipt: a cost is a sum of prices. Every line
// carries the colour and shape of its price, and unfolds its formula on a click. Startup, the other
// half of a cost, has its own widget (startup-cost). Captured data only: every total is the planner's.
import { ALL, P, SCAN, T, cpu, folding, line, look, n, sum } from "@widget-lib/receipt.js";
import { stepper } from "@widget-lib/stepper.js";

// Each step: the query, the receipt's lines, and the total the planner prints for it.
const STEPS = [
  { stop: "Prices", title: "Everything has a price", lines: [], total: null, sql: "",
    note: `A plan pays for two things: the <b>pages</b> it reads and the <b>work</b> it does on rows. One page read in file order costs 1. Everything else is priced against that.` },
  { stop: "Scan", title: "Seq Scan: pages plus rows", sql: "SELECT * FROM products", lines: SCAN, total: "200.00",
    note: `${T.pages} pages at 1.00, and the per-row work on ${n(T.rows)} rows at 0.01 each. Half the cost is reading pages, half is the work on rows. Click a line to see its formula.` },
  { stop: "Filter", title: "A condition is paid on every row", sql: "SELECT * FROM products WHERE price_cents < 600",
    lines: [...SCAN, cpu("test every row", T.rows, P.op)], total: "225.00",
    note: `The test runs on all ${n(T.rows)} rows, whether or not they pass: ${n(T.rows)} operations at 0.0025.` },
  { stop: "Count", title: "An aggregate reads no pages of its own", sql: "SELECT count(*) FROM products", decisive: true,
    lines: [...SCAN, cpu("add one to the counter, per row", T.rows, P.op), cpu("hand up the one result row", 1, P.row)], total: "225.01",
    note: `The node above the scan reads no pages of its own. It pays for one operation per row it receives, and for the single row it returns.` },
];

const CSS = `
.lw .cr { display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 1.5fr); gap:16px; align-items:start; }
.lw .cr .zone { background:var(--panel); border:1.5px solid var(--line); border-radius:12px; padding:12px 16px 14px; }
.lw .cr h4 { margin:0 0 10px; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .cr .prices { display:grid; grid-template-columns:1fr max-content; gap:8px 14px; font-size:14px; }
.lw .cr .prices b { font:600 15px ui-monospace, Menlo, monospace; text-align:right; }
.lw .cr .sql { margin:0 0 12px; padding:8px 12px; border-radius:8px; background:var(--cell); font:14px ui-monospace, Menlo, monospace; white-space:pre-wrap; }
.lw .cr .total { display:flex; justify-content:space-between; align-items:baseline; margin-top:12px; padding-top:10px; border-top:1.5px dashed var(--line); font-size:14px; }
.lw .cr .total b { font:700 22px ui-monospace, Menlo, monospace; color:var(--accent); }
.lw .cr .total small { font:13px ui-monospace, Menlo, monospace; color:var(--mute); margin-right:12px; }
.lw .cr .split { display:flex; gap:2px; height:14px; margin-top:12px; border-radius:6px; overflow:hidden; background:var(--cell); }
.lw .cr .split b { display:block; transition:flex .5s; }
.lw .cr .bill h4 { display:flex; justify-content:space-between; align-items:baseline; }
@container (max-width: 700px) { .lw .cr { grid-template-columns:1fr; } }
`;

const PRICES = `<h4>The price list</h4><div class="prices">
  <span><i class="k seq"></i>one page, read in file order</span><b>1.00</b>
  <span><i class="k rand"></i>one page, fetched out of order</span><b>4.00</b>
  <span><i class="k row"></i>the work on one row: find it, check it, pass it up</span><b>0.01</b>
  <span><i class="k op"></i>one comparison or calculation</span><b>0.0025</b></div>`;
const NAMES = { seq: "pages in file order", row: "work on rows", op: "comparisons and calculations" };

function receipt(step) {
  if (!step.lines.length) return `<h4>The receipt</h4><p style="margin:0;color:var(--mute);font-size:14px">Pick a query: its cost is the sum of what it reads and the work it does.</p>`;
  const part = (kind) => sum(step.lines.filter((l) => l.kind === kind));
  const kinds = Object.keys(NAMES).filter((kind) => part(kind) > 0); // the prices this plan pays, in price-list order
  return `<h4>The receipt${ALL}</h4><div class="sql">${step.sql}</div>
    <div class="lines">${step.lines.map((l, i) => line(l, i)).join("")}</div>
    <div class="total"><span>the planner's cost</span><b>${step.total}</b></div>
    <div class="split">${kinds.map((kind) => `<b class="${kind}" style="flex:${part(kind)}"></b>`).join("")}</div>
    <div class="legend">${kinds.map((kind) => `<span><i class="k ${kind}"></i>${NAMES[kind]}</span>`).join("")}</div>`;
}

function render({ model, el }) {
  let root;
  const fold = folding();
  const ui = stepper({
    el, model, label: "A plan's cost, itemised", css: look("cr") + CSS, steps: () => STEPS,
    draw({ at, body }) {
      if (!root) {
        body.innerHTML = `<div class="cr"><div class="zone">${PRICES}</div><div class="zone bill"></div></div>`;
        root = body.querySelector(".cr");
        fold.bind(root);
      }
      root.querySelector(".bill").innerHTML = receipt(STEPS[at]);
      fold.apply();
    },
  });
  ui.show(Number(model?.get?.("start") ?? 0));
  return () => ui.destroy();
}
export default { render };
