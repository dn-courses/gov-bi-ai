// bitmap-scan — the same nine rows fetched two ways, one action at a time: an Index Scan that visits
// each row's page in the index's order, and a bitmap scan that first marks the pages and then reads
// them in file order. Measured on shop at the end.
import { DESK, css, drive, last, scaled } from "../lib/joinplay.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

// Three index entries: customer_id and the pages its three rows are on. Two pages hold a row of two
// different customers, so the index leads to them twice.
const ENTRIES = [[1, [1333, 2666, 3999]], [2, [235, 1333, 2902]], [3, [471, 2666, 3137]]];
const ROWS = ENTRIES.flatMap(([customer, pages]) => pages.map((page, n) => ({ customer, page, n })));
const FILE = [...new Set(ROWS.map((r) => r.page))].sort((a, b) => a - b); // the table's pages, in file order
const SHARED = FILE.filter((page) => ROWS.filter((r) => r.page === page).length > 1).length;
const at = (page) => FILE.indexOf(page);
const ORDINAL = ["first", "second", "third"];

const blank = (bitmap) => ({ entry: -1, page: -1, turns: FILE.map(() => []), bits: FILE.map(() => false), bitmap });
function indexScan() {
  let turns = FILE.map(() => []), back = 0, again = 0, before = -1;
  const counts = (visits) => [["page visits", visits], ["pages visited again", again], ["moves backwards", back]];
  const states = [{ ...blank(false), counts: counts(0), say: `An Index Scan takes the entries in the index's order and fetches each row's page at once.` }];
  ROWS.forEach(({ customer, page, n }, e) => {
    const p = at(page), isBack = p < before, isAgain = turns[p].length > 0;
    back += isBack ? 1 : 0; again += isAgain ? 1 : 0; before = p;
    turns = turns.map((t, i) => (i === p ? [...t, e + 1] : t));
    states.push({ ...blank(false), entry: e, page: p, turns, tone: isBack || isAgain ? "miss" : "", fly: [[`.e[data-e="${e}"]`, `.pg[data-p="${p}"]`]], counts: counts(e + 1),
      say: isAgain ? `Customer ${customer}'s ${ORDINAL[n]} order is on page ${page}, which was already fetched on turn ${turns[p][0]}. It is fetched again.`
        : isBack ? `Customer ${customer}'s ${ORDINAL[n]} order is on page ${page}: back towards the start of the file.` : `Customer ${customer}'s ${ORDINAL[n]} order: fetch page ${page}.` });
  });
  states.push({ ...last(states), entry: -1, page: -1, fly: [], tone: "", say: `Nine rows, nine page visits to ${FILE.length} pages: ${SHARED} pages were fetched twice, and the file was crossed three times. Under each page, the turns it was read on.` });
  return states;
}
function collect() {
  let bits = FILE.map(() => false);
  const marked = () => bits.filter(Boolean).length;
  const states = [{ ...blank(true), counts: [["index entries read", 0], ["pages marked", 0], ["table pages read", 0]], say: `A bitmap scan starts with the index alone. It keeps one mark per page of the table.` }];
  ROWS.forEach(({ customer, page, n }, e) => {
    const already = bits[at(page)];
    bits = bits.map((b, i) => b || i === at(page));
    states.push({ ...blank(true), entry: e, bits, mark: at(page), fly: [[`.e[data-e="${e}"]`, `.bit[data-p="${at(page)}"]`]], counts: [["index entries read", e + 1], ["pages marked", marked()], ["table pages read", 0]],
      say: already ? `Customer ${customer}'s ${ORDINAL[n]} order is on page ${page}, which is already marked. A page is marked once, however many rows it holds.` : `Customer ${customer}'s ${ORDINAL[n]} order: page ${page} is marked. Nothing is fetched.` });
  });
  states.push({ ...last(states), entry: -1, mark: -1, fly: [], say: `Nine entries read, ${FILE.length} pages marked. Not one page of the table has been read yet.` });
  return states;
}
function pass(from) {
  let turns = FILE.map(() => []);
  const counts = (visits) => [["page visits", visits], ["pages visited again", 0], ["moves backwards", 0]];
  const states = [{ ...from, counts: counts(0), say: `Now the table. The marked pages are read in the order they lie in the file.` }];
  FILE.forEach((page, p) => {
    const rows = ROWS.filter((r) => r.page === page).length;
    turns = turns.map((t, i) => (i === p ? [p + 1] : t));
    states.push({ ...from, page: p, turns, mark: p, counts: counts(p + 1), say: rows > 1 ? `Page ${page} is read once, and both matching rows on it are taken.` : `Page ${page} is read once, and its matching row is taken.` });
  });
  states.push({ ...last(states), page: -1, mark: -1, say: `The same nine rows from ${FILE.length} page visits instead of nine, in one pass from the front of the file to its end.` });
  return states;
}
const INDEX = indexScan(), COLLECT = collect(), PASS = pass(last(COLLECT));
const PHASES = [{ states: INDEX, tick: 1000 }, { states: COLLECT, tick: 800 }, { states: PASS, tick: 800 }, { plain: true, states: [last(PASS)] }];

const steps = () => [
  { stop: "Index Scan", title: "An Index Scan fetches in the index's order", produces: "Index Scan",
    note: `Press Play, or Step for one action at a time. Three customers with three orders each. Two pages hold an order of two different customers.` },
  { stop: "Collect", title: "A bitmap scan first only collects", produces: "Bitmap Index Scan",
    note: `Press Play. It reads the index alone and marks which pages of the table hold a match.` },
  { stop: "One pass", title: "Then it reads the marked pages in file order", produces: "Bitmap Heap Scan",
    note: `Press Play. Each marked page is read once, front to back. No going back, and no page fetched twice, however many matching rows it holds.` },
  { stop: "At scale", title: "With many rows, going back and forth adds up", decisive: true,
    note: `With nine rows the difference is two page visits. As the rows multiply, the Index Scan returns more and more often to pages it has already visited, and the bitmap scan never does.` },
];

const CSS = `
.lw .bs .ents { display:grid; gap:8px; }
.lw .bs .ent { display:flex; align-items:center; gap:8px; flex-wrap:wrap; font:13px ui-monospace, Menlo, monospace; }
.lw .bs .ent b { width:96px; font-weight:600; }
.lw .bs .e, .lw .bs .bit, .lw .bs .pg { border-radius:8px; background:var(--cell); border:1.5px solid transparent; transition:background .25s, border-color .25s, color .25s; }
.lw .bs .e { padding:5px 10px; }
.lw .bs .e.now, .lw .bs .pg.now, .lw .bs .bit.now { border-color:var(--accent); background:var(--accent-bg); color:var(--accent); }
.lw .bs .pg.now.miss { border-color:var(--hot); background:var(--hot-bg); color:var(--hot); }
.lw .bs .strip, .lw .bs .file { display:grid; grid-template-columns:repeat(${FILE.length}, 1fr); gap:6px; }
.lw .bs .bit { height:26px; display:grid; place-items:center; font:600 13px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .bs .bit.set { background:var(--ok-bg); border-color:var(--ok); color:var(--ok); }
.lw .bs .bits:not(.shown) { display:none; }
.lw .bs .pg { padding:8px 2px; text-align:center; font:600 13px ui-monospace, Menlo, monospace; }
.lw .bs .pg small { display:block; margin-top:4px; min-height:18px; font:600 14px ui-monospace, Menlo, monospace; color:var(--accent); }
.lw .bs .pg.seen { border-color:var(--line); }
.lw .bs .pg.twice small { color:var(--hot); }
`;
const scene = () => `${DESK}
  <div class="card"><h4>The index's entries, in order of customer_id</h4><div class="ents">${ENTRIES.map(([customer, pages], c) =>
    `<div class="ent"><b>customer ${customer}</b>${pages.map((page, n) => `<span class="e" data-e="${c * 3 + n}">page ${page}</span>`).join("")}<span>…</span></div>`).join("")}</div></div>
  <div class="card bits"><h4>The bitmap: one mark per page of the table</h4><div class="strip">${FILE.map((_, p) => `<span class="bit" data-p="${p}"></span>`).join("")}</div></div>
  <div class="card"><h4>The table's pages, in file order · under each, the turns it was read on</h4>
    <div class="file">${FILE.map((page, p) => `<div class="pg" data-p="${p}">${page}<small></small></div>`).join("")}</div></div>
  ${scaled("Measured on the shop database: rows of many customers, scattered over the table", `data-from="3"`, ["Index Scan", "Bitmap scan"], [
    [`9 rows on ${FILE.length} pages`, "the animation", ["9 visits", `${SHARED} pages fetched twice · the file crossed 3 times`], [`${FILE.length} visits`, "each page once, in one pass"]],
    ["50,000 rows", "measured", ["256 ms", "50,046 page visits", "slow"], ["102 ms", "48,119 page visits · <b>2.5×</b> faster", "pick"]],
    ["100,000 rows", "measured · the table has 66,657 pages", ["545 ms", "100,089 page visits: more than the table has", "slow"], ["250 ms", "66,321 page visits · <b>2.2×</b> faster", "pick"]],
    ["500,000 rows", "measured", ["2.8 s", "500,437 page visits", "slow"], ["280 ms", "67,094 page visits · <b>10×</b> faster", "pick"]],
  ])}`;

function draw(root, s) {
  root.querySelectorAll(".e").forEach((e, i) => e.classList.toggle("now", i === s.entry));
  root.querySelector(".bits").classList.toggle("shown", s.bitmap);
  root.querySelectorAll(".bit").forEach((b, p) => { b.className = "bit" + (s.bits[p] ? " set" : "") + (p === s.mark ? " now" : ""); b.textContent = s.bits[p] ? "✓" : ""; });
  root.querySelectorAll(".pg").forEach((pg, p) => {
    pg.className = "pg" + (s.turns[p].length ? " seen" : "") + (s.turns[p].length > 1 ? " twice" : "") + (p === s.page ? ` now ${s.tone ?? ""}` : "");
    pg.querySelector("small").textContent = s.turns[p].join(", ");
  });
  root.querySelector(".say").textContent = s.say;
  root.querySelector(".counts").innerHTML = s.counts.map(([label, n]) => `<span>${label}<b>${n}</b></span>`).join("");
}

export default { render: build({ stepper, key: "bs", label: "Index Scan and bitmap scan", css: css("bs") + CSS, steps, scene, after: (root, at) => drive(root, at, PHASES, draw) }) };
