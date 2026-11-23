// cpu-or-io — two slow queries, each one's own time split into waiting for pages and working on rows.
import { fmt, scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const QUERIES = {
  a: { name: "Query A", what: "units sold per product",
    sql: `SELECT product_id, sum(quantity) FROM order_items GROUP BY product_id` },
  b: { name: "Query B", what: "20,000 orders, scattered",
    sql: `SELECT sum(amount) FROM orders WHERE order_id = ANY (ARRAY(SELECT g * 250 + 7 FROM generate_series(0, 19999) g))` },
};
// total / read: milliseconds in all and waiting on reads; rows: rows the scan worked on.
const CAPTURED = {
  a: { total: 2510, read: 6, rows: 15000000, pages: 95542, out: 10000 },
  b: { total: 340, read: 274, rows: 20000, pages: 33743, out: 1 },
};

const share = (q) => { const p = (100 * q.read) / q.total; return (p < 1 ? p.toFixed(1) : Math.round(p)) + "%"; };
const steps = (D) => [
  { stop: "Two queries", title: "Two queries, both slower than we want",
    note: `The total time says <i>that</i> a query is slow. It does not say what the time went on.` },
  { stop: "Query A", title: "Query A works: CPU-bound",
    note: `<b>${share(D.a)}</b> of its time was spent waiting for pages. The rest went on ${fmt(D.a.rows)} rows, one after another.` },
  { stop: "Query B", title: "Query B waits: I/O-bound",
    note: `<b>${share(D.b)}</b> of its time was spent waiting for pages — ${fmt(D.b.pages)} of them, to fetch ${fmt(D.b.rows)} rows.` },
  { stop: "So", title: "Different bottleneck, different fix", decisive: true,
    note: `CPU-bound: touch fewer rows, or share the work. I/O-bound: touch fewer pages, or have them in memory already.` },
];

const CSS = `
.lw .ci text.num { font:600 18px ui-monospace, Menlo, monospace; text-anchor:end; }
.lw .ci .q .zone { transition:stroke .5s; }
.lw .ci[data-at="1"] .qa .zone, .lw .ci[data-at="2"] .qb .zone { stroke:var(--accent); }
.lw .ci .whole { fill:var(--cell); }
.lw .ci .io { fill:var(--hot); transform-box:fill-box; transform-origin:left center; transform:scaleX(0); transition:transform .9s; }
.lw .ci .cpu { fill:var(--accent); transform-box:fill-box; transform-origin:right center; transform:scaleX(0); transition:transform .9s; }
.lw .ci .part { opacity:0; transition:opacity .6s .5s; }
.lw .ci:not([data-at="0"]) .qa .io, .lw .ci:not([data-at="0"]) .qa .cpu,
.lw .ci[data-at="2"] .qb .io, .lw .ci[data-at="2"] .qb .cpu, .lw .ci[data-at="3"] .qb .io, .lw .ci[data-at="3"] .qb .cpu { transform:none; }
.lw .ci:not([data-at="0"]) .qa .part, .lw .ci[data-at="2"] .qb .part, .lw .ci[data-at="3"] .qb .part { opacity:1; }
.lw .ci .chip { fill:var(--accent-bg); } .lw .ci .chip.h { fill:var(--hot-bg); }
`;
const X = 46, W = 668;
// One query: its total, a bar split to scale, and the three counts that explain the split.
function query(k, q, y) {
  const w = Math.max(4, (W * q.read) / q.total);
  return `<g class="q q${k}"><rect class="zone" x="26" y="${y}" width="708" height="164" rx="12"/>
  <text class="cap" x="42" y="${y + 20}">${QUERIES[k].name.toUpperCase()}</text><text class="lbl l" x="118" y="${y + 20}">${QUERIES[k].what}</text>
  <text class="num" x="716" y="${y + 22}">${fmt(Math.round(q.total))} ms</text>
  <rect class="whole" x="${X}" y="${y + 44}" width="${W}" height="34" rx="6"/>
  <rect class="cpu" x="${X + w}" y="${y + 44}" width="${W - w}" height="34" rx="6"/><rect class="io" x="${X}" y="${y + 44}" width="${w}" height="34" rx="${Math.min(6, w / 2)}"/>
  <g class="part"><text class="l hot" x="${X}" y="${y + 98}">waiting for pages · ${fmt(Math.round(q.read))} ms · ${share(q)}</text>
    <text class="r acc" x="${X + W}" y="${y + 98}">working on rows · ${fmt(Math.round(q.total - q.read))} ms</text>
    <text class="mono l dim" x="${X}" y="${y + 136}">rows worked on ${fmt(q.rows)}</text><text class="mono dim" x="380" y="${y + 136}">pages read ${fmt(q.pages)}</text><text class="mono r dim" x="${X + W}" y="${y + 136}">rows returned ${fmt(q.out)}</text></g></g>`;
}
const scene = (D) => `<svg viewBox="0 0 760 420">${query("a", D.a, 8)}${query("b", D.b, 186)}
  <g class="st" data-from="3"><rect class="chip" x="26" y="368" width="344" height="40" rx="20"/><text class="acc" x="198" y="389">CPU-bound → fewer rows, or more workers</text>
    <rect class="chip h" x="390" y="368" width="344" height="40" rx="20"/><text class="hot" x="562" y="389">I/O-bound → fewer pages, or pages in memory</text></g></svg>`;

export default { render: build({ stepper, key: "ci", label: "CPU-bound or I/O-bound", css: CSS, steps, scene, captured: CAPTURED }) };
