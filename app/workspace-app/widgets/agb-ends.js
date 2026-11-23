// agb-ends — the three ways a call ends: an answer, a tool call, or a stop. What each looks like
// on the response, the stop that matters most to code (cut short), and the order code checks them.
import { code, cols, esc, rows, verdict, widget, zone } from "./agb-lib.js";

// RECORDED 2026-11-23, gemini-3.5-flash-lite: the page's `ending` cell, one call per setting, the
// TopSpender schema in all three (scratch run e7, the page's code).
const RUNS = {
  answer: { finish: "STOP", text: '{"customer_id": 526, "name": "KARL SEAL", "total": 221.55}', parsed: "TopSpender(customer_id=526, name='KARL SEAL', total=221.55)" },
  tool: { finish: "STOP", call: "customer_rentals({'customer_id': 526})", parsed: "None" },
  stop: { finish: "MAX_TOKENS", text: "'Here is the'", parsed: "None", out: 4 },
};
const ENDING = [
  "def ending(reply):",
  "    if not reply.candidates:",
  "        return f\"stopped before it began: {reply.prompt_feedback.block_reason}\"",
  "    finish = reply.candidates[0].finish_reason",
  "    if reply.function_calls:",
  "        return f\"a tool call: ...\"",
  "    if finish != types.FinishReason.STOP:",
  "        return f\"a stop: {finish.name} ...\"",
  "    return f\"an answer: {reply.parsed!r}\"",
];

const css = `
.lw .agb .end h5 { margin:0 0 12px; font-size:19px; display:flex; align-items:center; gap:10px; }
.lw .agb .end h5::before { content:""; width:10px; height:10px; border-radius:50%; background:currentColor; }
.lw .agb .zone.ok .end h5 { color:var(--ok); } .lw .agb .zone.on .end h5 { color:var(--accent); } .lw .agb .zone.hot .end h5 { color:var(--hot); }
.lw .agb .end dl { display:grid; gap:10px; margin:0; }
.lw .agb .end dt { font:600 12px ui-monospace, Menlo, monospace; color:var(--mute); margin-bottom:3px; }
.lw .agb .end dd { margin:0; padding:6px 10px; border-radius:7px; background:var(--cell); font:14px/1.45 ui-monospace, Menlo, monospace; overflow-wrap:break-word; }
.lw .agb .end dd.ok { color:var(--ok); } .lw .agb .end dd.hot { color:var(--hot); } .lw .agb .end dd.acc { color:var(--accent); }
.lw .agb .cols > .zone:has(.end) { animation:lw-in .4s both; } .lw .agb .cols > .zone:has(.end):nth-child(2) { animation-delay:.15s; } .lw .agb .cols > .zone:has(.end):nth-child(3) { animation-delay:.3s; }
.lw .agb pre.sdk { font-size:13px; white-space:pre; overflow-x:auto; }
`;

const card = (title, cls, items) => zone("", `<div class="end"><h5>${title}</h5><dl>${items.map(([k, v, tone = ""]) => `<div><dt>${k}</dt><dd class="${tone}">${esc(v)}</dd></div>`).join("")}</dl></div>`, cls);

const VIEWS = [
  () => cols([
    card("An answer", "ok", [["finish_reason", RUNS.answer.finish], ["text", RUNS.answer.text], ["parsed", RUNS.answer.parsed, "ok"]]),
    card("A tool call", "on", [["finish_reason", RUNS.tool.finish], ["function_calls", RUNS.tool.call, "acc"], ["parsed", RUNS.tool.parsed]]),
    card("A stop", "hot", [["finish_reason", RUNS.stop.finish, "hot"], ["text", RUNS.stop.text], ["parsed", RUNS.stop.parsed, "hot"]]),
  ]),
  () => `${cols([zone("asked with the schema and max_output_tokens=8", `<pre>text          ${esc(RUNS.stop.text)}
finish_reason ${RUNS.stop.finish}
parsed        ${RUNS.stop.parsed}</pre>`, "hot"), zone("what the SDK does when the text does not validate", `<pre class="sdk">try:
    result.parsed = response_schema.model_validate_json(result_text)
except pydantic.ValidationError:
    pass</pre><p class="small" style="margin-top:8px">google-genai 2.34.0, types.py: no exception, no log</p>`)], "minmax(0,.75fr) minmax(0,1.25fr)")}${
    verdict("Cut short, the text was not even the start of the JSON. <code>parsed</code> is simply <code>None</code>, so read <code>finish_reason</code> first.", "hot")}`,
  () => `${zone("check in this order", code(ENDING, [1, 4, 6, 8]))}${zone("the stops, by finish_reason", rows(["value", "means"], [
    [["STOP", "m ok"], "finished: an answer or a tool call"], [["MAX_TOKENS", "m hot"], "the output limit came first"],
    [["SAFETY · PROHIBITED_CONTENT · …", "m hot"], "the answer was withheld"], [["no candidates", "m hot"], "the prompt itself was blocked: <code>prompt_feedback.block_reason</code>"]]))}`,
];

const steps = [
  { stop: "Three endings", title: "A call ends in one of three ways",
    note: `An answer, a request for a tool, or a stop before either. The schema shapes only the first: a tool call carries its own arguments, and a stop carries nothing to parse.` },
  { stop: "Cut short", title: "A stop leaves nothing to parse", decisive: true,
    note: `With the output limit at 8 tokens, the recorded reply was four tokens of English. The SDK tries to validate it, fails, and leaves <code>parsed</code> empty without a word.` },
  { stop: "In order", title: "Code that reads an answer checks the other two first",
    note: `Gemini has no refusal field: a withheld answer is a stop with its own <code>finish_reason</code>, and a blocked prompt returns no candidate at all.` },
];

export default widget({ label: "Three ways a call ends", css, steps, view: (s, at) => VIEWS[at]() });
