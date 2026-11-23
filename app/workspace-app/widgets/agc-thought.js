// agc-thought — the two things called a "thought": text the model writes into the list (an argument
// the tool's schema requires), and thinking done inside one call (hidden, counted, summarised on
// request). Each drawn as the mechanism it is, then what each showed on the Susan Davis question.
import { esc, fmt, stack, widget, zone } from "./ag1-lib.js";
import { CSS, src, stat, strip } from "./agc-lib.js";

// RECORDED 2026-11-23 with gemini-3.5-flash-lite, the page's agent (scratch susan.py, susan2.py).
// With a required `reason`: six runs, four answered 54; this is one of the four, word for word.
// With thinking_level "high" and include_thoughts: three runs, all three found both actors; these
// are run 1's summaries, cut where marked (…), and the thoughts_token_count of each run.
const MODEL = "gemini-3.5-flash-lite";
const COUNT = "SELECT COUNT(*) AS film_count FROM actor a JOIN film_actor fa ON a.actor_id = fa.actor_id WHERE a.first_name = 'SUSAN' AND a.last_name = 'DAVIS'";
const REASONED = [
  { role: "user", text: "How many films has Susan Davis appeared in?" },
  { role: "assistant", text: null, calls: [{ name: "list_tables", args: { reason: "Find tables related to actors and films to answer the question about Susan Davis." } }] },
  { role: "assistant", text: null, calls: [{ name: "describe_table", args: { table_name: "actor", reason: "Check columns of the actor table." } },
    { name: "describe_table", args: { reason: "Check columns of the film_actor table.", table_name: "film_actor" } }] },
  { role: "assistant", text: null, calls: [{ name: "run_sql", args: { reason: "Count the number of films Susan Davis has appeared in.", query: COUNT } }] },
  { role: "tool", text: `{"columns": ["film_count"], "rows": [["54"]], "truncated": false}` },
  { role: "assistant", text: "Susan Davis has appeared in **54** films." },
];
const REASON_RUNS = { runs: 6, wrong: 4 };
const THINK = {
  runs: 3, right: 3, thoughts: [668, 790, 632], said: 454,
  before: { title: "My Thought Process for Querying Susan Davis's Filmography",
    text: "…the very first thing I need to establish is whether an actor by that name even exists within our database. It would be quite inefficient to proceed with crafting a query if the foundational element – the actor themselves – isn't present…" },
  call: "SELECT * FROM actor WHERE first_name ILIKE 'Susan' AND last_name ILIKE 'Davis'",
  after: { title: "Addressing Potential Name Duplication in the Actor Database",
    text: "My immediate thought upon encountering \"Susan Davis\" was a flicker of surprise – were there truly two actors with that exact name in the system?…" },
  drift: "…I'll also need the release_year to understand when it came out, and likely a genre to categorize it…",
};

const steps = [
  { stop: "In the list", title: "A thought the schema asks for is text in the list",
    note: `Each tool gets one more required argument, <code>reason</code>. The model must fill it to make the call, so every call arrives with a sentence. It is an ordinary argument: it sits in the message list, your code can print it, and it is sent again with every later request.` },
  { stop: "What it said", title: "The reasons said what it did, not what it assumed",
    note: `“Count the number of films Susan Davis has appeared in” restates the question. The assumption that one name is one person never appears. With the argument required, ${REASON_RUNS.wrong} of ${REASON_RUNS.runs} runs still answered 54.` },
  { stop: "Inside a call", title: "Thinking happens inside one call, before the reply",
    note: `With thinking switched on, the model writes tokens you never receive, then its reply. You get their count (<code>thoughts_token_count</code>, billed as output), a summary if you ask for one (<code>include_thoughts</code>), and a signature: an encrypted blob on the reply that must go back in the list, or the next request fails.` },
  { stop: "What it showed", title: "The summary names the choice, and the choice changed", decisive: true,
    note: `At <code>thinking_level="high"</code> all ${THINK.right} runs first asked whether such an actor exists, saw two rows, and answered with both. A summary is the model's account of its thinking, not a record: one summary described a <code>genre</code> column that Pagila does not have. Check it against the calls.` },
  { stop: "Two meanings", title: "Two meanings of “thought”",
    note: `One is text the model writes into your list, at the price of a few output tokens. The other is work inside one call, which you pay for in full and see only as a summary. Both are words written by the model. Neither proves that the model reasoned the way it says.` },
];

// The list as stack() draws it, with every `reason` argument's text lit.
const lit = (html) => html.replace(/("reason": ")([^"]*)(")/g, `$1<mark class="why">$2</mark>$3`);

const quote = (kicker, title, text, cls = "") => `<div class="quote ${cls}"><i>${kicker}</i><b>${esc(title)}</b><p>${esc(text)}</p></div>`;

const BACK = [
  ["summary", "<code>part.thought = True</code>", "only with <code>include_thoughts=True</code>", "on"],
  ["signature", "<code>function_call</code><em>+</em><code>thought_signature</code>", "encrypted; send it back as it came", "hot"],
  ["count", "<code>usage_metadata.thoughts_token_count</code>", "how much thinking you paid for", ""]];
const comesBack = () => `<p class="cap" style="margin-top:20px">What comes back</p><div class="parts">${BACK.map(([tag, what, why, tone]) =>
  `<div class="part"><span class="tag ${tone}">${tag}</span><div><div class="what">${what}</div><div class="why2">${why}</div></div></div>`).join("")}</div>`;

function inside() {
  const lane = `<div class="lane"><span>you send</span><span class="hotc">you never receive</span><span class="acc">comes back</span></div>`;
  return `<div class="cols" style="--cols:minmax(0,1.5fr) minmax(0,1fr)">${zone("One request, as the model spends it", strip([
    ["the list", "prompt tokens", "base", 3], ["thinking", "hidden · billed as output", "res", 3], ["the reply", "a call or an answer", "said", 2.4]])
    + lane + comesBack(), "on")}
    ${zone("The setting, on this model", `<pre>types.ThinkingConfig(
    thinking_level="high",
    include_thoughts=True)</pre><p class="small" style="margin-top:12px;line-height:1.5">levels: minimal (the default here: no thinking), low, medium, high. The older <code>thinking_budget</code> also works; the two cannot be set together.</p>`)}</div>`;
}

function showed() {
  const avg = Math.round(THINK.thoughts.reduce((a, b) => a + b, 0) / THINK.thoughts.length);
  return `<div class="cols" style="--cols:minmax(0,1.5fr) minmax(0,1fr)"><div class="flow">
    ${quote("summary · before the query", THINK.before.title, THINK.before.text, "on")}
    <div class="call"><span class="fn">run_sql</span><span class="args">${esc(THINK.call)}</span></div>
    ${quote("summary · after the query", THINK.after.title, THINK.after.text, "ok")}
    ${quote("check it against the calls", "A summary that drifted", THINK.drift, "hot")}</div>
    ${zone("Three runs at high", `<div style="display:grid;gap:18px">${stat(`${THINK.right} of ${THINK.runs}`, "found both actors", "okc")}
      ${stat(fmt(avg), "thinking tokens a run, on average", "hotc")}${stat(fmt(THINK.said), "tokens of calls and answer, in run 1")}</div>`)}</div>
    ${src(`run 1 of three, recorded 2026-11-23 with ${MODEL}; summaries cut where marked …`)}`;
}

const ROWS = [["", "a required argument", "thinking inside a call"], ["where it lives", "in the list, as text", "inside one request; a signature in the list"],
  ["who reads it", "your code, the model on every later turn", "you, as a summary, if you ask"], ["what it costs", "a few output tokens a call", "every thinking token, as output"],
  ["here, it…", "restated the task; 4 of 6 runs still said 54", "checked first; 3 of 3 runs found both actors"]];
const cell = (c, i, j) => (i ? `<td>${c}</td>` : `<th class="${["", "acc", "hotc"][j]}">${c}</th>`);
const compare = () => zone("Two meanings of “thought”", `<table class="cmp">${ROWS.map((r, i) => `<tr>${r.map((c, j) => cell(c, i, j)).join("")}</tr>`).join("")}</table>`);

function view(step, at) {
  if (at === 0) return zone(`The message list of a run with <code>reason</code> required`, lit(stack(REASONED, 4, [1, 2, 3])));
  if (at === 1) return zone(`The same run, to the end`, lit(stack(REASONED, 6, [3, 5]))) + src(`recorded 2026-11-23 with ${MODEL}; one of the four runs that answered 54`);
  if (at === 2) return inside();
  if (at === 3) return showed();
  return compare();
}

const css = CSS + `
.lw .ag1 mark.why { background:var(--accent-bg); color:var(--accent); font-weight:600; border-radius:4px; padding:0 3px; }
.lw .ag1 .flow { display:grid; gap:10px; }
.lw .ag1 .quote { padding:10px 14px; border-radius:10px; background:var(--cell); border-left:4px solid var(--mute); animation:lw-in .4s both; }
.lw .ag1 .quote i { display:block; font-style:normal; font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); margin-bottom:3px; }
.lw .ag1 .quote b { display:block; font-size:14px; margin-bottom:4px; } .lw .ag1 .quote p { font-size:14.5px; line-height:1.5; color:var(--ink); }
.lw .ag1 .quote.on { border-left-color:var(--accent); background:var(--accent-bg); } .lw .ag1 .quote.ok { border-left-color:var(--ok); }
.lw .ag1 .quote.hot { border-left-color:var(--hot); } .lw .ag1 .quote.hot i { color:var(--hot); }
.lw .ag1 .flow > :nth-child(2) { animation-delay:.12s; } .lw .ag1 .flow > :nth-child(3) { animation-delay:.24s; } .lw .ag1 .flow > :nth-child(4) { animation-delay:.36s; }
.lw .ag1 .lane { display:grid; grid-template-columns:3fr 3fr 2.4fr; gap:4px; margin-top:6px; font-size:12px; text-align:center; color:var(--mute); }
.lw .ag1 .parts { display:grid; gap:8px; }
.lw .ag1 .part { display:grid; grid-template-columns:88px minmax(0,1fr); gap:12px; align-items:center; padding:9px 12px; border-radius:9px; background:var(--cell); animation:lw-in .4s both; }
.lw .ag1 .part:nth-child(2) { animation-delay:.1s; } .lw .ag1 .part:nth-child(3) { animation-delay:.2s; }
.lw .ag1 .part .tag { justify-self:start; padding:2px 9px; border-radius:999px; font:600 12px ui-monospace, Menlo, monospace; background:var(--panel); color:var(--mute); }
.lw .ag1 .part .tag.on { background:var(--accent-bg); color:var(--accent); } .lw .ag1 .part .tag.hot { background:var(--hot-bg); color:var(--hot); }
.lw .ag1 .part .what { font:14px ui-monospace, Menlo, monospace; overflow-wrap:anywhere; }
.lw .ag1 .part .what code { background:none; padding:0; font-size:14px; }
.lw .ag1 .part .what em { font-style:normal; color:var(--mute); margin:0 8px; }
.lw .ag1 .part .why2 { font-size:13px; color:var(--mute); margin-top:2px; } .lw .ag1 .part .why2 code { font-size:12px; }
.lw .ag1 table.cmp { width:100%; border-collapse:collapse; font-size:15px; }
.lw .ag1 table.cmp th { text-align:left; font-size:12px; letter-spacing:.06em; text-transform:uppercase; padding:4px 12px 10px 0; }
.lw .ag1 table.cmp td { padding:10px 12px 10px 0; border-top:1px solid var(--line); vertical-align:top; line-height:1.45; }
.lw .ag1 table.cmp td:first-child { color:var(--mute); width:18%; }
.lw .ag1 table.cmp tr:last-child td { font-weight:600; }
`;

export default widget({ label: "Two meanings of thought", css, steps, view });
