// ag4-embed — lesson 26, first scene: text becomes a vector; similar meaning becomes a small angle;
// normalised, the dot product is the cosine. (Search as a sort is shown once, in SQL, in ag4-retrieve.) Each pair of vectors is drawn in its own plane at its real angle (three
// vectors of 1,536 dimensions cannot be drawn truthfully in one).
//
// RECORDED 2026-11-23 with gemini-embedding-001 (Vertex AI, location global, output_dimensionality
// 1536) by running the cells of content/agents/26-embeddings.mdx (before 26 and 27 were merged) in the agents lab: every float,
// cosine, length and token count below is that run's output. The six documents are the lab's `docs`
// table. Facts in the last step: Vertex AI text-embeddings page and pricing page, read 2026-11-23.
import { staged } from "./ag4-lib.js";

const RECORDED = {
  model: "gemini-embedding-001", dims: 1536,
  sentence: "A short sentence about cats.", first: [-0.0277, 0.0097, 0.0129, -0.0827, -0.0064, 0.0049],
  cos: { cats: 0.888, pg: 0.681 },
  lengths: [0.686, 0.688, 0.688], rawDot: 0.419,
  docsTokens: 246,
};
const R = RECORDED;
const deg = (cos) => Math.round((Math.acos(cos) * 180) / Math.PI);

const steps = [
  { stop: "Numbers", title: "Text in, a list of numbers out",
    note: `An embedding model returns <b>${R.dims.toLocaleString("en-US")}</b> floats for any text, short or long. No single number means anything. The meaning is in how two lists compare.` },
  { stop: "Close", title: "Two sentences about the same thing point the same way",
    note: `Treat each list as an arrow in space. The two cat sentences are worded differently, and their arrows are <b>${deg(R.cos.cats)}°</b> apart. The cosine of that angle, ${R.cos.cats}, is the usual score.` },
  { stop: "Far", title: "A sentence about something else points further away",
    note: `Cats against PostgreSQL: <b>${deg(R.cos.pg)}°</b>, cosine ${R.cos.pg}. Not a right angle: with this model even unrelated texts score well above 0. So no threshold is worth memorising. You rank, and take the top few.` },
  { stop: "Length", title: "Normalise before you compare by dot product", decisive: true,
    note: `At 1,536 dimensions these vectors come back with length about ${R.lengths[0]}, not 1. The cosine does not care; a plain dot product does. Divide each vector by its length once, and the dot product <i>is</i> the cosine.` },
  { stop: "The rules", title: "Four things to know before embedding a corpus",
    note: `Embedding is the cheap part. The decisions are which model, and what you store.` },
];

const CSS = `
.lw .emb .flow { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1.4fr); gap:14px; align-items:center; }
@container (max-width: 820px) { .lw .emb .flow { grid-template-columns:1fr; } }
.lw .emb .quote { padding:12px 14px; border-radius:12px; background:var(--cell); font-size:17px; }
.lw .emb .engine { padding:10px 16px; border-radius:999px; background:var(--accent-bg); color:var(--accent); font:600 14px ui-monospace, Menlo, monospace; text-align:center; }
.lw .emb .floats { display:flex; flex-wrap:wrap; gap:6px; }
.lw .emb .floats span { padding:6px 9px; border-radius:6px; background:var(--cell); font:15px ui-monospace, Menlo, monospace; }
.lw .emb .floats span.more { background:transparent; color:var(--mute); }
.lw .emb .pairs { display:grid; gap:16px; grid-template-columns:repeat(2, minmax(0,1fr)); }
.lw .emb .pairs:has(> .off) { grid-template-columns:minmax(0, 540px); justify-content:center; }
@container (max-width: 820px) { .lw .emb .pairs { grid-template-columns:1fr; } }
.lw .emb svg { width:100%; height:auto; display:block; }
.lw .emb svg text { font:600 15px system-ui, sans-serif; fill:var(--ink); }
.lw .emb svg text.dim { fill:var(--mute); font-weight:500; font-size:13px; }
.lw .emb svg text.num { font:600 26px ui-monospace, Menlo, monospace; fill:var(--accent); }
.lw .emb svg .arrow { stroke:var(--accent); stroke-width:3.5; stroke-linecap:round; fill:none; }
.lw .emb svg .arrow.other { stroke:var(--hot); }
.lw .emb svg .arc { stroke:var(--mute); stroke-width:1.5; fill:none; stroke-dasharray:4 4; }
.lw .emb svg .tip { fill:var(--accent); } .lw .emb svg .tip.other { fill:var(--hot); }
.lw .emb .axis { position:relative; height:86px; margin:6px 40px 0; }
.lw .emb .axis .line { position:absolute; left:0; right:0; top:44px; height:3px; border-radius:2px; background:var(--line); }
.lw .emb .axis .tick { position:absolute; top:52px; transform:translateX(-50%); font-size:13px; color:var(--mute); white-space:nowrap; }
.lw .emb .axis .pin { position:absolute; top:0; transform:translateX(-50%); text-align:center; font-size:13px; white-space:nowrap; }
.lw .emb .axis .pin b { display:block; font:600 16px ui-monospace, Menlo, monospace; }
.lw .emb .axis .pin::after { content:""; display:block; width:12px; height:12px; border-radius:50%; background:var(--accent); margin:3px auto 0; }
.lw .emb .axis .pin.far::after { background:var(--hot); }
.lw .emb .rules { display:grid; gap:12px; grid-template-columns:repeat(2, minmax(0,1fr)); }
@container (max-width: 820px) { .lw .emb .rules { grid-template-columns:1fr; } }
.lw .emb .rules h4 { margin:0 0 6px; font-size:17px; } .lw .emb .rules p { margin:0; font-size:14.5px; color:var(--mute); }
.lw .emb .same td { font-family:ui-monospace, Menlo, monospace; font-size:16px; }
`;

// Two arrows from one origin, `angle` degrees apart, each with its sentence.
function pair(a, b, cos, tone) {
  const angle = Math.acos(cos), len = 190, ox = 40, oy = 230;
  const tip = (t) => [ox + len * Math.cos(t), oy - len * Math.sin(t)];
  const [ax, ay] = tip(0.12), [bx, by] = tip(0.12 + angle);
  const [mx, my] = [ox + 62 * Math.cos(0.12 + angle / 2), oy - 62 * Math.sin(0.12 + angle / 2)];
  const arc = `M ${ox + 44 * Math.cos(0.12)} ${oy - 44 * Math.sin(0.12)} A 44 44 0 0 0 ${ox + 44 * Math.cos(0.12 + angle)} ${oy - 44 * Math.sin(0.12 + angle)}`;
  return `<svg viewBox="0 0 420 270" role="img" aria-label="two vectors ${deg(cos)} degrees apart">
    <path class="arc" d="${arc}"/>
    <line class="arrow" x1="${ox}" y1="${oy}" x2="${ax}" y2="${ay}"/><circle class="tip" cx="${ax}" cy="${ay}" r="6"/>
    <line class="arrow ${tone}" x1="${ox}" y1="${oy}" x2="${bx}" y2="${by}"/><circle class="tip ${tone}" cx="${bx}" cy="${by}" r="6"/>
    <text x="${mx + 6}" y="${my}">${deg(cos)}°</text>
    <text class="dim" x="${ox}" y="${oy + 26}">${a}</text>
    <text class="dim" x="${Math.min(bx + 12, 200)}" y="${Math.max(by - 12, 18)}">${b}</text>
    <text class="num" x="300" y="56">${cos}</text><text class="dim" x="300" y="80">cosine</text></svg>`;
}

const at = (cos) => `${((cos + 1) / 2) * 100}%`;
const pin = (label, cos, cls = "") => `<div class="pin ${cls}" style="left:${at(cos)}">${label}<b>${cos}</b></div>`;
const rule = (title, text) => `<div class="zone"><h4>${title}</h4><p>${text}</p></div>`;

const scene = () => `
  <div class="zone flow" data-on="0">
    <div class="quote">“${R.sentence}”</div>
    <div class="engine">${R.model}</div>
    <div><div class="floats">${R.first.map((f) => `<span>${f}</span>`).join("")}<span class="more">… ${(R.dims - R.first.length).toLocaleString("en-US")} more</span></div></div>
  </div>
  <div class="pairs" data-from="1" data-until="2">
    <div class="zone"><p class="cap">Two sentences about cats</p>${pair("“Cats are small carnivorous mammals…”", "“The domestic cat is…”", R.cos.cats, "")}</div>
    <div class="zone" data-on="2"><p class="cap">Cats, and a database</p>${pair("“Cats are small carnivorous mammals…”", "“PostgreSQL is…”", R.cos.pg, "other")}</div>
  </div>
  <div class="zone" data-on="2">
    <p class="cap">Cosine similarity</p>
    <div class="axis"><div class="line"></div>
      <span class="tick" style="left:0">−1 opposite</span><span class="tick" style="left:50%">0 unrelated</span><span class="tick" style="left:100%">1 same</span>
      ${pin("cats · postgres", R.cos.pg, "far")}${pin("cats · cats", R.cos.cats)}</div>
  </div>
  <div class="zone" data-on="3">
    <table class="same"><thead><tr><th>cats · cats</th><th>as returned</th><th>divided by its length</th></tr></thead><tbody>
      <tr><td>lengths</td><td class="hot">${R.lengths[0]}, ${R.lengths[1]}</td><td class="ok">1, 1</td></tr>
      <tr><td>dot product</td><td class="hot">${R.rawDot}</td><td class="ok">${R.cos.cats}</td></tr>
      <tr><td>cosine</td><td>${R.cos.cats}</td><td>${R.cos.cats}</td></tr></tbody></table>
  </div>
  <div class="rules" data-on="4">
    ${rule("One model per corpus", "Vectors from two models, or two versions, cannot be compared. Changing the model means embedding everything again.")}
    ${rule("2,048 tokens per text", "Longer text is cut silently. Long documents are split into passages first, each with its own vector.")}
    ${rule("$0.15 per million tokens", `The six documents here are ${R.docsTokens} tokens. A million words costs about twenty cents.`)}
    ${rule("A query is not a document", "<code>task_type</code> tells the model which side a text is on: <code>RETRIEVAL_DOCUMENT</code> when storing, <code>RETRIEVAL_QUERY</code> when asking.")}
  </div>`;

export default staged({ key: "emb", label: "Embeddings", css: CSS, steps, scene });
