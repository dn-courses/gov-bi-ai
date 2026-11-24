// agt4-design — the task of designing a toolset: seven store-manager questions and how many facts each
// rests on, the four questions a tool's author answers (left unanswered), and the starter toolset (one
// general tool) with one recorded run of it. Runs recorded in agt4-data.js.
import { esc, widget, zone } from "./ag1-lib.js";
import { CSS, panel, totals } from "./agt4-lib.js";

// The sheet's questions, as the page's setup cell asks them.
const SHEET = [
  "How many copies of LUST LOCK are on the shelf at store 1 right now?",
  "Which films does TAMMY SANDERS still have out?",
  "How many of store 1's copies are rented out right now?",
  "What was the last film MARY SMITH rented?",
  "How many copies of CREATURES SHAKESPEARE are on the shelf at each store?",
  "TAMMY SANDERS wants ACADEMY DINOSAUR. How many copies are on the shelf at her own store?",
  "For each film TAMMY SANDERS still has out, how many copies are on the shelf at her own store?",
];

// How many facts each question rests on; more than one means calls that feed each other.
const NEEDS = ["one fact", "one fact", "one fact, counted", "one fact", "one fact, at two stores",
  "two facts: the second needs the first", "a fact, then one more per film"];

// The questions a tool's author answers; the page answers none of them.
const CHOICES = [
  ["What is one tool?", "One table? One row? One question of the sheet? Which facts come up in more than one question? (“How big is one tool?” on the tools page.)"],
  ["Which arguments?", "What does the manager have in hand when she asks? Anything the model must look up before it can call your tool costs a call of its own."],
  ["What does it return?", "Rows for the model to read and count, or the number itself? What will the next call need from this one?"],
  ["When it misses?", "A title it does not find, a name written another way: what does the model read back, and can it go on? (“When a tool fails”.)"],
];

const CSS2 = CSS + `
.lw .ag1 .jobs { display:grid; gap:8px; }
.lw .ag1 .job { display:grid; grid-template-columns:minmax(0,1.6fr) minmax(0,.7fr); gap:12px; align-items:center; padding:8px 12px; border-radius:10px; background:var(--cell); border:1.5px solid var(--line); font-size:15px; }
.lw .ag1 .job.two { border-color:var(--accent); }
.lw .ag1 .job .fact { justify-self:start; padding:3px 9px; border-radius:7px; background:var(--panel); border:1px solid var(--line); font-size:13px; }
.lw .ag1 .choices { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.lw .ag1 .choices .zone p { font-size:15px; line-height:1.5; }
@container (max-width: 820px) { .lw .ag1 .job, .lw .ag1 .choices { grid-template-columns:1fr; } }
`;

const weak = totals("weak");

const steps = [
  { stop: "The jobs", title: "Seven questions, and the facts each one rests on",
    note: `A store manager's questions about stock, customers and what is out. Each ends on an ANSWER line measured with plain SQL. The last two rest on more than one fact: the agent makes several calls, and what one returns is what the next one takes.` },
  { stop: "Four choices", title: "What you decide for each tool",
    note: `Four questions to answer for every tool you write, before you write it. Then the next step: replace the starter, run the sheet, read the calls it prints.` },
  { stop: "Your toolset", title: "The starter: one general tool, no free SQL", decisive: true,
    note: `Recorded three times, the starter scored ${weak.score} of 7 in about ${weak.model} model calls a sheet. Run it yourself and find out why from the calls it prints.` },
];

const jobs = () => `<div class="jobs">${SHEET.map((q, i) => `<div class="job ${i > 4 ? "two" : ""}">
  <span><b>Q${i + 1}</b> ${esc(q)}</span><span class="fact">${esc(NEEDS[i])}</span></div>`).join("")}</div>`;

const STARTER = [["get_rows(table: str, column: str, value: str) -> dict", "hot", "Return up to 20 rows of one Pagila table where a column equals a value."]];

const choices = () => `<div class="choices">${CHOICES.map(([q, a]) => zone(q, `<p>${esc(a)}</p>`)).join("")}</div>`;

const VIEWS = [jobs, choices, () => panel("the starter toolset", "weak", STARTER)];

export default widget({ label: "Designing a toolset", css: CSS2, steps, view: (step, at) => VIEWS[at]() });
