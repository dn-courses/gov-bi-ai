// heap-file — a table's file, one action at a time: rows piled into pages as they arrive, each with
// an address; finding rows by a value reads the whole pile; finding one by its address is a single
// jump. Measured on shop at the end.
import { DESK, css, drive, last, scaled } from "../lib/joinplay.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const HOLDS = 4, PAGES = 3; // rows a toy page holds; pages drawn
// [order, customer] in order of arrival — the same rows the lesson's Python cell piles up.
const ROWS = [[1, 7], [2, 3], [3, 9], [4, 7], [5, 2], [6, 9], [7, 3], [8, 7], [9, 5], [10, 2]];
const WANTED = 7, TARGET = 7; // the customer searched for by value; the row fetched by address
const page = (i) => Math.floor(i / HOLDS), place = (i) => (i % HOLDS) + 1, address = (i) => `(${page(i)},${place(i)})`;
const FULL = ROWS.length;

function arrive() {
  const counts = (n) => [["rows stored", n], ["pages in use", Math.ceil(n / HOLDS)]];
  const states = [{ queue: true, shown: 0, counts: counts(0), say: `Orders arrive one after another. Each goes to the first free place.` }];
  ROWS.forEach(([order], i) => states.push({ queue: true, shown: i + 1, row: i, page: page(i), fly: [[`.arr[data-i="${i}"]`, `.slot[data-i="${i}"]`]], counts: counts(i + 1),
    say: place(i) === 1 && i ? `Order ${order}: the last page is full, so a new page is started. Its address is ${address(i)}.`
      : `Order ${order} goes to page ${page(i)}, place ${place(i)}. Its address is ${address(i)}.` }));
  states.push({ ...last(states), row: -1, page: -1, fly: [], say: `Ten rows in arrival order. Nothing sorts them by customer, by amount or by anything else.` });
  return states;
}
function byValue() {
  let kept = new Set();
  const counts = (n) => [["pages read", Math.ceil(n / HOLDS)], ["rows looked at", n], ["rows kept", kept.size]];
  const states = [{ shown: FULL, seen: 0, kept, counts: counts(0), say: `Which orders belong to customer ${WANTED}? Nothing says where they are, so the search starts at the first row of the first page.` }];
  ROWS.forEach(([order, customer], i) => {
    const hit = customer === WANTED;
    if (hit) kept = new Set([...kept, i]);
    states.push({ shown: FULL, seen: i + 1, kept, row: i, page: page(i), tone: hit ? "hit" : "miss", counts: counts(i + 1),
      say: hit ? `Order ${order} belongs to customer ${WANTED}: kept.` : `Order ${order} belongs to customer ${customer}: looked at and thrown away.` });
  });
  states.push({ ...last(states), row: -1, page: -1, say: `Every page and every row was read: ${FULL} rows looked at to keep ${kept.size}. The last row had to be checked too, because one more match could have been there.` });
  return states;
}
function byAddress() {
  const [order, customer] = ROWS[TARGET], base = { shown: FULL };
  const counts = (pages, rows) => [["pages read", pages], ["rows looked at", rows]];
  return [
    { ...base, counts: counts(0, 0), say: `Now the row's address is known: ${address(TARGET)}. That is page ${page(TARGET)}, place ${place(TARGET)}.` },
    { ...base, page: page(TARGET), counts: counts(1, 0), say: `Pages are all the same size, so page ${page(TARGET)} is one jump away. The other pages are not touched.` },
    { ...base, page: page(TARGET), row: TARGET, tone: "hit", kept: new Set([TARGET]), counts: counts(1, 1), say: `Place ${place(TARGET)} in that page: order ${order} of customer ${customer}. One page read, one row looked at.` },
  ];
}
const ARRIVE = arrive(), VALUE = byValue(), ADDRESS = byAddress();
const PHASES = [{ states: [{ shown: 0, counts: [], say: `Three empty pages of a toy file. Each holds ${HOLDS} rows.` }] },
  { states: ARRIVE, tick: 800 }, { states: VALUE, tick: 800 }, { states: ADDRESS, tick: 1200 }, { plain: true, states: [last(ADDRESS)] }];

const steps = () => [
  { stop: "Pages", title: "A table is a file of pages",
    note: `Pages of one size, in a row. <code>orders</code> is 66,657 of them, 8,192 bytes each. This file is called the table's <b>heap</b>: a pile.` },
  { stop: "Rows", title: "Rows are piled in as they arrive",
    note: `Press Play, or Step for one action at a time. Each row gets an <b>address</b>: its page and its place in the page.` },
  { stop: "By value", title: "Finding rows by a value: read the whole pile",
    note: `Press Play. The pile has no order, so a question about a value is answered by looking at every row.` },
  { stop: "By address", title: "Finding a row by its address: one jump",
    note: `Press Play. An address names the page and the place, so nothing is searched.` },
  { stop: "At scale", title: "The whole pile, or one page", decisive: true,
    note: `So the whole game is to get from a <b>value</b> to <b>addresses</b> without reading the pile. That is what an index is for.` },
];

const CSS = `
.lw .hf .queue:not(.shown) { display:none; }
.lw .hf .arrs { display:flex; flex-wrap:wrap; gap:6px; }
.lw .hf .arr, .lw .hf .slot { border-radius:8px; background:var(--cell); border:1.5px solid transparent; font:13px ui-monospace, Menlo, monospace; white-space:nowrap; transition:background .25s, border-color .25s, color .25s, opacity .25s; }
.lw .hf .arr { padding:5px 10px; } .lw .hf .arr.done { opacity:.35; }
.lw .hf .file { display:grid; grid-template-columns:repeat(${PAGES}, 1fr); gap:12px; }
.lw .hf .page { padding:10px; border-radius:11px; border:1.5px solid var(--line); display:grid; gap:6px; transition:border-color .25s, background .25s; }
.lw .hf .page.now { border-color:var(--accent); background:var(--accent-bg); }
.lw .hf .page > b { font:600 11px system-ui, sans-serif; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); }
.lw .hf .slot { display:flex; gap:10px; padding:6px 9px; background:transparent; border:1.5px dashed var(--line); }
.lw .hf .slot em { font-style:normal; color:var(--mute); }
.lw .hf .slot span { visibility:hidden; }
.lw .hf .slot.full { background:var(--cell); border:1.5px solid transparent; } .lw .hf .slot.full span { visibility:visible; }
.lw .hf .slot.full em { color:var(--accent); }
.lw .hf .slot.passed { opacity:.4; }
.lw .hf .slot.now { border-color:var(--accent); background:var(--accent-bg); color:var(--accent); opacity:1; }
.lw .hf .slot.now.miss { border-color:var(--hot); background:var(--hot-bg); color:var(--hot); }
.lw .hf .slot.kept, .lw .hf .slot.now.hit { border-color:var(--ok); background:var(--ok-bg); color:var(--ok); opacity:1; }
.lw .hf .chain { display:flex; align-items:center; justify-content:center; gap:14px; font:600 15px system-ui, sans-serif; }
.lw .hf .chain span { padding:8px 18px; border-radius:999px; background:var(--cell); }
.lw .hf .chain span.q { background:var(--accent-bg); color:var(--accent); border:1.5px solid var(--accent); }
.lw .hf .chain i { font-style:normal; color:var(--accent); }
`;
const slot = (i) => `<div class="slot" data-i="${i}"><em>${address(i)}</em><span>${ROWS[i] ? `order ${ROWS[i][0]} · customer ${ROWS[i][1]}` : "&nbsp;"}</span></div>`;
const scene = () => `${DESK}
  <div class="card queue"><h4>Orders arriving</h4><div class="arrs">${ROWS.map(([order, customer], i) => `<span class="arr" data-i="${i}">order ${order} · customer ${customer}</span>`).join("")}</div></div>
  <div class="card"><h4>The heap file · in front of each place, its address: (page, place)</h4>
    <div class="file">${Array.from({ length: PAGES }, (_, p) => `<div class="page" data-p="${p}"><b>page ${p}</b>${Array.from({ length: HOLDS }, (_, n) => slot(p * HOLDS + n)).join("")}</div>`).join("")}</div></div>
  ${scaled("Measured on the shop database", `data-from="4"`, ["by value", "by address"], [
    [`${FULL} rows on ${PAGES} pages`, "the animation", [`${PAGES} pages · ${FULL} rows`, "7 looked at and thrown away"], ["1 page · 1 row"]],
    ["5,000,000 rows on 66,657 pages", "measured: the 50 orders of one customer, and one order by its address", ["230 ms", "66,657 pages read · 4,999,950 rows thrown away", "slow"], ["0.01 ms", "1 page read · <b>23,000×</b> faster", "pick"]],
  ])}
  <div class="card measured st" data-from="4"><h4>What is missing</h4><div class="chain"><span>a value</span><i>→</i><span class="q">?</span><i>→</i><span>row addresses</span></div></div>`;

function draw(root, s) {
  const kept = s.kept ?? new Set();
  root.querySelector(".queue").classList.toggle("shown", Boolean(s.queue));
  root.querySelectorAll(".arr").forEach((a, i) => a.classList.toggle("done", i < s.shown));
  root.querySelectorAll(".slot").forEach((el, i) => {
    el.className = "slot" + (i < s.shown ? " full" : "") + (kept.has(i) ? " kept" : i < (s.seen ?? 0) ? " passed" : "") + (i === s.row ? ` now ${s.tone ?? ""}` : "");
  });
  root.querySelectorAll(".page").forEach((p, i) => p.classList.toggle("now", i === s.page));
  root.querySelector(".say").textContent = s.say;
  root.querySelector(".counts").innerHTML = s.counts.map(([label, n]) => `<span>${label}<b>${n}</b></span>`).join("");
}

export default { render: build({ stepper, key: "hf", label: "The heap file", css: css("hf") + CSS, steps, scene, after: (root, at) => drive(root, at, PHASES, draw) }) };
