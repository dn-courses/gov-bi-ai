// skewed-histogram — the same kind of column twice: amounts spread evenly, and amounts where most
// rows are small. On top, how many rows fall in each tenth of the range; underneath, the ten
// boundaries ANALYZE keeps, which crowd together where the rows are. Then what the planner's
// estimate owes to them. Captured data only: measured in the lab on a table the page's cell builds.
import { cards } from "../lib/cards.js";
import { fmt, scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const LO = 5, HI = 500;
// counts: rows in each tenth of the range of amounts. bounds: the histogram's boundaries, one per tenth of the rows.
const EVEN = { name: "orders.amount", rows: 5000000, counts: [500551, 499950, 499950, 499950, 499950, 499950, 499950, 499950, 499950, 499849],
  bounds: [5.01, 55.5, 104.74, 152.34, 201.17, 250.19, 300.91, 351.14, 399.76, 450.87, 499.98] };
const SKEW = { name: "tips.amount", rows: 500000, counts: [314975, 46620, 30701, 23256, 19197, 16299, 14362, 12438, 11600, 10552],
  bounds: [5.68, 8.18, 12.76, 21.76, 37.19, 62.47, 100.75, 156.09, 234.64, 346.37, 499.97],
  below20: { est: 244996, actual: 247640 }, above400: { est: 22681, actual: 22424 } };
const FLAT = Math.round((SKEW.rows * (20 - LO)) / (HI - LO)); // what an even spread would predict for amount < 20

const steps = () => [
  { stop: "Even", title: "Amounts spread evenly: every range holds the same number of rows",
    note: `The bars count the rows in each tenth of the range. Under them, the boundaries ANALYZE keeps: each gap between two marks holds a tenth of the rows, so here the marks are evenly spaced.` },
  { stop: "Skewed", title: "Most amounts are small: the boundaries crowd where the rows are",
    note: `Tips: ${fmt(SKEW.counts[0])} of ${fmt(SKEW.rows)} are in the lowest tenth of the range. Each gap still holds a tenth of the rows, so six of the ten marks fall below 65, and the last gap alone runs from 346 to 500.` },
  { stop: "The estimate", title: "The estimate follows the shape",
    note: `How many tips are below 20? An even spread would say ${fmt(FLAT)}. The histogram says ${fmt(SKEW.below20.est)}: three whole gaps and most of a fourth lie below 20. The table has ${fmt(SKEW.below20.actual)}.` },
  { stop: "The tail", title: "And it is right at the thin end too", decisive: true,
    note: `Above 400 there are few rows, and the histogram knows it. The histogram is the planner's picture of a column: skew is not a problem as long as the picture is current.` },
];

const CSS = `
.lw .sh .card.st:not(.on) { display:none; }
.lw .sh .col { fill:var(--cell); stroke:var(--line); transition:fill .4s; }
.lw .sh .col.lit { fill:var(--accent-bg); stroke:var(--accent); }
.lw .sh .axis { stroke:var(--line); }
.lw .sh .mark { fill:var(--ok); }
.lw .sh .gap { stroke:var(--ok); stroke-width:2; }
.lw .sh .cut { stroke:var(--accent); stroke-width:2; stroke-dasharray:4 3; }
.lw .sh text.sm { font:12px ui-monospace, Menlo, monospace; font-weight:400; }
.lw .sh .facts { display:grid; grid-template-columns:max-content 1fr max-content max-content; gap:8px 18px; align-items:center; font:14px ui-monospace, Menlo, monospace; }
.lw .sh .facts > div { display:contents; } .lw .sh .facts > div > * { transition:opacity .6s; } .lw .sh .facts > div.st:not(.on) > * { opacity:0; }
.lw .sh .facts b { color:var(--accent); } .lw .sh .facts .hot { color:var(--hot); } .lw .sh .facts .act { color:var(--mute); }
`;
const x = (v) => 40 + ((v - LO) / (HI - LO)) * 690;
// One column drawn twice over the same axis: counts per equal range above it, ANALYZE's boundaries below.
function picture(D, on, cuts) {
  const top = Math.max(...D.counts), width = (HI - LO) / 10;
  const bars = D.counts.map((n, i) => { const h = Math.max(2, (110 * n) / top), x0 = x(LO + i * width), w = x(LO + (i + 1) * width) - x0;
    return `<rect class="col" x="${x0 + 2}" y="${150 - h}" width="${w - 4}" height="${h}" rx="3"/><text class="sm ${h > 30 ? "" : "dim"}" x="${x0 + w / 2}" y="${h > 30 ? 150 - h / 2 : 138 - h}">${fmt(n)}</text>`; }).join("");
  let last = -100;
  const marks = D.bounds.map((b) => { const show = x(b) - last >= 46; if (show) last = x(b);
    return `<path class="mark" d="M${x(b)} 172 l-5 10 h10 z"/>${show ? `<text class="sm" x="${x(b)}" y="196">${b.toFixed(b < 100 ? 2 : 0)}</text>` : ""}`; }).join("");
  return `<div class="card st" ${on}><h4>${D.name} · ${fmt(D.rows)} rows</h4><svg viewBox="0 0 760 232">
    <text class="cap" x="40" y="14">ROWS IN EACH TENTH OF THE RANGE</text>${bars}
    <line class="axis" x1="40" y1="150" x2="730" y2="150"/><text class="sm dim" x="40" y="162" style="text-anchor:start">${LO}</text><text class="sm dim" x="730" y="162" style="text-anchor:end">${HI}</text>
    <line class="gap" x1="${x(D.bounds[0])}" y1="172" x2="${x(D.bounds[10])}" y2="172"/>${marks}
    <text class="lbl l" x="40" y="220">the boundaries ANALYZE keeps: each gap between two marks holds a tenth of the rows</text>
    ${cuts.map(([value, from]) => `<g class="st" data-on="${from}"><line class="cut" x1="${x(value)}" y1="22" x2="${x(value)}" y2="172"/><text class="sm acc" x="${x(value) + (value < 250 ? 6 : -6)}" y="30" style="text-anchor:${value < 250 ? "start" : "end"}">amount ${value < 250 ? "&lt;" : "&gt;"} ${value}</text></g>`).join("")}</svg></div>`;
}
const fact = (on, where, how, est, actual, tone = "") => `<div class="st" data-from="${on}"><span>${where}</span><span>${how}</span><b class="${tone}">rows=${fmt(est)}</b><span class="act">actual ${fmt(actual)}</span></div>`;
const scene = () => `${picture(EVEN, 'data-on="0 1"', [])}${picture(SKEW, 'data-from="1"', [[20, 2], [400, 3]])}
  <div class="card st" data-from="2"><h4>What the planner computes for tips</h4><div class="facts">
    ${fact("2", "amount &lt; 20", "assuming an even spread", FLAT, SKEW.below20.actual, "hot")}
    ${fact("2", "amount &lt; 20", "from the histogram", SKEW.below20.est, SKEW.below20.actual)}
    ${fact("3", "amount &gt; 400", "assuming an even spread", Math.round((SKEW.rows * (HI - 400)) / (HI - LO)), SKEW.above400.actual, "hot")}
    ${fact("3", "amount &gt; 400", "from the histogram", SKEW.above400.est, SKEW.above400.actual)}</div></div>`;

export default { render: build({ stepper, key: "sh", label: "A histogram of a skewed column", css: cards("sh") + CSS, steps, scene }) };
