// row-versions — an update, one action at a time: the new version goes into the row's page when it
// has room and to another page when it does not; the old one stays behind dead; scans pay for the
// dead rows; VACUUM frees their places and VACUUM FULL rewrites the file. Captured data only:
// measured in the lab with the module's `_lab/mvcc.sh`.
import { DESK, css, drive, last, scaled } from "@widget-lib/joinplay.js";
import { scene as build } from "@widget-lib/scene.js";
import { stepper } from "@widget-lib/stepper.js";
import { HEAP_CSS, HOLDS, addr, at, clone, count, fileHtml, paintFile, row, update } from "./heap.js";

const PAGES = 6; // pages drawn at most
const START = [[row(1, 10), row(2, 20), row(3, 30), row(4, 40)], [row(5, 50), row(6, 60), row(7, 70), row(8, 80)], [row(9, 90), row(10, 100), null, null]];
const raise = (v) => v + 5;
const label = (c) => `product ${c.k} · $${c.v}`;
const sel = (cls, [p, n]) => `.${cls} .slot[data-a="${at(p, n)}"]`;
const sizes = (file) => [["pages", file.length], ["live rows", count(file, "live")], ["dead rows", count(file, "dead")]];

// One UPDATE as four actions: find the row, look for room, write the new version, end the old one.
function one(file, k, lead) {
  const u = update(file, k, raise), [p, n] = u.from, old = file[p][n], to = addr(...u.to);
  const where = u.same ? `Page ${p} has a free place, so the new version goes there: ${to}.`
    : u.grew ? `No page has a free place. A new page is added at the end of the file, and the new version goes there: ${to}.`
      : `The new version goes to another page that has a free place: ${to}. The row now has an address in a different page.`;
  const states = [
    { file, counts: sizes(file), say: `${lead} The row is at ${addr(p, n)}.` },
    { file, mark: { [at(p, n)]: "now" }, pmark: u.same ? { [p]: "now" } : { [p]: "full" }, counts: sizes(file),
      say: u.same ? `The row is found. It is not changed where it is.` : `The row is found, and page ${p} is full. The page is not split, and no row is moved aside.` },
    { file: u.written, mark: { [at(p, n)]: "now", [at(...u.to)]: "hit" }, pmark: u.grew ? { [u.to[0]]: "fresh" } : {}, fly: [[sel("heap", u.from), sel("heap", u.to)]], counts: sizes(u.written),
      say: `A whole new version is written: $${old.v} becomes $${raise(old.v)}. ${where}` },
    { file: u.after, mark: { [at(...u.to)]: "hit" }, counts: sizes(u.after),
      say: `The old version is stamped as ended, and stays in its place. A query that began before the update still reads it. When no query needs it, it is a <b>dead row</b>.` },
  ];
  return { states, file: u.after };
}

const fits = one(START, 9, "UPDATE product 9: raise its price by $5.");
const full = one(fits.file, 2, "UPDATE product 2.");
const grows = one(full.file, 6, "UPDATE product 6.");

function everyRow(file) {
  const states = [{ file, counts: sizes(file), say: `UPDATE every product: raise all ten prices in one statement.` }];
  for (let k = 1; k <= 10; k += 1) {
    const u = update(last(states).file, k, raise);
    states.push({ file: u.after, mark: { [at(...u.to)]: "hit" }, pmark: u.grew ? { [u.to[0]]: "fresh" } : {}, fly: [[sel("heap", u.from), sel("heap", u.to)]], counts: sizes(u.after),
      say: `Product ${k}: new version at ${addr(...u.to)}, old version left behind at ${addr(...u.from)}.` });
  }
  const end = last(states).file;
  states.push({ file: end, counts: sizes(end), say: `Ten rows, as before. The file went from ${START.length} pages to ${end.length}, and more than half of what it holds is dead.` });
  return states;
}
const EVERY = everyRow(grows.file), CHURNED = last(EVERY).file;

function scan(file) {
  const mark = {}, seen = [];
  const counts = (pages) => [["pages read", pages], ["versions looked at", seen.length], ["rows returned", seen.filter((c) => c.s === "live").length]];
  const states = [{ file, counts: counts(0), say: `SELECT count(*) FROM products. Nothing says which places hold live rows, so the scan starts at page 0.` }];
  file.forEach((page, p) => page.forEach((c, n) => {
    if (!c) return;
    Object.keys(mark).forEach((a) => { if (mark[a] === "miss") mark[a] = "passed"; });
    mark[at(p, n)] = c.s === "live" ? "hit" : "miss"; seen.push(c);
    states.push({ file, mark: { ...mark }, pmark: { [p]: "now" }, counts: counts(p + 1),
      say: c.s === "live" ? `${addr(p, n)}: a live version of product ${c.k}. Counted.` : `${addr(p, n)}: a dead version of product ${c.k}. Read, checked, and skipped.` });
  }));
  states.push({ ...last(states), pmark: {}, say: `${file.length} pages read and ${seen.length} versions checked to count ${count(file, "live")} rows. Before the updates it was ${START.length} pages and ${count(START, "live")} versions.` });
  return states;
}

function vacuum(file) {
  const states = [{ file, others: "other queries: running", counts: sizes(file), say: `VACUUM products. It walks the file page by page, while other queries keep reading and writing the table.` }];
  file.forEach((page, p) => {
    if (!page.some((c) => c?.s === "dead")) return;
    const next = clone(last(states).file);
    next[p] = next[p].map((c) => (c?.s === "dead" ? null : c));
    states.push({ file: next, pmark: { [p]: "now" }, others: "other queries: running", counts: sizes(next), say: `Page ${p}: its dead rows are removed (${page.filter((c) => c?.s === "dead").length}). Their places are free.` });
  });
  const clean = last(states).file;
  states.push({ file: clean, others: "other queries: running", counts: sizes(clean), say: `No dead rows are left. The file is still ${clean.length} pages: the free places are inside it and were not given back to the disk.` });
  const u = update(clean, 4, raise);
  states.push({ file: u.after, mark: { [at(...u.to)]: "hit" }, fly: [[sel("heap", u.from), sel("heap", u.to)]], others: "other queries: running", counts: sizes(u.after),
    say: `The next UPDATE (product 4) finds a freed place at ${addr(...u.to)}. The file does not grow.` });
  return states;
}
const VACUUM = vacuum(CHURNED), VACUUMED = last(VACUUM).file;

function vacuumFull(file) {
  const wait = "other queries: waiting", lock = { all: "locked" };
  const both = (f, copy) => [["pages, old file", f.length], ["pages, new file", copy.length]];
  const states = [{ file, others: "other queries: running", counts: sizes(file), say: `VACUUM FULL products.` },
    { file, pmark: lock, others: wait, counts: sizes(file), say: `First it locks the whole table. From now until it ends, every other query on the table waits, a plain SELECT included.` },
    { file, pmark: lock, others: wait, copy: [], counts: both(file, []), say: `A new, empty file is created beside the old one.` }];
  const copy = [];
  file.forEach((page, p) => page.forEach((c, n) => {
    if (c?.s !== "live") return;
    if (!copy.length || !last(copy).includes(null)) copy.push(Array(HOLDS).fill(null));
    const m = last(copy).indexOf(null); last(copy)[m] = { ...c };
    states.push({ file, pmark: lock, others: wait, copy: clone(copy), mark: { [at(p, n)]: "now" }, copyMark: { [at(copy.length - 1, m)]: "hit" }, counts: both(file, copy),
      fly: [[sel("heap", [p, n]), sel("copy", [copy.length - 1, m])]], say: `Live product ${c.k} is copied from ${addr(p, n)} to the next place in the new file. Dead rows and free places are not copied.` });
  }));
  states.push({ file, gone: true, copy: clone(copy), others: "other queries: running", counts: sizes(copy),
    say: `The old file is deleted and the lock is released. ${copy.length} pages instead of ${file.length}, and the space went back to the disk. The table's indexes were rebuilt as well.` });
  return states;
}
const FULL = vacuumFull(VACUUMED);

const PHASES = [{ states: [{ file: START, counts: sizes(START), say: `Ten products in a toy file. A page holds ${HOLDS} rows; the last page has two free places.` }] },
  { states: fits.states, tick: 1700 }, { states: [...full.states, ...grows.states], tick: 1700 }, { states: EVERY, tick: 700 }, { states: scan(CHURNED), tick: 450 },
  { states: VACUUM, tick: 1100 }, { states: FULL, tick: 800 }, { plain: true, states: [last(FULL)] }];

// Measured in the lab: a copy of orders (5,000,000 rows), every row updated once.
const D = { fresh: 66657, churned: 132587, vacuum: { secs: 8.8, alone: 0.15, beside: 0.23 }, full: { secs: 10.8, silent: 9, before: 133052, pages: 66532 } };
const n = (x) => x.toLocaleString("en-US");

const steps = () => [
  { stop: "A table", title: "A table before any update",
    note: `Every row here has one version. Each has an address: its page and its place in the page.` },
  { stop: "Room", title: "An update writes a new version, in the same page if it fits",
    note: `Press Play, or Step for one action at a time. The row is never changed where it is.` },
  { stop: "No room", title: "When the page is full, the new version goes to another page",
    note: `Press Play. A table page is never split. The new version goes wherever there is room, and when there is none, the file grows.` },
  { stop: "Every row", title: "Update every row: the table doubles",
    note: `Press Play. Each new version needs a place, and no old version has left yet.` },
  { stop: "Reads pay", title: "A scan reads the dead rows too",
    note: `Press Play. The same question now costs more pages, and the answer has not changed.` },
  { stop: "VACUUM", title: "VACUUM frees the dead rows' places",
    note: `Press Play. The table stays open for reading and writing. The file does not shrink; its free places are filled by the next writes.` },
  { stop: "VACUUM FULL", title: "VACUUM FULL writes the table again, and locks it",
    note: `Press Play. This is the one that shrinks the file. Nothing else can use the table until it ends.` },
  { stop: "The bill", title: "Two ways to clean, two prices", decisive: true,
    note: `VACUUM runs all day beside the application; autovacuum does it without being asked. VACUUM FULL is a planned outage of the table.` },
];

const CSS = `.lw .rv .copy:not(.shown) { display:none; }`;
const scene = () => `${DESK}
  ${fileHtml("heap", "The table's file · each place has an address: (page, place)", PAGES)}
  ${fileHtml("copy", "The new file", 3)}
  ${scaled("Measured on a copy of orders: 5,000,000 rows", `data-on="4"`, ["pages read to count the rows"], [
    ["Before any update", "one version of each row", [n(D.fresh)]],
    ["After one UPDATE of every row", "the same 5,000,000 rows, each with a dead version beside it", [n(D.churned), "twice the reading for the same answer", "slow"]],
  ])}
  ${scaled("Measured on the same table, beside an application doing lookups by key", `data-from="5"`, ["VACUUM", "VACUUM FULL"], [
    ["Time to clean 5,000,000 dead rows", "", [`${D.vacuum.secs} s`], [`${D.full.secs} s`]],
    ["The application meanwhile", "four clients reading one order at a time", [`${D.vacuum.alone} → ${D.vacuum.beside} ms`, "a lookup, alone → beside it"], [`${D.full.silent} s`, "with no lookup answered", "slow"]],
    ["The file afterwards", "5,000,000 live rows fit in 66,657 pages", [`${n(D.churned)} → ${n(D.churned)}`, "same size, free places inside"], [`${n(D.full.before)} → ${n(D.full.pages)}`, "space returned to the disk", "pick"]],
  ])}`;

function draw(root, s, moving) {
  root.classList.toggle("moving", Boolean(moving));
  const heap = root.querySelector(".heap"), copy = root.querySelector(".copy");
  heap.classList.toggle("gone", Boolean(s.gone));
  copy.classList.toggle("shown", Boolean(s.copy));
  paintFile(heap, s.file, label, s.mark, s.pmark);
  paintFile(copy, s.copy ?? [], label, s.copyMark);
  const others = (s.gone ? copy : heap).querySelector(".others");
  root.querySelectorAll(".others").forEach((el) => { el.textContent = ""; });
  others.textContent = s.others ?? ""; others.classList.toggle("wait", /waiting/.test(s.others ?? ""));
  root.querySelector(".say").innerHTML = s.say;
  root.querySelector(".counts").innerHTML = s.counts.map(([name, v]) => `<span>${name}<b>${v}</b></span>`).join("");
}

export default { render: build({ stepper, key: "rv", label: "Row versions, dead rows and vacuum", css: css("rv") + HEAP_CSS("rv") + CSS, steps, scene, after: (root, at) => drive(root, at, PHASES, draw) }) };
