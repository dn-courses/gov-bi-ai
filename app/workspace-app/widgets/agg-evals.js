// agg-evals — what an eval of the warehouse agent checks. One line of the model changed and the
// answer moved while the calls and the sentence stayed the same; a check of the value catches it,
// a check of the calls does not; a check of the calls compares arguments exactly; an eval set runs
// all the cases again. Every run is recorded in agg-evals-data.js.
import { esc, widget, zone } from "./ag1-lib.js";
import { EVAL, HOUR as H, MODEL, SCORED } from "./agg-evals-data.js";

const steps = [
  { stop: "One line", title: "One line of the model changed. Which answer is right?",
    note: `The same question, before and after someone simplified <code>hour</code> in <code>model.yml</code>. The agent sent the same call both times, and both answers read well. A check that looks for an hour in the sentence passes both.` },
  { stop: "The value", title: "Check the value, computed from the database", decisive: true,
    note: `A person writes the expected value once, with plain SQL on the table: 11:00 New York time. The check reads the number the answer rests on and compares it. The second run fails, which is what it should do.` },
  { stop: "The calls", title: "Check which tools it called, and with what",
    note: `A trajectory check compares the calls the agent made with the calls it should make. Here both runs made the right call: the error is below the tools, in the model. So the calls check passes both, and it is the value check that catches this one.` },
  { stop: "Exact", title: "A check of the calls compares arguments exactly",
    note: `ADK scores a call 1 only if the name and every argument are equal. Splitting by <code>system</code> while filtering to one system gives the same number, and scores 0. Write the expected call the way the agent should send it, and read every failure before you trust it.` },
  { stop: "The set", title: "An eval set runs every case again after each change",
    note: `Three questions, their expected calls, and a score per case, from one <code>adk eval</code> run. The failure is the exact-arguments case: the answer, 2,520, is right. Run the set after every change to the prompt, the model or a tool.` },
];

const CSS = `
.lw .ag1 .two { display:grid; gap:14px; grid-template-columns:minmax(0,1fr) minmax(0,1fr); }
.lw .ag1 .lab { font-size:13px; color:var(--mute); margin:12px 0 5px; }
.lw .ag1 .ans { font-size:15px; line-height:1.5; padding:10px 13px; border-radius:10px; background:var(--cell); }
.lw .ag1 .row { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:10px; font-size:14px; }
.lw .ag1 .first { display:flex; align-items:baseline; gap:12px; }
.lw .ag1 .hour { font:700 34px/1 ui-monospace, Menlo, monospace; }
.lw .ag1 .hour.on { color:var(--accent); } .lw .ag1 .hour.hot { color:var(--hot); }
.lw .ag1 .callz { margin-top:14px; }
.lw .ag1 table.t { width:100%; border-collapse:collapse; font-size:14px; }
.lw .ag1 table.t td, .lw .ag1 table.t th { padding:8px 10px; border-bottom:1px solid var(--line); text-align:left; vertical-align:middle; }
.lw .ag1 table.t tr:last-child td { border-bottom:none; }
.lw .ag1 table.t th { font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .ag1 table.t .n { text-align:right; font-family:ui-monospace, Menlo, monospace; }
.lw .ag1 table.t .c { text-align:center; }
.lw .ag1 table.t tr.mk td { background:var(--accent-bg); }
.lw .ag1 table.t tr.miss td:first-child { box-shadow:inset 3px 0 0 var(--hot); }
.lw .ag1 table.t th.n { font-family:inherit; }
.lw .ag1 .cgrid { display:grid; grid-template-columns:auto 1fr 1fr; gap:10px 16px; align-items:center; font-size:14px; }
.lw .ag1 .cgrid .hd { font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); font-weight:600; text-align:center; }
.lw .ag1 .cgrid .gc { text-align:center; }
.lw .ag1 .big { font:700 22px ui-monospace, Menlo, monospace; }
.lw .ag1 .pill { font-size:14px; padding:4px 14px; }
`;

const mark = (ok) => `<span class="pill ${ok ? "ok" : "hot"}">${ok ? "pass" : "fail"}</span>`;
const check = (label, ok) => `<div class="row"><span class="dim">${label}</span>${mark(ok)}</div>`;

const run = (title, side, cls) => zone(title, `<pre>${esc(side.line)}</pre>
  <p class="lab">first row the tool returned</p><div class="first"><span class="dim">hour</span><span class="hour ${cls}">${side.top[0]}</span><span class="chip">${side.top[1]}</span></div>
  <p class="lab">the answer</p><div class="ans">${esc(side.answer)}</div>${check("sentence names an hour", true)}`, cls === "hot" ? "hot" : "");

const oneLine = () => `<div class="two">${run("before · local time", H.before, "on")}${run("after · one line changed", H.after, "hot")}</div>
  ${zone("the call, both times", `<pre>${esc(H.call)}</pre><p class="small" style="margin-top:8px">recorded on ${MODEL}, 2026-11-23</p>`, "callz")}`;

const truth = () => `<table class="t"><thead><tr><th class="n">New York hour</th><th class="n">empty share</th></tr></thead><tbody>
  ${H.truth.map(([h, s], i) => `<tr class="${i ? "" : "mk"}"><td class="n ${i ? "" : "acc"}">${h}</td><td class="n">${s}</td></tr>`).join("")}</tbody></table>`;

const value = () => `<div class="cols" style="--cols:minmax(0,1fr) minmax(0,1.2fr)">
  ${zone("expected · plain SQL on the table", `${truth()}<p class="small" style="margin-top:8px">written down once; no model involved</p>`, "ok")}
  ${zone("the check", `<pre>expected = 11
answer_hour == expected</pre>
    <div class="row"><span class="dim">before</span><span class="big acc">11</span>${mark(true)}</div>
    <div class="row"><span class="dim">after</span><span class="big hotc">15</span>${mark(false)}</div>`)}</div>`;

const calls = () => `<div class="cols" style="--cols:minmax(0,1fr) minmax(0,1fr)">
  ${zone("expected calls", `<pre>list_metrics()            # any order before
query_metrics(empty_share by hour,
  2026-09-15, system = lyft_nyc)</pre>`, "on")}
  ${zone("what each check says", `<div class="cgrid"><span></span><span class="hd">calls</span><span class="hd">value</span>
    <span class="dim">before</span><span class="gc">${mark(true)}</span><span class="gc">${mark(true)}</span>
    <span class="dim">after</span><span class="gc">${mark(true)}</span><span class="gc">${mark(false)}</span></div>`)}</div>`;

const exact = () => zone("tool_trajectory_avg_score · IN_ORDER · scored without a model", `<table class="t"><thead><tr><th>the actual call</th><th class="c">score</th><th>why</th></tr></thead><tbody>
  ${SCORED.map(([what, score, why]) => `<tr class="${score ? "" : "miss"}"><td>${esc(what)}</td><td class="c"><span class="pill ${score ? "ok" : "hot"}">${score}</span></td><td class="dim">${esc(why)}</td></tr>`).join("")}</tbody></table>`);

const caseRow = ([id, answer, score, n, tokens, s]) => `<tr class="${score ? "" : "miss"}"><td><code>${id}</code></td><td>${esc(answer)}</td>
  <td class="c"><span class="pill ${score ? "ok" : "hot"}">${score.toFixed(1)}</span></td><td class="n">${n}</td><td class="n">${tokens.toLocaleString("en-US")}</td><td class="n">${s}</td></tr>`;

const set = () => zone(`adk eval · ${EVAL.passed} passed, ${EVAL.failed} failed`, `<table class="t"><thead><tr><th>case</th><th>answer</th><th class="c">calls score</th><th class="n">model calls</th><th class="n">tokens</th><th class="n">seconds</th></tr></thead><tbody>
  ${EVAL.cases.map(caseRow).join("")}</tbody></table>
  <p class="small" style="margin-top:8px">recorded on ${MODEL}, 2026-11-23, one run of each case</p>`);

const VIEWS = [oneLine, value, calls, exact, set];
const view = (step, at) => VIEWS[at]();

export default widget({ label: "Checking an agent", css: CSS, steps, view });
