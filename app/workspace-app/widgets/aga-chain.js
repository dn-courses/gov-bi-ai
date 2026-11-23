// aga-chain — the hand-written loop on Gemini, on a question that needs two tools in order:
// (12 + 8) * 3. The list and the sequence diagram change together, one turn or one tool run a step.
// Then what the model saw, several calls in one turn, and the cap.
import { bar, code, tooldef, widget, zone } from "./ag1-lib.js";
import { GCSS, RECORDED_WITH, fcall, fresp, gmsg, gpanes } from "./aga-lib.js";

const TOOLS = [
  { name: "add", description: "Add two integers. Returns the integer sum.", params: [["a", "integer"], ["b", "integer"]] },
  { name: "multiply", description: "Multiply two integers. Returns the integer product.", params: [["a", "integer"], ["b", "integer"]] },
];

// RECORDED on 2026-11-23 with gemini-3.5-flash-lite: the page's own cells, one run (scratch
// recording rec1); 6 runs of 6 in scratch e5 chained the same way, one call a turn. `tokens`:
// prompt_token_count of each of the three calls. `both`: the independent question, 2 runs of 2:
// two function_call parts in one model message (only the first carries the thought_signature).
// Ids shortened: the API's are "call_" and 19 digits.
const RECORDED = {
  first: { name: "add", args: { b: 8, a: 12 }, id: "call_1" },
  second: { name: "multiply", args: { a: 20, b: 3 }, id: "call_2" },
  answer: "(12 + 8) * 3 = 60",
  tokens: [97, 115, 133],
  both: [{ name: "add", args: { a: 3, b: 4 }, id: "call_3" }, { name: "multiply", args: { b: 6, a: 5 }, id: "call_4" }],
  bothAnswer: "3 + 4 is 7, and 5 * 6 is 30.",
};
const R = RECORDED;

const LIST = [
  { role: "user", text: "What is (12 + 8) * 3?" },
  { role: "model", calls: [R.first] },
  { role: "user", resps: [{ name: "add", response: { result: 20 }, id: "call_1" }] },
  { role: "model", calls: [R.second] },
  { role: "user", resps: [{ name: "multiply", response: { result: 60 }, id: "call_2" }] },
  { role: "model", text: R.answer },
];
const CFG = ["system_instruction", "tools: add, multiply"];

// [step it appears on, from party, to party, label]: 0 the person, 1 your code, 2 the model, 3 a tool
const EVENTS = [
  [2, 0, 1, "the question"], [2, 1, 2, "the list · 1 message"], [2, 2, 1, "function_call: add"],
  [3, 1, 3, "add(12, 8)"], [3, 3, 1, "20"],
  [4, 1, 2, "the list · 3 messages"], [4, 2, 1, "function_call: multiply"],
  [5, 1, 3, "multiply(20, 3)"], [5, 3, 1, "60"],
  [6, 1, 2, "the list · 5 messages"], [6, 2, 1, "text: no function call"], [6, 1, 0, "the answer"],
];

const CSS = GCSS + `
.lw .ag1 .expr { display:flex; flex-wrap:wrap; align-items:center; gap:10px 18px; }
.lw .ag1 .expr .q { font:700 34px/1.1 ui-monospace, Menlo, monospace; }
.lw .ag1 .expr .q u { text-decoration:none; padding:0 6px; border-radius:8px; background:var(--accent-bg); color:var(--accent); }
.lw .ag1 .order { display:flex; gap:8px; align-items:center; font:14px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .ag1 .order b { padding:3px 10px; border-radius:999px; background:var(--cell); color:var(--ink); }
.lw .ag1 .tl { display:grid; gap:8px; }
.lw .ag1 .tl > div { display:grid; grid-template-columns:64px 1fr; gap:10px; align-items:center; }
.lw .ag1 .tl .t { font:600 13px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .ag1 .tl .none { padding:6px 10px; border-radius:8px; border:1.5px dashed var(--hot); color:var(--hot); font:14px ui-monospace, Menlo, monospace; }
.lw .ag1 .seen .bar { grid-template-columns:56px 1fr 52px; }
.lw .ag1 .after { margin-top:10px; padding:8px 12px; border-radius:8px; background:var(--cell); font-size:15px; }
`;

const steps = [
  { stop: "Two tools", title: "A question that needs two tools, in order",
    note: `The second call needs the first one's result. That is what makes the loop go round more than once.` },
  { stop: "The code", title: "The loop in three pieces",
    note: `<code>call_model</code> sends the list, <code>run_calls</code> answers every call of one turn in one message, <code>run_agent</code> goes round until a message has no call, or the cap.` },
  { stop: "Turn 0", title: "Turn 0: the model asks for <code>add</code>", n: 2, fresh: [1], state: "thinking",
    note: `It cannot multiply yet: it does not have the sum. So it asks for the one step it can take.` },
  { stop: "20", title: "Your code runs it: 20 joins the list", n: 3, fresh: [2], state: "acting",
    note: `The result goes back as a function response, and the loop goes round.` },
  { stop: "Turn 1", title: "Turn 1: the 20 it just read becomes an argument", n: 4, fresh: [3], state: "thinking", decisive: true,
    note: `This is the chain. The model runs nothing; it chooses, one step at a time, what your Python runs next, from what is in the list.` },
  { stop: "60", title: "Your code runs it: 60 joins the list", n: 5, fresh: [4], state: "acting",
    note: `Five messages now, and the model has written none of the numbers that matter.` },
  { stop: "Turn 2", title: "Turn 2: no function call, so the loop returns", n: 6, fresh: [5], state: "done",
    note: `Three calls to the model, two to tools, six messages.` },
  { stop: "Seen", title: "Everything the model saw: the config and the list",
    note: `No hidden scratchpad sits beside them. When an agent misbehaves, print the list and read it top to bottom: the failure is in there.` },
  { stop: "Several", title: "Several calls in one turn",
    note: `Asked two independent things, the model put <b>two calls in one message</b>. Gemini has no switch to stop that, so the loop answers them all: one <code>user</code> message, one response per call, in the same order, each with its call's id.` },
  { stop: "The cap", title: "The cap, in code",
    note: `With <code>max_turns=2</code> the same question runs out of turns one short of its answer: the loop raises instead of going round for ever. A real cap sits well above what a good run needs.` },
];

function question() {
  return zone("The question", `<div class="expr"><span class="q"><u>(12 + 8)</u> * 3</span>
      <span class="order"><b>add</b>first, then<b>multiply</b></span></div><p class="small" style="margin-top:10px">neither tool answers it alone</p>`, "on")
    + zone("The declarations", `<div class="cols">${TOOLS.map((t) => tooldef(t)).join("")}</div>`);
}

function seen() {
  const max = R.tokens.at(-1) * 1.1;
  return `<div class="cols" style="--cols:minmax(0,1fr) minmax(0,1fr)">${zone(`contents · ${LIST.length} items`, `<div class="stack">${LIST.map((m) => gmsg(m)).join("")}</div>`)}
    ${zone("Tokens in, call by call", `<div class="bars seen">${R.tokens.map((t, i) => bar(`call ${i + 1}`, t, max, undefined, i === 2 ? "hot" : "")).join("")}</div>
      <p class="small" style="margin-top:10px">prompt_token_count of each call · recorded, ${RECORDED_WITH}</p>`, "on")}</div>`;
}

function several() {
  return `<div class="cols">
    ${zone("One model message, two function_call parts", gmsg({ role: "model", calls: R.both }) + `<p class="small" style="margin-top:10px">recorded, 2 runs of 2 · the thought_signature rides on the first part only</p>`, "on")}
    ${zone("One user message back, two responses, same order", `<div class="stack">${fresp({ name: "add", response: { result: 7 }, id: "call_3" })}${fresp({ name: "multiply", response: { result: 30 }, id: "call_4" })}</div>
      <p class="after">then: “${R.bothAnswer}”</p>`, "ok")}</div>`;
}

function capped() {
  return `<div class="cols">${zone("max_turns=2", `<div class="tl">
      <div><span class="t">turn 0</span>${fcall(R.first)}</div>
      <div><span class="t">turn 1</span>${fcall(R.second)}</div>
      <div><span class="t">turn 2</span><span class="none">never runs</span></div></div>
      <p class="small" style="margin-top:10px">the answer would have come on turn 2, and there is none</p>`)}
    ${zone("The loop raises", `<pre>RuntimeError: agent did not finish in 2 turns</pre>`, "hot")}</div>`;
}

const LOOP = [
  "for turn in range(max_turns):",
  "    reply, calls = call_model(contents)",
  "    contents.append(reply)",
  "    if not calls:",
  "        return text of reply, contents",
  "    contents.append(run_calls(calls))",
  "raise RuntimeError(\"agent did not finish\")"];

function view(step, at) {
  if (at === 0) return question();
  if (at === 1) return zone("run_agent", code(LOOP, [1, 5]), "on");
  if (at === 7) return seen();
  if (at === 8) return several();
  if (at === 9) return capped();
  return gpanes(LIST, EVENTS, step, at, CFG);
}

export default widget({ label: "The loop chains two tools", css: CSS, steps, view });
