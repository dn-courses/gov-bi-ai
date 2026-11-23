// agb-size — a game for the room: how big should one tool be? Ten tool declarations, one at a time,
// each to be put in its column (drag it, or click the column): too big, too small, or one action a
// person would name. A wrong column says what to ask; the rule step shows the finished board.
// No measured numbers: the declarations are examples written for the game.
import { esc, widget } from "./agb-lib.js";

const COLS = ["Too big", "One per action", "Too small"];
const ASK = [
  "Can its schema say what to pass? If “anything” fits, it is too big.",
  "Would a person name this as one thing they want done?",
  "Would a person ever ask for only this? Or is it one value of a bigger action?",
];
// [name(args), description, its column, why]. Mixed on purpose.
const ITEMS = [
  ["database(action, payload)", "Does anything with the database.", 0, "Every action hides behind one name, and payload can be anything: the schema no longer says what to pass."],
  ["run_sql(query)", "Run one read-only SELECT and return its rows.", 1, "One thing a person asks for: run this query."],
  ["get_film_title(film_id)", "The title of one film.", 2, "One column of one row. A query does this, and a hundred more like it."],
  ["describe_table(table_name)", "The columns of one table, with their types.", 1, "“Show me what this table holds”: one action."],
  ["analytics(task)", "Answers any analytics question.", 0, "A tool that does everything describes nothing: no question matches it better than any other."],
  ["count_rentals_in_july()", "How many rentals there were in July.", 2, "One question, frozen into a tool. August needs another one."],
  ["list_tables()", "The names of the tables in the database.", 1, "“What is in there?”: the first thing anyone asks."],
  ["get_column_type(table, column)", "The type of one column.", 2, "A piece of describing a table, split off. The model now has two tools for one action."],
  ["report(spec)", "Queries, charts and e-mails a report.", 0, "Three actions, one of them sending mail. Each needs its own arguments and its own permission."],
  ["make_chart(sql, kind, x, y)", "Draw the rows of one query as a bar or line chart.", 1, "“Show it as a chart”: one action, with a small, closed set of arguments."],
];

const steps = [
  { stop: "Play", title: "How big is one tool?",
    note: "Drag the card to its column, or click the column. Ask: <b>would a person name this as one thing they want done?</b>" },
  { stop: "Rule", title: "One tool per action a person would name", decisive: true,
    note: "Too big, and the schema cannot say what to pass. Too small, and the catalog fills with near-twins the model must choose between. In between: one tool for each action a person asks for." },
];

const card = ([name, desc]) => `<b>${esc(name)}</b><span>${esc(desc)}</span>`;
const view = () => `<div class="game">
  <div class="top"><div class="tray"><span class="cap">where does it go?</span><div class="card" draggable="true"></div></div>
    <div class="side"><div class="dots">${ITEMS.map(() => "<i></i>").join("")}</div><div class="tally"></div>
      <div class="tell"></div><button class="again">Start again</button></div></div>
  <div class="board">${COLS.map((c, i) => `<div class="col c${i}" data-col="${i}"><h4>${c}</h4><div class="put"></div></div>`).join("")}</div></div>`;

const games = new WeakMap();
const fresh = () => ({ at: 0, tries: 0, first: 0, placed: [], won: [] });
const HINT = "Drag the card onto a column, or click the column.";

// One dot per card: green if placed on the first try, blue if it took more, ringed for the one in hand.
function dots(root, g) {
  root.querySelectorAll(".dots i").forEach((d, i) => {
    d.className = i < g.at ? ((g.won ?? []).includes(i) ? "won" : "late") : i === g.at ? "now" : "";
  });
}

function paint(root, g, say = "", tone = "") {
  const done = g.at >= ITEMS.length;
  root.classList.toggle("done", done);
  root.querySelector(".card").innerHTML = done ? "<b>All placed.</b>" : card(ITEMS[g.at]);
  root.querySelector(".tally").textContent = done ? `${g.first} of ${ITEMS.length} right on the first try`
    : `Card ${g.at + 1} of ${ITEMS.length} · ${g.first} right on the first try`;
  const line = root.querySelector(".tell");
  line.textContent = say || (done ? "" : HINT);
  line.dataset.tone = say ? tone : "hint";
  dots(root, g);
  root.querySelectorAll(".col").forEach((col, c) => {
    col.querySelector(".put").innerHTML = g.placed.filter((i) => ITEMS[i][2] === c).map((i) => `<div class="chip">${esc(ITEMS[i][0])}</div>`).join("");
  });
}

function flash(target, cls) {
  target.classList.remove("yes", "no");
  void target.offsetWidth; // restart the animation
  target.classList.add(cls);
}

function drop(root, col) {
  const g = games.get(root);
  if (!g || g.at >= ITEMS.length || root.classList.contains("shown")) return;
  const [, , right, why] = ITEMS[g.at], target = root.querySelector(`.col[data-col="${col}"]`);
  if (col !== right) {
    g.tries += 1;
    flash(target, "no");
    return paint(root, g, `Not ${COLS[col].toLowerCase()}. ${ASK[right]}`, "no");
  }
  if (g.tries === 0) { g.first += 1; g.won.push(g.at); }
  g.placed.push(g.at);
  g.at += 1;
  g.tries = 0;
  paint(root, g, `Right: ${COLS[right].toLowerCase()}. ${why}`, "yes");
  flash(target, "yes");
}

// The view is rebuilt on every step, so the game lives in a WeakMap keyed by the widget's element.
const state = new WeakMap();
function bind(root) {
  const host = root.closest(".lw");
  if (!state.has(host)) state.set(host, fresh());
  games.set(root, state.get(host));
  const cardEl = root.querySelector(".card");
  cardEl.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", "card"));
  root.querySelectorAll(".col").forEach((col) => {
    const n = Number(col.dataset.col);
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); });
    col.addEventListener("dragleave", () => col.classList.remove("over"));
    col.addEventListener("drop", (e) => { e.preventDefault(); col.classList.remove("over"); drop(root, n); });
    col.addEventListener("click", () => drop(root, n));
  });
  root.querySelector(".again").addEventListener("click", () => { state.set(host, fresh()); games.set(root, state.get(host)); paint(root, state.get(host)); });
}

function after(scene, at) {
  const root = scene.querySelector(".game");
  bind(root);
  root.classList.toggle("shown", at === 1);
  if (at === 1) paint(root, { at: ITEMS.length, first: games.get(root).first, placed: ITEMS.map((_, i) => i), won: games.get(root).won }, "Would a person name it as one thing they want done?", "yes");
  else paint(root, games.get(root));
}

const css = `
.lw .agb .game { font:500 14px system-ui, sans-serif; color:var(--ink); }
.lw .agb .game .top { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,1fr); gap:14px; margin-bottom:14px; }
.lw .agb .game .tray { border:1.5px dashed var(--accent); border-radius:14px; padding:12px 14px 14px; background:var(--panel); }
.lw .agb .game .cap { display:block; font:650 12px system-ui, sans-serif; letter-spacing:.1em; text-transform:uppercase; color:var(--mute); margin-bottom:8px; }
.lw .agb .game .card { display:grid; gap:6px; background:var(--accent-bg); border:1.5px solid var(--accent); border-radius:10px; padding:14px 18px; cursor:grab; min-height:56px; user-select:none; box-shadow:0 6px 18px -10px var(--accent); animation:lw-in .35s both; }
.lw .agb .game .card:active { cursor:grabbing; }
.lw .agb .game .card b { font:700 18px ui-monospace, Menlo, monospace; } .lw .agb .game .card span { font-size:15px; }
.lw .agb .game.done .card, .lw .agb .game.shown .card { cursor:default; background:var(--cell); border-color:var(--line); color:var(--mute); box-shadow:none; }
.lw .agb .game .side { display:flex; flex-direction:column; gap:8px; padding:12px 14px; border-radius:14px; background:var(--panel); border:1.5px solid var(--line); }
.lw .agb .game .dots { display:flex; gap:6px; }
.lw .agb .game .dots i { flex:1; height:8px; border-radius:999px; background:var(--cell); transition:background .3s; }
.lw .agb .game .dots i.won { background:var(--ok); } .lw .agb .game .dots i.late { background:var(--accent); }
.lw .agb .game .dots i.now { background:var(--accent-bg); box-shadow:inset 0 0 0 1.5px var(--accent); }
.lw .agb .game .tally { font:600 13px system-ui, sans-serif; color:var(--mute); }
.lw .agb .game .tell { flex:1; font-size:15px; line-height:1.45; }
.lw .agb .game .tell[data-tone="yes"] { color:var(--ok); } .lw .agb .game .tell[data-tone="no"] { color:var(--hot); } .lw .agb .game .tell[data-tone="hint"] { color:var(--mute); }
.lw .agb .game .again { align-self:flex-end; font:600 12px system-ui, sans-serif; color:var(--mute); background:none; border:1px solid var(--line); border-radius:7px; padding:4px 10px; cursor:pointer; }
.lw .agb .game .again:hover { color:var(--ink); border-color:var(--mute); }
.lw .agb .game.shown .again { visibility:hidden; } .lw .agb .game.shown .dots, .lw .agb .game.shown .tally { display:none; }
.lw .agb .game .board { display:grid; grid-template-columns:1fr 1.15fr 1fr; gap:10px; }
.lw .agb .game .col { background:var(--panel); border:1.5px solid var(--line); border-top-width:4px; border-radius:12px; padding:10px; min-height:180px; cursor:pointer; transition:border-color .3s, background .3s; }
.lw .agb .game .col.c1 { border-top-color:var(--ok); } .lw .agb .game .col.c0, .lw .agb .game .col.c2 { border-top-color:var(--hot); }
.lw .agb .game .col h4 { margin:2px 0 8px; font:650 15px system-ui, sans-serif; text-align:center; }
.lw .agb .game .col.c1 h4 { color:var(--ok); } .lw .agb .game .col.c0 h4, .lw .agb .game .col.c2 h4 { color:var(--hot); }
.lw .agb .game .col:hover, .lw .agb .game .col.over { border-color:var(--accent); background:var(--accent-bg); }
.lw .agb .game.shown .col.c1 { border-color:var(--ok); background:var(--ok-bg); }
.lw .agb .game.shown .col, .lw .agb .game.done .col { cursor:default; }
.lw .agb .game .chip { background:var(--cell); border:1px solid var(--line); border-radius:8px; padding:6px 9px; margin-top:6px; font:13px ui-monospace, Menlo, monospace; overflow-wrap:anywhere; }
.lw .agb .game .col.yes { animation:agb-yes .9s; } .lw .agb .game .col.no { animation:agb-no .45s; }
@keyframes agb-yes { 0% { border-color:var(--ok); background:var(--ok-bg); } 100% { background:var(--panel); } }
@keyframes agb-no { 0%, 100% { transform:none; } 25% { transform:translateX(-5px); border-color:var(--hot); } 75% { transform:translateX(5px); border-color:var(--hot); } }
@media (prefers-reduced-motion: reduce) { .lw .agb .game .col.yes, .lw .agb .game .col.no, .lw .agb .game .card { animation:none; } }
@container (max-width: 700px) { .lw .agb .game .board, .lw .agb .game .top { grid-template-columns:1fr; } }
`;

export default widget({ label: "How big is one tool", css, steps, view, after });
