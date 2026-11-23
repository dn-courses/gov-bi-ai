// agb-sqltools — the three tools of a SQL agent on Pagila, one action each: see the tables, look at
// one, run a query. What each returns, the row cap on run_sql, failures returned as data, and which
// tool the model picks for three questions once all three are declared.
import { TABLE_CSS, table, widths } from "@widget-lib/table.js";
import { callcap, cols, esc, fmt, json, rows, tooldef, widget, zone } from "./agb-lib.js";

// MEASURED 2026-11-23 on the lab's Pagila through the page's own functions, connected as agent_ro.
// Relation counts: the page's SQL cell over information_schema.tables. Token count:
// client.models.count_tokens (gemini-3.5-flash-lite) over json.dumps of run_sql("SELECT * FROM
// rental") with the cap at 50. `wrong` and `write`: run_sql on the same day, as agent_ro.
const CAPTURED = {
  relations: 30, views: 7, base: 23, partitions: 7,
  tables: ["actor", "address", "category", "city", "country", "customer", "docs", "film", "film_actor", "film_category", "inventory", "language", "payment", "rental", "staff", "store"],
  film: [["film_id", "integer", "false"], ["title", "text", "false"], ["description", "text", "true"], ["release_year", "integer", "true"],
    ["language_id", "integer", "false"], ["original_language_id", "integer", "true"], ["rental_duration", "smallint", "false"],
    ["rental_rate", "numeric", "false"], ["length", "smallint", "true"], ["replacement_cost", "numeric", "false"],
    ["rating", "USER-DEFINED", "true"], ["last_update", "timestamp with time zone", "false"], ["special_features", "ARRAY", "true"], ["fulltext", "tsvector", "false"]],
  missing: { error: "no such table: movies", hint: "call list_tables to see the table names" },
  shape: { columns: ["rentals"], rows: [["16044"]], truncated: false },
  rentals: 16044, capped: 4975,
  wrong: { error: 'relation "movies" does not exist\\nLINE 1: SELECT count(*) FROM movies …', hint: "fix the SQL and try again; check names with list_tables and describe_table" },
  write: { error: "permission denied for table payment", hint: "fix the SQL and try again; check names with list_tables and describe_table" },
};
// RECORDED 2026-11-23, gemini-3.5-flash-lite: the page's "which tool" cell, one call per question,
// the first function call of each reply.
const PICKS = [
  ["What tables are there?", "list_tables({})"],
  ["What columns does the payment table have?", 'describe_table({"table_name": "payment"})'],
  ["How many films are rated PG?", "list_tables({})"],
];
const TOOLS = [
  { name: "list_tables", description: "List the tables of the Pagila film-rental database. Takes no arguments.", params: [] },
  { name: "describe_table", description: "Get the columns of one table, with their types. Call it before writing SQL that uses the table.", params: [["table_name", "string", "Exact table name, as list_tables returns it."]] },
  { name: "run_sql", description: "Run one read-only PostgreSQL SELECT and return up to 50 rows. On failure returns error and hint.", params: [["query", "string", "One PostgreSQL SELECT statement."]] },
];

const css = TABLE_CSS("agb") + `
.lw .agb .path { display:grid; grid-template-columns:1fr auto 1fr auto 1fr; gap:10px; align-items:stretch; }
.lw .agb .fn { font:700 17px ui-monospace, Menlo, monospace; color:var(--accent); margin-bottom:10px; display:flex; align-items:flex-start; gap:10px; }
.lw .agb .fn > span { min-width:0; overflow-wrap:normal; }
.lw .agb .fn em { font:700 13px system-ui, sans-serif; font-style:normal; display:grid; place-items:center; width:24px; height:24px; border-radius:50%; background:var(--accent); color:var(--accent-ink); flex:none; }
.lw .agb .path .zone { animation:lw-in .4s both; } .lw .agb .path .zone:nth-of-type(2) { animation-delay:.15s; } .lw .agb .path .zone:nth-of-type(3) { animation-delay:.3s; }
.lw .agb .path .gives { font-size:17px; font-weight:550; }
.lw .agb .side { display:grid; gap:16px; align-content:start; }
.lw .agb .edge { display:grid; grid-template-columns:auto minmax(0,1fr); gap:8px 12px; align-items:baseline; font-size:15px; }
.lw .agb .edge code { font-size:14px; } .lw .agb .edge b { font:600 14px ui-monospace, Menlo, monospace; color:var(--hot); }
.lw .agb .fn span span { color:var(--mute); font-weight:400; }
.lw .agb .funnel { display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
.lw .agb svg.tbl { width:100%; max-width:560px; height:auto; display:block; }
.lw .agb svg.tbl text { font:13px ui-monospace, SFMono-Regular, Menlo, monospace; fill:var(--ink); dominant-baseline:middle; }
.lw .agb svg.tbl text.l { text-anchor:start; }
.lw .agb pre.j { font-size:14px; }
.lw .agb td.m.pick { color:var(--ok); }
@container (max-width: 760px) { .lw .agb .path { grid-template-columns:1fr; } .lw .agb .path .arrow { display:none; } }
`;

const D = CAPTURED;
const step = (n, name, args, gives, when) => zone("", `<p class="fn"><em>${n}</em><span>${name}<wbr><span>${args}</span></span></p><p class="gives">${gives}</p><p class="small" style="margin-top:6px">${when}</p>`);

function filmTable() {
  const data = D.film.map(([n, t, nl]) => [n, ["USER-DEFINED", "ARRAY"].includes(t) ? [t, "rep"] : t, nl]);
  const head = ["name", "type", "nullable"], w = widths(head, data);
  const h = 34 + data.length * 24 + 6;
  return `<svg class="tbl" viewBox="0 0 ${w.reduce((a, b) => a + b, 0) + 4} ${h + 30}">${table(2, 28, head, data, { cap: "describe_table(\"film\") — 14 columns", rowH: 24, w })}</svg>`;
}

const ceiling = () => `<div class="funnel"><span class="big acc">${fmt(D.capped)}</span><span class="acc">tokens: the first 50 rows, truncated: true</span></div>
  <p class="small">all ${fmt(D.rentals)} rows, as text, would not fit in the window; the cap keeps them out</p>`;

const VIEWS = [
  () => `<div class="path">${step(1, "list_tables", "()", "the names of the tables", "before it can pick one")}<span class="arrow">→</span>${
    step(2, "describe_table", "(table_name)", "the columns and their types", "before it can write a SELECT")}<span class="arrow">→</span>${step(3, "run_sql", "(query)", "the rows", "the answer itself")}</div>`,
  () => zone("public schema", `<div class="funnel"><span class="big dim">${D.relations}</span><span class="dim">tables and views</span><span class="dim">→</span><span class="big dim">${D.base}</span><span class="dim">base tables</span><span class="dim">→</span><span class="big acc">${D.tables.length}</span><span class="acc">returned</span></div>
    <div class="chips">${D.tables.map((t) => `<span class="chip on">${t}</span>`).join("")}</div><p class="small" style="margin-top:10px">left out: ${D.views} views, and the ${D.partitions} monthly partitions of <code>payment</code> (payment_p2022_01 … _07)</p>`),
  () => cols([zone("", filmTable()), `<div class="side">${zone("rough edges, as the catalog reports them", `<div class="edge"><code>rating</code><b>USER-DEFINED</b><code>special_features</code><b>ARRAY</b></div>`)}${
    zone(callcap("a name that does not exist", 'describe_table("movies")'), `<pre class="j">${esc(json(D.missing))}</pre>`, "hot")}</div>`], "minmax(0,1.15fr) minmax(0,1fr)"),
  () => `${zone(callcap("the shape", 'run_sql("SELECT count(*) AS rentals FROM rental")'), `<pre class="j">${esc(json(D.shape))}</pre>`)}${zone(callcap("tokens in the next model call", "SELECT * FROM rental"), ceiling())}`,
  () => cols([zone(callcap("a wrong name", 'run_sql("SELECT count(*) FROM movies")'), `<pre class="j">${esc(json(D.wrong))}</pre>`, "hot"),
    zone(callcap("a refused write", 'run_sql("DELETE FROM payment")'), `<pre class="j">${esc(json(D.write))}</pre>`, "hot")]),
  () => `${cols(TOOLS.map((t) => tooldef(t, "good")))}${zone("the first call, for three questions", rows(["question", "first call"], PICKS.map(([q, c]) => [esc(q), [esc(c), "m pick"]])))}`,
];

const steps = [
  { stop: "Three tools", title: "Three actions a person would name",
    note: `A model that has never seen this schema needs three things, in this order: which tables exist, what one of them holds, and the rows of a query. One tool for each.` },
  { stop: "list_tables", title: "list_tables: only what the model should choose from",
    note: `The schema holds ${D.relations} tables and views. The tool returns the ${D.tables.length} tables a question could name, and takes no argument, so there is nothing to get wrong.` },
  { stop: "describe_table", title: "describe_table: the columns of one table",
    note: `What the catalog says, rough edges included: <code>rating</code> is reported as USER-DEFINED (an enum) and <code>special_features</code> as ARRAY. A name that does not exist comes back as an answer with a hint.` },
  { stop: "run_sql", title: "run_sql: rows, with a ceiling", decisive: true,
    note: `Every result becomes input of the next model call, and the whole <code>rental</code> table, as text, does not fit in the window. The tool returns at most 50 rows, ${fmt(D.capped)} tokens, and says <code>truncated</code> when there were more. The cap is in your code, not in the declaration.` },
  { stop: "Failures", title: "A failed query returns; it does not raise",
    note: `Like any tool's failure, a wrong name or a refused write comes back as data: the database's message, and a hint naming the tools that help.` },
  { stop: "Declared", title: "Declared to Gemini, the three are picked by action",
    note: `The descriptions are all the model reads. In one recorded call per question it picked the tool whose action matched; for a count it first looks at the tables.` },
];

export default widget({ label: "Three SQL tools", css, steps, view: (s, at) => VIEWS[at]() });
