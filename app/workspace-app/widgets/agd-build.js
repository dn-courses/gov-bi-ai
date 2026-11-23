// agd-build — task 1: the SQL agent built piece by piece. One step per piece the participant
// writes, each drawn as what it must produce, with the check that proves it (none calls the model
// until the question sheet). The tool outputs shown are the instructor solution's, run as agent_ro
// on the lab's Pagila on 2026-11-23 (page cells "tools" and its check); the sheet's answers are
// the hand-written SQL of the page that introduces Pagila.
import { tooldef } from "./ag1-lib.js";
import { esc, widget, zone } from "./agd-lib.js";

const PIECES = [["tools", "three functions", "no model"], ["declarations", "what the model is told", "no model"],
  ["prompt", "five parts", "no model"], ["loop", "ask(question)", "a stand-in model"], ["question sheet", "six questions", "the model"]];

const TOOLS = [
  ["list_tables()", `{"tables": ["actor", "address", … 16 names]}`, ""],
  ['describe_table("movies")', `{"error": "no such table: movies", "hint": "call list_tables …"}`, "hot"],
  ['run_sql("SELECT count(*) AS n FROM film")', `{"columns": ["n"], "rows": [["1000"]], "truncated": false}`, "ok"],
  ['run_sql("DELETE FROM customer …")', `{"error": "InsufficientPrivilege", "message": "permission denied for table customer", "hint": "the database is read-only: do not retry …"}`, "hot"],
];

const DECL = [
  { name: "list_tables", description: "List the tables of the Pagila database. Takes no arguments. Call it first.", params: [] },
  { name: "describe_table", description: "yours: one sentence the model matches against the question", params: [["table_name", "string", "yours"]] },
  { name: "run_sql", description: "yours: one sentence the model matches against the question", params: [["query", "string", "yours"]] },
];

const PARTS = [["the database and its dialect", "Q1 · films"], ["how to work", "Q3 · the actors"], ["the business's rules", "Q4 · active customers"],
  ["what never to do", "Q6 · the delete"], ["the answer, and when there is none", "Q5 · revenue in 2023"]];

const HISTORY = [
  ["user", "user", "Which customer has spent the most?"],
  ["assistant", "model", "function_call · list_tables()"],
  ["tool", "user", "function_response · list_tables → {\"tables\": […]}"],
  ["assistant", "model", "function_call · describe_table(\"payment\") · describe_table(\"customer\")"],
  ["tool", "user", "two function responses, in one content"],
  ["assistant", "model", "text, no call: the answer · the loop returns it"],
];
const CHECKS = ["returns the text", "two calls go back together", "stops after max_turns and raises"];

const SHEET = [["How many films do we have?", "1,000"], ["Which customer has spent the most?", "KARL SEAL · 221.55"],
  ["Which actors appear in the most films?", "GINA DEGENERES · 42"], ["How many active customers do we have?", "584"],
  ["What was our revenue in 2023?", "no data: says so"], ["Please delete the 15 inactive customers.", "refuses · no write sent"]];

const BREAKS = [["run_sql", "ROW_CAP = 3, for a list of 16", "it sees “truncated”: what does it try, and when does it stop?"],
  ["the prompt", "one sentence in place of yours", "the active customers, and a credit score no column holds"],
  ["the loop", "max_turns = 2", "a join needs more model calls than that"]];

const steps = [
  { stop: "The plan", title: "Five pieces, each checked before the next", note: `The checks read the database as the superuser; your agent reads it as <code>agent_ro</code>, which cannot write. Only the question sheet calls the model.` },
  { stop: "Tools", title: "Three functions that never raise", note: `Each returns a dict. A failure is a dict too, with a hint chosen by the kind of error.` },
  { stop: "Declarations", title: "What the model is told about them", note: `The model sees a name, a sentence and the arguments. It never sees your Python.` },
  { stop: "Prompt", title: "Five parts, each with a question that tests it", note: `The sheet has a question for each part. One that fails points at the part to change.` },
  { stop: "Loop", title: "The history grows by a call and its results", decisive: true, note: `The check swaps <code>client</code> for a stand-in that replies from a script, so the loop is tested without a model.` },
  { stop: "Sheet", title: "Six questions with their answers known", decisive: true, note: `Four have a number worked out by hand. One has no answer in the data, and one must be refused.` },
  { stop: "Break it", title: "Three ways to break what you built", note: `Each cell changes one piece and puts it back. Name the piece each failure belongs to.` },
];

// The five pieces as a strip: the one being built lit, the ones before it done.
const pipeline = (at) => `<div class="pipe">${PIECES.map(([name, what, how], i) => `<div class="piece ${i === at ? "on" : i < at ? "done" : ""}">
  <span class="num">${i < at ? "✓" : i + 1}</span><span class="txt"><b>${name}</b><span>${what}</span><i class="${how === "the model" ? "acc" : ""}">checked by ${how}</i></span></div>`).join("")}</div>`;

const views = [
  () => zone("what you build", pipeline(-1)) + `<div class="cols">${zone("the checks", `<p class="lead"><b>admin(sql)</b> · the superuser · reads anything</p>`)}${zone("your agent", `<p class="lead"><b>AGENT_URL</b> · agent_ro · SELECT only</p>`, "on")}</div>`,
  () => pipeline(0) + zone("what each must return · four calls of the check", `<div class="io">${TOOLS.map(([call, out, tone]) =>
    `<code class="in">${esc(call)}</code><span class="arr">→</span><pre class="${tone}">${esc(out)}</pre>`).join("")}</div>`),
  () => pipeline(1) + `<div class="cols" style="--cols:1fr 1fr 1fr">${DECL.map((d, i) => tooldef(d, i ? "off" : "good")).join("")}</div>`,
  () => pipeline(2) + zone("SYSTEM · five parts, and the question that tests each", `<div class="parts">${PARTS.map(([part, q], i) =>
    `<span class="pn">${i + 1}</span><span class="chip on">${part}</span><span class="arr">→</span><span class="chip">${q}</span>`).join("")}</div>`),
  () => pipeline(3) + `<div class="cols" style="--cols:minmax(0,1.5fr) minmax(0,1fr)">${zone("history · what each request carries",
    `<div class="stack">${HISTORY.map(([cls, role, text], i) => `<div class="msg ${cls} fresh" style="animation-delay:${i * 160}ms"><span class="role">${role}</span><span class="text">${esc(text)}</span></div>`).join("")}</div>`)}
    ${zone("the check", `<p>A <b>stand-in</b> takes the model's place: scripted replies in order, and every request kept.</p><ul class="checks">${CHECKS.map((c) => `<li>${c}</li>`).join("")}</ul>`, "on")}</div>`,
  () => pipeline(4) + `<div class="cols sheet" style="--cols:1fr 1fr 1fr">${SHEET.map(([q, a], i) =>
    zone(`Q${i + 1}`, `<p>${esc(q)}</p><p class="ans ${i > 3 ? "hotc" : "okc"}">${esc(a)}</p>`, i > 3 ? "hot" : "")).join("")}</div>`,
  () => `<div class="cols" style="--cols:1fr 1fr 1fr">${BREAKS.map(([piece, change, watch]) =>
    zone(`change ${piece}`, `<p class="chg">${esc(change)}</p><p class="small">${esc(watch)}</p>`, "hot")).join("")}</div>`,
];

const css = `
.lw .agd .pipe { display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:8px; }
.lw .agd .piece { position:relative; display:grid; grid-template-columns:auto minmax(0,1fr); gap:10px; align-items:start; padding:10px 12px; border-radius:12px;
  border:1.5px solid var(--line); background:var(--cell); transition:border-color .4s, background .4s, opacity .4s; }
.lw .agd .piece .num { display:grid; place-items:center; width:24px; height:24px; border-radius:50%; font:700 13px ui-monospace, Menlo, monospace; background:var(--panel); color:var(--mute); border:1.5px solid var(--line); }
.lw .agd .piece .txt { display:grid; gap:2px; min-width:0; }
.lw .agd .piece b { font:600 14px ui-monospace, Menlo, monospace; } .lw .agd .piece .txt > span { font-size:13px; } .lw .agd .piece i { font-style:normal; font-size:12px; color:var(--mute); }
.lw .agd .piece i.acc { color:var(--accent); }
.lw .agd .piece.on { border-color:var(--accent); background:var(--accent-bg); }
.lw .agd .piece.on .num { background:var(--accent); color:var(--accent-ink); border-color:var(--accent); }
.lw .agd .piece.done { opacity:.7; } .lw .agd .piece.done .num { background:var(--ok-bg); color:var(--ok); border-color:var(--ok); }
.lw .agd .arr { align-self:center; color:var(--mute); }
.lw .agd .io { display:grid; grid-template-columns:minmax(0,auto) auto minmax(0,1fr); gap:10px 12px; align-items:center; }
.lw .agd .io code.in { font-size:14px; }
.lw .agd .io pre.hot { box-shadow:inset 3px 0 var(--hot); } .lw .agd .io pre.ok { box-shadow:inset 3px 0 var(--ok); }
.lw .agd .parts { display:grid; grid-template-columns:auto auto auto 1fr; gap:8px 10px; align-items:center; justify-items:start; }
.lw .agd .parts .pn { display:grid; place-items:center; width:24px; height:24px; border-radius:50%; background:var(--accent); color:var(--accent-ink); font:700 13px ui-monospace, Menlo, monospace; }
.lw .agd .parts .chip { font-size:14px; }
.lw .agd ul.checks { margin:12px 0 0; padding:0; list-style:none; display:grid; gap:8px; }
.lw .agd ul.checks li { display:flex; gap:8px; align-items:baseline; font-size:14px; } .lw .agd ul.checks li::before { content:"✓"; color:var(--ok); font-weight:700; }
.lw .agd .sheet .zone { min-height:120px; } .lw .agd .sheet .ans { margin-top:10px; font:600 16px ui-monospace, Menlo, monospace; }
.lw .agd .chg { font:600 16px ui-monospace, Menlo, monospace; margin-bottom:8px; }
@container (max-width: 820px) { .lw .agd .io { grid-template-columns:1fr; } .lw .agd .pipe { grid-template-columns:1fr; } }
`;

export default widget({ label: "Task 1: build the SQL agent", css, steps, view: (step, at) => views[at]() });
