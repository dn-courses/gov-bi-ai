// ag1-tokens — a language model as one function: tokens in, a probability for every possible next
// token out; draw one, append it, run again. Then what that does to a question about your data.
import { bar, esc, widget, zone } from "./ag1-lib.js";
import { GCSS, RECORDED_WITH } from "./aga-lib.js";

// Measured in the lab on 2026-11-23 with Gemini's own tokenizer (client.models.compute_tokens,
// gemini-3.5-flash-lite); the page's first cell prints the same pieces.
const CAPTURED = {
  prompt: ["The", " customer", " who", " has", " spent", " the", " most", " is"],
  names: [["film", ["film"]], ["film_category", ["film", "_", "category"]], ["KARL SEAL", ["KAR", "L", " SEAL"]],
          ["BUCKET BROTHERHOOD", ["BUCK", "ET", " BRO", "THER", "HO", "OD"]]],
  // SELECT … FROM customer JOIN payment … ORDER BY total DESC LIMIT 1 (the page's SQL cell)
  truth: { name: "KARL SEAL", total: "221.55" },
};

// RECORDED on 2026-11-23 with gemini-3.5-flash-lite: the page's own cells, one run (scratch
// recording rec1). Vertex returns no logprobs for this model ("Logprobs is not supported for this
// model", 400), so the distribution is measured: 30 calls of the prompt with the system instruction
// "Continue the user's text. Output only the continuation.", the first word of each reply counted.
// `zeroDistinct`: 10 calls at temperature=0, the number of different replies. `reply`: the first
// of the 30 replies, in full. Another run draws differently.
const RECORDED = {
  first: [["John", 12], ["Mr.", 9], ["identified", 7], ["currently", 1], ["Mrs.", 1]],
  draws: 30, picked: 2, zeroDistinct: 10, zeroCalls: 10,
  reply: "identified as John Doe, with a total lifetime value of $15,430 across 42 separate purchases over the past three years.",
};
const R = RECORDED;
// The parts of the reply that claim a fact about the data: the name and the amount.
const INVENTED = ["John Doe", "$15,430"];

const CSS = GCSS + `
.lw .ag1 .chip i.ws { font-style:normal; color:var(--mute); opacity:.7; font-weight:400; }
.lw .ag1 .chip.wrap { display:inline-block; white-space:normal; line-height:1.5; }
.lw .ag1 .chip.reply { background:var(--hot-bg); border-color:var(--hot); color:var(--ink); font-weight:500; }
.lw .ag1 mark.inv { background:none; color:var(--hot); font-weight:700; text-decoration:underline wavy var(--hot); text-underline-offset:4px; }
.lw .ag1 .said { font:600 26px/1.3 ui-monospace, Menlo, monospace; padding:12px 16px; border-radius:10px; background:var(--cell); }
.lw .ag1 .said .q { color:var(--mute); }
.lw .ag1 .temp { display:grid; grid-template-columns:repeat(3, 1fr); gap:0; margin-top:12px; border-radius:10px; overflow:hidden; border:1px solid var(--line); }
.lw .ag1 .temp div { padding:7px 10px; background:var(--cell); font-size:13px; text-align:center; color:var(--mute); }
.lw .ag1 .temp div + div { border-left:1px solid var(--line); }
.lw .ag1 .temp div b { display:block; font:600 14px ui-monospace, Menlo, monospace; color:var(--ink); }
.lw .ag1 .temp div.on { background:var(--accent-bg); color:var(--ink); } .lw .ag1 .temp div.on b { color:var(--accent); }
.lw .ag1 .truth { display:flex; flex-wrap:wrap; align-items:baseline; gap:6px 16px; }
.lw .ag1 .names { display:grid; gap:0; }
.lw .ag1 .names > div { display:grid; grid-template-columns:minmax(200px, 28%) 1fr auto; gap:14px; align-items:center; padding:10px 0; border-top:1px solid var(--line); }
.lw .ag1 .names > div:first-child { border-top:0; }
`;

// A token as a chip; its leading space drawn as a faint ␣ so the fragment reads as the tokenizer cut it.
const tok = (t) => esc(t).replace(/^ /, `<i class="ws">␣</i>`);
const chips = (tokens, cls = "", fresh = false) => tokens.map((t) => `<span class="chip ${cls} ${fresh ? "fresh" : ""}">${tok(t)}</span>`).join("");
const marked = (text) => INVENTED.reduce((html, part) => html.replace(esc(part), `<mark class="inv">${esc(part)}</mark>`), esc(text));

const steps = [
  { stop: "Text", title: "The input is a string",
    note: `Not a question, not a table, not a row. Whatever you send a language model arrives as text.` },
  { stop: "Tokens", title: "The string is cut into tokens",
    note: `${CAPTURED.prompt.length} tokens. A token is a fragment the tokenizer settled on: often a word with its leading space, often less than a word.` },
  { stop: "Next token", title: "One function: tokens in, a probability for every next token",
    note: `The model is a fixed function. Its whole output is a list: how likely each possible token is to come next. Gemini does not hand that list out, so here it is measured: the same text sent ${R.draws} times, and how each reply began.` },
  { stop: "Append", title: "Draw one, append it, run the function again",
    note: `The next token is <b>drawn at random, weighted by these chances</b>, like a loaded die. "${R.first[0][0]}" came up ${R.first[0][1]} times in ${R.draws}, "${R.first[R.picked][0]}" ${R.first[R.picked][1]}, and the first reply drew "${R.first[R.picked][0]}". How random the draw is, is a setting called the <b>temperature</b>: lower picks the likeliest more often, higher flattens the chances. This model ignores a custom value: ${R.zeroCalls} calls at temperature 0 gave ${R.zeroDistinct} different replies. The drawn token joins the input and the function runs again; a paragraph is this loop run a few hundred times.` },
  { stop: "Fluent", title: "One reply: fluent, and about nobody", decisive: true,
    note: `Every token was chosen because it was <b>likely</b>. Nothing in the function looks anything up, so the name and the amount are invented. In Pagila the answer is <b>${CAPTURED.truth.name}, ${CAPTURED.truth.total}</b>.` },
  { stop: "Names", title: "Your identifiers are fragments too",
    note: `A table name, a customer, a film title: to the model each is a few pieces, and the next piece is chosen because it is plausible, not because the row exists.` },
];

function names() {
  return zone("The same tokenizer, on names from Pagila", `<div class="names">${CAPTURED.names.map(([name, tokens]) =>
    `<div><span class="mono" style="font-size:17px">${esc(name)}</span><span class="chips">${chips(tokens, tokens.length > 2 ? "hot" : "")}</span><span class="mono dim">${tokens.length} token${tokens.length > 1 ? "s" : ""}</span></div>`).join("")}</div>`);
}

function temperature() {
  return `<p class="small" style="margin-top:12px">a weighted draw, not a ranking: the likeliest start won ${R.first[0][1]} draws of ${R.draws}, not all of them</p>
    <div class="temp"><div><b>lower</b>the likeliest, more often</div><div class="on"><b>default 1.0</b>these chances as they are</div><div><b>higher</b>flatter, more surprising</div></div>
    <p class="small" style="margin-top:8px">${RECORDED_WITH} ignores a custom temperature: ${R.zeroCalls} calls at 0, ${R.zeroDistinct} different replies</p>`;
}

function dist(at) {
  const lit = (i) => at === 3 && i === R.picked;
  const rest = R.draws - R.first.reduce((sum, [, n]) => sum + n, 0);
  const rows = R.first.map(([word, n], i) => bar(`<span class="chip ${lit(i) ? "on" : ""}">${esc(word)}</span>`, n, R.first[0][1] * 1.1, `${n} of ${R.draws}`, lit(i) ? "" : "mute")).join("");
  const other = rest ? bar(`<span class="dim">any other word</span>`, rest, R.first[0][1] * 1.1, `${rest} of ${R.draws}`, "mute") : "";
  return zone(`How the reply begins · ${R.draws} recorded calls, ${RECORDED_WITH}`, `<div class="bars lean">${rows}${other}</div>${at === 3 ? temperature() : ""}`, at === 3 ? "on" : "");
}

// The fluent reply, drawn once: joined to the input, its invented parts marked; then the table's answer.
function fluent() {
  const input = zone(`The input, grown into a reply · one recorded reply, ${RECORDED_WITH}`,
    `<div class="chips">${chips(CAPTURED.prompt)}<span class="chip wrap reply fresh">${marked(" " + R.reply)}</span></div>
    <p class="small" style="margin-top:10px"><span class="hotc">underlined</span>: the name and the amount, both invented</p>`, "hot");
  const truth = zone("What the payment table says", `<div class="truth"><span class="big okc" style="font-size:28px">${CAPTURED.truth.name}, ${CAPTURED.truth.total}</span>
    <span class="small">the customer who has spent the most, from the page's SQL</span></div>`, "ok");
  return input + truth;
}

function view(step, at) {
  const text = CAPTURED.prompt.join("");
  if (at === 0) return zone("What you send · a string", `<p class="said"><span class="q">"</span>${esc(text)}<span class="q">"</span></p>`, "on");
  if (at === 4) return fluent();
  if (at === 5) return names();
  const grown = at === 3 ? [" " + R.first[R.picked][0]] : [];
  const input = zone(at === 3 ? "The input, one token longer each time" : `The input, as the model receives it · <b>${CAPTURED.prompt.length} tokens</b>`,
    `<div class="chips">${chips(CAPTURED.prompt, at === 1 ? "fresh" : "")}${chips(grown, "on", true)}</div>`, at === 1 ? "on" : "");
  if (at === 1) return input;
  return input + dist(at);
}

export default widget({ label: "One token at a time", css: CSS, steps, view });
