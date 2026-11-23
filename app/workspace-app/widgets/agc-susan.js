// agc-susan — a plausible answer that is wrong with nothing wrong on its face. The SQL agent asked
// how many films Susan Davis appeared in: one run says 54, and Pagila holds two actors of that
// name. Then nine runs, and the two message lists side by side, parting where one count came back.
import { table, tableWidth, widths, TABLE_CSS } from "@widget-lib/table.js";
import { beside, talk, widget, zone } from "./ag1-lib.js";
import { CSS, reqBar, reqBars, runList, src, stat } from "./agc-lib.js";

// RECORDED 2026-11-23 with gemini-3.5-flash-lite, the page's own agent (scratch susan.py, the
// default config): the wrong run, word for word; the right run's calls. Nine runs that day of the
// same agent and question: six found two actors (33 and 21 films), three answered 54.
const MODEL = "gemini-3.5-flash-lite";
const TABLES = `["actor", "address", "category", "city", "country", "customer", "docs", "film", "film_actor", "film_category", "inventory", "language", "payment", "rental", "staff", "store"]`;
const COUNT = "SELECT count(*) FROM actor a JOIN film_actor fa ON a.actor_id = fa.actor_id WHERE a.first_name = 'SUSAN' AND a.last_name = 'DAVIS'";
const WRONG = [
  { role: "user", text: "How many films has Susan Davis appeared in?" },
  { role: "tool", name: "list_tables", args: {}, result: TABLES },
  { role: "tool", name: "describe_table", args: { table_name: "actor" }, result: `{"table": "actor", "columns": [{"name": "actor_id", "type": "integer"}, {"name": "first_name", "type": "text"}, {"name": "last_name", "type": "text"}, {"name": "last_update", "type": "timestamp with time zone"}]}` },
  { role: "tool", name: "describe_table", args: { table_name: "film_actor" }, result: `{"table": "film_actor", "columns": [{"name": "actor_id", "type": "integer"}, {"name": "film_id", "type": "integer"}, {"name": "last_update", "type": "timestamp with time zone"}]}` },
  { role: "tool", name: "run_sql", args: { query: COUNT }, result: `{"columns": ["count"], "rows": [["54"]], "truncated": false}` },
  { role: "assistant", text: "Susan Davis has appeared in **54** films." },
];
const RUNS = ["two", "two", "54", "two", "two", "54", "two", "54", "two"]; // in the order they ran
// Measured on the lab's Pagila: the actors named DAVIS and their films.
const DAVIS = [["4", "JENNIFER", "DAVIS", "22"], ["101", ["SUSAN", "chg"], ["DAVIS", "chg"], ["33", "chg"]], ["110", ["SUSAN", "rep"], ["DAVIS", "rep"], ["21", "rep"]]];
const COLS = ["actor_id", "first_name", "last_name", "films"];

const steps = [
  { stop: "The answer", title: "One number, and nothing wrong with it on its face",
    note: `The agent looked up the tables, read two of them, ran one count and answered. The SQL is valid, nothing failed, and 54 is a believable number of films.` },
  { stop: "Two actors", title: "Pagila holds two actors called Susan Davis", decisive: true,
    note: `Two rows, two <code>actor_id</code>s, two careers: 33 films and 21. The count added them up and called the total one person's.` },
  { stop: "Nine runs", title: "Same agent, same question, nine runs",
    note: `Six runs found both actors. Three answered 54. Each answer reads as fluently as the others, so the answer alone cannot tell you which kind of run produced it.` },
  { stop: "Where they part", title: "Read the two lists side by side",
    note: `The same first steps. Then the right run's first count returned 0 (it searched for <code>'Susan'</code>, and names are stored in capitals), so it went looking and found two people. The wrong run's count worked the first time, so it never checked. The list shows what the agent did. It does not show what the agent assumed.` },
];

function davis() {
  const w = Math.max(tableWidth(COLS, DAVIS, widths(COLS, DAVIS, 40)) + 16, 470);
  return `<svg class="tbl" viewBox="0 0 ${w} 150" style="width:100%;max-width:620px;display:block;margin:0 auto">${
    table(8, 32, COLS, DAVIS, { cap: "actor — WHERE last_name = 'DAVIS', with a count of film_actor", pad: 40 })}</svg>`;
}

const sum = () => reqBars([
  reqBar("actor 101", [[33, "said"]], 54), reqBar("actor 110", [[21, "ok"]], 54),
  reqBar("count(*)", [[33, "said"], [21, "ok"]], 54, { text: `<span class="hotc">54</span>`, cls: "tot" })]);

const twoActors = () => `<div class="cols" style="--cols:minmax(0,1.15fr) minmax(0,1fr);align-items:stretch">
  ${zone("The rows the count added up", davis())}
  ${zone("What the count did with them", sum() + `<p class="sum">33 + 21 = <b class="hotc">54</b>, reported as one person's films</p>`, "hot")}</div>`;

function tiles() {
  const wrong = RUNS.filter((r) => r === "54").length;
  return `<div class="tally">${stat(`${RUNS.length - wrong}`, "runs found two actors", "okc")}${stat(`${wrong}`, "runs answered 54", "hotc")}</div>
  <div class="runs">${RUNS.map((r, i) => `<div class="tile ${r === "54" ? "bad" : "good"}"><span>run ${i + 1}</span><b>${
    r === "54" ? "54" : "2"}</b><small>${r === "54" ? "films · one person assumed" : "actors · 33 and 21 films"}</small></div>`).join("")}</div>`;
}

const lists = () => `<div class="cols">
  ${zone("A run that answered 54", runList([
    [1, "call", "list_tables()", "same"], [3, "call", "describe_table(actor), describe_table(film_actor)", "same"],
    [5, "call", "run_sql: count(*) … first_name = 'SUSAN' AND last_name = 'DAVIS'", "on"],
    [6, "result", "[[\"54\"]] — it worked", "bad"], [7, "answer", "Susan Davis has appeared in 54 films."]]), "hot")}
  ${zone("A run that found two", runList([
    [1, "call", "list_tables()", "same"], [3, "call", "describe_table(actor), describe_table(film_actor)", "same"],
    [5, "call", "run_sql: count(*) … first_name = 'Susan' AND last_name = 'Davis'", "on"],
    [6, "result", "[[\"0\"]] — nothing found, so it looked", "good"],
    [7, "call", "run_sql: … WHERE first_name ILIKE '%Susan%' OR last_name ILIKE '%Davis%'"],
    [8, "result", "JENNIFER DAVIS, SUSAN DAVIS, SUSAN DAVIS"],
    [9, "call", "run_sql: … GROUP BY a.actor_id, a.first_name, a.last_name"],
    [10, "result", "101 → 33, 110 → 21"], [13, "answer", "two different actors named Susan Davis: 33 and 21 films"]]), "ok")}</div>
  ${src(`two of the nine runs recorded on 2026-11-23 with ${MODEL}; the number is the message's place in the list; faded lines are the same in both`)}`;

const checks = () => zone("What a reviewer can see", `<div class="okl">
  <p><b class="okc">✓</b> the SQL ran, with no error</p><p><b class="okc">✓</b> it joins the right two tables</p>
  <p><b class="okc">✓</b> 54 is a plausible number of films</p><p class="ask"><b class="hotc">?</b> whose films they are</p></div>`);

function view(step, at) {
  if (at === 0) return beside(talk(WRONG, { model: MODEL, recorded: true, open: [4] }), checks());
  if (at === 1) return twoActors();
  if (at === 2) return zone(`Nine runs of the same agent · recorded 2026-11-23`, tiles());
  return lists();
}

const css = CSS + TABLE_CSS("ag1") + `
.lw .ag1 .okl { display:grid; gap:4px; font-size:16px; } .lw .ag1 .okl p { padding:8px 10px; border-radius:8px; }
.lw .ag1 .okl b { display:inline-block; width:24px; } .lw .ag1 .okl .ask { margin-top:6px; background:var(--hot-bg); }
:where(.lw .ag1 svg.tbl) text { font:13px ui-monospace, SFMono-Regular, Menlo, monospace; fill:var(--ink); dominant-baseline:middle; text-anchor:start; }
.lw .ag1 .sum { margin-top:16px; font-size:15px; color:var(--mute); } .lw .ag1 .sum b { font:700 20px ui-monospace, Menlo, monospace; }
.lw .ag1 .rq .r.tot { margin-top:8px; padding-top:10px; border-top:1px dashed var(--line); } .lw .ag1 .rq .r.tot .val { font-size:20px; }
.lw .ag1 .tally { display:flex; gap:36px; margin:2px 0 16px; }
.lw .ag1 .runs { display:grid; grid-template-columns:repeat(9, minmax(0,1fr)); gap:8px; }
@container (max-width: 820px) { .lw .ag1 .runs { grid-template-columns:repeat(3, minmax(0,1fr)); } }
.lw .ag1 .tile { display:grid; gap:2px; padding:12px 6px; border-radius:10px; border:1.5px solid var(--line); background:var(--cell); text-align:center; animation:lw-in .4s both; }
.lw .ag1 .tile span { font-size:12px; color:var(--mute); } .lw .ag1 .tile b { font:700 30px/1.15 ui-monospace, Menlo, monospace; }
.lw .ag1 .tile small { font-size:12px; color:var(--mute); line-height:1.35; }
.lw .ag1 .tile.bad { border-color:var(--hot); background:var(--hot-bg); } .lw .ag1 .tile.bad b { color:var(--hot); }
.lw .ag1 .tile.good { border-color:var(--ok); } .lw .ag1 .tile.good b { color:var(--ok); }
${RUNS.map((_, i) => `.lw .ag1 .tile:nth-child(${i + 1}) { animation-delay:${i * 0.07}s; }`).join("\n")}
`;

export default widget({ label: "A plausible wrong answer", css, steps, view });
