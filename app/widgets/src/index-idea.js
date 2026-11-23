// index-idea — from a value to row addresses: the pile read in full, a second structure beside the
// table, the descent to one entry, and that entry's addresses pointing at the pages to fetch.
// Captured data only for now: measured in the lab, not yet read live.
import { fmt, scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const D = {
  pages: 66657, scanMs: 230, idxPages: 53, idxMs: 0.05, size: "34 MB", tsize: "521 MB",
  levels: [["root", 1], ["inner", 16], ["leaves", 4348]],
  // The first entries of the index's first leaf: customer_id, the first three of its 50 row addresses.
  entries: [[1, ["(1333,18)", "(2666,29)", "(3999,40)"]], [2, ["(235,54)", "(1568,72)", "(2902,8)"]],
    [3, ["(471,33)", "(1804,44)", "(3137,55)"]], [4, ["(707,12)", "(2040,23)", "(3373,34)"]]],
  perEntry: 50,
};
const pageOf = (address) => Number(address.slice(1).split(",")[0]);

const steps = () => [
  { stop: "The pile", title: "By value, the whole pile is read", produces: `${fmt(D.pages)} pages read`,
    note: `The 50 orders of customer 1 are spread over the file, and nothing says where. Every page is read to find the few that matter: ${D.scanMs} ms.` },
  { stop: "The index", title: "An index: a second structure, beside the table", produces: `${D.size} beside ${D.tsize}`,
    note: `For every <code>customer_id</code>, the <b>addresses</b> of its rows, kept sorted by the value. The table itself is not touched or reordered.` },
  { stop: "Descend", title: "Find the value in the index", produces: "3 pages read",
    note: `It is a B-tree: the root, one inner page, one leaf. Three pages to reach the entry for customer 1.` },
  { stop: "Fetch", title: "Follow the addresses into the table", produces: "50 pages read",
    note: `The entry holds ${D.perEntry} addresses; three are drawn. Each one names a page of the table, and only those pages are read.` },
  { stop: "The bill", title: `${D.idxPages} pages where there were ${fmt(D.pages)}`, decisive: true,
    note: `Three pages of index and fifty of table. The same 50 rows, for about a thousandth of the reading.` },
];

const CSS = `
.lw .ii { position:relative; display:grid; grid-template-columns:minmax(0, 1.1fr) minmax(0, 1fr); gap:16px; align-items:stretch; }
.lw .ii .card { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px 16px; transition:border-color .4s; }
.lw .ii h4 { margin:0 0 12px; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .ii h4 b { color:var(--ink); font-weight:600; letter-spacing:0; text-transform:none; font:600 13px ui-monospace, Menlo, monospace; margin-left:6px; }
.lw .ii .wires { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; overflow:visible; z-index:2; }
.lw .ii .wires path { fill:none; stroke:var(--accent); stroke-width:1.75; stroke-linecap:round; opacity:.9; transition:stroke-dashoffset .9s ease-out; }
.lw .ii .wires circle { fill:var(--accent); }

.lw .ii .lvl { display:grid; grid-template-columns:58px 1fr 92px; gap:10px; align-items:center; margin-bottom:8px; font-size:13px; color:var(--mute); }
.lw .ii .lvl .cells { display:flex; gap:3px; }
.lw .ii .lvl .cells i { flex:1 1 0; height:16px; border-radius:4px; background:var(--cell); transition:background .4s; }
.lw .ii .lvl:first-child .cells i { flex:0 0 46px; }
.lw .ii .lvl .n { font:13px ui-monospace, Menlo, monospace; text-align:right; }
.lw .ii[data-at="2"] .lvl .cells i.t, .lw .ii[data-at="3"] .lvl .cells i.t { background:var(--accent); }
.lw .ii[data-at="2"] .lvl:nth-child(2) i.t { transition-delay:.25s; } .lw .ii[data-at="2"] .lvl:nth-child(3) i.t { transition-delay:.5s; }

.lw .ii .entries { margin-top:14px; display:grid; gap:6px; }
.lw .ii .entry { display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:10px; border:1px solid transparent; transition:background .4s, border-color .4s, opacity .4s; }
.lw .ii .entry .k { flex:none; min-width:30px; padding:3px 0; text-align:center; border-radius:7px; background:var(--cell); font:600 14px ui-monospace, Menlo, monospace; }
.lw .ii .entry .a { padding:3px 8px; border-radius:999px; background:var(--cell); font:13px ui-monospace, Menlo, monospace; white-space:nowrap; transition:background .4s, color .4s; }
.lw .ii .entry .more { color:var(--mute); font-size:13px; white-space:nowrap; }
.lw .ii[data-at="2"] .entry.e1, .lw .ii[data-at="3"] .entry.e1, .lw .ii[data-at="4"] .entry.e1 { background:var(--accent-bg); border-color:var(--accent); }
.lw .ii[data-at="3"] .entry.e1 .a, .lw .ii[data-at="4"] .entry.e1 .a { background:var(--accent); color:var(--accent-ink); }
.lw .ii[data-at="3"] .entry:not(.e1), .lw .ii[data-at="4"] .entry:not(.e1) { opacity:.45; }

.lw .ii .grid { display:grid; grid-template-columns:repeat(5, 1fr); gap:8px 6px; align-items:center; }
.lw .ii .grid i { padding:7px 0; text-align:center; border-radius:7px; background:var(--cell); border:1px solid var(--line);
      font:13px ui-monospace, Menlo, monospace; font-style:normal; color:var(--mute); transition:background .35s, border-color .35s, color .35s; }
.lw .ii .grid .gap { text-align:center; color:var(--mute); letter-spacing:.25em; transition:color .35s; }
.lw .ii.reading .grid i { background:var(--hot-bg); border-color:var(--hot); color:var(--hot); transition-delay:calc(var(--i) * 320ms); }
.lw .ii.reading .grid i.mine { background:var(--ok-bg); border-color:var(--ok); color:var(--ok); font-weight:600; } /* read, and it held a row we wanted */
.lw .ii .key { display:flex; gap:16px; margin:10px 0 0; font-size:13px; color:var(--mute); opacity:0; transition:opacity .4s; }
.lw .ii[data-at="0"] .key { opacity:1; }
.lw .ii .key b { display:inline-block; width:12px; height:12px; margin-right:6px; border-radius:3px; vertical-align:-1px; border:1px solid var(--hot); background:var(--hot-bg); }
.lw .ii .key b.good { border-color:var(--ok); background:var(--ok-bg); }
.lw .ii.reading .grid .gap { color:var(--hot); transition-delay:calc(var(--i) * 320ms); } /* the pile is read slowly, cell by cell */
.lw .ii[data-at="3"] .grid i.mine, .lw .ii[data-at="4"] .grid i.mine { background:var(--accent); border-color:var(--accent); color:var(--accent-ink); font-weight:600; }
.lw .ii .sub { margin:10px 0 0; font-size:13px; color:var(--mute); }

.lw .ii .bill { grid-column:1 / -1; display:grid; grid-template-columns:max-content 1fr max-content; gap:10px 14px; align-items:center; font-size:14px; }
.lw .ii .bill h4 { grid-column:1 / -1; margin:0; }
.lw .ii:not([data-at="4"]) .bill { display:none; } /* the bill takes no room until its own step */
.lw .ii .bill .track { height:14px; border-radius:7px; background:var(--cell); overflow:hidden; }
.lw .ii .bill .track b { display:block; height:100%; border-radius:7px; background:var(--hot); width:100%; }
.lw .ii .bill .track b.ix { background:var(--accent); width:0; min-width:0; transition:width .8s .2s, min-width .8s .2s; }
.lw .ii .bill .row.on .track b.ix { min-width:4px; }
.lw .ii .bill .v { font:600 15px ui-monospace, Menlo, monospace; white-space:nowrap; }
.lw .ii .bill .v.hot { color:var(--hot); } .lw .ii .bill .v.acc { color:var(--accent); }
.lw .ii .bill .row { display:contents; }
@media (max-width: 760px) { .lw .ii { grid-template-columns:1fr; } }
`;

const cells = (count) => Array.from({ length: Math.min(count, 28) }, (_, i) => `<i${i === 0 ? ' class="t"' : ""}></i>`).join("");
const level = ([name, pages]) => `<div class="lvl"><span>${name}</span><div class="cells">${cells(pages)}</div><span class="n">${fmt(pages)} page${pages > 1 ? "s" : ""}</span></div>`;
const entry = ([key, addresses]) => `<div class="entry e${key}"><span class="k">${key}</span>
  ${addresses.map((a) => `<span class="a" data-page="${pageOf(a)}">${a}</span>`).join("")}<span class="more">+ ${D.perEntry - addresses.length} more</span></div>`;
// The table's pages: the first few, the neighbourhood of each page the entry points at, the last few.
// Dots stand for the thousands of pages in between.
const gap = (i) => `<span class="gap" style="--i:${i}">···</span>`;
function pagesShown() {
  const targets = D.entries[0][1].map(pageOf), last = D.pages - 1;
  const page = (n, i) => `<i style="--i:${i}" data-page="${n}"${targets.includes(n) ? ' class="mine"' : ""}>${n}</i>`;
  const rows = [[0, 1, 2, 3, null], ...targets.map((t) => [null, t - 1, t, t + 1, null]), [null, last - 3, last - 2, last - 1, last]];
  return rows.flat().map((n, i) => (n === null ? gap(i) : page(n, i))).join(""); // --i: its turn in the slow sweep
}

const scene = () => `
  <svg class="wires"></svg>
  <div class="card index st" data-from="1"><h4>The index <b>orders_customer_id_idx</b></h4>
    ${D.levels.map(level).join("")}
    <div class="entries">${D.entries.map(entry).join("")}</div>
    <p class="sub">one entry per customer: the value, then the addresses of its rows</p></div>
  <div class="card heap"><h4>The table <b>orders</b></h4>
    <div class="grid">${pagesShown()}</div>
    <p class="sub">${fmt(D.pages)} pages, numbered 0 to ${fmt(D.pages - 1)}</p>
    <p class="key"><span><b></b>read, nothing we wanted</span><span><b class="good"></b>read, and it held one of the rows</span></p></div>
  <div class="card bill"><h4>Pages read for the orders of customer 1</h4>
    <div class="row"><span>the whole table</span><div class="track"><b></b></div><span class="v hot">${fmt(D.pages)} · ${D.scanMs} ms</span></div>
    <div class="row st" data-from="4"><span>with the index</span><div class="track"><b class="ix"></b></div><span class="v acc">${D.idxPages} · ${D.idxMs} ms</span></div></div>`;

// Draw one wire from each address of customer 1's entry to the square holding that page.
function wire(root, at) {
  const svg = root.querySelector(".wires");
  svg.innerHTML = "";
  if (at < 3) return;
  const box = root.getBoundingClientRect();
  root.querySelectorAll(".entry.e1 .a").forEach((chip) => {
    const target = root.querySelector(`.grid i[data-page="${chip.dataset.page}"]`);
    const a = chip.getBoundingClientRect(), b = target.getBoundingClientRect();
    const x1 = a.right - box.left, y1 = a.top + a.height / 2 - box.top, x2 = b.left - box.left - 5, y2 = b.top + b.height / 2 - box.top; // the wire ends at the page's left edge
    const bend = Math.max(40, (x2 - x1) / 2);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M${x1} ${y1} C${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`);
    svg.append(path);
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", x2); dot.setAttribute("cy", y2); dot.setAttribute("r", 3.5);
    svg.append(dot);
    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = at === 3 ? length : 0; // drawn once, on arriving at "Fetch"
    if (at === 3) requestAnimationFrame(() => requestAnimationFrame(() => { path.style.strokeDashoffset = 0; }));
  });
}
// The sweep starts from unread pages every time "The pile" is shown, including when the page opens.
function sweep(root, at) {
  root.classList.remove("reading");
  if (at === 0) requestAnimationFrame(() => requestAnimationFrame(() => root.dataset.at === "0" && root.classList.add("reading")));
}
function after(root, at) {
  sweep(root, at);
  wire(root, at);
  if (!root.dataset.watched) { root.dataset.watched = "1"; new ResizeObserver(() => wire(root, Number(root.dataset.at))).observe(root); }
  root.querySelector(".bill .ix").style.width = at >= 4 ? `${Math.max(0.4, (100 * D.idxPages) / D.pages)}%` : "0";
}

export default { render: build({ stepper, key: "ii", label: "What an index is", css: CSS, steps, scene, after }) };
