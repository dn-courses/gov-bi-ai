// query-journey — a click-through of one query's trip from SQL text to rows.
//
// It draws at once from CAPTURED (lesson 01's own facts, PostgreSQL 16 + Pagila), then asks the lab
// database for the same facts and redraws from the answer. Before planning it runs
// `VACUUM ANALYZE film`, which is what the lesson's own first cell does — without it a freshly
// seeded lab has no statistics and plans this query at a different cost and row estimate than the
// lesson's text quotes.

import { live } from "../lib/kernel.js";
import { stepper } from "../lib/stepper.js";

const SQL = "SELECT title FROM film WHERE rental_rate = 0.99";

const CAPTURED = {
  plan: ["Seq Scan on film  (cost=0.00..67.50 rows=341 width=15)", "  Filter: (rental_rate = 0.99)"],
  films: [
    [1, "ACADEMY DINOSAUR", "0.99"],
    [2, "ACE GOLDFINGER", "4.99"],
    [3, "ADAPTATION HOLES", "2.99"],
    [4, "AFFAIR PREJUDICE", "2.99"],
    [5, "AFRICAN EGG", "2.99"],
    [6, "AGENT TRUMAN", "2.99"],
    [7, "AIRPLANE SIERRA", "4.99"],
    [8, "AIRPORT POLLOCK", "4.99"],
    [9, "ALABAMA DEVIL", "2.99"],
    [10, "ALADDIN CALENDAR", "4.99"],
    [11, "ALAMO VIDEOTAPE", "0.99"],
    [12, "ALASKA PHANTOM", "0.99"],
  ],
  total: 1000,
  matching: 341,
};

async function load(kernel) {
  const [, plan, films, [[total, matching]]] = await kernel.sql(
    [
      "VACUUM ANALYZE film",
      `EXPLAIN ${SQL}`,
      "SELECT film_id, title, rental_rate::text FROM film ORDER BY ctid LIMIT 12",
      "SELECT count(*), count(*) FILTER (WHERE rental_rate = 0.99) FROM film",
    ],
    { autocommit: true },
  );
  return { plan: plan.map(([line]) => line), films, total, matching };
}

const QUERY = `<span class="kw">SELECT</span> title <span class="kw">FROM</span> film <span class="kw">WHERE</span> rental_rate = 0.99`;

const tree = (resolved) => {
  const tag = (text) => (resolved ? ` <span class="ok">${text}</span>` : "");
  return `<pre class="tree">SELECT
├─ columns   <b>title</b>${tag("✓ film.title")}
├─ from      <b>film</b>${tag("✓ table public.film")}
└─ where     <b>rental_rate</b> = 0.99${tag("✓ numeric column")}</pre>`;
};

function paths(d) {
  const node = d.plan[0].split("  (")[0];
  const cost = d.plan[0].match(/\.\.([\d.]+)/)?.[1] ?? "?";
  const rejected = node.startsWith("Seq Scan")
    ? `<div class="path out"><span>Index Scan</span><span>—</span><span class="mark">no index on rental_rate</span></div>`
    : "";
  return `<div class="paths">
      <div class="path win"><span>${node}</span><span>cost ${cost}</span><span class="mark">✓ cheapest</span></div>
      ${rejected}
    </div>
    <pre class="plan">${d.plan.join("\n")}</pre>`;
}

const scan = (d) =>
  `<div class="scan">${d.films
    .map(
      ([id, title, rate], i) =>
        `<div class="row ${rate === "0.99" ? "hit" : "miss"}" style="animation-delay:${i * 0.16}s">
           <span class="id">${id}</span><span class="title">${title}</span>
           <span class="rate">${rate}</span><span class="mark">${rate === "0.99" ? "→ out" : "✕"}</span>
         </div>`,
    )
    .join("")}</div>
  <p class="note2">…and on through the table: <b>${d.total.toLocaleString("en-US")}</b> rows read, <b>${d.matching.toLocaleString("en-US")}</b> returned.</p>`;

const STEPS = [
  {
    stop: "SQL text",
    title: "You wrote what, not how",
    produces: "SQL text",
    note: "A description of the answer. Nothing here says how to find it.",
    art: () => `<pre class="sql">${QUERY}</pre>`,
  },
  {
    stop: "Parse",
    title: "Syntax check",
    produces: "parse tree",
    note: "Grammar only, no catalog. The names are still just strings — <code>flim</code> would pass.",
    art: () => tree(false),
  },
  {
    stop: "Analyze",
    title: "Semantic analysis",
    produces: "query tree",
    note: "Names resolved against the catalog. A misspelled table or column fails here.",
    art: () => tree(true),
  },
  {
    stop: "Rewrite",
    title: "Rewriter",
    produces: "rewritten query tree",
    note: "Applies catalog rules — above all, expanding views. Still what, not how.",
    art: () =>
      `<div class="dim">${tree(true)}</div>
       <p class="note2"><b>film</b> is a base table, not a view — nothing to expand.</p>`,
  },
  {
    stop: "Plan",
    title: "Planner / optimizer",
    produces: "plan tree",
    decisive: true,
    badge: "The only stage that picks fast or slow",
    note: "Generates the possible paths, estimates each one's cost, keeps the cheapest.",
    art: paths,
  },
  {
    stop: "Execute",
    title: "Executor",
    produces: "result rows",
    note: "Runs the plan it was handed, faithfully: read every row, keep the matches.",
    art: scan,
  },
];

const CSS = `
.lw { --head:118px; }
.qj .art { background:var(--panel); border:1px solid var(--line); border-radius:10px;
      padding:14px 16px; min-height:200px; overflow-x:auto; animation:lw-in .4s ease both; }
.qj pre { margin:0; font:15px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      white-space:pre; background:none; color:var(--ink); border:0; padding:0; }
.qj .kw { color:var(--accent); font-weight:600; }
.qj .tree b { color:var(--accent); }
.qj .ok { display:inline-block; margin-left:8px; padding:0 8px; border-radius:999px;
      background:var(--ok-bg); color:var(--ok); font-size:13px; animation:lw-in .5s ease both; }
.qj .dim { opacity:.55; }
.qj .note2 { margin:12px 0 0; font-size:14px; color:var(--mute); }
.qj .note2 b { color:var(--ink); }

.qj .paths { display:grid; gap:8px; margin-bottom:14px; }
.qj .path { display:grid; grid-template-columns:1.3fr .8fr 1.6fr; gap:10px; padding:8px 12px;
      border:1px solid var(--line); border-radius:8px; font-size:15px; animation:lw-in .45s ease both; }
.qj .path.win { border-color:var(--ok); background:var(--ok-bg); font-weight:600; animation-delay:.45s; }
.qj .path.win .mark { color:var(--ok); }
.qj .path.out { color:var(--mute); }
.qj .path.out span:first-child { text-decoration:line-through; }
.qj .plan { padding-top:12px; border-top:1px dashed var(--line); animation:lw-in .5s ease .9s both; }

.qj .scan { display:grid; gap:3px; }
.qj .row { display:grid; grid-template-columns:2.2em minmax(0,1fr) 3.2em 4em; gap:10px;
      padding:2px 8px; border-radius:6px; font:14px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
      animation:qj-scan .4s ease both; }
.qj .row .id, .qj .row .rate { text-align:right; }
.qj .row .title { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.qj .row.miss { color:var(--mute); }
.qj .row.miss .mark { opacity:.6; }
.qj .row.hit { background:var(--ok-bg); color:var(--ok); font-weight:600; }
@keyframes qj-scan { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:none; } }
`;

function render({ model, el }) {
  let data = CAPTURED;
  const ui = stepper({
    el,
    model,
    label: "The journey of a query, from SQL text to rows",
    css: CSS,
    steps: () => STEPS,
    // A fresh panel node per step, so its entrance animations restart every time.
    draw: ({ step, body }) => {
      body.className = "body qj";
      body.innerHTML = `<div class="art">${step.art(data)}</div>`;
    },
  });
  ui.refresh();

  ui.setSource("loading");
  live(load, model?.get?.("jupyter")).then((fresh) => {
    ui.setSource(fresh ? "live" : "captured");
    if (!fresh || JSON.stringify(fresh) === JSON.stringify(data)) return;
    data = fresh;
    ui.refresh();
  });
  return ui.destroy;
}

export default { render };
