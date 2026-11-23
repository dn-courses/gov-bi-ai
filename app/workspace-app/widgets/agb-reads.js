// agb-reads — what the model reads to choose a tool: never the code, only the declaration. A vague
// catalog and a precise one, the same question, and the call the model made with each.
import { code, cols, question, runs, tooldef, verdict, widget, zone } from "./agb-lib.js";

const Q = "How many rentals were there in July 2022?";
// RECORDED 2026-11-23, gemini-3.5-flash-lite: the page's two `first_call` cells, three calls each,
// the first function call of each reply. Every run of a catalog made the same call.
const RECORDED = {
  vague: ['get_data({"table": "rentals"})', 'get_data({"table": "rentals"})', 'get_data({"table": "rentals"})'],
  precise: [
    "run_sql({\"query\": \"SELECT count(*) FROM rental WHERE rental_date >= '2022-07-01' AND rental_date < '2022-08-01';\"})",
    "run_sql({\"query\": \"SELECT COUNT(*) FROM rental WHERE rental_date >= '2022-07-01' AND rental_date < '2022-08-01';\"})",
    "run_sql({\"query\": \"SELECT COUNT(*) FROM rental WHERE rental_date >= '2022-07-01' AND rental_date < '2022-08-01';\"})",
  ],
};
const VAGUE = [
  { name: "get_data", description: "Gets data.", params: [["table", "string", ""]] },
  { name: "query", description: "Runs a query.", params: [["q", "string", ""]] },
];
const PRECISE = [
  { name: "get_rows", description: "Return the first 50 rows of one table, unfiltered: to see what a table holds. Not for counting.", params: [["table_name", "string", "Exact table name."]] },
  { name: "run_sql", description: "Run one PostgreSQL SELECT on the Pagila database and return its rows: to count, sum and filter.", params: [["query", "string", "One PostgreSQL SELECT statement."]] },
];
const CODE = [
  "def get_data(table):",
  "    with psycopg.connect(AGENT_URL) as conn:",
  "        cur = conn.execute(f\"SELECT * FROM {table} LIMIT 50\")",
  "        return {\"columns\": [c.name for c in cur.description],",
  "                \"rows\": [[str(v) for v in r] for r in cur]}",
];

const css = `
.lw .agb .hidden .code { font-size:13px; opacity:.4; filter:saturate(.4); }
.lw .agb .lock { display:flex; align-items:center; gap:8px; margin-top:10px; padding:6px 12px; border-radius:8px; background:var(--hot-bg); color:var(--hot); font:600 13px system-ui, sans-serif; }
.lw .agb .lock::before { content:"✕"; font-weight:700; }
.lw .agb .gate { display:grid; justify-items:center; gap:4px; align-self:center; color:var(--accent); font:600 12px system-ui, sans-serif; letter-spacing:.07em; text-transform:uppercase; text-align:center; }
.lw .agb .gate i { font-style:normal; font-size:26px; line-height:1; }
.lw .agb .reads { box-shadow:0 0 0 4px var(--accent-bg); }
.lw .agb .tooldef mark { padding:0 3px; }
`;
// A tool definition with some words of its description marked: tooldef escapes text, so mark after.
const marked = (t, words, cls) => words.reduce((html, w) => html.replace(w, `<mark class="${cls}">${w}</mark>`), tooldef(t, cls === "ok" ? "good" : ""));

const steps = [
  { stop: "What it reads", title: "The model never sees your function",
    note: `It chooses from the declaration alone, so how that text is written decides which tool it picks.` },
  { stop: "Vague", title: "A vague catalog: the model guesses",
    note: `Two tools, and neither says what it is for. In three runs of three the model chose <code>get_data</code>, a tool that cannot count, with a table named <code>rentals</code>, which does not exist.` },
  { stop: "Precise", title: "The description is matched against the question", decisive: true,
    note: `Same question, descriptions that say what each tool is for. “How many” meets “to count”, and “not for counting” sends it away from the other. Three runs of three wrote the right <code>COUNT(*)</code>.` },
];

const VIEWS = [
  () => cols([zone("your code", `<div class="hidden">${code(CODE)}</div><p class="lock">the model never sees this</p>`),
    `<div class="gate"><i>→</i>declared<br>as</div>`, zone("what the model reads", tooldef(VAGUE[0], "on"), "on reads")], "minmax(0,1.55fr) auto minmax(0,1fr)"),
  () => `${question(Q)}${cols(VAGUE.map((t) => tooldef(t, "bad")))}${zone("the call the model made · 3 runs", runs(RECORDED.vague.map((c, i) => [`run ${i + 1}`, c, "hot"])))}${
    verdict("Nothing in either description meets “how many”: the model took the likelier-sounding name, and guessed the table.", "hot")}`,
  () => `${question(Q.replace("How many", "<mark>How many</mark>"))}${cols([marked(PRECISE[0], ["Not for counting"], "hot"), marked(PRECISE[1], ["to count"], "ok")])}${
    zone("the call the model made · 3 runs", runs(RECORDED.precise.map((c, i) => [`run ${i + 1}`, c, "ok"])))}`,
];

export default widget({ label: "What the model reads", css, steps, view: (s, at) => VIEWS[at]() });
