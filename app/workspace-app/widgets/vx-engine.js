// vx-engine — a real vectorized engine on the same query: DuckDB's plan for the average of
// bikes_available > 0 over station_status.parquet, drawn as its chain of operators; then the size
// of its batches (its vector) and its time beside the two Python runs.
import { fmt, scene as build } from "@widget-lib/scene.js";
import { stepper } from "@widget-lib/stepper.js";

// Re-measured 2026-11-23 on the 346 MB file page 01 writes (ORDER BY station_id, captured_at), in the lesson app on the postgres lab (columnar-mpp/06-vectorized-execution),
// three runs in one held lab call. DuckDB 2.0.0, `SET threads = 1; EXPLAIN ANALYZE SELECT
// avg(bikes_available) FROM 'station_status.parquet' WHERE bikes_available > 0;`: Total Time
// 0.0405–0.0421 s, Data Read 17.0 MB, Table Scan 25,431,214 rows 30.0 ms with `Filters:
// bikes_available > 0`, Row Groups Scanned 211 / 211, Ungrouped Aggregate sum(#0), count_star()
// 1 row 10.0 ms. `duckdb.__standard_vector_size__` = 2048. Python times from this page's cells:
// one row per call 1.06–1.26 s, batches of 2,048 0.14–0.15 s.
const CAPTURED = {
  values: 25920000, vector: 2048, vectors: 12657, totalS: "0.04", readMb: "17.0",
  nodes: [ // top of the plan first: name, detail, rows, time
    ["Projection", "sum / count: the average", "1 row", ""],
    ["Ungrouped Aggregate", "sum(bikes_available), count(*)", "1 row", "10 ms"],
    ["Projection", "bikes_available", "25,431,214 rows", ""],
    ["Table Scan", "PARQUET_SCAN · Filters: bikes_available &gt; 0", "25,431,214 rows", "30 ms"],
  ],
  race: [["Python, one row per call", "from memory", 1.1, ""], ["Python, 2,048 per call", "from memory", 0.15, ""],
    ["DuckDB, one thread", "reading the file too", 0.04, "on"]],
};

const steps = (D) => [
  { stop: "DuckDB's plan", title: "The same chain of operators, in a real engine",
    note: `DuckDB's <code>EXPLAIN ANALYZE</code> for the same query, read bottom up. The filter runs inside the scan; the average is a sum and a count, then one division. One thread, the whole query: <b>${D.totalS} s</b>.` },
  { stop: "Its vector", title: "DuckDB hands on 2,048 values per call", decisive: true,
    note: `DuckDB's batch, its <b>vector</b>, holds <b>${fmt(D.vector)} values</b> of a column: ${fmt(D.vectors)} vectors for this column. Its operators are compiled loops over them, so on one thread it reads the file <i>and</i> answers faster than Python's batches over a column already in memory.` },
];

const CSS = `
.lw .vxe text.huge { font:650 34px ui-monospace, Menlo, monospace; text-anchor:start; fill:var(--accent); letter-spacing:-.02em; }
.lw .vxe text.nm { font:650 14px system-ui, sans-serif; text-anchor:start; }
.lw .vxe .lnk { fill:none; stroke:var(--line); stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
.lw .vxe .rule { stroke:var(--line); stroke-width:1; }
.lw .vxe .lanec { fill:var(--accent); opacity:.4; }
.lw .vxe .chip { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1; }
.lw .vxe text.ms { font:600 13px ui-monospace, Menlo, monospace; fill:var(--accent); text-anchor:end; }
`;

const PX = 34, PW = 392, PH = 52;
const nodeY = (i) => 52 + i * 70;

// An upward link with its chevron between two plan nodes (rows flow from the scan up).
const up = (i) => { const hi = nodeY(i) + PH, lo = nodeY(i + 1);
  return `<path class="lnk" d="M230 ${lo} L230 ${hi + 2} M224 ${hi + 8} L230 ${hi + 2} L236 ${hi + 8}"/>`; };

const node = ([name, detail, rows, ms], i) => { const y = nodeY(i), hit = i === 3 || i === 1 ? " hit" : "";
  return `<rect class="pill${hit}" x="${PX}" y="${y}" width="${PW}" height="${PH}" rx="14"/>
    <text class="nm" x="${PX + 16}" y="${y + 18}">${name}</text>
    <text class="mono r" x="${PX + PW - 16}" y="${y + 18}">${rows}</text>
    <text class="lbl l" x="${PX + 16}" y="${y + 38}">${detail}</text>
    ${ms ? `<text class="ms" x="${PX + PW - 16}" y="${y + 38}">${ms}</text>` : ""}`; };

const plan = (D) => `<g class="st" data-on="0"><rect class="zone" x="14" y="14" width="432" height="320" rx="12"/>
  <text class="cap" x="34" y="38">EXPLAIN ANALYZE · READ BOTTOM UP ↑</text>
  ${D.nodes.slice(1).map((_, i) => up(i)).join("")}
  ${D.nodes.map(node).join("")}
  <rect class="zone" x="460" y="14" width="286" height="320" rx="12"/>
  <text class="cap" x="478" y="38">SUMMARY · ONE THREAD</text>
  <text class="lbl l" x="478" y="78">Total Time</text><text class="huge" x="478" y="114">${D.totalS} s</text>
  <line class="rule" x1="478" y1="146" x2="728" y2="146"/>
  <text class="lbl l" x="478" y="176">Data Read</text><text class="huge" x="478" y="212">${D.readMb} MB</text>
  <rect class="chip" x="478" y="250" width="250" height="56" rx="10"/>
  <text class="lbl l" x="494" y="270">from station_status.parquet,</text>
  <text class="lbl l" x="494" y="290">not from memory</text></g>`;

// One vector drawn as a strip of value cells with a gap in the middle that carries its size.
const strip = (D) => `<rect class="box hit" x="34" y="58" width="320" height="40" rx="9"/>
  ${Array.from({ length: 22 }, (_, t) => (t >= 6 && t <= 15 ? "" : `<rect class="lanec" x="${44 + t * 13.6}" y="68" width="9" height="20" rx="2"/>`)).join("")}
  <text class="big acc" x="194" y="79">${fmt(D.vector)} values</text>
  <text class="l" x="376" y="70">${fmt(D.values)} values of bikes_available</text>
  <text class="lbl l" x="376" y="92">= <tspan class="acc" style="fill:var(--accent);font-weight:650">${fmt(D.vectors)} vectors</tspan>, one call each</text>`;

const vector = (D) => { const scale = 330 / D.race[0][2];
  return `<g class="st" data-on="1"><rect class="zone" x="14" y="14" width="732" height="320" rx="12"/>
  <text class="cap" x="34" y="42">ONE VECTOR</text>
  ${strip(D)}
  <line class="rule" x1="34" y1="126" x2="726" y2="126"/>
  <text class="cap" x="34" y="156">THE SAME QUERY, ONE THREAD · SECONDS</text>
  ${D.race.map(([label, where, s, cls], i) => { const y = 196 + i * 48, w = Math.max(3, s * scale);
    return `<text class="l ${cls ? "acc" : ""}" x="34" y="${y}">${label}</text><text class="lbl l" x="34" y="${y + 20}">${where}</text>
      <line class="rule" x1="269" y1="${y - 15}" x2="269" y2="${y + 17}"/>
      <rect class="bar ${cls}" x="270" y="${y - 9}" width="${w}" height="20" rx="5"/>
      <text class="big l ${cls ? "acc" : ""}" x="${282 + w}" y="${y + 2}">${s} s</text>`; }).join("")}</g>`; };

const scene = (D) => `<svg viewBox="0 0 760 348">${plan(D)}${vector(D)}</svg>`;

export default { render: build({ stepper, key: "vxe", label: "DuckDB: the plan and its vector", css: CSS, steps, scene, captured: CAPTURED }) };
