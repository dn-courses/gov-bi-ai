// ag4-retrieve — lesson 26, second scene: documents get a vector once, a question gets one when it is asked, and
// retrieval is ORDER BY distance LIMIT k. Then the search becomes a tool the agent calls, and the
// conversation is drawn with the shared chat widget.
//
// RECORDED 2026-11-23 in the agents lab by the cells of content/agents/27-pgvector-demo.mdx (now the second scene of 26-embeddings):
// gemini-embedding-001 vectors (1536, normalised) stored in `docs`; distances from pgvector's <=>
// (the top three printed by the page's search cell; the other three are 1 − the cosines the Python sort cell
// of the old 26-embeddings printed for the same question, which agree with the top three to the third decimal); the
// conversations from gemini-3.5-flash-lite, re-run in one batch with full tool results kept. The
// tool-choice pair was run three times each (ROUTED).
import { esc, staged, talk } from "./ag4-lib.js";
import { conversation, wireChat } from "@widget-lib/chat.js";

const DOCS = ["Late fee policy", "Membership tiers", "Refund policy", "Damaged disc procedure", "Hours of operation", "Pre-order policy"];
const LATE = "Customers are charged a $1.00 late fee for every day a rental is returned past the due date. The fee is capped at the replacement cost of the film.";
const DAMAGED = "If a returned disc is visibly cracked or unplayable, the customer is charged the replacement cost on file in inventory. Customers may contest the charge in writing within 14 days.";
const TIERS = "Pagila Video has three membership tiers: Basic ($0/mo, 2 rentals at a time), Plus ($9.99/mo, 5 rentals, no late fees under 3 days), and Family ($14.99/mo, 10 rentals, shared across up to 5 accounts).";
const HOURS = "All Pagila locations are open Monday through Saturday from 10 AM to 10 PM. Sunday hours are 12 PM to 8 PM. Closed on Thanksgiving and Christmas Day.";
const PREORDER = "New releases may be pre-ordered up to 30 days before their street date. Pre-orders are filled in the order received and are held for 48 hours after the release.";
const REFUND = "Refunds are issued only for defective discs, billing errors, or store-confirmed equipment failures. Refund requests must be filed within 30 days of the transaction.";
const hits = (rows) => JSON.stringify({ passages: rows.map(([title, text, distance]) => ({ title, text, distance })) });

const RECORDED = {
  model: "gemini-3.5-flash-lite",
  question: "If I return a movie a week late, what does it cost me?",
  ranked: [["Late fee policy", 0.223], ["Damaged disc procedure", 0.331], ["Membership tiers", 0.347], ["Pre-order policy", 0.393], ["Refund policy", 0.394], ["Hours of operation", 0.463]],
  operators: { same: 0, longer: 0, right: 1, opposite: 2 },
  support: [
    { role: "system", text: "You are a support assistant for Pagila Video. Answer policy questions from the policy documents and quote the passage you used." },
    { role: "user", text: "How much am I charged if I return a movie 3 days late?" },
    { role: "tool", name: "search_policies", args: { query: "late return fee charge days" }, result: hits([["Late fee policy", LATE, 0.28], ["Damaged disc procedure", DAMAGED, 0.33], ["Membership tiers", TIERS, 0.403]]) },
    { role: "assistant", text: "Based on the standard policy, customers are charged a $1.00 late fee for each day a rental is returned past the due date. For 3 days late, this would be $3.00. \n\n*(Note: If you have a **Plus** membership tier, there are no late fees for returns under 3 days).*\n\n**Policy Passage:**\n> \"Customers are charged a $1.00 late fee for every day a rental is returned past the due date. The fee is capped at the replacement cost of the film.\"" },
  ],
  policy: [
    { role: "user", text: "What are your opening hours on Sunday?" },
    { role: "tool", name: "search_policies", args: { query: "opening hours Sunday" }, result: hits([["Hours of operation", HOURS, 0.332], ["Pre-order policy", PREORDER, 0.444], ["Refund policy", REFUND, 0.46]]) },
    { role: "assistant", text: "On Sundays, Pagila Video locations are open from **12 PM to 8 PM**." },
  ],
  data: [
    { role: "user", text: "How many films are in the catalogue?" },
    { role: "tool", name: "run_sql", args: { query: "SELECT count(*) FROM film" }, result: `{"columns": ["count"], "rows": [["1000"]]}` },
    { role: "assistant", text: "There are 1,000 films in the catalogue." },
  ],
};
const ROUTED = { runs: 3, policyToSearch: 3, dataToSql: 3 };
const R = RECORDED;

const steps = [
  { stop: "A table", title: "Documents are rows, with one more column",
    note: `<code>docs</code> has a title, a body, and <code>embedding vector(1536)</code>. Until the next step runs, the column is empty.` },
  { stop: "Embed once", title: "Each body becomes a vector, once",
    note: `One request to the embedding model for all six bodies, normalised, one <code>UPDATE</code> per row. This is the indexing step: it runs when documents are loaded or changed, never per question.` },
  { stop: "An operator", title: "pgvector adds distance as an operator",
    note: `<code>a &lt;=&gt; b</code> is cosine distance, 1 minus the cosine: 0 for the same direction, 1 for a right angle, 2 for opposite. Length does not matter to it.` },
  { stop: "ORDER BY", title: "Retrieval is ORDER BY distance LIMIT k", decisive: true,
    note: `The question is embedded with the same model, and the database sorts the rows by distance to it. The top row is the late-fee policy, at ${R.ranked[0][1]}. The question never says “fee”.` },
  { stop: "A tool", title: "The search becomes a tool the agent can call",
    note: `The model writes its own search phrase, reads the three passages that come back, and answers from them. This is <b>retrieval-augmented generation</b>: the fact was read, not remembered.` },
  { stop: "Which tool", title: "Policy goes to the search, data goes to SQL",
    note: `With both tools, the model chooses by their descriptions. In ${ROUTED.runs} recorded runs of each question it sent the policy question to the search ${ROUTED.policyToSearch} times and the data question to SQL ${ROUTED.dataToSql} times.` },
];

const CSS = `
.lw .rtv .docs td { font-size:15.5px; }
.lw .rtv .docs tr.top td { background:var(--ok-bg); }
.lw .rtv .docs tr.cut td { color:var(--mute); }
.lw .rtv .vec { display:inline-block; padding:2px 10px; border-radius:999px; font:13.5px ui-monospace, Menlo, monospace; background:var(--cell); color:var(--mute); }
.lw .rtv .vec.full { background:var(--accent-bg); color:var(--accent); }
.lw .rtv .ops { display:grid; gap:12px; grid-template-columns:repeat(4, minmax(0,1fr)); }
@container (max-width: 820px) { .lw .rtv .ops { grid-template-columns:repeat(2, minmax(0,1fr)); } }
.lw .rtv .ops > div { text-align:center; padding:12px 8px 14px; border-radius:12px; background:var(--cell); border:1px solid var(--line); }
.lw .rtv .ops p { margin:6px 0 0; font-size:14px; color:var(--mute); }
.lw .rtv .ops code { font-size:13.5px; }
.lw .rtv .docs tr.edge3 td { border-bottom:2px dashed var(--ok); }
.lw .rtv .dist { display:inline-block; width:90px; height:10px; border-radius:5px; background:var(--cell); margin-right:10px; overflow:hidden; vertical-align:middle; }
.lw .rtv .dist i { display:block; height:100%; background:var(--mute); border-radius:5px; } .lw .rtv tr.top .dist i { background:var(--ok); }
.lw .rtv .limit { margin:8px 0 0; font-size:13px; color:var(--ok); font-weight:600; }
.lw .rtv svg.mini { width:160px; height:72px; display:block; margin:0 auto 4px; }
.lw .rtv svg.mini line { stroke-width:5; stroke-linecap:round; } .lw .rtv svg.mini .va { stroke:var(--accent); } .lw .rtv svg.mini .vb { stroke:var(--hot); opacity:.85; }
.lw .rtv svg.mini .o { fill:var(--ink); }
.lw .rtv .route { margin:0 0 8px; font-size:15px; color:var(--mute); } .lw .rtv .route b { font-family:ui-monospace, Menlo, monospace; color:var(--ink); }
.lw .rtv .quote { padding:10px 14px; border-radius:12px; background:var(--cell); font-size:16px; margin-bottom:12px; }
`;

const table = (rows) => `<table class="docs"><thead><tr><th>title</th><th>embedding</th></tr></thead><tbody>${
  rows.map(([title]) => `<tr><td>${title}</td>
    <td><span class="vec" data-on="0">NULL</span><span class="vec full" data-from="1" data-until="2">1,536 floats · length 1</span></td></tr>`).join("")}</tbody></table>`;
const sorted = (rows) => `<table class="docs"><thead><tr><th>title</th><th>distance to the question</th></tr></thead><tbody>${
  rows.map(([title, distance], i) => `<tr class="${i < 3 ? "top" : "cut"} ${i === 2 ? "edge3" : ""}"><td>${title}</td>
    <td><span class="dist"><i style="width:${Math.round(distance * 200)}%"></i></span><span class="mono">${distance.toFixed(3)}</span></td></tr>`).join("")}</tbody></table>
  <p class="limit">LIMIT 3: the top three go to the model</p>`;

// Two small arrows from one origin, as the operator compares them.
const vecs = (a, b) => `<svg viewBox="-72 -54 144 64" class="mini"><line x1="0" y1="0" x2="${b[0] * 40}" y2="${-b[1] * 40}" class="vb"/>
  <line x1="0" y1="0" x2="${a[0] * 40}" y2="${-a[1] * 40}" class="va"/><circle r="3" class="o"/></svg>`;
const op = (value, label, sql, a, b) => `<div>${vecs(a, b)}<span class="big">${value}</span><p>${label}</p><code>${esc(sql)}</code></div>`;

const scene = () => `
  <div class="zone" data-from="0" data-until="1"><p class="cap">public.docs</p>${table(DOCS.map((title) => [title]))}</div>
  <div class="ops" data-on="2">
    ${op(R.operators.same, "same direction", "'[1,0]' <=> '[1,0]'", [1, 0], [1, 0])}${op(R.operators.longer, "same direction, longer", "'[1,0]' <=> '[5,0]'", [1, 0], [1.6, 0])}
    ${op(R.operators.right, "a right angle", "'[1,0]' <=> '[0,1]'", [1, 0], [0, 1.2])}${op(R.operators.opposite, "opposite", "'[1,0]' <=> '[-1,0]'", [1, 0], [-1, 0])}
  </div>
  <div class="cols wide-left" data-on="3">
    <div class="zone"><div class="quote">“${R.question}”</div>
      <pre>SELECT title, body,\n       embedding &lt;=&gt; :question AS distance\nFROM docs\nORDER BY embedding &lt;=&gt; :question\nLIMIT 3;</pre></div>
    <div class="zone"><p class="cap">public.docs, sorted</p>${sorted(R.ranked)}</div>
  </div>
  <div data-slot="chat" data-on="4"></div>
  <div class="cols" data-on="5">
    <div><p class="route">policy question → <b>search_policies</b> <span class="chip ok">${ROUTED.policyToSearch} of ${ROUTED.runs}</span></p><div data-slot="policy"></div></div>
    <div><p class="route">data question → <b>run_sql</b> <span class="chip ok">${ROUTED.dataToSql} of ${ROUTED.runs}</span></p><div data-slot="data"></div></div></div>`;

function bind(root) {
  for (const which of ["policy", "data"]) {
    const slot = root.querySelector(`[data-slot="${which}"]`);
    slot.innerHTML = conversation(R[which], { open: [1], model: R.model, recorded: true });
    wireChat(slot);
  }
}

function after(root, at) {
  if (at === 4) talk(root.querySelector('[data-slot="chat"]'), R.support, { upto: 4, open: [2], mark: /\$1\.00 late fee for every day/, model: R.model, recorded: true });
}

export default staged({ key: "rtv", label: "Retrieval in Postgres", css: CSS, steps, scene, bind, after });
