// fill-factor — when a new version can stay in its page. One row at a time, a full page copes: the
// first update leaves, and the next one cleans the page and stays. A statement that changes many
// rows of a page cannot: every new version leaves, the file grows and the index gets a new entry
// each time. With room left in each page (fillfactor) the new versions stay and the index is not touched.
// The toy is a picture; the last step is measured in the lab with the module's `_lab/mvcc.sh`.
import { DESK, css, drive, last, scaled } from "@widget-lib/joinplay.js";
import { scene as build } from "@widget-lib/scene.js";
import { stepper } from "@widget-lib/stepper.js";
import { HEAP_CSS, at, clone, fileHtml, paintFile, row, update } from "./heap.js";

const KEYS = [1, 2, 3, 4], PAGES = 3;
const EVERY = [KEYS, KEYS], SINGLE = [[2], [3], [1], [2]]; // statements, each a list of the rows it updates
const raise = (v) => v + 5;
const label = (c) => `product ${c.k} · $${c.v}`;
const sel = ([p, n]) => `.heap .slot[data-a="${at(p, n)}"]`;
const entries = (file) => file.flatMap((page, p) => page.filter((c) => c?.s === "live").map((c) => ({ k: c.k, p, s: "live" })));
const sizes = (file, index, stayed) => [["pages", file.length], ["index entries", index.length], ["new versions that stayed in their page", stayed]];

// Statements run one after another. A full page with dead rows of an earlier, finished statement is
// cleaned by the update that finds it full; dead rows of the running statement cannot be.
function run(start, open, statements) {
  let file = start, index = entries(start), stayed = 0;
  const states = [{ file, index, counts: sizes(file, index, 0), say: open }];
  const push = (more) => states.push({ file, index, counts: sizes(file, index, stayed), ...more });
  statements.forEach((keys, i) => {
    const mine = new Set(); // places holding dead rows this statement made
    if (keys.length > 1) push({ say: `UPDATE every product: raise all four prices in one statement. Statement ${i + 1} of ${statements.length}.` });
    keys.forEach((k) => {
      const [p] = file.map((page, i) => (page.some((c) => c?.k === k && c.s === "live") ? i : -1)).filter((i) => i >= 0);
      const old = file[p].map((c, n) => (c?.s === "dead" && !mine.has(at(p, n)) ? n : -1)).filter((n) => n >= 0);
      if (!file[p].includes(null) && old.length) {
        file = clone(file); old.forEach((n) => { file[p][n] = null; });
        push({ pmark: { [p]: "now" }, say: `Page ${p} is full, but it holds ${old.length === 1 ? "a dead version" : `${old.length} dead versions`} left by a statement that has finished. The update clears ${old.length === 1 ? "it" : "them"} itself, without VACUUM.` });
      }
      const u = update(file, k, raise);
      file = u.after; mine.add(at(...u.from));
      if (u.same) stayed += 1;
      else index = [...index.map((e) => (e.k === k && e.s !== "stale" ? { ...e, s: "stale" } : e)), { k, p: u.to[0], s: "new" }];
      push({ mark: { [at(...u.to)]: "hit" }, pmark: u.grew ? { [u.to[0]]: "fresh" } : {}, fly: [[sel(u.from), sel(u.to)]],
        say: u.same ? `Product ${k}: the new version fits in page ${p}. The row is still reached through the same index entry, so the index is not touched.`
          : `Product ${k}: page ${p} has no free place, so the new version goes to page ${u.to[0]}. The row moved to another page, so the index gets a new entry, though the product number did not change.` });
    });
  });
  return states;
}
const FULL = [KEYS.map((k) => row(k, k * 10))];
const HALF = [[row(1, 10), row(2, 20), null, null], [row(3, 30), row(4, 40), null, null]];
const single = run(FULL, `Four products on one full page, and beside the table its index on the product number. Four UPDATE statements follow, each changing one row.`, SINGLE);
const full = run(FULL, `The same full page. This time one statement changes every row.`, EVERY);
const half = run(HALF, `The same four products loaded with fillfactor 50: each page is filled half way, and the rest is kept for new versions.`, EVERY);
single.push({ ...last(single), mark: {}, pmark: {}, fly: [], say: `Four updates, one miss. The first new version had to leave; after that each update found a dead row to clear and stayed in its page. A full page makes its own room, one row at a time.` });
full.push({ ...last(full), mark: {}, pmark: {}, fly: [], say: `Two statements: the file tripled, none of the eight new versions stayed in its page, and the index holds three entries for every product. An index page that fills up is split in two; a table page never is.` });
half.push({ ...last(half), mark: {}, pmark: {}, fly: [], say: `The same two statements: the file did not grow, every new version stayed in its page, and the index was never written to. The table was twice the size from the start.` });
const PHASES = [{ states: single, tick: 1600 }, { states: full, tick: 1300 }, { states: half, tick: 1300 }, { plain: true, states: [last(half)] }];

// Measured in the lab: two copies of products (10,000 rows), every row updated five times, no VACUUM.
const D = { loaded: [84, 170], after: [497, 177], index: [[30, 69], [30, 30]], stayed: [375, 49652], updates: 50000, single: { full: [645772, 646633, 84, 92], ninety: [501246, 501246, 93, 93] } };
const n = (x) => x.toLocaleString("en-US");
const pct = (a, b) => `${(100 * a / b).toFixed(1)}%`;

const steps = () => [
  { stop: "One row", title: "One row at a time: a full page copes",
    note: `Press Play, or Step for one action at a time. Each UPDATE is a statement of its own, and finishes before the next one starts.` },
  { stop: "Many rows", title: "Many rows in one statement: every new version has to leave",
    note: `Press Play. The dead rows a statement makes cannot be cleared while it is still running. Watch the number of pages, and the index.` },
  { stop: "Room left", title: "Half-full pages: the new versions stay",
    note: `Press Play. <code>fillfactor</code> says how full a page is filled when rows are inserted; the rest is kept for updates. Oracle's name for the same idea is <code>PCTFREE</code>.` },
  { stop: "Measured", title: "What the empty half buys, and what it costs", decisive: true,
    note: `The room pays where many rows of a page change before the page can be cleaned: batch updates, and updates that arrive while a long transaction is open. For one-row updates full pages are enough.` },
];

const CSS = `
.lw .ff .both { display:grid; grid-template-columns:2.4fr 1fr; gap:14px; align-items:start; }
.lw .ff .ixs { display:grid; gap:5px; }
.lw .ff .ix { padding:5px 10px; border-radius:8px; background:var(--cell); border:1.5px solid transparent; font:13px ui-monospace, Menlo, monospace; white-space:nowrap; }
.lw .ff .ix.stale { opacity:.45; text-decoration:line-through; }
.lw .ff .ix.new { border-color:var(--hot); background:var(--hot-bg); color:var(--hot); }
.lw .ff.moving .ix.new:last-child { animation:ff-in .5s .3s backwards; }
@container (max-width: 760px) { .lw .ff .both { grid-template-columns:1fr; } }
`;
const scene = () => `${DESK}<div class="both">${fileHtml("heap", "The table's file", PAGES, false)}
  <div class="card index"><h4>Index on product number</h4><div class="ixs"></div></div></div>
  ${scaled(`Measured, one row at a time: 60 seconds of one-row updates on 10,000 products, no VACUUM`, `data-on="0 3"`, ["fillfactor 100", "fillfactor 90"], [
    ["New versions that stayed in their page", "", [pct(D.single.full[0], D.single.full[1]), `${n(D.single.full[0])} of ${n(D.single.full[1])}`, "pick"], [pct(D.single.ninety[0], D.single.ninety[1]), `${n(D.single.ninety[0])} of ${n(D.single.ninety[1])}`, "pick"]],
    ["Pages, loaded → after", "", [`${D.single.full[2]} → ${D.single.full[3]}`], [`${D.single.ninety[2]} → ${D.single.ninety[3]}`]],
  ])}
  ${scaled(`Measured, many rows in one statement: every one of 10,000 products updated five times, no VACUUM`, `data-on="1 2 3"`, ["fillfactor 100", "fillfactor 50"], [
    ["Pages when loaded", "what every scan reads from the first day", [n(D.loaded[0]), "", "pick"], [n(D.loaded[1]), "twice the pages", "slow"]],
    ["Pages after the updates", "", [n(D.after[0]), "", "slow"], [n(D.after[1]), "", "pick"]],
    ["Index pages, loaded → after", "the primary key; no key was changed, and its pages split", [`${D.index[0][0]} → ${D.index[0][1]}`, "", "slow"], [`${D.index[1][0]} → ${D.index[1][1]}`, "", "pick"]],
    ["New versions that stayed in their page", `of ${n(D.updates)}`, [pct(D.stayed[0], D.updates), n(D.stayed[0]), "slow"], [pct(D.stayed[1], D.updates), n(D.stayed[1]), "pick"]],
  ])}`;

function draw(root, s, moving) {
  root.classList.toggle("moving", Boolean(moving));
  paintFile(root.querySelector(".heap"), s.file, label, s.mark, s.pmark);
  root.querySelector(".ixs").innerHTML = s.index.map((e) => `<div class="ix ${e.s}">product ${e.k} → page ${e.p}</div>`).join("");
  root.querySelector(".say").innerHTML = s.say;
  root.querySelector(".counts").innerHTML = s.counts.map(([name, v]) => `<span>${name}<b>${v}</b></span>`).join("");
}

export default { render: build({ stepper, key: "ff", label: "Fillfactor", css: css("ff") + HEAP_CSS("ff") + CSS, steps, scene, after: (root, at) => drive(root, at, PHASES, draw) }) };
