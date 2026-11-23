// agb-schema — a schema the model must follow. The Pydantic class becomes a JSON Schema that travels
// with the request, and the answer is written inside it: at each position only what the schema
// allows may follow. A diagram of mechanism; the "ruled out" continuations are examples of what a
// schema excludes, not recorded samples. The last step is the page's recorded parsed reply.
import { cols, esc, verdict, widget, zone } from "./agb-lib.js";

const CLASS = `class TopSpender(BaseModel):
    customer_id: int
    name: str
    total: float`;
const SCHEMA = `{
  "type": "object",
  "properties": {
    "customer_id": {"type": "integer"},
    "name":        {"type": "string"},
    "total":       {"type": "number"}
  },
  "required": ["customer_id", "name", "total"]
}`;
const CONFIG = `types.GenerateContentConfig(
    response_mime_type="application/json",
    response_schema=TopSpender)`;

const lit = (text, needle) => (needle ? esc(text).replace(esc(needle), `<mark>${esc(needle)}</mark>`) : esc(text));

const css = `
.lw .agb .out { font:600 20px/1.5 ui-monospace, Menlo, monospace; min-height:44px; padding:8px 14px; border-radius:10px; background:var(--cell); overflow-wrap:anywhere; }
.lw .agb .out .caret { display:inline-block; width:10px; height:22px; margin-left:2px; background:var(--accent); vertical-align:text-bottom; border-radius:2px; animation:agb-blink 1s steps(1) 3; }
@keyframes agb-blink { 50% { opacity:0; } }
.lw .agb .next { display:grid; gap:8px; margin-top:14px; }
.lw .agb .tokrow { display:grid; grid-template-columns:96px minmax(0, 1fr); gap:10px; align-items:center; }
.lw .agb .tokrow > i { font-style:normal; font:600 12px system-ui, sans-serif; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); }
.lw .agb .toks { display:flex; flex-wrap:wrap; gap:6px; }
.lw .agb .tk { padding:4px 10px; border-radius:6px; font:14px ui-monospace, Menlo, monospace; animation:lw-in .35s both; }
.lw .agb .tk.yes { background:var(--ok-bg); color:var(--ok); font-weight:600; }
.lw .agb .tk.no { background:var(--cell); color:var(--mute); text-decoration:line-through; }
.lw .agb .flow { display:grid; grid-template-columns:minmax(0,.8fr) auto minmax(0,1.3fr); gap:10px 12px; align-items:center; }
.lw .agb .flow pre { white-space:pre; overflow-x:auto; }
.lw .agb .flow .down { grid-column:1 / -1; justify-self:center; color:var(--accent); font-size:22px; line-height:1; }
.lw .agb .flow .wide { grid-column:1 / -1; }
.lw .agb .flow > .zone { animation:lw-in .4s both; } .lw .agb .flow > .zone:nth-of-type(2) { animation-delay:.15s; } .lw .agb .flow > .zone:nth-of-type(3) { animation-delay:.3s; }
@container (max-width: 760px) { .lw .agb .flow { grid-template-columns:1fr; } .lw .agb .flow .arrow { display:none; } }
`;

function writing({ so, yes, no, key, why }) {
  const toks = (list, cls) => list.map((t) => `<span class="tk ${cls}">${esc(t)}</span>`).join("");
  return cols([zone("the schema, sent with the request", `<pre>${lit(SCHEMA, key)}</pre>`),
    zone("the answer, as it is written", `<div class="out">${esc(so)}<span class="caret"></span></div>
      <div class="next"><div class="tokrow"><i>may follow</i><div class="toks">${toks(yes, "yes")}</div></div>
      <div class="tokrow"><i>ruled out</i><div class="toks">${toks(no, "no")}</div></div></div>
      <p class="verdict" style="margin-top:14px">${why}</p>`, "on")], "minmax(0,1fr) minmax(0,1.15fr)");
}

// RECORDED 2026-11-23, gemini-3.5-flash-lite: the page's response_schema cell (one run, scratch e7).
const PARSED = { text: '{"customer_id": 526, "name": "KARL SEAL", "total": 221.55}', type: "TopSpender", match: true };

const VIEWS = [
  () => `<div class="flow">${zone("a Pydantic class", `<pre>${esc(CLASS)}</pre>`)}<span class="arrow">→</span>${
    zone("becomes a JSON Schema", `<pre>${esc(SCHEMA)}</pre>`)}<span class="down">↓</span>${zone("sent in the request's config", `<pre>${esc(CONFIG)}</pre>`, "on wide")}</div>`,
  () => writing({ so: "", yes: ["{"], no: ["Sure", "The", "```json", "Here"],
    why: "The schema says <code>object</code>, so the only possible start is an opening brace. A greeting cannot be written." }),
  () => writing({ so: "{", key: '"customer_id"', yes: ['"customer_id"'], no: ['"id"', '"customer"', '"answer"'],
    why: "Only keys the schema names, however natural another would read." }),
  () => writing({ so: '{"customer_id": ', key: '{"type": "integer"}', yes: ["5", "1", "9", "-"], no: ['"526"', "null", '"KARL"', "five"],
    why: "Which digits is still the model's choice, and can be wrong. The <b>shape</b> is held; the <b>content</b> is not." }),
  () => cols([zone("response.text", `<pre>${esc(PARSED.text)}</pre>`), zone(`response.parsed · a ${PARSED.type}`,
    `<pre>TopSpender(customer_id=526, name='KARL SEAL', total=221.55)</pre>`, "ok")]) +
    verdict(`Read straight into the class. Checked against the database: ${PARSED.match ? "the same customer and total" : "different"}. That check stays yours.`, "ok"),
];

const steps = [
  { stop: "The schema", title: "The shape travels with the request",
    note: `A Pydantic class is the contract, written as Python. The SDK turns it into a JSON Schema and sends it with the request.` },
  { stop: "Open", title: "The answer is written inside the schema",
    note: `Google's documentation: the API “compiles your JSON Schema into a state machine that constrains token generation”. The schema is not advice in the prompt; it limits what may be written next.` },
  { stop: "A key", title: "Only the keys the schema names",
    note: `The model still chooses, but only among what the schema allows at this position.` },
  { stop: "A value", title: "Only values of the declared type", decisive: true,
    note: `<code>integer</code> admits digits; the number in quotes is a string, and is not on offer. Asked about something with no customer in it, the model still writes one: the shape is held, the content is not.` },
  { stop: "Parsed", title: "Your code gets an object, not a sentence",
    note: `<code>response.parsed</code> is an instance of the class. Nothing is pulled out of text.` },
];

export default widget({ label: "A schema the model must follow", css, steps, view: (s, at) => VIEWS[at]() });
