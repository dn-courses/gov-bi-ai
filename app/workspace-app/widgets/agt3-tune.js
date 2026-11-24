// agt3-tune — tuning an instruction against an eval, and why a held-out set exists. The same scorer
// runs three instructions: the weak one the page starts from, one patched row by row until the
// tuning set passed, and one that states the operations team's words. The patched one is found out
// by four questions it was never tuned on. Every run is recorded in agt3-tune-data.js.
import { esc, widget, zone } from "./ag1-lib.js";
import { ASK, MODEL, RUNS, TUNING, HELD_OUT } from "./agt3-tune-data.js";

const steps = [
  { stop: "The score", title: "Score the words, not the answers",
    note: `The page's starting instruction, one sentence, on the eight tuning questions: ${RUNS.weak.tuning.filter((r) => r[0]).length} of 8. Each failed line says what the agent called and what it got: an hour that is not the busiest, its own guess at the morning rush, days it chose itself.` },
  { stop: "Patch the rows", title: "Fix each failed line, and the tuning score goes up",
    note: `One sentence per failed line, nothing more: the word it got wrong, the hours it guessed, the days it should not have chosen. One fix broke a line that had passed (once it could not choose days, "yesterday" needed a sentence of its own), so that was added too. Every sentence is true, and the tuning set says ${RUNS.fitted.tuning.filter((r) => r[0]).length} of 8.` },
  { stop: "Held out", title: "Four questions it was never tuned on", decisive: true,
    note: `The same kinds of question, other words and other cities. The patched instruction passes ${RUNS.fitted.held.filter((r) => r[0]).length} of 4, in three runs out of three. No tuning line asked about the evening rush, so no sentence was written for it, and the agent guessed its hours. The tuning score measured the eight questions, not what the agent knows.` },
  { stop: "The rule", title: "State the team's words, not the rows",
    note: `An instruction that writes down every word on the team's sheet as a rule, including the ones no tuning line failed on. It passes ${RUNS.general.tuning.filter((r) => r[0]).length} of 8, and ${RUNS.general.held.filter((r) => r[0]).length} of 4 on questions it never saw.` },
  { stop: "The wording", title: "The same rule, in two wordings, scored differently",
    note: `Two instructions tried on the way, each saying in its own words to ask when no days are given. Under the first the agent still chose days itself and ran a query. One run each: which wording works is measured, and measured more than once.` },
];

const CSS = `
.lw .ag1 table.t { width:100%; border-collapse:collapse; font-size:14px; }
.lw .ag1 table.t td, .lw .ag1 table.t th { padding:6px 9px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
.lw .ag1 table.t tr:last-child td { border-bottom:none; }
.lw .ag1 table.t th { font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .ag1 table.t .n { text-align:right; font-family:ui-monospace, Menlo, monospace; white-space:nowrap; }
.lw .ag1 table.t .m { font-family:ui-monospace, Menlo, monospace; font-size:13px; }
.lw .ag1 table.t tr.miss td:first-child { box-shadow:inset 3px 0 0 var(--hot); }
.lw .ag1 .pill { font-size:13px; padding:3px 11px; }
.lw .ag1 .tot { display:flex; gap:12px; align-items:baseline; margin-top:10px; font-size:14px; }
.lw .ag1 .tot b { font:700 24px ui-monospace, Menlo, monospace; }
.lw .ag1 pre.ins { max-height:240px; overflow:auto; }
.lw .ag1 .word { display:grid; gap:10px; }
`;

const mark = (ok) => `<span class="pill ${ok ? "ok" : "hot"}">${ok ? "pass" : "fail"}</span>`;
const count = (rows) => rows.filter((r) => r[0]).length;

const row = (q, [ok, got, want, tools, mb]) => `<tr class="${ok ? "" : "miss"}"><td>${mark(ok)}</td><td>${esc(q)}</td>
  <td class="n">${esc(got)}</td><td class="n">${esc(want)}</td><td class="m">${esc(tools.join(" → ") || "none")}</td><td class="n">${mb}</td></tr>`;

const table = (questions, rows) => `<table class="t"><thead><tr><th></th><th>question</th><th class="n">got</th><th class="n">expected</th><th>calls</th><th class="n">MB</th></tr></thead>
  <tbody>${questions.map((q, i) => row(q, rows[i])).join("")}</tbody></table>`;

const scored = (cap, questions, rows, cls = "") => zone(cap, `${table(questions, rows)}
  <div class="tot"><b class="${count(rows) === rows.length ? "okc" : "hotc"}">${count(rows)} of ${rows.length}</b><span class="dim">passed · recorded on ${MODEL}</span></div>`, cls);

const instruction = (name, run) => zone(`the instruction · ${name}`, `<pre class="ins">${esc(run.instruction)}</pre>`, "on");

// The rule's instruction is not drawn: writing it is the task.
const rule = () => zone("the instruction · the team's words", `<p>Every row of the sheet <i>The operations team's words</i>, each written as a rule the agent can follow, whether or not a tuning line failed on it.</p>
  <p class="small" style="margin-top:8px">${RUNS.general.words} words</p>`, "on");

const both = (name, run, cls) => `<div class="cols" style="--cols:minmax(0,.8fr) minmax(0,1.6fr)">${rule()}
  <div style="display:grid; gap:14px; min-width:0">${scored("tuning set", TUNING, run.tuning)}${scored("held-out set", HELD_OUT, run.held, cls)}</div></div>`;

const one = (name, run, rows, questions, cap, cls) => `<div class="cols" style="--cols:minmax(0,.8fr) minmax(0,1.6fr)">${instruction(name, run)}${scored(cap, questions, rows, cls)}</div>`;

const wording = () => `<div class="word">${ASK.map(([text, ran, tools]) => zone(ran ? "the agent chose days and ran a query" : "the agent asked, and ran nothing",
  `<pre>${esc(text)}</pre><p class="small" style="margin-top:8px">"How many stations reported in Chicago?" · calls: ${esc(tools.join(" → "))}</p>`, ran ? "hot" : "ok")).join("")}
  <p class="small">one run each, ${MODEL}</p></div>`;

const VIEWS = [
  () => one("weak", RUNS.weak, RUNS.weak.tuning, TUNING, "tuning set"),
  () => one("patched row by row", RUNS.fitted, RUNS.fitted.tuning, TUNING, "tuning set"),
  () => one("patched row by row", RUNS.fitted, RUNS.fitted.held, HELD_OUT, "held-out set", "hot"),
  () => both("the team's words", RUNS.general, "ok"),
  wording,
];
const view = (step, at) => VIEWS[at]();

export default widget({ label: "Tuning against an eval", css: CSS, steps, view });
