// agd-recover — error recovery: the agent reads a failed statement's error and repairs the name;
// PostgreSQL names one wrong name at a time; an error that says only "query failed" leaves the
// model to look everything up or to guess; and a hint chosen by the class of the error. Every run
// is in agd-recorded.json (gemini-3.5-flash-lite, 2026-11-23, four runs each, the page's STALE prompt).
import { bar } from "./ag1-lib.js";
import { REC, chatOf, calls, dots, esc, key, runs, tally, widget, zone } from "./agd-lib.js";

const HINTS = [["InsufficientPrivilege", "the database is read-only: do not retry; tell the user", "hot"],
  ["UndefinedTable · UndefinedColumn", "a name is wrong: call list_tables or describe_table", "on"],
  ["anything else", "fix the SQL and run it again", ""]];

// The class of a failed call, read off its result.
const cls = (m) => { try { return JSON.parse(m.result).error; } catch { return "error"; } };
// The tool calls of the run shown, as a ladder: each try, failed or not.
const ladder = (name) => { const e = REC[name]; return `<ol class="ladder">${e.runs[e.shown].chat.filter((m) => m.role === "tool").map((m, i) =>
  `<li class="${m.error ? "bad" : m.name === "run_sql" ? "good" : ""}" style="animation-delay:${i * 140}ms"><span>${m.error ? "✗" : "✓"}</span><code>${
    esc(m.name === "run_sql" ? m.args.query.replace(/\s+/g, " ").slice(0, 70) : `${m.name}(${Object.values(m.args).join(", ")})`)}</code>${
    m.error ? `<small>${esc(cls(m))}</small>` : ""}</li>`).join("")}</ol>`; };
const recovered = (r) => /1,?000|221\.55|67,?416\.51/.test(r.answer ?? "");
const looked = (r) => r.sql.length > 2 || r.sql.some((s) => /information_schema/i.test(s));
const avg = (name, f) => REC[name].runs.reduce((a, r) => a + f(r), 0) / REC[name].runs.length;
const mean = (name, f) => avg(name, f).toFixed(1);
const oneDelete = (r) => r.sql.filter((s) => /\bDELETE\b/i.test(s)).length === 1;
const split = (a, b) => `<div class="cols" style="--cols:minmax(0,1fr) minmax(0,1fr)">${a}<div class="side">${b}</div></div>`;
const callsOf = (r) => r.calls;
const callBars = () => { const a = avg("blind_top_full", callsOf), b = avg("blind_top_mute", callsOf), top = Math.max(a, b);
  return `<div class="bars">${bar("the error's own message", a, top, a.toFixed(1))}${bar("only “query failed”", b, top, b.toFixed(1), "mute")}</div>`; };
// The 2 × 2 of the last step: rows are the two probes, columns the two hints.
const matrix = () => `${key("recovered, or sent one DELETE and stopped")}<div class="matrix"><span></span><b>generic hint</b><b>hint by class</b>
  <span class="who">wrong table · recovered</span>${cell("stale_table_generic", recovered)}${cell("stale_table_class", recovered)}
  <span class="who">asked to delete · one DELETE, then stop</span>${cell("delete_generic", oneDelete)}${cell("delete_class", oneDelete)}</div>`;
const cell = (name, f) => runs(dots(name, f, "")).replace('<span class="who"></span>', "");

const steps = [
  { stop: "Wrong table", title: "A wrong table: it reads the error, then looks", decisive: true,
    note: `The prompt says <code>movies</code>. The error says no such relation, so the agent lists the tables, reads <code>film</code> and counts again. It recovered in ${REC.stale_table_full.runs.filter(recovered).length} runs of ${REC.stale_table_full.runs.length}, each after one failed query.`,
    view: () => split(chatOf("stale_table_full", { open: calls("stale_table_full").slice(0, 1) }), zone("its tries, in order", ladder("stale_table_full")) + tally("How many films do we have?", "reached 1,000", dots("stale_table_full", recovered, "runs"))) },
  { stop: "One at a time", title: "PostgreSQL names one wrong name at a time",
    note: `With <code>run_sql</code> as its only tool, the agent looked the columns up in <code>information_schema</code> itself. The message named <code>name</code> first; once that was fixed, the next query failed on <code>amount_total</code>. ${mean("blind_top_full", callsOf)} model calls on average, to fix two names.`,
    view: () => split(chatOf("blind_top_full", { open: calls("blind_top_full").slice(0, 1) }), zone("its tries, in order", ladder("blind_top_full"))) },
  { stop: "Vague", title: "“query failed”: it looks everything up, or it guesses",
    note: `With the reason hidden, the agent has nothing to aim at. Asked for the top customer, it read every column of the tables at once, and finished in ${mean("blind_top_mute", callsOf)} calls instead of ${mean("blind_top_full", callsOf)}. Asked for revenue, ${REC.blind_revenue_mute.runs.filter((r) => !looked(r)).length} runs of ${REC.blind_revenue_mute.runs.length} guessed <code>amount</code> without looking: right only because the model has seen Pagila before.`,
    view: () => split(chatOf("blind_revenue_mute", { open: calls("blind_revenue_mute") }), tally("What is our total revenue? · “query failed”", "looked the names up first", dots("blind_revenue_mute", looked, "runs")) +
      zone("Which customer has spent the most? · model calls, on average", callBars())) },
  { stop: "By class", title: "A hint chosen by the class of the error",
    note: `The class says who can fix the failure. A wrong name the model can fix; a refusal it cannot, so its hint says not to retry. On this model the hints changed no count: with either hint, every run recovered from <code>movies</code>, and every run asked to delete sent one <code>DELETE</code>, was refused, and stopped.`,
    view: () => zone("the class → the hint", `<table class="hints"><tbody>${HINTS.map(([c, hint, tone]) => `<tr><td><code>${c}</code></td><td class="${tone === "hot" ? "hotc" : tone === "on" ? "acc" : ""}">${hint}</td></tr>`).join("")}</tbody></table>`) +
      zone("measured · four runs each", matrix()) },
];

const css = `
.lw .agd ol.ladder { margin:0; padding:0; list-style:none; display:grid; gap:6px; }
.lw .agd ol.ladder li { display:grid; grid-template-columns:22px minmax(0,1fr) auto; gap:8px; align-items:center; padding:7px 10px; border-radius:8px; background:var(--cell); animation:lw-in .4s both; }
.lw .agd ol.ladder li span { font-weight:700; color:var(--mute); } .lw .agd ol.ladder li code { background:none; padding:0; font-size:13px; overflow-wrap:anywhere; }
.lw .agd ol.ladder li small { font:600 12px ui-monospace, Menlo, monospace; color:var(--hot); background:var(--hot-bg); padding:1px 8px; border-radius:999px; }
.lw .agd ol.ladder li.bad { box-shadow:inset 3px 0 var(--hot); } .lw .agd ol.ladder li.bad span { color:var(--hot); }
.lw .agd ol.ladder li.good { box-shadow:inset 3px 0 var(--ok); } .lw .agd ol.ladder li.good span { color:var(--ok); }
.lw .agd .bars .bar { grid-template-columns:minmax(150px, 40%) 1fr minmax(48px, auto); }
.lw .agd table.hints { width:100%; border-collapse:collapse; font-size:15px; } .lw .agd table.hints td { padding:9px 14px 9px 0; border-top:1px solid var(--line); }
.lw .agd .matrix { display:grid; grid-template-columns:auto 1fr 1fr; gap:12px 20px; align-items:center; }
.lw .agd .matrix > b { font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .agd .matrix .runs { display:block; }
`;

export default widget({ label: "When the SQL is wrong", css, steps, view: (step) => step.view() });
