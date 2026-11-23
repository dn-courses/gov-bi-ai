// agc-grow — the list grows every turn and is sent whole every time. Two questions to the SQL agent
// on Pagila, one bar per request to one scale: the first request, every tool result carried along,
// and everything else; then where the billed input went, and the rows the model typed out again.
import { fmt, widget, zone } from "./ag1-lib.js";
import { CSS, key, reqBar, reqBars, src, stat } from "./agc-lib.js";

// RECORDED 2026-11-23 with gemini-3.5-flash-lite: the cells of content/agents/20-conversation-history
// run end to end (scratch rec20.py). input = usage_metadata.prompt_token_count, out =
// candidates_token_count, result = count_tokens of the tool results that request asked for.
const MODEL = "gemini-3.5-flash-lite";
const RUN = [
  { input: 117, out: 10, asked: "list_tables", result: 56 },
  { input: 184, out: 74, asked: "describe_table × 4", result: 338 },
  { input: 584, out: 126, asked: "run_sql", result: 59 },
  { input: 766, out: 64, asked: "answer" },
  { input: 843, out: 18, asked: "describe_table", result: 121 },
  { input: 979, out: 30, asked: "run_sql · 20 rows, every column", result: 2075 },
  { input: 3081, out: 2120, asked: "answer: the 20 rows, typed out" },
];
const PRICE = { input: 0.30, output: 2.50 }; // USD per 1M tokens, Vertex AI global, checked 2026-11-23

const HEAD = RUN[0].input;
const carried = RUN.map((_, n) => RUN.slice(0, n).reduce((a, r) => a + (r.result ?? 0), 0));
const billed = RUN.reduce((a, r) => a + r.input, 0), out = RUN.reduce((a, r) => a + r.out, 0);
const results = carried.reduce((a, b) => a + b, 0), heads = HEAD * RUN.length, rest = billed - heads - results;
const pct = (n) => `${Math.round((100 * n) / billed)}%`;
const usd = (n, per) => `$${((n * per) / 1e6).toFixed(4)}`;

const steps = [
  { stop: "Request 1", title: "The first request: system prompt, tool schemas, the question",
    note: `<b>${HEAD} tokens</b>. The model asks for <code>list_tables</code>. Your code runs it and appends the call and its result to the list.` },
  { stop: "Question 1", title: "Every result stays in the list, and the list is sent whole",
    note: `Four requests to answer “Which three film categories brought in the most rental revenue?”. The four table descriptions came back as ${RUN[1].result} tokens, and every later request carried them again.` },
  { stop: "A follow-up", title: "One wide result, and the next request triples",
    note: `“Show me the 20 most recent rentals, every column.” Twenty rows came back as <b>${fmt(RUN[5].result)} tokens</b>. Request 7 carried everything before it: <b>${fmt(RUN[6].input)}</b>.` },
  { stop: "The bill", title: "Where the billed input went", decisive: true,
    note: `${RUN.length} requests, <b>${fmt(billed)} input tokens</b>. Tool results, carried from request to request, were <b>${pct(results)}</b> of it. The first request, sent again every time, was ${pct(heads)}.` },
  { stop: "Typed out", title: "The same rows, paid for a second time",
    note: `The model then typed the twenty rows into its answer: ${fmt(RUN[6].out)} output tokens. Output costs about eight times as much as input, so this run's output cost more than all of its input.` },
];

const bars = (upto) => reqBars(RUN.slice(0, upto).map((r, n) => reqBar(`request ${n + 1}`,
  [[HEAD, "base"], [carried[n], "res"], [r.input - HEAD - carried[n], "said"]], RUN[upto - 1].input,
  { text: fmt(r.input), note: `→ ${r.asked}`, cls: n === upto - 1 ? "on" : "" })), true);
const KEY = key([["", "request 1: system prompt, tool schemas, question"], ["res", "tool results, carried along"], ["said", "the model's calls, answers, the next question"]]);

const share = () => zone(`${fmt(billed)} input tokens, ${RUN.length} requests`, reqBars([reqBar("all input", [[heads, "base"], [results, "res"], [rest, "said"]], billed)])
  + `<div class="cols" style="--cols:1fr 1fr 1fr;margin-top:14px">${stat(pct(results), `tool results · ${fmt(results)} tokens`, "hotc")}${
    stat(pct(heads), `request 1, ${RUN.length} times · ${fmt(heads)}`)}${stat(pct(rest), `everything else · ${fmt(rest)}`, "acc")}</div>` + KEY);

const typed = () => `<div class="cols">${zone("Tokens", reqBars([reqBar("input", [[billed, "base"]], billed), reqBar("output", [[out - RUN[6].out, "said"], [RUN[6].out, "res"]], billed)])
  + key([["", "everything sent"], ["said", "calls and the first answer"], ["res", "the 20 rows, typed out"]]))}
  ${zone(`At list price, ${MODEL}`, `<div style="display:grid;gap:12px">${stat(usd(billed, PRICE.input), `${fmt(billed)} input tokens at $${PRICE.input.toFixed(2)} per million`)}${
    stat(usd(out, PRICE.output), `${fmt(out)} output tokens at $${PRICE.output.toFixed(2)} per million`, "hotc")}</div>`)}</div>`;

function view(step, at) {
  const src1 = src(`one run recorded 2026-11-23 with ${MODEL}; the counts are the API's own`);
  if (at === 3) return share() + src1;
  if (at === 4) return typed() + src1;
  const upto = [1, 4, 7][at];
  return zone("Input tokens of each request, and what the model asked for next", bars(upto) + KEY) + src1;
}

const css = CSS + `
.lw .ag1 .rq .r.on .val { color:var(--accent); }
.lw .ag1 .rq .r:last-child .seg { animation-delay:.1s; }
`;

export default widget({ label: "What every request carries", css, steps, view });
