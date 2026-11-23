// cc-place — a game for the room: fourteen things a BI team runs, one card at a time and in no
// order, each to be put in its column by dragging it there (or clicking the column). A right
// column keeps the card and says why; a wrong one says what to ask. No measured numbers.
import { CSS, widget } from "./cc-lib.js";

const COLS = ["On-premises", "IaaS", "PaaS", "PaaS · serverless", "SaaS"];
// What to ask when a card is dropped on the wrong column, by the column it belongs to.
const ASK = [
  "Who owns the room the machine stands in?",
  "Who patches the operating system? Who installed the software?",
  "Who runs the engine, and who still picks the size of the machine?",
  "Is there any machine or size left for you to pick?",
  "Did you build or deploy anything, or only sign in?",
];
// [the card, its column, why]. The order is the order of play: mixed on purpose.
const ITEMS = [
  ["Power BI reports your team opens in the browser", 4, "Finished software: you sign in, bring data and decide who sees it."],
  ["SQL Server you installed on a rented virtual machine", 1, "The machine is rented. From the operating system up it is all still yours."],
  ["BigQuery: you send SQL and pay for what the query read", 3, "A platform for your own data and queries, with no machine or size to choose."],
  ["The SQL Server in your organisation's own server room", 0, "Your building, your server, and everything on it."],
  ["A managed PostgreSQL: the provider patches it, you pick its size", 2, "The provider operates the engine. You choose the machine and bring the data."],
  ["Your nightly ETL scripts, scheduled on a cloud VM you maintain", 1, "A rented machine that you patch, schedule and watch yourself."],
  ["Tableau Cloud, where analysts publish dashboards", 4, "Finished software run for you. Nothing to install or patch."],
  ["A managed Airflow service that runs the pipelines you write", 2, "The provider runs the scheduler. The pipelines and the sizing are yours."],
  ["SQL over files in object storage, with no cluster to start", 3, "You bring files and queries. The provider finds the machines for each query."],
  ["A report server on a machine in the office basement", 0, "You own the hardware, the power and the backups."],
  ["A BI server product you install on virtual machines you rent", 1, "Renting the machines changed who owns hardware, not who runs the software."],
  ["Amazon RDS for SQL Server, on an instance size you chose", 2, "Backups and patches are the provider's. The instance size is your decision."],
  ["A function that runs your code each time a file arrives", 3, "Your code on a platform that starts and stops the machines by itself."],
  ["The spreadsheets your unit edits together in Microsoft 365", 4, "Finished software. Your part is the data and who may open it."],
];

const steps = () => [
  { stop: "Play", title: "Where does each one sit?",
    note: "Drag the card to its column, or click the column. Three questions place anything: <b>who patches the operating system, who runs the engine, who chooses the size?</b>" },
  { stop: "Rule", title: "One question places anything", decisive: true,
    note: "The product name tells you little. <b>What do I still operate?</b> tells you the work, the risk and the control you keep." },
];

const scene = () => `
  <div class="top">
    <div class="tray"><span class="cap">WHERE DOES IT GO?</span><div class="card" draggable="true"></div></div>
    <div class="side"><div class="tally"></div><div class="tell"></div><button class="again">Start again</button></div>
  </div>
  <div class="cols">${COLS.map((c, i) => `<div class="col" data-col="${i}"><h4>${c}</h4><div class="put"></div></div>`).join("")}</div>`;

const games = new WeakMap();
const fresh = () => ({ at: 0, tries: 0, first: 0, placed: [] });

function paint(root, g, say = "", tone = "") {
  const done = g.at >= ITEMS.length;
  root.classList.toggle("done", done);
  root.querySelector(".card").textContent = done ? "All placed." : ITEMS[g.at][0];
  root.querySelector(".tally").textContent = done
    ? `${g.first} of ${ITEMS.length} right on the first try`
    : `Card ${g.at + 1} of ${ITEMS.length} · ${g.first} right on the first try`;
  const line = root.querySelector(".tell");
  line.textContent = say;
  line.dataset.tone = tone;
  root.querySelectorAll(".col").forEach((col, c) => {
    col.querySelector(".put").innerHTML = g.placed.filter((i) => ITEMS[i][1] === c).map((i) => `<div class="chip">${ITEMS[i][0]}</div>`).join("");
  });
}

function drop(root, col) {
  const g = games.get(root);
  if (g.at >= ITEMS.length) return;
  const [, right, why] = ITEMS[g.at], target = root.querySelector(`.col[data-col="${col}"]`);
  if (col !== right) {
    g.tries += 1;
    target.classList.remove("no");
    void target.offsetWidth; // restart the shake
    target.classList.add("no");
    return paint(root, g, `Not ${COLS[col]}. ${ASK[right]}`, "no");
  }
  if (g.tries === 0) g.first += 1;
  g.placed.push(g.at);
  g.at += 1;
  g.tries = 0;
  paint(root, g, `Right: ${COLS[right]}. ${why}`, "yes");
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
  if (at === 1) paint(root, { ...g, at: ITEMS.length, placed: ITEMS.map((_, i) => i) }, "What do I still operate?", "yes");
  else paint(root, g);
  root.classList.toggle("shown", at === 1);
}

const css = CSS("cc-pl") + `
.lw .cc-pl { font:500 14px system-ui, sans-serif; color:var(--ink); }
.lw .cc-pl .top { display:flex; gap:16px; align-items:stretch; margin-bottom:14px; }
.lw .cc-pl .tray { flex:1.2; border:1.5px dashed var(--accent); border-radius:12px; padding:12px 14px 14px; }
.lw .cc-pl .cap { display:block; font:600 12px system-ui, sans-serif; letter-spacing:.09em; color:var(--mute); margin-bottom:8px; }
.lw .cc-pl .card { background:var(--accent-bg); border:1.5px solid var(--accent); border-radius:10px; padding:14px 16px;
  font:600 17px system-ui, sans-serif; line-height:1.35; cursor:grab; min-height:46px; user-select:none; }
.lw .cc-pl.done .card, .lw .cc-pl.shown .card { cursor:default; background:var(--cell); border-color:var(--line); color:var(--mute); }
.lw .cc-pl .side { flex:1; display:flex; flex-direction:column; gap:8px; }
.lw .cc-pl .tally { font:600 13px system-ui, sans-serif; color:var(--mute); }
.lw .cc-pl .tell { flex:1; font:500 15px system-ui, sans-serif; line-height:1.4; }
.lw .cc-pl .tell[data-tone="yes"] { color:var(--ok); } .lw .cc-pl .tell[data-tone="no"] { color:var(--hot); }
.lw .cc-pl .again { align-self:flex-start; font:600 12px system-ui, sans-serif; color:var(--mute); background:none;
  border:1px solid var(--line); border-radius:7px; padding:4px 10px; cursor:pointer; }
.lw .cc-pl.shown .again { visibility:hidden; }
.lw .cc-pl .cols { display:grid; grid-template-columns:repeat(5, 1fr); gap:8px; }
.lw .cc-pl .col { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:10px 8px; min-height:210px;
  cursor:pointer; transition:border-color .3s, background .3s; }
.lw .cc-pl .col h4 { margin:0 0 8px; font:650 14px system-ui, sans-serif; text-align:center; }
.lw .cc-pl .col:hover, .lw .cc-pl .col.over { border-color:var(--accent); background:var(--accent-bg); }
.lw .cc-pl.shown .col, .lw .cc-pl.done .col { cursor:default; background:var(--panel); border-color:var(--line); }
.lw .cc-pl .chip { background:var(--cell); border-radius:8px; padding:6px 8px; margin-top:6px; font:500 12px system-ui, sans-serif; line-height:1.3; }
.lw .cc-pl .col.yes { animation:cc-pl-yes .9s; } .lw .cc-pl .col.no { animation:cc-pl-no .45s; }
@keyframes cc-pl-yes { 0% { border-color:var(--ok); background:var(--ok-bg); } 100% { border-color:var(--line); background:var(--panel); } }
@keyframes cc-pl-no { 0%, 100% { transform:none; } 25% { transform:translateX(-5px); border-color:var(--hot); } 75% { transform:translateX(5px); border-color:var(--hot); } }
@media (prefers-reduced-motion: reduce) { .lw .cc-pl .col.yes, .lw .cc-pl .col.no { animation:none; } }
`;

export default widget({ key: "cc-pl", label: "Place it on the spectrum", css, steps, scene, after });
