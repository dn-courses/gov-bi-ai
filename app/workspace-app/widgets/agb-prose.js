// agb-prose — an answer written for a person, and the code that has to pull values out of it. The
// pattern below really runs, in the browser, against each recorded answer: what the widget says it
// found is computed here, not written.
import { cols, esc, question, talk, verdict, widget, zone } from "./agb-lib.js";

// MEASURED on the lab's Pagila: payments per customer, the top three (the page's first cell).
const TOP = { customer_id: 526, name: "KARL SEAL", total: 221.55 };
const QUESTION = "Payments per customer, the top three:\ncustomer 526: KARL SEAL, 221.55 dollars\ncustomer 148: ELEANOR HUNT, 216.54 dollars\ncustomer 144: CLARA SHAW, 195.58 dollars\n\nWho spent the most, and how much?";
// RECORDED 2026-11-23, gemini-3.5-flash-lite: seven calls of the page's `ask()` with QUESTION
// (scratch run e4, the same code as the page's cells). Every call ended with finish_reason STOP.
const ANSWERS = [
  "**KARL SEAL** (Customer 526) spent the most, with a total of **221.55 dollars**.",
  "**KARL SEAL** (Customer 526) spent the most, with a total of **221.55 dollars**.",
  "**Karl Seal** spent the most, with a total of **221.55 dollars** (Customer 526).",
  "**KARL SEAL** (customer 526) spent the most, with a total of **221.55 dollars**.",
  "**Karl Seal** spent the most, with a total of **$221.55**.",
  "**KARL SEAL** (customer 526) spent the most, with a total of **221.55 dollars**.",
  "Based on the provided data, **KARL SEAL** (customer 526) spent the most, with a total of **221.55 dollars**.",
];
// Written to fit the first answer, as the page's pattern cell does.
const PATTERN = /\*\*([A-Z ]+)\*\* \(Customer (\d+)\) spent the most, with a total of \*\*([\d.]+) dollars\*\*/;
const found = (text) => { const m = PATTERN.exec(text); return m ? { name: m[1], id: Number(m[2]), total: Number(m[3]) } : null; };
const hits = ANSWERS.filter(found).length;

const css = `
.lw .agb .slots { display:grid; gap:8px; }
.lw .agb .slot { display:grid; grid-template-columns:120px 76px minmax(0, 1fr); gap:10px; align-items:center; padding:8px 12px; border-radius:8px; background:var(--cell); font:15px ui-monospace, Menlo, monospace; }
.lw .agb .slot i { font-style:normal; color:var(--mute); font-size:13px; }
.lw .agb .slot b { text-align:right; color:var(--mute); font-weight:400; }
.lw .agb .slot.ok b { color:var(--ok); font-weight:700; } .lw .agb .slot.hot b { color:var(--hot); font-weight:700; }
.lw .agb .rx { font:600 14px/1.5 ui-monospace, Menlo, monospace; color:var(--accent); overflow-wrap:anywhere; margin-bottom:12px; padding:9px 12px; border-radius:8px; background:var(--accent-bg); }
.lw .agb .tally { display:grid; gap:6px; }
.lw .agb .ans { display:grid; grid-template-columns:24px minmax(0,1fr); gap:8px; padding:7px 12px; border-radius:8px; background:var(--ok-bg); border-left:3px solid var(--ok); font-size:14px; animation:lw-in .35s both; }
.lw .agb .ans b.y { color:var(--ok); } .lw .agb .ans b.n { color:var(--hot); }
.lw .agb .ans.miss { background:var(--hot-bg); border-left-color:var(--hot); }
`;

const slots = (fill = {}) => `<div class="slots">${[["customer_id", "integer"], ["name", "string"], ["total", "number"]].map(([key, type]) => {
  const [value, tone] = fill[key] ?? ["?", ""];
  return `<div class="slot ${tone}"><span>${key}</span><i>${type}</i><b>${esc(value)}</b></div>`;
}).join("")}</div>`;
const first = found(ANSWERS[0]);
const chat = talk([{ role: "user", text: QUESTION }, { role: "assistant", text: ANSWERS[0] }]);
const tally = () => `<div class="tally">${ANSWERS.map((a, i) => `<div class="ans ${found(a) ? "" : "miss"}" style="animation-delay:${i * 90}ms">${
  found(a) ? '<b class="y">✓</b>' : '<b class="n">✗</b>'}<span>${esc(a)}</span></div>`).join("")}</div>`;

const VIEWS = [
  () => cols([chat, zone("what the next program needs", slots())], "minmax(0,1.2fr) minmax(0,1fr)"),
  () => cols([chat, zone("your code", `<p class="rx">${esc(String(PATTERN))}</p>${slots({ customer_id: [String(first.id), "ok"], name: [first.name, "ok"], total: [String(first.total), "ok"] })}`)], "minmax(0,1.2fr) minmax(0,1fr)"),
  () => `${question("the same facts, the same question, seven times", "asked")}${zone(`the pattern, over ${ANSWERS.length} recorded answers`, tally())}${
    verdict(`<b>${hits} of ${ANSWERS.length}</b> matched. The facts never changed; the capital C, the name's case, “$” for “dollars” and the place of the id did.`, "hot")}`,
];

const steps = [
  { stop: "Prose", title: "An answer written for a person",
    note: `The model was handed the three top customers and asked who leads. A person reads the sentence and is done. A report, a join or the next step of an agent needs three values.` },
  { stop: "Pattern", title: "So someone writes a pattern",
    note: `A regular expression shaped like that sentence gets all three: ${TOP.customer_id}, ${TOP.name}, ${TOP.total}.` },
  { stop: "Again", title: "The same question, asked again", decisive: true,
    note: `Seven recorded answers to the same prompt. A pattern is a bet on wording, and the model never agreed to it. Your own runs will word things differently again.` },
];

export default widget({ label: "Prose or values", css, steps, view: (s, at) => VIEWS[at]() });
