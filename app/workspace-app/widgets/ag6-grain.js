// ag6-grain — "Why Free SQL Is Not Production": bad context. The prompt names columns, not meaning,
// so the model decides what a "sale" is, and different runs decide differently.
//
// RECORDED 2026-11-22 in the agents lab with gemini-3.5-flash-lite, by the page's `ask` and SYSTEM:
// "How many sales did we make in 2025?" asked 11 times — 9 answers counted order lines (780,384),
// 1 counted orders (260,128), 1 counted units (2,341,188). "How many orders were there in 2025?"
// asked 5 times — all 5 used COUNT(DISTINCT order_id) and left pending orders out (260,128); counting
// every order gives 262,756. The numbers are the page's SQL cell. The conversation is run 1 of the
// page's cell, copied.
import { esc, fmt, staged, talk } from "./ag4-lib.js";

export const MODEL = "gemini-3.5-flash-lite";
const QUESTION = "How many sales did we make in 2025?";
const SQL_LINES = "SELECT COUNT(*) FROM mart.fact_sales f JOIN mart.dim_date d ON f.date_key = d.date_key WHERE d.year = 2025 AND f.status != 'pending';";
const CONVERSATION = [
  { role: "user", text: QUESTION },
  { role: "tool", name: "run_sql", args: { sql: SQL_LINES }, result: `{"rows": [["780384"]]}` },
  { role: "assistant", text: "We made 780,384 sales in 2025." },
];
const RUNS = 11;
const ANSWERS = [
  { value: 780384, runs: 9, what: "order lines", expr: "count(*)" },
  { value: 260128, runs: 1, what: "orders", expr: "count(DISTINCT order_id)" },
  { value: 2341188, runs: 1, what: "units", expr: "sum(quantity)" },
];
const ORDERS = { runs: 5, without: 260128, every: 262756 };

const steps = [
  { stop: "One run", title: "A question in business words",
    note: `The model picked <code>count(*)</code> on <code>fact_sales</code>, ran it, and answered in one sentence. Nothing failed.` },
  { stop: `${RUNS} runs`, title: `The same question, ${RUNS} runs, three different numbers`,
    note: `${ANSWERS.map((a) => `${a.runs} of ${RUNS} answered ${fmt(a.value)} (${a.what})`).join(", ")}. None of them asked what was meant.` },
  { stop: "All valid", title: "Every one of those queries was correct SQL", decisive: true,
    note: `They differ in one expression. Each returned one row and no error. A database checks that SQL is valid; it cannot check that it means what the person meant.` },
  { stop: "Orders", title: "A clearer word, and still a choice",
    note: `Asked “How many orders were there in 2025?”, the model counted <code>DISTINCT order_id</code> in ${ORDERS.runs} runs of ${ORDERS.runs}: the grain was right. It also left pending orders out every time, borrowing the revenue rule: ${fmt(ORDERS.without)}. Counting every order gives ${fmt(ORDERS.every)}. Which one is the shop's figure is a definition, and the prompt does not hold it.` },
];

const CSS = `
.lw .ag6g .bars .bar { grid-template-columns:minmax(150px, 30%) 1fr minmax(120px, auto); }
.lw .ag6g .shape { margin:0 0 14px; padding:12px 14px; border-radius:10px; background:var(--code); font:15px/1.5 ui-monospace, Menlo, monospace; }
.lw .ag6g .shape .slot { display:inline-block; min-width:96px; padding:0 8px; border-radius:6px; border:1.5px dashed var(--accent); color:var(--accent); text-align:center; }
.lw .ag6g .expr { display:grid; gap:8px; }
.lw .ag6g .expr div { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:16px; align-items:center; padding:8px 14px; border-radius:10px; background:var(--cell); }
.lw .ag6g .expr code { font:600 16px ui-monospace, Menlo, monospace; color:var(--accent); background:none; padding:0; }
.lw .ag6g .expr .what { color:var(--mute); font-size:14px; }
.lw .ag6g .two { display:grid; gap:12px; grid-template-columns:1fr 1fr; }
.lw .ag6g .two div { text-align:center; }
`;

const max = Math.max(...ANSWERS.map((a) => a.runs));
const bars = ANSWERS.map((a, i) => `<div class="bar"><span><b class="mono">${fmt(a.value)}</b><br><span class="dim">${a.what}</span></span>
  <span class="track"><span class="seg ${i === 0 ? "acc" : "hot"}" style="width:${(a.runs / max) * 100}%"></span></span>
  <span class="val">${a.runs} of ${RUNS}</span></div>`).join("");

const shape = `SELECT <span class="slot">?</span> FROM fact_sales JOIN dim_date … WHERE year = 2025 AND status &lt;&gt; 'pending'`;

const scene = () => `
  <div data-slot="chat" data-on="0"></div>
  <div class="zone" data-on="1">
    <p class="cap">“${esc(QUESTION)}” — what ${RUNS} runs answered</p>
    <div class="bars">${bars}</div>
  </div>
  <div class="zone" data-on="2">
    <p class="cap">The three queries, side by side: one shape, one expression apart</p>
    <div class="shape">${shape}</div>
    <div class="expr">${ANSWERS.map((a) => `<div><code>${esc(a.expr)}</code><span class="what">${a.what}</span><span class="chip ok">valid · ${fmt(a.value)}</span></div>`).join("")}</div>
  </div>
  <div class="zone" data-on="3">
    <p class="cap">“How many orders were there in 2025?” — ${ORDERS.runs} runs</p>
    <div class="two">
      <div><p class="big hot">${fmt(ORDERS.without)}</p><p class="dim">what the agent answered, ${ORDERS.runs} of ${ORDERS.runs}<br>pending orders left out</p></div>
      <div><p class="big">${fmt(ORDERS.every)}</p><p class="dim">every order of 2025<br><code>COUNT(DISTINCT order_id)</code>, no status filter</p></div>
    </div>
  </div>`;

function after(root, at) {
  if (at === 0) talk(root.querySelector('[data-slot="chat"]'), CONVERSATION, { upto: 3, open: [1], model: MODEL, recorded: true });
}

export default staged({ key: "ag6g", label: "What a sale is, decided per run", css: CSS, steps, scene, after });
