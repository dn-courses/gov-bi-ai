// agb-chart — a table of numbers is not what a BI user wants back. Without a chart tool the model
// improvises a chart config in text, every number retyped by itself; with one, it writes a small
// spec (a query, a kind, two column names, a title), your code runs the query and draws the rows.
import { barChart, cols, esc, json, question, tooldef, verdict, widget, zone } from "./agb-lib.js";

const Q = "Show the revenue of each film category as a chart.";
// RECORDED 2026-11-23, gemini-3.5-flash-lite, the page's two `ask` cells (one run each). Without the
// chart tool: list_tables, six describe_table, one run_sql, then an answer that is a Chart.js config
// in a code block (shortened here at the "…"; the 16 numbers in it are the model's own copy of the
// query's result). With it: the same lookups, then the make_chart call below.
const WITHOUT = `\`\`\`json
{
  "chart": {
    "type": "bar",
    "data": {
      "labels": ["Foreign", "Children", "Animation", … 16 names],
      "datasets": [{
          "label": "Total Revenue ($)",
          "data": [10507.67, 10437.05, 10369.55, … 16 numbers],
          "backgroundColor": "rgba(54, 162, 235, 0.6)",
    …
\`\`\``;
const CALL = {
  title: "Revenue by Film Category", kind: "bar", x: "category", y: "total_revenue",
  sql: "SELECT c.name AS category, SUM(p.amount) AS total_revenue FROM category c JOIN film_category fc … JOIN payment p ON r.rental_id = p.rental_id GROUP BY c.name ORDER BY total_revenue DESC",
};
const RECEIPT = { chart: 1, drawn: "a bar chart of 16 points", truncated: false };
const ANSWER = "Here is the total revenue for each film category, ordered from highest to lowest:";
// The 16 points make_chart kept: run_sql's rows of the model's query, as agent_ro on the lab's Pagila.
const POINTS = [["Foreign", 10507.67], ["Children", 10437.05], ["Animation", 10369.55], ["Documentary", 10307.29], ["Action", 10289.6],
  ["Music", 10188.81], ["Sci-Fi", 10054.1], ["New", 9915.24], ["Sports", 9902.86], ["Games", 9848.23], ["Horror", 9807.69],
  ["Travel", 9793.98], ["Classics", 9708.77], ["Family", 9703.84], ["Drama", 9522.54], ["Comedy", 9181.93]];

const TOOL = { name: "make_chart", description: "Draw the rows of one SELECT as a chart the person sees. Use it when the person asks for a chart, or when the answer is many numbers to compare.",
  params: [["sql", "string", "One SELECT returning a label column and a number column."], ["kind", "enum", "bar | line"],
    ["x", "string", "The label column."], ["y", "string", "The number column."], ["title", "string", "A short title."]] };

const css = `
.lw .agb .pipe { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr); gap:6px; align-items:stretch; }
.lw .agb .pipe .stage { padding:12px 14px; border-radius:12px; background:var(--cell); border:1.5px solid var(--line); border-top-width:4px; font-size:14px; line-height:1.45; animation:lw-in .4s both; }
.lw .agb .pipe .stage b { display:block; margin-bottom:4px; font-size:15px; }
.lw .agb .pipe .stage.m { border-top-color:var(--accent); } .lw .agb .pipe .stage.c { border-top-color:var(--ok); }
.lw .agb .pipe .stage.m b { color:var(--accent); } .lw .agb .pipe .stage.c b { color:var(--ok); }
.lw .agb .pipe .arrow { font-size:20px; }
.lw .agb .pipe > :nth-child(3) { animation-delay:.15s; } .lw .agb .pipe > :nth-child(5) { animation-delay:.3s; } .lw .agb .pipe > :nth-child(7) { animation-delay:.45s; }
.lw .agb pre.spec { font-size:14px; line-height:1.55; }
.lw .agb pre.spec .k { color:var(--accent); }
.lw .agb .said { margin-top:12px; padding:8px 12px; border-left:3px solid var(--ok); font-size:14px; color:var(--ink); }
.lw .agb .said i { display:block; font:650 12px system-ui, sans-serif; font-style:normal; letter-spacing:.07em; text-transform:uppercase; color:var(--mute); margin-bottom:2px; }
@container (max-width: 760px) { .lw .agb .pipe { grid-template-columns:1fr; } .lw .agb .pipe .arrow { display:none; } }
`;

const marks = (text) => esc(text).replace(/\d{4,5}\.\d+/g, (n) => `<mark class="hot">${n}</mark>`);
const pipe = () => `<div class="pipe">
  <div class="stage m"><b>the model</b>writes the spec: a query, a kind, two column names, a title</div><span class="arrow">→</span>
  <div class="stage"><b>make_chart</b>runs the query through <code>run_sql</code>, as agent_ro</div><span class="arrow">→</span>
  <div class="stage"><b>the rows</b>come from the database; the model never types a number</div><span class="arrow">→</span>
  <div class="stage c"><b>your code</b>draws them, and hands the model a short receipt</div></div>`;
// The recorded call, one argument a line: the same keys and values as CALL.
const spec = () => `make_chart({\n${Object.entries(CALL).map(([k, v]) => `  <span class="k">"${k}"</span>: ${esc(JSON.stringify(v))}`).join(",\n")}\n})`;

const VIEWS = [
  () => `${question(Q)}${zone("the model's answer, with no tool that draws", `<pre>${marks(WITHOUT)}</pre>`, "hot")}${
    verdict("Text that describes a chart, for a library nobody named, with every number copied out by the model. Nothing on screen is a chart.", "hot")}`,
  () => `${cols([tooldef(TOOL, "good")])}${pipe()}`,
  () => `${question(Q)}${cols([zone("the call the model made", `<pre class="spec">${spec()}</pre>`, "on"),
    zone("what the model gets back", `<pre>${esc(json(RECEIPT))}</pre><p class="said"><i>then it answered</i>“${esc(ANSWER)}”</p>`, "ok")], "minmax(0,1.5fr) minmax(0,1fr)")}`,
  () => zone("what the person sees · drawn by your code from the rows", barChart(CALL, POINTS), "ok"),
];

const steps = [
  { stop: "Without", title: "A BI user wants a chart; the model can only write text",
    note: `With the three SQL tools only, the model found the numbers and then wrote a chart config as text, for a charting library nobody named, retyping all sixteen totals itself.` },
  { stop: "The tool", title: "A chart is one more action a person would name", decisive: true,
    note: `<code>make_chart</code> takes a spec, not a picture: which query, which kind, which columns. The numbers come from the database, through the same read-only <code>run_sql</code>.` },
  { stop: "Asked", title: "The model asks for a chart",
    note: `Recorded run: the same lookups as before, then one call with a spec. The model reads a receipt, not the picture.` },
  { stop: "Drawn", title: "Your code draws it",
    note: `Sixteen categories, from ${(9181.93).toLocaleString("en-US")} to ${(10507.67).toLocaleString("en-US")} dollars. In a cell the same points print as text bars; an app hands them to its charting library.` },
];

export default widget({ label: "A tool that returns a chart", css, steps, view: (s, at) => VIEWS[at]() });
