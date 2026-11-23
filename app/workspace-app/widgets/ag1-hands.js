// ag1-hands — the model has no hands. It writes text asking for an action and stops; your process
// notices, decides, runs the function and appends the result. The boundary never moves.
import { call, tooldef, widget, zone } from "./ag1-lib.js";
import { GCSS, flow, gtalk } from "./aga-lib.js";

const QUESTION = "How many films do we have?";
// Measured on the preview's Pagila: SELECT count(*) FROM film;
const CAPTURED = { films: 1000 };

// RECORDED on 2026-11-23 with gemini-3.5-flash-lite (scratch recordings e3 and rec1).
// `guess`: the question alone, no tools (the page's first cell); 3 runs of 3 asked which films
// were meant and gave no number; only the reply's first line is shown. `call`: the same question
// with the run_sql declaration below and automatic function calling off; 3 runs of 3 asked for
// exactly this query.
const RECORDED = {
  guess: "It looks like you didn't mention which list, streaming service, or collection you are referring to! …",
  call: { name: "run_sql", args: { query: "SELECT count(*) FROM film" } },
};

const TOOL = { name: "run_sql", description: "Run one read-only SQL query on the Pagila database and return its rows.", params: [["query", "string", "A single SELECT statement."]] };

const CSS = GCSS + `
.lw .ag1 .split { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); gap:14px; align-items:center; }
.lw .ag1 .split > .gap { padding:0 4px; }
.lw .ag1 .wall { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1.25fr); gap:14px; align-items:stretch; }
.lw .ag1 .wall .edge { display:grid; place-items:center; color:var(--mute); font:600 12px ui-monospace, Menlo, monospace; writing-mode:vertical-rl; letter-spacing:.08em; text-transform:uppercase; border-left:2px dashed var(--line); padding-left:6px; }
.lw .ag1 .writes { display:grid; gap:8px; }
.lw .ag1 .ran { margin-top:12px; display:flex; align-items:center; gap:12px; padding:8px 12px; border-radius:10px; background:var(--cell); font:14px ui-monospace, Menlo, monospace; }
.lw .ag1 .ran b { font-size:22px; color:var(--ok); margin-left:auto; }
.lw .ag1 .keep { display:grid; gap:6px; margin:0; padding:0; list-style:none; }
.lw .ag1 .keep li { display:flex; gap:10px; align-items:center; padding:6px 10px; border-radius:10px; background:var(--accent-bg); font-size:15px; }
.lw .ag1 .keep li::before { content:"✓"; font-weight:700; color:var(--accent); }
@container (max-width: 820px) { .lw .ag1 .split, .lw .ag1 .wall { grid-template-columns:1fr; } .lw .ag1 .wall .edge { writing-mode:horizontal-tb; border-left:0; border-top:2px dashed var(--line); padding:6px 0 0; } }
`;

const steps = [
  { stop: "A guess", title: "A completion can answer; it cannot look",
    note: `The count is in a database, and nothing in an API call can reach a database. So the model does the one thing it does, writes likely text: here, a question back about which films you mean. However you rephrase, the 1,000 is not in reach.` },
  { stop: "Text", title: "What a model can do instead: ask, in text",
    note: `It writes which function it would like run, with which arguments, and <b>stops</b>. That is still text out. Nothing has been run.` },
  { stop: "Your code", title: "Everything after the text is your process", decisive: true,
    note: `Your code notices the request, decides whether to honour it, runs the function itself and writes the result into the next prompt.` },
  { stop: "Granted", title: "Nothing is ever granted to the model",
    note: `Declaring a tool in the request hands the model a <b>description</b> of what your code is willing to do on request. When an agent does something you did not want, the code that let it is yours.` },
];

const DUTIES = ["notice the request", "decide to honour it", "run the function", "append the result"];
const KEEP = ["the loop", "the dispatch table", "the decision to honour a call", "the error you hand back", "the cap that stops it"];

function guess() {
  return `<div class="split">${gtalk([{ role: "user", text: QUESTION }, { role: "assistant", text: RECORDED.guess }])}
    <div class="gap"><i>✕</i>no link</div>
    ${zone("Pagila — where the answer is", `<p class="mono">SELECT count(*) FROM film;</p><p class="big okc" style="margin:8px 0">${CAPTURED.films.toLocaleString("en-US")}</p><p class="small">no part of the call connects to this</p>`, "off")}</div>`;
}

function granted() {
  return `<div class="cols">
    ${zone("What a tool declaration hands the model: text", tooldef(TOOL))}
    ${zone("What stays yours", `<ul class="keep">${KEEP.map((t) => `<li>${t}</li>`).join("")}</ul>
      <p class="small" style="margin-top:12px">none of this is in the model, and none of it is in the API</p>`, "on")}</div>`;
}

function view(step, at) {
  if (at === 0) return guess();
  if (at === 3) return granted();
  const model = zone("The model — text in, text out", `<div class="writes"><p class="small">it writes</p>${call(RECORDED.call)}<p class="small">and stops</p></div>`, at === 1 ? "on" : "");
  const ran = at === 2 ? `<div class="ran fresh"><span>${RECORDED.call.args.query}</span><b>→ ${CAPTURED.films}</b></div><p class="small" style="margin-top:8px">the database is reached from here, by a function you wrote</p>` : `<p class="small" style="margin-top:12px">nothing has run yet</p>`;
  const yours = zone("Your process — everything else", flow(DUTIES, at === 2) + ran, at === 2 ? "on" : "off");
  return `<div class="wall">${model}<div class="edge">the boundary</div>${yours}</div>`;
}

export default widget({ label: "The model has no hands", css: CSS, steps, view });
