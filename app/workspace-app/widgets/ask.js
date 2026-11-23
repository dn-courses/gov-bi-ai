// ask — what the "ask the model" widgets share. One query, what the model has so far (context it
// was handed, tools it may call, a person beside it), and for each database the query could be
// running on: what is true there, what the model answered, and what that answer measured to.
// Every answer shown was really given (Claude Sonnet; the sessions are in the module's
// `_lab/transcripts`); every measurement was taken in the lab.
import { stepper } from "@widget-lib/stepper.js";

export const CONTEXT = ["the query", "table definitions", "what else runs"];
export const TOOLS = ["explain(query)", "analyze=True", "built with care"];
export const PERSON = ["who knows the system"];

const CSS = `
.lw:has(.ask) .source { display:none; }
.lw .ask { display:grid; gap:14px; }
.lw .ask .card { background:var(--panel); border:1.5px solid var(--line); border-radius:14px; padding:14px 16px; min-width:0; }
.lw .ask h4 { margin:0 0 10px; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .ask h4 b { color:var(--ink); font:600 14px ui-monospace, Menlo, monospace; letter-spacing:0; text-transform:none; margin-left:6px; }
.lw .ask .has { display:flex; flex-wrap:wrap; gap:10px 28px; }
.lw .ask .rungs { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.lw .ask .rungs > i { font-style:normal; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .ask .rung { padding:5px 14px; border-radius:999px; background:var(--cell); color:var(--mute); font-size:14px; transition:background .4s, color .4s; }
.lw .ask .rung.on { background:var(--accent-bg); color:var(--accent); font-weight:600; }
.lw .ask .rung.new { background:var(--accent); color:var(--accent-ink); }
.lw .ask pre { margin:0; padding:9px 12px; border-radius:8px; background:var(--cell); font:14px/1.45 ui-monospace, Menlo, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
.lw .ask .given pre { margin-top:12px; }
.lw .ask .cases { display:grid; gap:14px; align-items:stretch; }
.lw .ask .case { display:flex; flex-direction:column; gap:10px; transition:border-color .4s; }
.lw .ask .case.ok { border-color:var(--ok); } .lw .ask .case.bad { border-color:var(--hot); } .lw .ask .case.mixed { border-color:var(--mute); }
.lw .ask .case > * { animation: lw-in .35s both; }
.lw .ask .fact { margin:0; font-size:15px; } .lw .ask .fact b { font-family:ui-monospace, Menlo, monospace; }
.lw .ask .hidden { margin:0; font-size:14px; color:var(--mute); font-style:italic; }
.lw .ask .who { display:block; margin-bottom:6px; font-size:12px; color:var(--mute); }
.lw .ask .res { margin:auto 0 0; padding:8px 12px; border-radius:8px; font-size:14px; background:var(--cell); }
.lw .ask .res b { font-family:ui-monospace, Menlo, monospace; }
.lw .ask .res.ok { background:var(--ok-bg); color:var(--ok); } .lw .ask .res.bad { background:var(--hot-bg); color:var(--hot); }
.lw .ask .extra { font-size:14px; }
.lw .ask .extra table { width:100%; border-collapse:collapse; font-size:14px; }
.lw .ask .extra th { text-align:left; font-weight:600; color:var(--mute); font-size:12px; padding:4px 10px 6px 0; }
.lw .ask .extra td { padding:5px 10px 5px 0; border-top:1px solid var(--line); font-family:ui-monospace, Menlo, monospace; }
.lw .ask .extra td.t { font-family:inherit; }
.lw .ask .extra .hot { color:var(--hot); } .lw .ask .extra .ok { color:var(--ok); }
.lw .ask .bars { display:grid; gap:8px; margin:4px 0 14px; }
.lw .ask .bars:last-child { margin-bottom:0; }
.lw .ask .bars h5 { margin:0 0 2px; font-size:13px; font-weight:600; color:var(--mute); }
.lw .ask .bar { display:grid; grid-template-columns:minmax(150px, 30%) 1fr minmax(110px, auto); gap:12px; align-items:center; font-size:15px; }
.lw .ask .bar .track { height:22px; border-radius:6px; background:var(--cell); overflow:hidden; }
.lw .ask .bar .fill { display:block; height:100%; border-radius:6px; background:var(--accent); animation: bar-grow .6s both; transform-origin:left; }
.lw .ask .bar .fill.hot { background:var(--hot); } .lw .ask .bar .fill.ok { background:var(--ok); }
.lw .ask .bar .val { font:600 15px ui-monospace, Menlo, monospace; text-align:right; }
@keyframes bar-grow { from { transform:scaleX(0); } to { transform:none; } }
@container (max-width: 760px) { .lw .ask .cases { grid-template-columns:1fr !important; } }
`;

// has: { context, tools, person } = how many chips of each group are lit; `fresh` names the group whose
// last lit chip is the one this step adds.
const group = (label, names, lit = 0, fresh) => `<div class="rungs"><i>${label}</i>${names.map((name, i) =>
  `<span class="rung${i < lit ? " on" : ""}${fresh && i === lit - 1 ? " new" : ""}">${name}</span>`).join("")}</div>`;
export const given = (step) => step.has === undefined ? "" : `<div class="card given"><h4>What the model has</h4><div class="has">${
  group("context", CONTEXT, step.has.context, step.fresh === "context")}${group("tools", TOOLS, step.has.tools, step.fresh === "tools")}${
  group("a person", PERSON, step.has.person, step.fresh === "person")}</div>${step.query ? `<pre>${step.query}</pre>` : ""}</div>`;

function one(c) {
  const fact = c.fact ? `<p class="fact">${c.fact}</p>` : `<p class="hidden">the model does not know what is in here</p>`;
  const answer = c.answer ? `<div><span class="who">the model${c.tally ? `, ${c.tally}` : ""}</span><pre>${c.answer}</pre></div>` : "";
  const measured = c.measured ? `<p class="res ${c.verdict === "ok" ? "ok" : c.verdict === "bad" ? "bad" : ""}">${c.measured}</p>` : "";
  return `<div class="card case ${c.measured ? c.verdict ?? "" : ""}"><h4>database<b>${c.name}</b></h4>${fact}${answer}${measured}</div>`;
}

function picture(step) {
  const cases = step.cases?.length ? `<div class="cases" style="grid-template-columns:repeat(${step.cases.length}, minmax(0, 1fr))">${step.cases.map(one).join("")}</div>` : "";
  const extra = step.extra ? `<div class="card extra">${step.extra}</div>` : "";
  return given(step) + cases + extra;
}

// bars: a measured comparison as horizontal bars, scaled to the largest value.
// rows: [{ label, value, text, tone }] — tone is "hot", "ok" or nothing.
export function bars(title, rows) {
  const max = Math.max(...rows.map((r) => r.value));
  return `<div class="bars"><h5>${title}</h5>${rows.map((r) => `<div class="bar"><span>${r.label}</span><span class="track"><span class="fill ${r.tone ?? ""}" style="width:${Math.max(1, (r.value / max) * 100)}%"></span></span><span class="val">${r.text}</span></div>`).join("")}</div>`;
}

// steps: [{ stop, title, note, has, fresh, query, cases: [{ name, fact, answer, tally, verdict, measured }], extra, decisive }]
export const ASK_CSS = CSS;
export const ask = ({ label, steps }) => ({
  render({ model, el }) {
    const ui = stepper({
      el, model, label, css: CSS, steps: () => steps,
      draw({ at, body }) { body.innerHTML = `<div class="ask">${picture(steps[at])}</div>`; },
    });
    ui.show(Number(model?.get?.("start") ?? 0));
    return () => ui.destroy();
  },
});

// The queries and answers the pages share.
export const Q_STATE = `SELECT order_id, customer_id, amount, created_at
FROM orders
WHERE state = 2;`;
export const Q_EMAIL = `SELECT customer_id, email
FROM customers
WHERE lower(email) = 'user77777@example.com';`;
export const Q_JOIN = `SELECT c.country, count(*) AS shipments, sum(o.amount) AS amount
FROM shipments s
JOIN orders o ON o.order_id = s.order_id
JOIN customers c ON c.customer_id = o.customer_id
WHERE s.carrier = 'UPS'
GROUP BY c.country;`;
export const Q_REFUNDS = `SELECT s.shipment_id, s.shipped_at,
       (SELECT sum(r.refunded) FROM returns r WHERE r.order_id = s.order_id) AS refunded
FROM shipments s
WHERE s.carrier = 'UPS';`;
export const Q_BIG = `SELECT count(DISTINCT session_id) AS sessions
FROM events;`;
export const Q_CUSTOMER = `SELECT count(*), sum(amount)
FROM orders
WHERE customer_id = 4242;`;

export const A_STATE_INDEX = `CREATE INDEX … ON orders (state)
  INCLUDE (order_id, customer_id, amount, created_at);`;
export const A_EMAIL_INDEX = `CREATE INDEX … ON customers (lower(email));`;
export const A_NOTHING = `Nothing should change.`;
