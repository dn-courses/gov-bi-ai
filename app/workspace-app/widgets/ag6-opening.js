// ag6-opening — "Why Free SQL Is Not Production", first scene: the free-SQL agent seen from outside.
// One tool that takes any text, a prompt that names four tables, and a role that can read all of them.
//
// CAPTURED 2026-11-22 in the agents lab, as analyst_ro on `shop`: count(*) of each mart table
// (1,666,665 / 100,000 / 10,000 / 731). The prompt text is the page's own SYSTEM. Fixed text: what
// the prompt does not say, read off that prompt.
import { CSS, chip, from, node, on, pill, svg, t, widget, zone } from "./ramp-lib.js";

const TABLES = [
  ["fact_sales", "1,666,665 rows"], ["dim_customer", "100,000 rows"], ["dim_product", "10,000 rows"], ["dim_date", "731 rows"],
];
const PROMPT = [
  "fact_sales(order_id, line_no, date_key,", "  customer_key, product_key, status, …)", "dim_product(product_key, name, …)",
  "dim_customer(customer_key, country, …)", "dim_date(date_key, day, year, …)", "Revenue = quantity*unit_cents/100.0,", "  pending orders excluded.",
];
const UNSAID = ["what one row of fact_sales is", "what a “sale” or an “order” counts", "that a row's text is data, not orders"];
const THREE = [
  ["meaning", "nobody checks what the SQL means"], ["authorship", "any text it reads can write the SQL"], ["reach", "one call reads what the role reads"],
];

const steps = [
  { stop: "One tool", title: "The agent holds one tool, and it takes any text",
    note: `<code>run_sql</code> accepts a string and runs it on the warehouse. Whatever the model writes there, PostgreSQL executes, as the role the tool connects as.` },
  { stop: "Told", title: "What it was told: four table names and their columns",
    note: `The system prompt lists the tables and one rule about revenue. It says nothing about what a row is, what counts as a sale, or which text to trust.` },
  { stop: "Reach", title: "What it can reach: everything the role can read",
    note: `The opening is as wide as <code>analyst_ro</code>: every table of the star, every join between them, every aggregate, and the system catalogs any role may read. Nothing between the model and the database looks at what the SQL means.` },
  { stop: "Three gaps", title: "Three things nobody controls", decisive: true,
    note: `What the SQL means, who wrote it, and how much one call can read. Each of them is shown below, on this star, with this agent.` },
];

const CSS_EXTRA = `
.lw .ag6o text.cap { font-size:12px; }
.lw .ag6o .fan { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; opacity:.7; }
.lw .ag6o .box.told { fill:var(--accent-bg); stroke:var(--accent); }
.lw .ag6o .pill.hot { fill:var(--hot-bg); stroke:var(--hot); }
.lw .ag6o[data-at="0"] .pill.tool, .lw .ag6o[data-at="2"] .pill.tool { fill:var(--accent-bg); stroke:var(--accent); }
.lw .ag6o[data-at="2"] .tbl, .lw .ag6o[data-at="3"] .tbl { fill:var(--accent-bg); stroke:var(--accent); }
`;

const prompt = () => `
  <rect class="box them" x="30" y="20" width="360" height="176" rx="10"/>${t(46, 40, "SYSTEM PROMPT", "cap")}
  ${PROMPT.map((line, i) => t(46, 64 + i * 18, line, "code")).join("")}
  ${on("1", `<rect class="box told" x="30" y="20" width="360" height="176" rx="10" style="fill:none"/>`)}`;

const agent = () => `
  ${node(30, 232, 140, 50, "the agent", "you", "")}
  ${pill(200, 232, 170, 50, "tool")}${t(285, 258, "run_sql(sql)", "mono")}
  <path class="edge on" d="M170 257 L200 257"/>
  ${t(285, 300, "sql: any text", "lbl")}`;

const warehouse = () => `
  ${zone(440, 20, 300, 394, "WHAT analyst_ro MAY READ")}
  ${TABLES.map(([name, rows], i) => `<rect class="box tbl" x="460" y="${50 + i * 72}" width="260" height="52" rx="8"/>
    ${t(476, 70 + i * 72, name, "mono l")}${t(476, 90 + i * 72, rows, "lbl l")}`).join("")}
  <rect class="box tbl" x="460" y="338" width="260" height="56" rx="8"/>${t(476, 358, "pg_catalog,", "mono l")}${t(476, 378, "information_schema", "mono l")}`;

const scene = () => svg(760, 432, `
  ${prompt()}${agent()}${warehouse()}
  ${on("0 1", `<path class="edge" d="M370 257 L440 257"/>`)}
  ${from(2, `<path class="fan" d="M370 244 L440 22 L440 412 L370 270 Z"/>`)}
  ${on("1 2", `${t(30, 334, "NOT IN THE PROMPT", "cap")}${UNSAID.map((u, i) => t(30, 358 + i * 22, `– ${u}`, "lbl l hot")).join("")}`)}
  ${on("3", `${t(30, 334, "NOBODY CONTROLS", "cap")}${THREE.map(([k, v], i) => `${chip(30, 344 + i * 30, 112, 26, k, "warm", "hot")}${t(156, 358 + i * 30, v, "lbl l")}`).join("")}`)}`);

export default widget({ key: "ag6o", label: "The free-SQL agent, from outside", css: CSS("ag6o") + CSS_EXTRA, steps: () => steps, scene });
