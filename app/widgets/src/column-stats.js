// column-stats — what ANALYZE keeps about a column, and how a plan's row estimate is computed from it.
// Captured from pg_stats and EXPLAIN in the lab (ANALYZE re-samples, so a fresh run differs a little).
import { bar, cards } from "../lib/cards.js";
import { fmt, scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const SAMPLE = 30000, MS = 220;
const CAPTURED = { rows: 5000000,
  distinct: [["status", "3"], ["country", "20"], ["customer_id", "≈ 98,110"], ["created_at", "all different"]],
  common: [["delivered", 0.9511], ["shipped", 0.0397], ["pending", 0.0092]],
  bounds: [5, 55.07, 104.92, 153.75, 204.15, 253.68, 301.64, 351.08, 398.35, 450.39, 499.99],
  pending: { est: 45833, actual: 50000 }, cheap: { est: 149840, actual: 151714 } };

const pct = (share) => `${(100 * share).toFixed(2)}%`;
const steps = (D) => [
  { stop: "A sample", title: "ANALYZE reads a sample, not the table",
    note: `${fmt(SAMPLE)} rows picked at random out of ${fmt(D.rows)}, in about ${MS} ms. Everything the planner knows about a column comes from them.` },
  { stop: "Distinct", title: "How many different values a column has",
    note: `An estimate from the sample: <code>customer_id</code> really has 100,000 different values. Close is enough.` },
  { stop: "Most common", title: "The most common values, each with its share",
    note: `For a column with few values, every value is listed. <code>status = 'pending'</code> is ${pct(D.common.find(([v]) => v === "pending")?.[1] ?? 0)} of the rows.` },
  { stop: "Histogram", title: "A histogram for everything else",
    note: `For a column with many values: boundaries that cut the rows into equal shares. Where a value falls between them tells what share lies below it.` },
  { stop: "The estimate", title: "rows= is arithmetic on these numbers", decisive: true,
    note: `Rows in the table × the share the statistics give. No row is read to produce it, so it is only as good as the statistics.` },
];

const CSS = `
.lw .cs .three { display:grid; grid-template-columns:1fr 1.4fr; gap:14px; }
.lw .cs .card.st { transition:opacity .6s; }
.lw .cs dl { margin:0; display:grid; grid-template-columns:max-content 1fr; gap:8px 14px; font:14px ui-monospace, Menlo, monospace; }
.lw .cs dt { color:var(--mute); } .lw .cs dd { margin:0; font-weight:600; text-align:right; }
.lw .cs .sample { display:flex; align-items:center; gap:12px; flex-wrap:wrap; font-size:14px; }
.lw .cs .hist .col { fill:var(--cell); stroke:var(--line); }
.lw .cs .hist .below { fill:var(--accent-bg); stroke:var(--accent); }
.lw .cs .hist .cut { stroke:var(--accent); stroke-width:2; stroke-dasharray:4 3; }
.lw .cs .hist .axis { stroke:var(--line); }
.lw .cs .hist text.sm { font:12px ui-monospace, Menlo, monospace; font-weight:400; }
.lw .cs .sum { display:grid; grid-template-columns:max-content 1fr max-content max-content; gap:8px 18px; align-items:center; font:14px ui-monospace, Menlo, monospace; }
.lw .cs .sum > div { display:contents; } .lw .cs .sum > div > * { transition:opacity .6s; } .lw .cs .sum > div.st:not(.on) > * { opacity:0; }
.lw .cs .sum b { color:var(--accent); } .lw .cs .sum .act { color:var(--mute); }
@media (max-width: 760px) { .lw .cs .three { grid-template-columns:1fr; } }
`;
// The share of the first bar that lies below the value asked for.
const CUT = 20;
const below = (D) => Math.min(1, Math.max(0, (CUT - D.bounds[0]) / (D.bounds[1] - D.bounds[0])));
// A bar per tenth of the rows, drawn on the real axis of amounts: equal areas, so a narrow range
// of amounts that holds many rows gives a tall bar.
function histogram(D) {
  const b = D.bounds, lo = b[0], hi = b[b.length - 1], x = (v) => 30 + ((v - lo) / (hi - lo)) * 700;
  const dense = b.slice(1).map((v, i) => 1 / Math.max(v - b[i], 1e-9)), top = Math.max(...dense), tenth = fmt(Math.round(D.rows / 10 / 1000) * 1000);
  const bars = dense.map((d, i) => { const h = (96 * d) / top, x0 = x(b[i]), w = x(b[i + 1]) - x0;
    return `<rect class="col" x="${x0 + 1}" y="${130 - h}" width="${Math.max(1, w - 2)}" height="${h}" rx="3"/><text class="sm dim" x="${x0 + w / 2}" y="${130 - h / 2}">10%</text>`; }).join("");
  const cut = x(CUT), h0 = (96 * dense[0]) / top;
  return `<svg class="hist" viewBox="0 0 760 196">${bars}
    <rect class="below" x="${x(lo) + 1}" y="${130 - h0}" width="${Math.max(1, cut - x(lo) - 1)}" height="${h0}" rx="3"/>
    <line class="axis" x1="30" y1="130" x2="730" y2="130"/>
    ${b.map((v) => `<line class="axis" x1="${x(v)}" y1="130" x2="${x(v)}" y2="136"/><text class="sm" x="${x(v)}" y="148">${Number(v).toFixed(2)}</text>`).join("")}
    <line class="cut" x1="${cut}" y1="20" x2="${cut}" y2="130"/><text class="sm acc" x="${cut + 6}" y="14" style="text-anchor:start">amount &lt; ${CUT}: ${below(D).toFixed(2)} of the first bar</text>
    <text class="lbl l" x="30" y="174">amount, from ${Number(lo).toFixed(2)} to ${Number(hi).toFixed(2)} · each bar ≈ ${tenth} rows</text></svg>`;
}
const line = (on, where, how, q) => `<div class="st" data-from="${on}"><span>${where}</span><span>${how}</span><b>rows=${fmt(q.est)}</b><span class="act">actual ${fmt(q.actual)}</span></div>`;
const scene = (D) => `
  <div class="card"><div class="sample"><span class="chip">orders · ${fmt(D.rows)} rows</span><span>→</span>
    <span class="chip acc">ANALYZE: a sample of ${fmt(SAMPLE)} rows</span><span>→</span><span class="chip">pg_stats: a few numbers per column</span></div></div>
  <div class="three">
    <div class="card st" data-from="1"><h4>Distinct values</h4><dl>${D.distinct.map(([c, n]) => `<dt>${c}</dt><dd>${n}</dd>`).join("")}</dl></div>
    <div class="card st" data-from="2"><h4>Most common values · status</h4><div class="bars">
      ${D.common.map(([v, s]) => bar({ label: v, share: s, value: pct(s), colour: v === "pending" ? "acc" : "", on: 'data-from="2"' })).join("")}</div></div>
  </div>
  <div class="card st" data-from="3"><h4>Histogram · amount · each bar holds a tenth of the rows; its width is the range of amounts it covers</h4>${histogram(D)}</div>
  <div class="card st" data-from="2"><h4>What the planner computes</h4><div class="sum">
    ${line(2, "status = 'pending'", `${fmt(D.rows)} × ${pct(D.common.find(([v]) => v === "pending")?.[1] ?? 0)}`, D.pending)}
    ${line(3, "amount &lt; 20", `${fmt(D.rows)} × 10% × ${below(D).toFixed(2)} of the first bar`, D.cheap)}</div></div>`;

export default { render: build({ stepper, key: "cs", label: "What the statistics hold", css: cards("cs") + CSS, steps, scene, captured: CAPTURED }) };
