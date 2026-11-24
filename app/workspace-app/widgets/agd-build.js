// agd-build — task 1: the SQL agent, where the participant writes only words. What reaches the
// model on every call (the declarations and the system prompt, never the Python); the weak tool
// words, and what the names already carry; a wrong value read off a trace; the sheet under four
// mixes of words; and a trace that ran out of turns. Every run is in agd-build-data.js.
import { tooldef } from "./ag1-lib.js";
import { esc, widget, zone } from "./agd-lib.js";
import { ACTIVE, DELETE, FIRST, GRID, MODEL, QUESTIONS, SECONDS } from "./agd-build-data.js";

const WEAK = [
  { name: "list_tables", description: "Lists tables.", params: [] },
  { name: "describe_table", description: "Describes a table.", params: [["table_name", "string", "A table."]] },
  { name: "run_sql", description: "Runs a query.", params: [["query", "string", "The query."]] },
];

const steps = [
  { stop: "Given", title: "The model sees words, never your Python",
    note: `On every call the request carries the system prompt and one declaration per tool: a name, a sentence, and the arguments with a sentence each. The functions, the loop, the read-only role and the ceiling of 50 rows stay in your process. Those are given. The words are yours.` },
  { stop: "Tool words", title: "The weak words: what the names already say",
    note: `With these, the model still began with <code>list_tables</code> in ${FIRST.list_tables} questions of ${FIRST.runs}: a good name carries a lot. A description earns its place with what the name cannot say. Which facts those are is yours to find.` },
  { stop: "Prompt", title: "A wrong value, read off the trace", decisive: true,
    note: `Under the weak words: three clean tool calls, a confident sentence, and the wrong number. The trace shows the column it counted on; the check shows the number worked out by hand. Between them is something the agent was never told.` },
  { stop: "Sheet", title: "A trace that ran out of turns", decisive: true,
    note: `Asked to delete, the weak agent never said no. In two runs of three it spent all eight turns planning the delete. In this one it sent the deletes and was refused by the role; its last try would have marked every customer inactive. The role is the wall. The words decide whether the agent tries at all.` },
  { stop: "Again", title: "One pass can be luck",
    note: `What we measured once the task was done: the sheet three times under each mix of words, one dot per run. Some fixes held in every run; some held in two runs of three, or one. Run a fixed question three times before you trust it.` },
];

const plan = () => `<div class="cols">${zone("sent to the model, every call", `<ul class="sent">
    <li><b>SYSTEM</b><span>your prompt</span></li>${WEAK.map((t) => `<li><b>${t.name}</b><span>your description${t.params.length ? ", and one for its argument" : ""}</span></li>`).join("")}
    <li><b>history</b><span>the question, the calls so far, their results</span></li></ul>`, "on")}
  ${zone("stays in your process", `<ul class="kept"><li>the three Python functions</li><li>the read-only role <code>agent_ro</code></li><li>at most 50 rows a result</li><li>the loop, and its cap of 8 model calls</li></ul>`)}</div>`;

const toolWords = () => `<div class="cols" style="--cols:1fr 1fr 1fr">${WEAK.map((t) => tooldef(t, "off")).join("")}</div>
  ${zone("the first tool the model chose, under these words", `<p class="big okc">list_tables <span class="dim">${FIRST.list_tables} of ${FIRST.runs}</span></p>`)}`;

const line = ([call, result], i, mark) => `<li class="${/ERROR/.test(result) ? "bad" : ""}" style="animation-delay:${i * 120}ms"><span class="t">${i + 1}</span>
  <code>${mark ? esc(call).replace(mark, (m) => `<mark>${m}</mark>`) : esc(call)}</code><small>${esc(result)}</small></li>`;
const traced = (run, mark) => `<ol class="tr">${run.calls.map((c, i) => line(c, i, mark)).join("")}</ol>
  <p class="ansl"><b>answer</b> ${run.answer ? esc(run.answer.replace(/\*\*/g, "")) : `<span class="hotc">none: stopped at the turn cap</span>`}</p>`;

const prompt = () => `<div class="cols" style="--cols:minmax(0,1.6fr) minmax(0,1fr)">${zone(`trace · ${ACTIVE.question}`, traced(ACTIVE, /activebool = TRUE/), "hot")}
  <div class="side">${zone("by hand", `<pre>${esc(ACTIVE.hand)}</pre>`, "ok")}${zone("the check", `<p class="big"><span class="hotc">599</span> <span class="dim">≠</span> <span class="okc">584</span></p><p class="small">FAIL · a wrong value: read the SQL it sent</p>`)}</div></div>`;

const dots = (marks) => `<span class="dts">${marks.map((m, i) => `<i class="${m ? "ok" : "hot"}" style="animation-delay:${i * 90}ms"></i>`).join("")}</span>`;
const total = (rows) => rows.reduce((a, q) => a + q.reduce((s, m) => s + m, 0), 0);
const grid = () => zone(`the sheet · 3 runs per mix · ${SECONDS} s a sheet · ${MODEL}`, `<div class="grid" style="--n:${QUESTIONS.length}">
  <span></span>${QUESTIONS.map((q, i) => `<b>Q${i + 1}<small>${q}</small></b>`).join("")}<b>right</b>
  ${GRID.map(([mix, rows]) => `<span class="mix">${mix}</span>${rows.map(dots).join("")}<span class="sum">${total(rows)}<small>/18</small></span>`).join("")}</div>`);

const readIt = () => `<div class="cols" style="--cols:minmax(0,1.6fr) minmax(0,1fr)">${zone(`trace · ${DELETE.question}`, traced(DELETE, /DELETE|UPDATE/g), "hot")}
  <div class="side">${zone("the check", `<p class="big hotc">FAIL</p><p class="small">why it failed: it sent a change to the database</p>`)}
  ${zone("eight model calls", `<p>It did the job it was given, as well as it could. Nothing in its words said it could not.</p>`)}</div></div>`;

const VIEWS = [plan, toolWords, prompt, readIt, grid];

const css = `
.lw .agd ul.sent, .lw .agd ul.kept { margin:0; padding:0; list-style:none; display:grid; gap:8px; }
.lw .agd ul.sent li { display:grid; grid-template-columns:130px 1fr; gap:10px; font-size:14px; } .lw .agd ul.sent b { font:600 14px ui-monospace, Menlo, monospace; color:var(--accent); }
.lw .agd ul.kept li { font-size:14px; color:var(--mute); } .lw .agd ul.kept li::before { content:"·"; margin-right:8px; }
.lw .agd ol.tr { margin:0; padding:0; list-style:none; display:grid; gap:6px; }
.lw .agd ol.tr li { display:grid; grid-template-columns:22px minmax(0,1fr); gap:2px 8px; padding:6px 10px; border-radius:8px; background:var(--cell); animation:lw-in .4s both; }
.lw .agd ol.tr .t { grid-row:span 2; font:700 13px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .agd ol.tr code { background:none; padding:0; font-size:13px; overflow-wrap:anywhere; } .lw .agd ol.tr small { font-size:12px; color:var(--mute); overflow-wrap:anywhere; }
.lw .agd ol.tr li.bad { box-shadow:inset 3px 0 var(--hot); } .lw .agd ol.tr li.bad small { color:var(--hot); }
.lw .agd ol.tr mark { background:var(--hot-bg); color:var(--hot); border-radius:3px; padding:0 2px; }
.lw .agd .ansl { margin-top:10px; font-size:15px; } .lw .agd .ansl b { font:600 12px ui-monospace, Menlo, monospace; text-transform:uppercase; color:var(--mute); margin-right:8px; }
.lw .agd .big { font:700 30px ui-monospace, Menlo, monospace; }
.lw .agd .grid { display:grid; grid-template-columns:minmax(150px, auto) repeat(var(--n), minmax(0,1fr)) auto; gap:10px 12px; align-items:center; }
.lw .agd .grid > b { font-size:12px; color:var(--mute); font-weight:600; text-align:center; } .lw .agd .grid > b small { display:block; font-weight:400; }
.lw .agd .grid .mix { font-size:14px; } .lw .agd .grid .sum { font:700 16px ui-monospace, Menlo, monospace; } .lw .agd .grid .sum small { font-weight:400; color:var(--mute); }
.lw .agd .dts { display:flex; gap:4px; justify-content:center; }
.lw .agd .dts i { width:16px; height:16px; border-radius:50%; border:2px solid var(--line); animation:lw-in .4s both; }
.lw .agd .dts i.ok { background:var(--ok-bg); border-color:var(--ok); } .lw .agd .dts i.hot { background:var(--hot-bg); border-color:var(--hot); }
@container (max-width: 820px) { .lw .agd .grid { grid-template-columns:1fr repeat(var(--n), auto) auto; } .lw .agd .grid > b small { display:none; } }
`;

export default widget({ label: "Task 1: the SQL agent", css, steps, view: (step, at) => VIEWS[at]() });
