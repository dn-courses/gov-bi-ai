// index-only-scan — a query the index can answer alone, one action at a time: counting entries with
// no visit to the table, the visits that remain when a page has changed lately, and the table coming
// back as soon as a column outside the index is asked for. Measured on shop at the end.
import { DESK, css, drive, last, scaled } from "../lib/joinplay.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

// Three index entries: customer_id and the pages its three rows are on.
const ENTRIES = [[1, [1333, 2666, 3999]], [2, [235, 1333, 2902]], [3, [471, 2666, 3137]]];
const ROWS = ENTRIES.flatMap(([customer, pages]) => pages.map((page, n) => ({ customer, page, n })));
const FILE = [...new Set(ROWS.map((r) => r.page))].sort((a, b) => a - b); // the table's pages, in file order
const at = (page) => FILE.indexOf(page);
const ORDINAL = ["first", "second", "third"], CHANGED = 2666; // one page was written to since the last vacuum

// Walk the nine entries. `needs(row)`: must this entry's row be looked at in the table?
function walk({ clean, intro, needs, counted, visit, skip, outro }) {
  let turns = FILE.map(() => []), fetched = 0;
  const base = () => ({ entry: -1, page: -1, turns, clean });
  const counts = (n) => [[counted, n], ["trips to the table", fetched]];
  const states = [{ ...base(), counts: counts(0), say: intro }];
  ROWS.forEach((row, e) => {
    const go = needs(row), p = at(row.page);
    if (go) { fetched += 1; turns = turns.map((t, i) => (i === p ? [...t, e + 1] : t)); }
    states.push({ ...base(), entry: e, page: go ? p : -1, check: clean ? p : -1, counts: counts(e + 1), fly: go ? [[`.e[data-e="${e}"]`, `.pg[data-p="${p}"]`]] : [],
      say: (go ? visit : skip)(row) });
  });
  states.push({ ...base(), counts: counts(ROWS.length), say: outro(fetched) });
  return states;
}
const who = ({ customer, n }) => `Customer ${customer}'s ${ORDINAL[n]} order`;
const ALL_CLEAN = FILE.map(() => true), ONE_CHANGED = FILE.map((page) => page !== CHANGED);
const COUNT = walk({ clean: ALL_CLEAN, counted: "entries counted", needs: () => false,
  intro: `How many orders do customers 1 to 3 have? The index has one entry per order, in the order of the customer number.`,
  skip: (r) => `${who(r)}: one more. The entry is enough; its page in the table is not opened.`,
  outro: () => `Nine orders counted from the index alone. The table was never touched.` });
const CHECK = walk({ clean: ONE_CHANGED, counted: "entries counted", needs: (r) => r.page === CHANGED,
  intro: `A row on page ${CHANGED} was changed a moment ago. An index entry cannot say whether its row is still valid, so the scan consults a small map: one mark per page whose rows are all known to be valid.`,
  skip: (r) => `${who(r)}: page ${r.page} is marked as all valid. Counted, without a visit.`,
  visit: (r) => `${who(r)}: page ${r.page} is not marked, so the row itself has to be checked. One trip to the table.`,
  outro: (n) => `Nine orders counted, with ${n} trips to the table. In the plan this is <code>Heap Fetches: ${n}</code>. Vacuum marks the page again and the trips disappear.` });
const SUM = walk({ clean: ALL_CLEAN, counted: "entries read", needs: () => true,
  intro: `Now the total of their amounts. The amount is not in the index: it is only in the table.`,
  visit: (r) => `${who(r)}: the amount is on page ${r.page}. A trip to the table.`,
  outro: (n) => `Nine entries, ${n} trips to the table. One column more in the query, and the index is only a signpost again.` });
const PHASES = [{ states: COUNT, tick: 800 }, { states: CHECK, tick: 1000 }, { states: SUM, tick: 800 }, { plain: true, states: [last(SUM)] }];

const steps = () => [
  { stop: "Index alone", title: "The index holds everything the query asks for", produces: "Index Only Scan",
    note: `Press Play, or Step for one action at a time. A count needs no column at all, and the filter is on the indexed column.` },
  { stop: "Still valid?", title: "A page that changed lately still has to be visited", produces: "Index Only Scan · Heap Fetches",
    note: `Press Play. The scan skips the table only for pages that are marked as holding nothing but valid rows.` },
  { stop: "One more column", title: "Ask for a column the index does not hold, and the table is back", produces: "Index Scan",
    note: `Press Play. The same nine entries, but every one of them now leads to a page.` },
  { stop: "At scale", title: "What skipping the table is worth", decisive: true,
    note: `The index is a small, ordered copy of one column. Reading it alone saves every trip to the table, and on many rows those trips are nearly all of the work.` },
];

const CSS = `
.lw .io .ents { display:grid; gap:8px; }
.lw .io .ent { display:flex; align-items:center; gap:8px; flex-wrap:wrap; font:13px ui-monospace, Menlo, monospace; }
.lw .io .ent b { width:96px; font-weight:600; }
.lw .io .e, .lw .io .bit, .lw .io .pg { border-radius:8px; background:var(--cell); border:1.5px solid transparent; transition:background .25s, border-color .25s, color .25s, opacity .25s; }
.lw .io .e { padding:5px 10px; }
.lw .io .e.now { border-color:var(--accent); background:var(--accent-bg); color:var(--accent); }
.lw .io .strip, .lw .io .file { display:grid; grid-template-columns:repeat(${FILE.length}, 1fr); gap:6px; }
.lw .io .bit { height:26px; display:grid; place-items:center; font:600 13px ui-monospace, Menlo, monospace; background:var(--ok-bg); border-color:var(--ok); color:var(--ok); }
.lw .io .bit.no { background:var(--hot-bg); border-color:var(--hot); color:var(--hot); }
.lw .io .bit.now { box-shadow:0 0 0 2px var(--accent); }
.lw .io .pg { padding:8px 2px; text-align:center; font:600 13px ui-monospace, Menlo, monospace; opacity:.45; }
.lw .io .pg small { display:block; margin-top:4px; min-height:18px; font:600 14px ui-monospace, Menlo, monospace; color:var(--hot); }
.lw .io .pg.seen { opacity:1; border-color:var(--line); }
.lw .io .pg.now { opacity:1; border-color:var(--hot); background:var(--hot-bg); color:var(--hot); }
`;
const scene = () => `${DESK}
  <div class="card"><h4>The index's entries, in order of customer_id</h4><div class="ents">${ENTRIES.map(([customer, pages], c) =>
    `<div class="ent"><b>customer ${customer}</b>${pages.map((page, n) => `<span class="e" data-e="${c * 3 + n}">→ page ${page}</span>`).join("")}<span>…</span></div>`).join("")}</div></div>
  <div class="card"><h4>The map: pages whose rows are all known to be valid</h4><div class="strip">${FILE.map((_, p) => `<span class="bit" data-p="${p}"></span>`).join("")}</div></div>
  <div class="card"><h4>The table's pages, in file order · under each, the turns it was read on</h4>
    <div class="file">${FILE.map((page, p) => `<div class="pg" data-p="${p}">${page}<small></small></div>`).join("")}</div></div>
  ${scaled("Measured on the shop database: the orders of 2,000 customers, 100,000 rows", `data-from="3"`, ["count(*)", "count(*), sum(amount)"], [
    ["9 rows", "the animation", ["0 trips to the table"], ["9 trips"]],
    ["Pages read", "the index is 34 MB; the table is 521 MB", ["6,059", "index pages only", "pick"], ["66,410", "nearly every page of the table", "slow"]],
    ["Time", "measured", ["9.6 ms", "<b>22×</b> faster", "pick"], ["215 ms", "", "slow"]],
  ])}`;

function draw(root, s) {
  root.querySelectorAll(".e").forEach((e, i) => e.classList.toggle("now", i === s.entry));
  root.querySelectorAll(".bit").forEach((b, p) => { b.className = "bit" + (s.clean[p] ? "" : " no") + (p === s.check ? " now" : ""); b.textContent = s.clean[p] ? "✓" : "changed"; });
  root.querySelectorAll(".pg").forEach((pg, p) => {
    pg.className = "pg" + (s.turns[p].length ? " seen" : "") + (p === s.page ? " now" : "");
    pg.querySelector("small").textContent = s.turns[p].join(", ");
  });
  root.querySelector(".say").innerHTML = s.say;
  root.querySelector(".counts").innerHTML = s.counts.map(([label, n]) => `<span>${label}<b>${n}</b></span>`).join("");
}

export default { render: build({ stepper, key: "io", label: "Index Only Scan", css: css("io") + CSS, steps, scene, after: (root, at) => drive(root, at, PHASES, draw) }) };
