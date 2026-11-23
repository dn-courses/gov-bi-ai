// agb-fail — a tool fails. Raised, the exception leaves the tool, the loop and the program, and
// the person gets no answer. Returned as data with a hint, it is one more thing the model reads, and
// the model corrects its own call. Two panes: the conversation, and who sends what to whom.
import { callcap, cols, esc, json, sequence, talk, verdict, widget, zone } from "./agb-lib.js";

const Q = "How many films has Mary Smith rented?";
// RECORDED 2026-11-23, gemini-3.5-flash-lite: the page's loop cells (scratch run e3, the same
// code). With the raising tool the first call was rentals_of("Mary Smith") and the cell ended in
// the LookupError below. With the returning tool, two runs of two made exactly these calls and
// gave this answer.
const RECORDED = {
  first: { customer_name: "Mary Smith" },
  raised: `Traceback (most recent call last):
  …
LookupError: no customer named 'Mary Smith'`,
  error: { error: "no customer named 'Mary Smith'", hint: "names are stored in capitals, as 'FIRST LAST'" },
  second: { customer_name: "MARY SMITH" },
  result: { rentals: 32 },
  answer: "Mary Smith has rented 32 films.",
};
const R = RECORDED;

// [the step it appears on, from party, to party, label]; parties: person, your code, model, tool.
const EVENTS = [
  [0, 0, 1, "the question"], [0, 1, 2, "the list"], [0, 2, 1, 'rentals_of("Mary Smith")'], [0, 1, 3, "run it"],
  [1, 3, 1, "{error, hint}"], [1, 1, 2, "the list + the error"],
  [2, 2, 1, 'rentals_of("MARY SMITH")'], [2, 1, 3, "run it"], [2, 3, 1, '{"rentals": 32}'], [2, 1, 2, "the list + the result"],
  [2, 2, 1, "plain text"], [2, 1, 0, "the answer"],
];
const RAISED = [[0, 0, 1, "the question"], [0, 1, 2, "the list"], [0, 2, 1, 'rentals_of("Mary Smith")'], [0, 1, 3, "run it"], [0, 3, 1, "raises LookupError"]];

const chatOf = (at) => {
  const m = [{ role: "user", text: Q }];
  if (at === 0) return talk(m.concat([{ role: "tool", name: "rentals_of", args: R.first, result: "LookupError", error: true }]), { waiting: "no reply ever arrives: the program has stopped", open: [1] });
  m.push({ role: "tool", name: "rentals_of", args: R.first, result: json(R.error), error: true });
  if (at === 1) return talk(m, { open: [1] });
  return talk(m.concat([{ role: "tool", name: "rentals_of", args: R.second, result: json(R.result) }, { role: "assistant", text: R.answer }]), { open: [2] });
};

const VIEWS = [
  () => `${cols([chatOf(0), zone("who sends what to whom", sequence(RAISED, 0))], "minmax(0,1fr) minmax(0,1.15fr)")}${
    zone("your terminal", `<pre class="hotc">${esc(R.raised)}</pre>`, "hot")}`,
  () => cols([chatOf(1), zone("who sends what to whom", sequence(EVENTS.filter(([s]) => s <= 1), 1))], "minmax(0,1fr) minmax(0,1.15fr)"),
  () => cols([chatOf(2), zone("who sends what to whom", sequence(EVENTS, 2))], "minmax(0,1fr) minmax(0,1.15fr)"),
  () => `${cols([zone(callcap("the value", 'rentals_of("MARY SMITH")'), `<pre class="shape">${esc(json(R.result))}</pre>`, "ok"),
    zone(callcap("the failure", 'rentals_of("Mary Smith")'), `<pre class="shape">${esc(json(R.error))}</pre>`, "hot")], "minmax(0,.8fr) minmax(0,1.2fr)")}${
    verdict("Always a dict back, in one of two shapes: the value, or <code>error</code> with a <code>hint</code> that names the next move. Never an exception, never a bare sentence.")}`,
];

const css = `
.lw .agb pre.shape { font-size:15px; padding:12px 14px; }
.lw .agb pre.hotc { border-left:3px solid var(--hot); }
`;

const steps = [
  { stop: "Raise", title: "The tool raises: the loop dies with it",
    note: `Names in Pagila are stored in capitals, so <code>"Mary Smith"</code> matches no one. The exception leaves the tool, the loop and the cell. The model never hears what went wrong; the person gets no answer.` },
  { stop: "As data", title: "The tool returns its failure instead",
    note: `The tool catches its own failure and returns it as a result: what went wrong, and a <b>hint</b> for the next step. The loop sends it to the model like any other result.` },
  { stop: "Corrected", title: "The model corrects its own call", decisive: true,
    note: `In both recorded runs it called again with <code>"MARY SMITH"</code>, got 32, and answered. It could not have done that for an error it never saw.` },
  { stop: "One shape", title: "Success and failure share one shape",
    note: `The SDK's own description of a function response: use an <code>"output"</code> key for the result and an <code>"error"</code> key for what went wrong; without either, the whole dict is the output. The hint is written for the model, which takes it literally.` },
];

export default widget({ label: "Failures the model can read", css, steps, view: (s, at) => VIEWS[at]() });
