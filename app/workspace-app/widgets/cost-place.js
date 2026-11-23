// cost-place — a game for the room that closes the columnar part: seven questions a BI team asks of
// the station data, one card at a time, each put on the engine it belongs on by dragging it there (or
// clicking the column): the row store, a column file on one machine, or the warehouse. A right column
// keeps the card and gives the measured reason; a wrong one says what to ask. Adapted from
// col-cmp-place. Times measured 2026-11-23 through the app's /api/cell, three runs each (Postgres capped
// at 3 CPUs, the app's DuckDB on 12 threads): monthly average one core each 3.47-3.99 s / 1.30-1.45 s,
// every core 0.25-0.31 s; lookup 0.011-0.027 ms / 6.9-7.5 ms; change 0.03 ms / rewrite 0.77-0.90 s,
// 346 MB; hourly average and minimum per station (2,160,000 groups, default settings) Postgres
// 3.8-4.9 s, DuckDB 0.27-0.34 s. All re-measured after page 01 sorted station_status.parquet. BigQuery: the 97.9 MB of page 05's dry run (Partitioning) and
// day1-reference/_measurements.md (46.1 GB, about 2 s, 3,060 inputs).
import { widget } from "./col-lib.js";

const COLS = ["Row store, with an index", "Column file, one machine", "Warehouse, many machines"];
// One line under each column's name: its ground, in the words of the questions below.
const GROUND = ["one row by its key, small changes", "most rows, a few columns, fits one machine", "beyond one machine, or many viewers"];
// What to ask when a card is dropped on the wrong column, by the column it belongs to.
const ASK = [
  "Does it touch one row by its key, or change a few? That is the row store's ground.",
  "Does it read most rows of a few columns, and fit on one machine? A column file on a laptop answers it.",
  "Does it scan more than one machine holds, or serve many viewers from a shared table? That is the warehouse.",
];
// [the card, its column, why]. The order is the order of play: mixed on purpose.
const ITEMS = [
  ["The monthly average of bikes per system, over the 26 million polls of the lab table", 1,
    "Every row, three columns: about 0.3 s with DuckDB on a laptop's cores, against about 3.6 s in Postgres on one."],
  ["A station page in a public app: one station at one moment, every field", 0,
    "One row by its key: under 0.03 ms through an index, against about 7 ms in the column file."],
  ["The monthly average over all 1.8 billion rows of the real capture", 2,
    "3,060 parallel inputs read the three columns, 46.1 GB of 167 GB, in about 2 s."],
  ["An operator corrects one reading a station got wrong", 0,
    "One small change: about 0.03 ms in Postgres. The column file is written again whole: 346 MB, 0.8–0.9 s."],
  ["The hourly average and minimum per station, 2.16 million groups from the lab table", 1,
    "About 0.3 s with DuckDB against about 4 s in Postgres with its parallel workers. No cluster needed."],
  ["A dashboard tile that 50 people open: one system on one day of the real capture", 2,
    "Partition and clustering filters cut a run to 97.9 MB of the 167 GB table, shared by every viewer."],
  ["All day long, readings are fixed one at a time as station reports come in", 0,
    "Many small writes: each is a fraction of a millisecond in Postgres, and each would rewrite a column file."],
];
const RULE = "One row, or most of them? Changed, or only read? One machine, or many?";

const steps = () => [
  { stop: "Play", title: "Which engine for which question?",
    note: "Drag each question to the engine it belongs on, or click the column. Every reason you get back is a number measured on this page." },
  { stop: "Rule", title: "Three questions settle most cases", decisive: true,
    note: "Does a typical query read <b>one row or most of them</b>? Do rows <b>change</b> after they are written? And does the data <b>fit on one machine</b>?" },
];

const scene = () => `
  <div class="top">
    <div class="tray"><span class="cap"><span class="q">WHICH ENGINE?</span><span class="r">THE RULE</span></span><div class="card" draggable="true"></div></div>
    <div class="side"><div class="tally"></div><div class="tell"></div><button class="again">Start again</button></div>
  </div>
  <div class="cols">${COLS.map((c, i) => `<div class="col" data-col="${i}"><h4><span class="dot">${i + 1}</span>${c}</h4>
    <p class="sub">${GROUND[i]}</p><div class="put"></div></div>`).join("")}</div>`;

const games = new WeakMap();
const fresh = () => ({ at: 0, tries: 0, first: 0, placed: [] });

function paint(root, g, say = "", tone = "") {
  const done = g.at >= ITEMS.length, shown = root.classList.contains("shown");
  root.classList.toggle("done", done);
  const card = root.querySelector(".card"), tally = root.querySelector(".tally"), line = root.querySelector(".tell");
  if (!card || !tally || !line) return;
  card.textContent = shown ? RULE : done ? "All placed." : ITEMS[g.at][0];
  tally.textContent = done
    ? `${g.first} of ${ITEMS.length} right on the first try`
    : `Question ${g.at + 1} of ${ITEMS.length} · ${g.first} right on the first try`;
  line.textContent = say;
  line.dataset.tone = tone;
  root.querySelectorAll(".col").forEach((col, c) => {
    const put = col.querySelector(".put");
    if (put) put.innerHTML = g.placed.filter((i) => ITEMS[i][1] === c).map((i) => `<div class="chip">${ITEMS[i][0]}</div>`).join("");
  });
}

function drop(root, col) {
  const g = games.get(root);
  if (!g || g.at >= ITEMS.length || root.classList.contains("shown")) return;
  const [, right, why] = ITEMS[g.at], target = root.querySelector(`.col[data-col="${col}"]`);
  if (col !== right) {
    g.tries += 1;
    target.classList.remove("no");
    void target.offsetWidth; // restart the shake
    target.classList.add("no");
    return paint(root, g, `Not there. ${ASK[right]}`, "no");
  }
  if (g.tries === 0) g.first += 1;
  g.placed.push(g.at);
  g.at += 1;
  g.tries = 0;
  paint(root, g, `Right: ${COLS[right]}. ${why}`, "yes");
  target.querySelector(".chip:last-child")?.classList.add("new");
  target.classList.remove("yes");
  void target.offsetWidth;
  target.classList.add("yes");
}

function bind(root) {
  games.set(root, fresh());
  const card = root.querySelector(".card");
  card.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", "card"); root.classList.add("drag"); });
  card.addEventListener("dragend", () => root.classList.remove("drag"));
  root.querySelectorAll(".col").forEach((col) => {
    const n = Number(col.dataset.col);
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); });
    col.addEventListener("dragleave", () => col.classList.remove("over"));
    col.addEventListener("drop", (e) => { e.preventDefault(); col.classList.remove("over"); drop(root, n); });
    col.addEventListener("click", () => drop(root, n));
  });
  root.querySelector(".again").addEventListener("click", () => { games.set(root, fresh()); paint(root, games.get(root)); });
  paint(root, games.get(root));
}

// The rule step shows the finished board, whatever the room had placed; going back keeps the game.
function after(root, at) {
  if (!games.has(root)) bind(root);
  const g = games.get(root);
  root.classList.toggle("shown", at === 1);
  if (at === 1) paint(root, { ...g, at: ITEMS.length, placed: ITEMS.map((_, i) => i) });
  else paint(root, g);
}

const css = `
.lw .cpl { font:500 14px system-ui, sans-serif; color:var(--ink); }
.lw .cpl .top { display:flex; gap:16px; align-items:stretch; margin-bottom:14px; }
.lw .cpl .tray { flex:1.25; border:1.5px dashed var(--accent); border-radius:14px; padding:12px 14px 14px; }
.lw .cpl .cap { display:block; font:600 12px system-ui, sans-serif; letter-spacing:.09em; color:var(--mute); margin-bottom:8px; }
.lw .cpl .card { background:var(--accent-bg); border:1.5px solid var(--accent); border-radius:12px; padding:14px 16px;
  font:600 17px system-ui, sans-serif; line-height:1.35; cursor:grab; min-height:46px; user-select:none;
  box-shadow:0 6px 16px rgba(0,0,0,.22); }
.lw .cpl.done:not(.shown) .card { cursor:default; background:var(--cell); border-color:var(--line); color:var(--mute); box-shadow:none; }
.lw .cpl.shown .card { cursor:default; border-style:solid; }
.lw .cpl .cap .r, .lw .cpl.shown .cap .q { display:none; } .lw .cpl.shown .cap .r { display:inline; }
.lw .cpl .side { flex:1; display:flex; flex-direction:column; gap:8px; }
.lw .cpl .tally { font:600 13px system-ui, sans-serif; color:var(--mute); }
.lw .cpl .tell { flex:1; font:500 15px system-ui, sans-serif; line-height:1.4; border-left:3px solid transparent; padding-left:10px; }
.lw .cpl .tell[data-tone="yes"] { color:var(--ok); border-color:var(--ok); } .lw .cpl .tell[data-tone="no"] { color:var(--hot); border-color:var(--hot); }
.lw .cpl .again { align-self:flex-start; font:600 12px system-ui, sans-serif; color:var(--mute); background:none;
  border:1px solid var(--line); border-radius:7px; padding:4px 10px; cursor:pointer; }
.lw .cpl.shown .side { display:none; }
.lw .cpl .cols { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
.lw .cpl .col { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:12px 10px; min-height:230px;
  cursor:pointer; transition:border-color .3s, background .3s; }
.lw .cpl .col h4 { margin:0; font:650 15px system-ui, sans-serif; display:flex; align-items:center; gap:8px; }
.lw .cpl .col .dot { display:inline-grid; place-items:center; width:22px; height:22px; border-radius:50%; flex:none;
  background:var(--accent-bg); color:var(--accent); font:700 12px ui-monospace, Menlo, monospace; }
.lw .cpl .col .sub { margin:4px 0 8px 30px; font:500 13px system-ui, sans-serif; color:var(--mute); }
.lw .cpl .col:hover, .lw .cpl .col.over { border-color:var(--accent); background:var(--accent-bg); }
.lw .cpl.shown .col, .lw .cpl.done .col { cursor:default; background:var(--panel); border-color:var(--line); }
.lw .cpl .chip { background:var(--cell); border-radius:9px; padding:7px 10px; margin-top:6px; font:500 13px system-ui, sans-serif; line-height:1.3;
  border-left:3px solid var(--accent); }
.lw .cpl .chip.new { animation:cost-in .5s ease-out; }
.lw .cpl .col.yes { animation:cost-yes .9s; } .lw .cpl .col.no { animation:cost-no .45s; }
@keyframes cost-in { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
@keyframes cost-yes { 0% { border-color:var(--ok); background:var(--ok-bg); } 100% { border-color:var(--line); background:var(--panel); } }
@keyframes cost-no { 0%, 100% { transform:none; } 25% { transform:translateX(-5px); border-color:var(--hot); } 75% { transform:translateX(5px); border-color:var(--hot); } }
@media (prefers-reduced-motion: reduce) { .lw .cpl .col.yes, .lw .cpl .col.no, .lw .cpl .chip.new { animation:none; } }
@container (max-width: 560px) { .lw .cpl .top { flex-direction:column; } }
`;

export default widget({ key: "cpl", label: "Which engine for which question", css, steps, scene, after });
