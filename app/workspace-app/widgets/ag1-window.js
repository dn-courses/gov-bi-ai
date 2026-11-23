// ag1-window — the two places a model's knowledge can live: the weights (written in training, not
// yours, fixed) and the context window (written by you on this request, a budget). Pagila's schema
// is a sliver of the window; one of its tables, as text, overflows it.
import { fmt, widget, zone } from "./ag1-lib.js";
import { GCSS, RECORDED_WITH } from "./aga-lib.js";

// Measured in the lab on 2026-11-23 with client.models.count_tokens on gemini-3.5-flash-lite, on the
// preview's Pagila (the page's cells repeat both counts). The window is the model's published
// context window, read on 2026-11-23 from its Vertex AI model page: 1,048,576 tokens.
const CAPTURED = {
  schemaTables: 16, schemaTokens: 522, // every table's name, columns and types, one line a table
  rentalRows: 16044, rentalTokens: 1084781, // the rental table as CSV, six columns
  window: 1048576,
};
const D = CAPTURED;
const share = (n) => `${Math.round((100 * n) / D.window)}%`;

const CSS = GCSS + `
.lw .ag1 .scale { display:grid; gap:12px; position:relative; }
.lw .ag1 .scale .row { display:grid; grid-template-columns:minmax(150px, 24%) 1fr minmax(110px, auto); gap:12px; align-items:center; font-size:15px; }
.lw .ag1 .scale .track { position:relative; height:26px; border-radius:6px; background:var(--cell); }
.lw .ag1 .scale .fill { position:absolute; inset:0 auto 0 0; min-width:3px; border-radius:6px; background:var(--mute); animation:ag1-grow .7s both; transform-origin:left; }
.lw .ag1 .scale .fill.ok { background:var(--ok); } .lw .ag1 .scale .fill.hot { background:var(--hot); } .lw .ag1 .scale .fill.win { background:color-mix(in srgb, var(--accent) 55%, var(--cell)); }
.lw .ag1 .scale .lim { position:absolute; top:-6px; bottom:-6px; width:0; border-left:2px dashed var(--accent); }
.lw .ag1 .scale .val { font:600 17px ui-monospace, Menlo, monospace; text-align:right; }
.lw .ag1 .scale .over { position:absolute; top:0; bottom:0; right:0; border-radius:0 6px 6px 0; background:repeating-linear-gradient(135deg, var(--hot) 0 4px, var(--hot-bg) 4px 8px); }
`;

const steps = [
  { stop: "Weights", title: "The weights: written in training, then frozen",
    note: `Public text, blurred and unattributed, up to a cutoff months or years back. This is why the model writes SQL and knows what a rental is. Your tables were never in it.` },
  { stop: "Window", title: "The context window: written by you, on this request",
    note: `Exactly the text you send, and nothing else. It is the only place anything specific to you can be.` },
  { stop: "Your data", title: "What is yours comes in through the window",
    note: `Pagila's schema, as text: ${D.schemaTables} tables, <b>${fmt(D.schemaTokens)} tokens</b>. Now the model can name a real column. It still has not seen a row.` },
  { stop: "A budget", title: "The window has a size, and every token in it is billed", decisive: true,
    note: `The schema is a sliver. The <code>rental</code> table as text is ${fmt(D.rentalTokens)} tokens: ${share(D.rentalTokens)} of the ${fmt(D.window)}-token window of ${RECORDED_WITH}. One table of sixteen does not fit in a million tokens, and whatever does fit is billed on every call that carries it.` },
];

const item = (text, cls = "") => `<span class="pill ${cls}">${text}</span>`;

function inWindow(at) {
  if (at === 1) return `<p class="dim">empty until you write to it</p>`;
  return `<div class="chips"><span class="chip ${at === 2 ? "on fresh" : ""}">Pagila schema · ${fmt(D.schemaTokens)} tokens</span><span class="chip">the question</span></div>`;
}

function weights(at) {
  return zone("The weights — not yours, fixed", `<div class="chips">${item("SQL syntax")}${item("Python")}${item("what a rental is")}${item("how a star schema is laid out")}</div>
    <p class="small" style="margin-top:12px">written during training · the same for every customer of the model · read-only</p>
    <div class="chips" style="margin-top:12px">${item("your tables", "hot")}${item("yesterday's rows", "hot")}<span class="small">not in here</span></div>`, at === 0 ? "on" : "off");
}

// One row of the scale: the track is drawn to the largest count; the dashed line is the window.
function row(label, n, max, cls) {
  const lim = (100 * D.window) / max, w = (100 * n) / max;
  const over = n > D.window ? `<span class="over" style="left:${lim}%"></span>` : "";
  return `<div class="row"><span>${label}</span><span class="track"><span class="fill ${cls}" style="width:${w}%"></span>${over}<span class="lim" style="left:${lim}%"></span></span><span class="val">${fmt(n)}</span></div>`;
}

function budget() {
  const max = Math.max(D.window, D.rentalTokens);
  return zone("Tokens, on one scale · the dashed line is the window", `<div class="scale">
    ${row("Pagila schema", D.schemaTokens, max, "ok")}
    ${row(`<code>rental</code>, ${fmt(D.rentalRows)} rows as text`, D.rentalTokens, max, "hot")}
    ${row(`the window, ${RECORDED_WITH}`, D.window, max, "win")}</div>
    <p class="small" style="margin-top:12px">counted by the model's own tokenizer (<code>count_tokens</code>) · the table is <b class="hotc">${fmt(D.rentalTokens - D.window)}</b> tokens over the window</p>`, "hot");
}

function view(step, at) {
  const window = at === 0 ? `<div class="zone ghost">the context window</div>` : zone("The context window — yours, per request", `${inWindow(at)}
    <p class="small" style="margin-top:12px">written by you on this call · billed per token · a hard size limit</p>`, at === 3 ? "" : "on");
  const pair = `<div class="cols">${weights(at)}${window}</div>`;
  return at === 3 ? pair + budget() : pair;
}

export default widget({ label: "Weights and window", css: CSS, steps, view });
