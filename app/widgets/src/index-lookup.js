// index-lookup — one lookup through a real B-tree, animated: root → leaf → heap pages.
//
// The scene is ONE svg whose objects persist; a step only toggles state classes and CSS transitions
// do the moving, so stepping backwards is the same code as stepping forwards.
//
// It draws at once from CAPTURED — read off PostgreSQL 16 + Pagila with `pageinspect`, for
// `CREATE INDEX … ON rental (customer_id)` and `WHERE customer_id = 5` — then asks the lab database
// for the same facts and redraws from the answer. The live read builds its own index inside a
// transaction and rolls it back, so it leaves nothing behind and does not depend on (or collide
// with) the index lesson 08's cells create and drop. The one thing it does keep is a
// `VACUUM ANALYZE rental`, the same housekeeping the lessons' own setup cells run.

import { live } from "../lib/kernel.js";
import { stepper } from "../lib/stepper.js";

const KEY = 5;
const PROBE = "lab_widget_probe";

const CAPTURED = {
  level: 1,
  separators: [null, 40, 80, 121, 160, 200, 241, 280, 320, 361, 401, 442, 482, 523, 566],
  leafBlocks: [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  entries: [[1, 32], [2, 27], [3, 26], [4, 22], [5, 38], [6, 28], [7, 33]],
  leafKeys: [1, 39],
  rowPages: [
    6, 10, 10, 14, 15, 19, 23, 29, 34, 45, 46, 47, 48, 53, 56, 62, 62, 68, 71, 73, 77, 83, 88, 92,
    99, 99, 102, 104, 111, 113, 119, 121, 123, 129, 131, 134, 135, 142,
  ],
  sample: ["(6,87)", "(10,13)", "(10,70)", "(14,2)", "(15,24)"],
  heapPages: 150,
  heapRows: 16044,
  indexPages: 17,
};

// pageinspect prints an index key as little-endian hex bytes; this turns the first four back into
// an int, and yields NULL for the keyless leftmost downlink.
const DECODE = "CASE WHEN array_length(b, 1) IS NULL THEN NULL ELSE ('x' || b[4] || b[3] || b[2] || b[1])::bit(32)::int END";
const ROOT_ITEMS = `SELECT (ctid::text::point)[0]::int AS child, string_to_array(trim(data), ' ') AS b
  FROM bt_page_items('${PROBE}', (SELECT root FROM bt_metap('${PROBE}')))`;
const PAGES_OF = (rel) => `(pg_relation_size('${rel}') / current_setting('block_size')::int)::int`;

async function load(kernel) {
  // A freshly seeded table carries empty pages at its end until it is vacuumed (lesson 01's first
  // cell does this for the whole database); without it the heap here is 192 pages, not 150.
  await kernel.sql(["VACUUM ANALYZE rental"], { autocommit: true });
  const [, [[level]], downlinks, leaf, rowPages, sample, [[heapPages, heapRows, indexPages]]] = await kernel.sql(
    [
      `CREATE INDEX ${PROBE} ON rental (customer_id)`,
      `SELECT level FROM bt_metap('${PROBE}')`,
      `SELECT child, ${DECODE} FROM (${ROOT_ITEMS}) r`,
      `WITH seps AS (SELECT child, ${DECODE} AS sep FROM (${ROOT_ITEMS}) r),
            leaf AS (SELECT child FROM seps WHERE sep IS NULL OR sep <= ${KEY} ORDER BY sep DESC NULLS LAST LIMIT 1)
       SELECT ${DECODE} AS key, sum(coalesce(array_length(tids, 1), 1))::int
       FROM (SELECT string_to_array(trim(data), ' ') AS b, tids, htid
             FROM bt_page_items('${PROBE}', (SELECT child FROM leaf))) i
       WHERE htid IS NOT NULL GROUP BY 1 ORDER BY 1`,
      `SELECT (ctid::text::point)[0]::int FROM rental WHERE customer_id = ${KEY} ORDER BY ctid`,
      `SELECT ctid::text FROM rental WHERE customer_id = ${KEY} ORDER BY ctid LIMIT 5`,
      `SELECT ${PAGES_OF("rental")}, (SELECT count(*) FROM rental), ${PAGES_OF(PROBE)}`,
    ],
    { rollback: true },
  );
  const at = leaf.findIndex(([key]) => key === KEY);
  const from = Math.max(0, Math.min(at - 4, leaf.length - 7));
  const data = {
    level,
    separators: downlinks.map(([, sep]) => sep),
    leafBlocks: downlinks.map(([child]) => child),
    entries: leaf.slice(from, from + 7),
    leafKeys: [leaf[0][0], leaf[leaf.length - 1][0]],
    rowPages: rowPages.map(([page]) => page),
    sample: sample.map(([ctid]) => ctid),
    heapPages,
    heapRows,
    indexPages,
  };
  // The scene is laid out for a two-level tree and a table this size; anything else stays captured.
  const fits = level === 1 && at >= 0 && data.separators.length <= 16 && heapPages <= 300 && data.rowPages.length > 0;
  if (!fits) throw new Error("the live index does not have the shape this scene draws");
  return data;
}

// Scene geometry, in viewBox units.
const W = 760, X0 = 20, ROOT_Y = 60, ROOT_H = 44, LEAF_Y = 150, LEAF_H = 30;
const PANEL_Y = 200, PANEL_H = 86, ENTRY_W = 84, ENTRY_X = 32, ENTRY_Y = 226, ENTRY_H = 28;
const GRID_Y = 328, PG = 24, COLS = 30, SWEEP_MS = 1800;
const n = (x) => x.toLocaleString("en-US");

function derive(d) {
  const cell = (W - 2 * X0) / d.separators.length;
  const down = d.separators.reduce((best, sep, i) => (sep === null || sep <= KEY ? i : best), 0);
  const hits = [...new Set(d.rowPages)];
  const keyAt = d.entries.findIndex(([key]) => key === KEY);
  return {
    cell,
    down,
    hits,
    cellX: (i) => X0 + cell * i + cell / 2,
    keyX: ENTRY_X + ENTRY_W * keyAt,
    height: GRID_Y + Math.ceil(d.heapPages / COLS) * PG + 8,
    reads: 2 + hits.length,
  };
}

const steps = (d, g) => [
  {
    stop: "Table",
    title: "No index: read everything",
    note: `The only way to find customer ${KEY}'s rentals is to read all <b>${d.heapPages}</b> pages of the table.`,
  },
  {
    stop: "Index",
    title: "An index is a second structure on disk",
    note: `A B-tree sorted by <code>customer_id</code>: a root and ${d.leafBlocks.length} leaves, <b>${d.indexPages}</b> pages with its metapage — kept in sync on every write.`,
  },
  {
    stop: "Root",
    title: "Read the root",
    note:
      g.down === 0
        ? `${KEY} is below the first separator key, ${d.separators[1]} — follow the first downlink. <b>1</b> page read.`
        : `${KEY} falls in the range that starts at ${d.separators[g.down]} — follow that downlink. <b>1</b> page read.`,
  },
  {
    stop: "Leaf",
    title: "Read one leaf",
    note: `Leaf block ${d.leafBlocks[g.down]} holds keys ${d.leafKeys[0]}–${d.leafKeys[1]}. Key ${KEY} is stored once, with the addresses of all <b>${d.rowPages.length}</b> matching rows.`,
  },
  {
    stop: "Heap",
    title: "Visit only the pages those addresses name",
    note: `${d.rowPages.length} rows sit on ${g.hits.length} heap pages. 2 index pages + ${g.hits.length} heap pages = <b>${g.reads}</b> reads, not ${d.heapPages}.`,
  },
];

function scene(d, g) {
  const pageXY = (p) => [X0 + (p % COLS) * PG + 11, GRID_Y + Math.floor(p / COLS) * PG + 11];
  const fan = [g.keyX + (ENTRY_W - 6) / 2, PANEL_Y + PANEL_H];
  const on = (i) => (i === g.down ? "on" : "");
  const leafW = Math.min(40, g.cell - 6);

  const root = d.separators
    .map(
      (sep, i) => `<g class="rcell ${on(i)}">
        <rect x="${X0 + g.cell * i}" y="${ROOT_Y}" width="${g.cell}" height="${ROOT_H}"/>
        <text x="${g.cellX(i)}" y="${ROOT_Y + 27}">${sep ?? "−∞"}</text></g>`,
    )
    .join("");
  const links = d.leafBlocks
    .map((_, i) => `<line class="link ${on(i)}" x1="${g.cellX(i)}" y1="${ROOT_Y + ROOT_H}" x2="${g.cellX(i)}" y2="${LEAF_Y}"/>`)
    .join("");
  const leaves = d.leafBlocks
    .map(
      (block, i) => `<g class="leaf ${on(i)}" style="--i:${i}">
        <rect x="${g.cellX(i) - leafW / 2}" y="${LEAF_Y}" width="${leafW}" height="${LEAF_H}" rx="4"/>
        <text x="${g.cellX(i)}" y="${LEAF_Y + 20}">${block}</text></g>`,
    )
    .join("");
  const entries = d.entries
    .map(
      ([key, count], i) => `<g class="entry ${key === KEY ? "on" : ""}">
        <rect x="${ENTRY_X + ENTRY_W * i}" y="${ENTRY_Y}" width="${ENTRY_W - 6}" height="${ENTRY_H}" rx="4"/>
        <text x="${ENTRY_X + ENTRY_W * i + (ENTRY_W - 6) / 2}" y="${ENTRY_Y + 19}">${key} → ${count}</text></g>`,
    )
    .join("");
  const pages = Array.from({ length: d.heapPages }, (_, p) => {
    const [x, y] = pageXY(p);
    const hit = g.hits.indexOf(p);
    return `<rect class="pg ${hit >= 0 ? "hit" : ""}" style="--i:${p};--h:${Math.max(hit, 0)}" x="${x - 10}" y="${y - 10}" width="20" height="20" rx="3"/>`;
  }).join("");
  const pointers = g.hits
    .map((p, h) => {
      const [x, y] = pageXY(p);
      const len = Math.ceil(Math.hypot(x - fan[0], y - 10 - fan[1]));
      return `<line class="ptr" style="--h:${h};--len:${len}" x1="${fan[0]}" y1="${fan[1]}" x2="${x}" y2="${y - 10}"/>`;
    })
    .join("");
  const leafX = g.cellX(g.down);

  return `<svg viewBox="0 0 ${W} ${g.height}" role="img" style="--sweep:${SWEEP_MS / d.heapPages}ms"
      aria-label="A B-tree index lookup for customer_id = ${KEY}: the root page, one leaf page, then ${g.hits.length} of the table's ${d.heapPages} heap pages">
    <g class="query"><rect x="${W / 2 - 170}" y="4" width="340" height="28" rx="14"/>
      <text x="${W / 2}" y="23">SELECT * FROM rental WHERE customer_id = ${KEY}</text></g>
    <g class="index">
      <text class="cap" x="${X0}" y="52">index on rental (customer_id) · root page · separator keys</text>
      ${links}${root}${leaves}
      <text class="cap end" x="${W - X0}" y="${LEAF_Y + LEAF_H + 14}">${d.leafBlocks.length} leaf pages (block numbers)</text>
    </g>
    <g class="panel">
      <path class="zoom" d="M${leafX - leafW / 2} ${LEAF_Y + LEAF_H} L${X0} ${PANEL_Y} M${leafX + leafW / 2} ${LEAF_Y + LEAF_H} L${W - X0} ${PANEL_Y}"/>
      <rect class="frame" x="${X0}" y="${PANEL_Y}" width="${W - 2 * X0}" height="${PANEL_H}" rx="6"/>
      <text class="cap" x="${ENTRY_X}" y="${PANEL_Y + 17}">leaf block ${d.leafBlocks[g.down]} · keys ${d.leafKeys[0]}–${d.leafKeys[1]}, sorted · key → number of row addresses</text>
      ${entries}
      <text class="more" x="${ENTRY_X + ENTRY_W * d.entries.length + 8}" y="${ENTRY_Y + 19}">… ${d.leafKeys[1]}</text>
      <text class="ctids" x="${W / 2}" y="${PANEL_Y + PANEL_H - 10}">${KEY} → ${d.sample.join(" ")} … ${d.rowPages.length} addresses (page, row)</text>
    </g>
    <g class="pointers">${pointers}</g>
    <g class="heap">
      <text class="cap" x="${X0}" y="${GRID_Y - 10}">table rental · heap · ${n(d.heapPages)} pages · ${n(d.heapRows)} rows</text>
      ${pages}
    </g>
    <g class="token"><circle r="13"/><text y="5">${KEY}</text></g>
  </svg>
  <div class="meter">
    <span class="lab">pages read, no index</span>
    <div class="track"><div class="bar a"></div></div><span class="num a"></span>
    <span class="lab">pages read, with index</span>
    <div class="track"><div class="bar b"></div></div><span class="num b"></span>
  </div>`;
}

// Where the probe marker rests at each step, and what the with-index counter reads.
const marks = (g) => [
  { token: null, reads: null },
  { token: null, reads: 0 },
  { token: [X0 + g.cell * g.down + 2, ROOT_Y + ROOT_H / 2], reads: 1 },
  { token: [g.cellX(g.down) - Math.min(40, g.cell - 6) / 2, LEAF_Y + LEAF_H / 2], reads: 2 },
  { token: [g.keyX - 3, ENTRY_Y + ENTRY_H / 2], reads: g.reads },
];

const CSS = `
.lw { --head:88px; }
.ix svg { display:block; width:100%; height:auto; background:var(--panel); border:1px solid var(--line);
      border-radius:10px; }
.ix svg text { font:12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill:var(--ink);
      text-anchor:middle; }
.ix svg .cap { font:11.5px system-ui, sans-serif; fill:var(--mute); text-anchor:start; }
.ix svg .cap.end { text-anchor:end; }
.ix .query rect { fill:var(--code); stroke:var(--line); }
.ix .query text { font-size:12.5px; }

.ix .index, .ix .panel { opacity:0; transition:opacity .6s ease; }
.ix.s-index .index, .ix.s-leaf .panel { opacity:1; }
.ix .rcell rect { fill:var(--cell); stroke:var(--line); transition:fill .4s, stroke .4s; }
.ix .rcell text { font-size:13px; }
.ix .link { stroke:var(--line); stroke-width:1.5; transition:stroke .4s, stroke-width .4s; }
.ix .leaf rect { fill:var(--cell); stroke:var(--line); transition:fill .4s, stroke .4s; }
.ix .leaf text { font-size:11px; fill:var(--mute); }
.ix .leaf { opacity:0; transform:translateY(-8px); transition:opacity .4s ease, transform .4s ease; }
.ix.s-index .leaf { opacity:1; transform:none; transition-delay:calc(var(--i) * 35ms + 250ms); }
.ix.s-root .rcell.on rect { fill:var(--hot-bg); stroke:var(--hot); }
.ix.s-root .link.on { stroke:var(--hot); stroke-width:3; }
.ix.s-leaf .leaf.on rect { fill:var(--hot-bg); stroke:var(--hot); }
.ix.s-leaf .leaf.on text { fill:var(--hot); font-weight:700; }

.ix .zoom { stroke:var(--line); stroke-dasharray:4 4; fill:none; }
.ix .frame { fill:var(--bg); stroke:var(--line); }
.ix .entry rect { fill:var(--cell); stroke:var(--line); transition:fill .4s, stroke .4s; }
.ix .more { fill:var(--mute); text-anchor:start; }
.ix.s-leaf .entry.on rect { fill:var(--hot-bg); stroke:var(--hot); transition-delay:.7s; }
.ix.s-leaf .entry.on text { font-weight:700; }
.ix .ctids { fill:var(--hot); opacity:0; transition:opacity .5s ease; }
.ix.s-leaf .ctids { opacity:1; transition-delay:1s; }

.ix .pg { fill:var(--cell); stroke:var(--line); stroke-width:.75; transition:fill .3s, stroke .3s; }
.ix.s-sweep .pg { fill:var(--accent-bg); stroke:var(--accent);
      animation:ix-read .25s ease backwards; animation-delay:calc(var(--i) * var(--sweep)); }
.ix.s-heap .pg.hit { fill:var(--ok-bg); stroke:var(--ok); stroke-width:1.5;
      transition-delay:calc(var(--h) * 45ms + 1100ms); }
.ix .ptr { stroke:var(--ok); stroke-width:1; opacity:.5; stroke-dasharray:var(--len);
      stroke-dashoffset:var(--len); transition:stroke-dashoffset .5s ease; }
.ix.s-heap .ptr { stroke-dashoffset:0; transition-delay:calc(var(--h) * 45ms + 700ms); }

.ix .token { opacity:0; transform:translate(${W / 2}px, 18px);
      transition:transform .8s cubic-bezier(.5,0,.2,1), opacity .3s ease; }
.ix .token circle { fill:var(--hot); stroke:var(--panel); stroke-width:2; }
.ix .token text { fill:#fff; font:700 13px system-ui, sans-serif; }

.ix .meter { display:grid; grid-template-columns:auto minmax(0,1fr) 3.2em; gap:6px 12px;
      align-items:center; margin-top:12px; font-size:14px; }
.ix .meter .lab { color:var(--mute); }
.ix .meter .track { height:14px; border-radius:7px; background:var(--cell); overflow:hidden; }
.ix .meter .bar { height:100%; width:0; border-radius:7px; transition:width .6s ease; }
.ix .meter .bar.a { background:var(--accent); }
.ix .meter .bar.b { background:var(--ok); }
.ix .meter .num { font:600 15px ui-monospace, SFMono-Regular, Menlo, monospace; text-align:right; }
@keyframes ix-read { from { fill:var(--cell); stroke:var(--line); } }
`;

function render({ model, el }) {
  let data = CAPTURED;
  let g = derive(data);
  let built = null;
  let ticking = 0;

  function countUp(node, to, ms) {
    cancelAnimationFrame(ticking);
    if (ui.still) return void (node.textContent = to);
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min((t - t0) / ms, 1);
      node.textContent = Math.round(to * k);
      if (k < 1) ticking = requestAnimationFrame(tick);
    };
    ticking = requestAnimationFrame(tick);
  }

  // The full-scan bar is the fixed reference; on the first step it fills in time with the sweep.
  function meter(body, at, reads) {
    const [barA, barB, numA, numB] = [".bar.a", ".bar.b", ".num.a", ".num.b"].map((s) => body.querySelector(s));
    if (at === 0) {
      barA.style.transition = "none";
      barA.style.width = "0";
      void barA.offsetWidth;
      barA.style.transition = ui.still ? "none" : `width ${SWEEP_MS}ms linear`;
      countUp(numA, data.heapPages, SWEEP_MS);
    } else {
      cancelAnimationFrame(ticking);
      barA.style.transition = "";
      numA.textContent = data.heapPages;
    }
    barA.style.width = "100%";
    barB.style.transitionDelay = at === 4 ? "1.1s" : "0s";
    barB.style.transitionDuration = at === 4 ? "1.6s" : "";
    barB.style.width = `${((reads ?? 0) / data.heapPages) * 100}%`;
    numB.textContent = reads ?? "—";
  }

  function draw({ at, body }) {
    if (built !== data) {
      body.innerHTML = scene(data, g);
      built = data;
    }
    // The whole scene is a function of the step: each flag switches one layer on.
    const flags = { "s-sweep": at === 0, "s-index": at >= 1, "s-root": at >= 2, "s-leaf": at >= 3, "s-heap": at >= 4 };
    body.className = `body ix ${Object.keys(flags).filter((f) => flags[f]).join(" ")}`;
    const { token, reads } = marks(g)[at];
    const marker = body.querySelector(".token");
    marker.style.transform = token ? `translate(${token[0]}px, ${token[1]}px)` : "";
    marker.style.opacity = token ? 1 : "";
    meter(body, at, reads);
  }

  const ui = stepper({
    el,
    model,
    label: "An index lookup, step by step",
    css: CSS,
    steps: () => steps(data, g),
    draw,
  });
  ui.refresh();

  ui.setSource("loading");
  live(load, model?.get?.("jupyter")).then((fresh) => {
    ui.setSource(fresh ? "live" : "captured");
    if (!fresh || JSON.stringify(fresh) === JSON.stringify(data)) return;
    data = fresh;
    g = derive(data);
    ui.refresh();
  });
  return () => {
    ui.destroy();
    cancelAnimationFrame(ticking);
  };
}

export default { render };
