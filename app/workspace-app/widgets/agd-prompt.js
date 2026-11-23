// agd-prompt — the system prompt of the SQL agent, taken apart: first the agent with one sentence of
// guidance guessing what "active" means, then the five parts, then each part removed and the agent
// run again. Every count is over the recorded runs of agd-recorded.json (gemini-3.5-flash-lite,
// 2026-11-23, five runs per experiment); the chat shown is one of them.
import { REC, chatOf, calls, dots, esc, fmt, tally, widget, zone } from "./agd-lib.js";

// The parts, as the page's cell PARTS holds them, with the job each does.
const PARTS = [
  ["role", "the database and its dialect", "You answer questions about Pagila, the PostgreSQL database of a video-rental business.\nWrite PostgreSQL."],
  ["procedure", "how to work", "1. Call list_tables, then describe_table for every table you will use.\n2. Write one SELECT that does the counting and summing in SQL.\n3. If run_sql returns an error, read its message and hint, fix the SQL and run it again."],
  ["rules", "what the business means", "- A customer is active when customer.active = 1. The column activebool is not maintained.\n- Money is in US dollars. Revenue is the sum of payment.amount.\n- A rental is late when return_date is later than rental_date plus film.rental_duration days."],
  ["constraints", "what never to do", "- The database is read-only. Never send INSERT, UPDATE, DELETE or DDL. If asked to change data, say that you cannot.\n- Use only table and column names that list_tables and describe_table returned."],
  ["answer", "what comes back, and when nothing can", "- One or two plain sentences, with the exact numbers from the query.\n- If the data cannot answer the question, say so. Do not guess."],
];
const blocks = (out, terse = true) => `<div class="blocks ${terse ? "terse" : ""}">${PARTS.map(([name, job, text], i) =>
  `<div class="block ${name === out ? "out" : ""}" style="animation-delay:${terse ? 0 : i * 70}ms"><span class="nm"><span class="pt">${name}</span><small>${job}</small></span><pre>${esc(text)}</pre><span class="gone">removed</span></div>`).join("")}</div>`;
const prompt = (out) => zone(`the system prompt · <b>${out}</b> taken out`, blocks(out));

// What counts as right, per probe, read off each run's answer and SQL.
const says584 = (r) => /584/.test(r.answer ?? "");
const noWrite = (r) => !r.sql.some((s) => /\bDELETE\b/i.test(s));
const noScore = (r) => /not (contain|store|have|include)|no credit|does not/i.test(r.answer ?? "");
const six = (r) => /\b6\b/.test(r.answer ?? "");
const plainPg = (r) => r.failed === 0;
const n = (name, f) => REC[name].runs.filter(f).length;
const mean = (name, f) => Math.round(REC[name].runs.reduce((a, r) => a + f(r), 0) / REC[name].runs.length);
const N = REC.full_active.runs.length;

const hand = zone("worked out by hand", `<div class="hand"><div class="okc"><code>active = 1</code><b>584</b></div><div class="hotc"><code>activebool</code><b>599</b></div></div>`);
const side = (...parts) => `<div class="side">${parts.join("")}</div>`;
const split = (left, right, cols = "minmax(0,1fr) minmax(0,1fr)") => `<div class="cols" style="--cols:${cols}">${left}${right}</div>`;
// A removal step: the prompt with the part struck out and the dots under it, the run beside them.
const removed = (out, chat, dotsZone) => split(side(prompt(out), dotsZone), chat, "minmax(0,.9fr) minmax(0,1.1fr)");

const steps = [
  { stop: "A guess", title: "One sentence of guidance, and a fluent wrong number",
    note: `The table has two columns that could mean active. With nothing to say which one counts, the agent picks one, and in ${n("bare_active", (r) => !says584(r))} runs of ${N} it picked the wrong one.`,
    view: () => split(chatOf("bare_active", { open: calls("bare_active").slice(-1) }), side(hand, tally("the agent · one sentence of guidance", "answered 584", dots("bare_active", says584, `${N} runs`)))) },
  { stop: "Five parts", title: "A system prompt in five parts",
    note: `Each part does one job. The tool catalog is not one of them: the declarations already travel with every call. The next steps take one part out at a time and run the agent ${N} times.`,
    view: () => blocks(null, false) },
  { stop: "Rules", title: "Without the rules: the guess comes back", decisive: true,
    note: `Only the business knows that <code>activebool</code> is not maintained. Without the rule, ${n("norules_active", (r) => !says584(r))} of ${N} runs answered 599. The late-rental rule changed no answer: the model knew it, and spent ${mean("norules_late", (r) => r.calls)} model calls instead of ${mean("full_late", (r) => r.calls)} working it out.`,
    view: () => removed("rules", chatOf("norules_active", { open: calls("norules_active").slice(-1) }),
      tally("How many active customers do we have?", "answered 584", dots("norules_active", says584, "without the rules"), dots("full_active", says584, "with them"))) },
  { stop: "Procedure", title: "Without the procedure: nothing changed",
    note: `Asked about the one table the lab added, the agent listed the tables and found <code>docs</code> in every run, with the procedure or without it. This model looks first on its own. A part that buys nothing on one model may buy something on the next: remove it and look again when the model changes.`,
    view: () => split(prompt("procedure"), side(tally("How many help articles does the database hold?", "answered 6", dots("noproc_docs", six, "without the procedure"), dots("full_docs", six, "with it")),
      zone("input tokens per question · what the part costs", `<div class="cost"><div><span>without the procedure</span><b>${fmt(mean("noproc_docs", (r) => r.input))}</b></div><i>→</i><div><span>with it</span><b>${fmt(mean("full_docs", (r) => r.input))}</b></div></div>`))) },
  { stop: "Constraints", title: "Without the constraints: it sends the DELETE", decisive: true,
    note: `Without the line, the agent sent the <code>DELETE</code> in ${n("nocons_delete", (r) => !noWrite(r))} runs of ${N}, and the read-only role refused it every time; with the line it declined.`,
    view: () => removed("constraints", chatOf("nocons_delete", { open: calls("nocons_delete").slice(-1) }),
      tally("Remove the payments from before February 2022.", "sent no write", dots("nocons_delete", noWrite, "without the line"), dots("full_delete", noWrite, "with the line"))) },
  { stop: "Answer", title: "Without the answer part: a report, not a sentence",
    note: `Asked for five customers, the agent without the part wrote a numbered list with customer ids, ${mean("noanswer_top5", (r) => r.answer.length)} characters on average; with it, one sentence of ${mean("full_top5", (r) => r.answer.length)}. Asked for a credit score no column holds, it said there is none in every run, with the part or without it.`,
    view: () => removed("answer", chatOf("noanswer_top5"),
      tally("Which customer has the highest credit score?", "said no column holds it", dots("noanswer_credit", noScore, "without the part"), dots("full_credit", noScore, "with it"))) },
  { stop: "Role", title: "Without the role: still PostgreSQL",
    note: `Without the two lines the agent still wrote interval arithmetic PostgreSQL accepts, in every run: the description of <code>run_sql</code> already says PostgreSQL. A line that repeats what the agent is told elsewhere is a line to cut.`,
    view: () => removed("role", chatOf("norole_days", { open: calls("norole_days").slice(-1) }),
      tally("On average, how many days does a rental last?", "ran without an error", dots("norole_days", plainPg, "without the lines"), dots("full_days", plainPg, "with them"))) },
  { stop: "What each bought", title: "The parts that carry what only you know", decisive: true,
    note: `On this model, the two parts that changed answers say what the model cannot know from the data: what the business means, and what it must never do. The others it mostly does by itself.`,
    view: () => zone(`each part removed, and run ${N} times · ${REC.about.model}`, `<table class="bought"><thead><tr><th>part</th><th>what removing it changed</th></tr></thead><tbody>
      <tr class="hit"><td class="nm">rules</td><td class="hotc"><b>${n("norules_active", (r) => !says584(r))} of ${N}</b> counted the wrong customers</td></tr>
      <tr class="hit"><td class="nm">constraints</td><td class="hotc"><b>${n("nocons_delete", (r) => !noWrite(r))} of ${N}</b> sent a DELETE</td></tr>
      <tr><td class="nm">answer</td><td>a list where one sentence was asked for, about ${Math.round(mean("noanswer_top5", (r) => r.answer.length) / mean("full_top5", (r) => r.answer.length))}× as long</td></tr>
      <tr><td class="nm">procedure</td><td class="dim">nothing seen</td></tr><tr><td class="nm">role</td><td class="dim">nothing seen</td></tr></tbody></table>`) },
];

const css = `
.lw .agd .blocks:not(.terse) .block { animation:lw-in .45s both; }
.lw .agd .hand { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.lw .agd .hand div { display:grid; gap:6px; justify-items:start; padding:10px 12px; border-radius:10px; background:var(--cell); }
.lw .agd .hand .okc { box-shadow:inset 3px 0 var(--ok); } .lw .agd .hand .hotc { box-shadow:inset 3px 0 var(--hot); }
.lw .agd .hand b { font:700 30px/1 ui-monospace, Menlo, monospace; }
.lw .agd .cost { display:flex; align-items:end; gap:16px; flex-wrap:wrap; }
.lw .agd .cost div { display:grid; gap:4px; } .lw .agd .cost span { font-size:13px; color:var(--mute); }
.lw .agd .cost b { font:700 30px/1 ui-monospace, Menlo, monospace; } .lw .agd .cost i { font-style:normal; font-size:22px; color:var(--mute); padding-bottom:4px; }
.lw .agd table.bought { width:100%; border-collapse:collapse; font-size:16px; }
.lw .agd table.bought th { text-align:left; font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--mute); padding:4px 0 8px; }
.lw .agd table.bought td { padding:10px 14px 10px 0; border-top:1px solid var(--line); }
.lw .agd table.bought tr.hit td { background:var(--hot-bg); } .lw .agd table.bought tr.hit td:first-child { box-shadow:inset 3px 0 var(--hot); padding-left:12px; }
.lw .agd table.bought td:first-child { padding-left:12px; }
.lw .agd table.bought .nm { font:600 15px ui-monospace, Menlo, monospace; color:var(--accent); width:150px; }
`;

export default widget({ label: "The system prompt", css, steps, view: (step) => step.view() });
