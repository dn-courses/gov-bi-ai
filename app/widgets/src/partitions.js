// partitions — orders split into one table per month: a filter on the month reads one piece,
// a filter on anything else reads them all, and an old month is dropped instead of deleted.
// Fixed, measured numbers; clicking a month shows what a query for that month reads.
import { bar, cards, time } from "../lib/cards.js";
import { fmt, scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const PAGES_PER_DAY = 96; // 7,200 orders a day, 75 to a page
const days = (y, m) => new Date(y, m, 0).getDate();
// 2024-01 … 2025-11; the last month is partial.
const MONTHS = Array.from({ length: 23 }, (_, i) => { const y = 2024 + Math.floor(i / 12), m = (i % 12) + 1;
  return { name: `${y}-${String(m).padStart(2, "0")}`, pages: i === 22 ? 2347 : days(y, m) * PAGES_PER_DAY }; });
const D = { pages: 66657, plain: 200, pruned: 8, june: 17, del: { ms: 125, rows: 223199, size: "521 MB" }, drop: { ms: 10, size: "498 MB" } };

const steps = () => [
  { stop: "One table", title: "One hour of orders, in one big table",
    note: `Without an index on the date, finding 300 orders means reading all ${fmt(D.pages)} pages.` },
  { stop: "Split", title: "The same rows, split into a table per month", produces: "PARTITION BY RANGE (created_at)",
    note: `Queries still name one table. Each row is stored in the piece its date belongs to.` },
  { stop: "Pruning", title: "A filter on the date rules pieces out before reading them",
    note: `The plan names only the month the filter can match. No index was involved. Click a month to ask for another.` },
  { stop: "Other filters", title: "A filter on anything else reads every piece",
    note: `Partitioning helps only queries that filter on the partition key. For customer 1 it is ${MONTHS.length} scans in place of one.` },
  { stop: "Lifecycle", title: "Removing a month: drop the piece", decisive: true,
    note: `A DELETE visits every row and leaves the space behind for cleanup. Dropping a partition removes a file. This, more than speed, is why large tables are partitioned.` },
];

const CSS = `
.lw .pt .months { display:grid; grid-template-columns:repeat(12, 1fr); gap:6px; }
.lw .pt .m { padding:9px 0; border-radius:8px; border:1.5px solid var(--line); background:var(--cell); text-align:center; font:12px ui-monospace, Menlo, monospace;
      color:var(--ink); cursor:default; transition:background .35s, border-color .35s, color .35s, opacity .5s, transform .5s; }
.lw .pt .months { transition:gap .5s; } .lw .pt[data-at="0"] .months { gap:0; }
.lw .pt[data-at="0"] .m { border-radius:0; color:transparent; }
.lw .pt[data-at="0"] .m, .lw .pt[data-at="3"] .m { background:var(--hot-bg); border-color:var(--hot); }
.lw .pt[data-at="0"] .m { border-color:var(--hot-bg); }
.lw .pt[data-at="2"] .m { cursor:pointer; opacity:.45; }
.lw .pt[data-at="2"] .m.read { opacity:1; background:var(--ok-bg); border-color:var(--ok); color:var(--ok); }
.lw .pt[data-at="4"] .m.gone { opacity:0; transform:translateY(-10px); }
.lw .pt .sum { display:flex; flex-wrap:wrap; gap:8px 22px; align-items:baseline; margin-top:14px; font-size:14px; }
.lw .pt .sum b { font:600 20px ui-monospace, Menlo, monospace; }
.lw .pt .sum .q { font:13px ui-monospace, Menlo, monospace; color:var(--mute); flex-basis:100%; }
.lw .pt .card.st { transition:opacity .6s; }
`;
const scene = () => `
  <div class="card"><h4 class="what"></h4>
    <div class="months">${MONTHS.map((m, i) => `<button type="button" class="m" data-i="${i}">${m.name.slice(2)}</button>`).join("")}</div>
    <div class="sum"><span class="q"></span><span>pages read <b class="pages"></b></span><span>pieces scanned <b class="pieces"></b></span><span>time <b class="ms"></b></span></div></div>
  <div class="card st" data-on="4"><h4>Removing January 2024 · ${fmt(D.del.rows)} rows</h4><div class="bars">
    ${bar({ label: "DELETE", sub: `table still ${D.del.size}`, share: 1, value: time(D.del.ms), colour: "hot", on: 'data-on="4"' })}
    ${bar({ label: "DROP TABLE orders_2024_01", sub: `table now ${D.drop.size}`, share: D.drop.ms / D.del.ms, value: time(D.drop.ms), colour: "acc", on: 'data-on="4"' })}
  </div></div>`;

function show(root, at, pick) {
  const set = (cls, text) => { root.querySelector(cls).textContent = text; };
  const month = MONTHS[pick];
  root.querySelectorAll(".m").forEach((m, i) => { m.classList.toggle("read", at === 2 && i === pick); m.classList.toggle("gone", i === 0); });
  set(".what", at === 0 ? "orders · one table" : `orders_by_month · ${MONTHS.length} partitions`);
  set(".q", at === 3 ? "WHERE customer_id = 1" : at === 2 ? `WHERE created_at is within one hour of ${month.name}` : at === 4 ? "" : "WHERE created_at is within one hour of 2025-06");
  set(".pages", at === 2 ? fmt(month.pages) : at === 4 ? "—" : fmt(D.pages));
  set(".pieces", at === 0 ? "the whole table" : at === 2 ? `1 of ${MONTHS.length}` : at === 4 ? "—" : `${MONTHS.length} of ${MONTHS.length}`);
  set(".ms", at === 2 ? time(Math.round((10 * D.pruned * month.pages) / MONTHS[D.june].pages) / 10) : at === 3 ? "270 ms" : at === 4 ? "—" : time(D.plain));
}
function after(root, at) {
  if (!root.dataset.bound) { root.dataset.bound = "1"; root.dataset.pick = String(D.june);
    root.querySelector(".months").addEventListener("click", (e) => { const m = e.target.closest(".m");
      if (!m || root.dataset.at !== "2") return; root.dataset.pick = m.dataset.i; show(root, 2, Number(m.dataset.i)); }); }
  show(root, at, Number(root.dataset.pick));
}

export default { render: build({ stepper, key: "pt", label: "A table split by month", css: cards("pt") + CSS, steps, scene, after }) };
