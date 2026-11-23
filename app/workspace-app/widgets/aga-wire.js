// aga-wire — one round trip of Gemini function calling, as code: the declaration you write, the
// tokens it costs, why automatic function calling is switched off, the function_call part that
// comes back, the function_response part that goes back (same id), and the answer.
import { bar, beside, tooldef, widget, zone } from "./ag1-lib.js";
import { GCSS, chatOfContents, config, gmsg, gstack, gtalk, stats } from "./aga-lib.js";

const ADD = { name: "add", description: "Add two integers. Returns the integer sum.",
  params: [["a", "integer", "First addend."], ["b", "integer", "Second addend."]] };

// RECORDED on 2026-11-23 with gemini-3.5-flash-lite: the page's own cells, one run (scratch
// recording rec1). `weight`: prompt_token_count of "Hi." alone, with add declared, with add and
// multiply. `afc`: the hidden loop's automatic_function_calling_history (user text, model call,
// user response). `tokens`: prompt_token_count of the first and the second call.
const RECORDED = {
  weight: { bare: 2, one: 40, two: 68 },
  call: { name: "add", args: { b: 25, a: 17 }, id: "call_8082887083924628597" },
  answer: "17 + 25 = 42",
  afc: 3, tokens: { first: 55, second: 74 },
};
const R = RECORDED;

const LIST = [
  { role: "user", text: "What is 17 + 25?" },
  { role: "model", calls: [R.call] },
  { role: "user", resps: [{ name: "add", response: { result: 42 }, id: R.call.id }] },
  { role: "model", text: R.answer },
];
const CFG = ["system_instruction", "tools: add", "automatic_function_calling: off"];

const CSS = GCSS + `
.lw .ag1 .parts { display:grid; gap:8px; }
.lw .ag1 .parts > div { display:grid; grid-template-columns:1fr; gap:2px; padding:8px 12px; border-radius:10px; background:var(--cell); }
.lw .ag1 .parts b { font:600 15px ui-monospace, Menlo, monospace; color:var(--accent); }
.lw .ag1 .parts span { font-size:15px; }
.lw .ag1 .sdk { font:700 22px/1.3 ui-monospace, Menlo, monospace; margin:12px 0; padding:10px 14px; border-radius:10px; background:var(--cell); }
.lw .ag1 .hidden { display:flex; gap:6px; margin:10px 0 4px; }
.lw .ag1 .resobj .stat b { font-size:17px; padding-top:2px; }
.lw .ag1 .hidden span { flex:1; height:10px; border-radius:5px; background:var(--hot); opacity:.55; }
`;

const steps = [
  { stop: "Declare", title: "A tool is declared: a name, a description, a schema",
    note: `A <code>FunctionDeclaration</code> is data, not code. No function exists on the model's side; the description is what it reads to decide <b>when</b> to call, the schema is the shape of the arguments.` },
  { stop: "It travels", title: "The declarations travel inside the prompt, and are billed",
    note: `They go in the config, and the model reads them as text with everything else: on every call, used or not. ${R.weight.one - R.weight.bare} tokens for one small tool.` },
  { stop: "Yours", title: "Automatic function calling off: the loop stays yours", decisive: true,
    note: `Pass the SDK a Python function and it runs the loop itself, inside one call: you get the answer, never the request. Pass a declaration and <code>disable=True</code>, and the request comes back to your code.` },
  { stop: "Comes back", title: "What comes back: a function_call part", n: 2, fresh: [1],
    note: `No text this time. The model message holds a <code>function_call</code> part: a <b>name</b>, the <b>args</b> already parsed into a dict, and an <b>id</b>. Beside it rides a <code>thought_signature</code>.` },
  { stop: "Goes back", title: "What goes back: the call kept, and a function_response with its id", n: 3, fresh: [2], link: [1, 2],
    note: `Append the model's message exactly as it came, signature included. Then a <code>user</code> message with a <code>function_response</code>: the call's name and id, and the result as a dict.` },
  { stop: "Answer", title: "The answer: a message with no function call", n: 4, fresh: [3],
    note: `Called again with the longer list, the model answers in text and <code>function_calls</code> is <code>None</code>. ${R.tokens.first} tokens in on the first call, ${R.tokens.second} on the second.` },
];

const field = (name, text) => `<div><b>${name}</b><span>${text}</span></div>`;

function declare() {
  return `<div class="cols" style="--cols:minmax(0,1fr) minmax(0,1.1fr)">${zone("types.FunctionDeclaration", tooldef(ADD, "on"), "on")}
    ${zone("What each part is for", `<div class="parts">
      ${field("name", "what the model writes to ask for it")}${field("description", "when to use it, written for a colleague")}
      ${field("parameters_json_schema", "JSON Schema of the arguments")}</div>
      <p class="small" style="margin-top:10px">wrapped as <code>types.Tool(function_declarations=[ADD])</code> and passed in the config's <code>tools</code></p>`)}</div>`;
}

function weight() {
  const w = R.weight, max = w.two * 1.05;
  return zone(`prompt_token_count for “Hi.” · recorded, the API's own count`, `<div class="bars">
    ${bar("“Hi.” alone", w.bare, max)}${bar("+ add", w.one, max, undefined, "hot")}${bar("+ add, multiply", w.two, max, undefined, "hot")}</div>
    <p class="small" style="margin-top:10px">sent again on every call of every conversation that declares them</p>`);
}

function yours() {
  const hidden = `<div class="hidden">${Array.from({ length: R.afc }, () => "<span></span>").join("")}</div>`;
  return `<div class="cols">
    ${zone("tools=[add] · a Python function", `<p>the SDK calls the model, runs <code>add</code>, calls again</p>
      <p class="sdk">→ “${R.answer}”</p>${hidden}
      <p class="small">${R.afc} messages went back and forth inside one call; your code held none of them</p>`, "hot")}
    ${zone("a declaration + disable=True", `<p>the model's request comes back to you</p>
      <div style="margin-top:12px">${gmsg(LIST[1])}</div>
      <p class="small" style="margin-top:10px">you decide, run, append and call again: the loop is yours</p>`, "ok")}</div>`;
}

// Under the list: on "Comes back", what the response object holds.
function extra(at) {
  if (at === 3) return `<div class="resobj" style="margin-top:10px">${stats([["response.text", "None"], ["parts", "function_call + thought_signature", true]])}</div>`;
  return "";
}

function view(step, at) {
  if (at === 0) return declare();
  if (at === 1) return weight();
  if (at === 2) return yours();
  const chat = gtalk(chatOfContents(LIST, step.n), { open: at === 3 ? [1] : [] });
  return beside(chat, zone(`<b>contents</b> · the list your code holds · ${step.n} items`, config(CFG) + gstack(LIST, step.n, step.fresh, step.link) + extra(at), "on"));
}

export default widget({ label: "One round trip, in code", css: CSS, steps, view });
