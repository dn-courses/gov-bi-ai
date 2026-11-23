// agh-team — B2, a team of agents: a root agent that hands each question to a specialist (ADK
// sub_agents), and the same specialists used as tools (AgentTool).
//
// MEASURED 2026-11-23 in the agents lab (agents-llm runner, gemini-3.5-flash-lite, google-adk 2.15.0):
//  - ONE: one agent with a 21-tool catalog (SQL, semantic layer, documents, chart, lookups), 8
//    questions × 3 runs: the first tool was the right kind (documents or data) in 24 of 24 runs; the
//    first request's prompt was 639–645 tokens. With 4 tools: 15 of 15. (scratchpad probe1/probe2)
//  - The event lists are one recorded run of content/agents/35-a-team-of-agents.mdx's agent.py
//    (scratchpad team.out), shortened to the call or the first words of the reply.
import { esc, staged } from "./ag4-lib.js";

const ONE = { tools: 21, runs: 24, right: 24, prompt: 640, small: 15 };
const T = (who, kind, text) => ({ who, kind, text });
const HANDOFF = [
  T("you", "asks", "What does a Plus membership cost per month?"),
  T("front_desk", "calls", "transfer_to_agent(agent_name='docs_agent')"),
  T("docs_agent", "calls", "search_policies(query='Plus membership cost per month')"),
  T("docs_agent", "says", "“…Plus ($9.99/mo, 5 rentals…)” A Plus membership costs $9.99/mo."),
];
const NEXT = [
  T("you", "asks", "And the Family tier?"),
  T("docs_agent", "calls", "search_policies(query='Family tier cost per month')"),
  T("docs_agent", "says", "The Family tier costs $14.99/mo."),
  T("you", "asks", "How many films are rated PG-13?"),
  T("docs_agent", "calls", "transfer_to_agent(agent_name='sql_agent')"),
  T("sql_agent", "calls", "describe_table(table_name='film')"),
  T("sql_agent", "calls", "run_sql(query=\"SELECT count(*) FROM film WHERE rating = 'PG-13';\")"),
  T("sql_agent", "says", "There are 223 films rated PG-13."),
];
const ASTOOL = [
  T("you", "asks", "What is the late fee, and how many rentals have not been returned yet?"),
  T("front_desk", "calls", "docs_agent(request='What is the late fee?')"),
  T("front_desk", "calls", "sql_agent(request='How many rentals have not been returned yet?')"),
  T("front_desk", "says", "The late fee is $1.00 per day past the due date… there are currently 183 rentals that have not been returned yet."),
];

const steps = [
  { stop: "One agent", title: "One agent, every tool: the picks were right",
    note: `With <b>${ONE.tools} tools</b> in one catalog, the agent chose the right kind of tool first in <b>${ONE.right} of ${ONE.runs}</b> recorded runs (with 4 tools: ${ONE.small} of ${ONE.small}). What does not scale is the rest: one prompt holds every job's rules, one account holds every job's rights, and one person owns all of it.` },
  { stop: "Specialists", title: "A root agent and two specialists", decisive: true,
    note: `Each specialist has its own short instruction, its own tools and its own rights: the documents agent has no <code>run_sql</code>, and the SQL agent connects as the read-only <code>agent_ro</code>. The root reads only their <b>descriptions</b>.` },
  { stop: "Hand-off", title: "The root hands the question over",
    note: `The root's model calls one function ADK adds for it, <code>transfer_to_agent</code>. From then on the specialist runs its own loop, with its own prompt and tools.` },
  { stop: "Next turn", title: "The specialist keeps the conversation",
    note: `The follow-up went straight to <code>docs_agent</code>; the root was not asked again. A data question then made <code>docs_agent</code> hand over to its peer itself.` },
  { stop: "As a tool", title: "Or: specialists as tools, the root answers",
    note: `Wrapped in <code>AgentTool</code>, each specialist is one function call that returns its answer. The root keeps control, asks both in one turn and writes one reply. The specialists' own tool calls stay inside them.` },
  { stop: "Dev UI", title: "The same app in the ADK dev UI",
    note: `The folder the setup cell wrote is an ADK app. The dev UI lists it without a restart; its events panel shows the same transfers.` },
];

const CSS = `
.lw .tm .tree { display:grid; gap:0; justify-items:center; }
.lw .tm .fork { width:50%; height:16px; border:2px solid var(--accent); border-bottom:0; border-radius:10px 10px 0 0; }
.lw .tm .agent { border:1.5px solid var(--line); border-radius:14px; background:var(--panel); padding:12px 16px; min-width:0; transition:border-color .4s, background .4s; }
.lw .tm .agent.on { border-color:var(--accent); background:var(--accent-bg); }
.lw .tm .agent h4 { margin:0 0 4px; font:700 17px ui-monospace, Menlo, monospace; }
.lw .tm .agent p { margin:0 0 8px; font-size:14px; color:var(--mute); }
.lw .tm .row2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; width:100%; }
.lw .tm .tools { display:flex; flex-wrap:wrap; gap:5px; }
.lw .tm .tool { padding:3px 9px; border-radius:7px; background:var(--cell); border:1px solid var(--line); font:13px ui-monospace, Menlo, monospace; }
.lw .tm .tool.hot { background:var(--hot-bg); border-color:var(--hot); color:var(--hot); }
.lw .tm .right { font-size:14px; margin-top:8px; color:var(--ok); }
.lw .tm .stub { width:2px; height:18px; background:var(--accent); }
.lw .tm .events { display:grid; gap:6px; }
.lw .tm .ev { display:grid; grid-template-columns:130px 60px minmax(0,1fr); gap:10px; align-items:baseline; padding:8px 12px; border-radius:10px; background:var(--cell); border-left:3px solid var(--line); font-size:14.5px; animation:lw-in .35s both; }
.lw .tm .ev b { font:600 13px ui-monospace, Menlo, monospace; }
.lw .tm .ev i { font-style:normal; font-size:12.5px; color:var(--mute); text-transform:uppercase; letter-spacing:.06em; }
.lw .tm .ev code { overflow-wrap:anywhere; background:none; padding:0; }
.lw .tm .ev.xfer { background:var(--accent-bg); border-left-color:var(--accent); } .lw .tm .ev.xfer code { color:var(--accent); font-weight:600; }
.lw .tm .ev.talks code { font-family:inherit; font-size:15px; }
.lw .tm .ev.you { background:transparent; border:1px solid var(--line); border-left:3px solid var(--ink); } .lw .tm .ev.you b { color:var(--ink); }
.lw .tm .ev.front_desk { border-left-color:var(--hot); } .lw .tm .ev.front_desk b { color:var(--hot); } .lw .tm .ev.sql_agent, .lw .tm .ev.docs_agent { border-left-color:var(--ok); } .lw .tm .ev.sql_agent b, .lw .tm .ev.docs_agent b { color:var(--ok); }
.lw .tm .stat { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; margin-top:12px; }
.lw .tm .stat div { padding:12px 16px; border-radius:12px; background:var(--cell); border:1px solid var(--line); }
.lw .tm .stat div.good { background:var(--ok-bg); border-color:var(--ok); } .lw .tm .stat div.bad { background:var(--hot-bg); border-color:var(--hot); }
.lw .tm .stat .mid { font-size:26px; } .lw .tm .stat p { margin:6px 0 0; font-size:14.5px; color:var(--mute); }
.lw .tm .fams { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:10px; }
.lw .tm .fam { padding:10px 12px; border-radius:10px; background:var(--cell); min-width:0; }
.lw .tm .fam.wide { grid-column:1 / -1; }
.lw .tm .fam p { margin:0 0 4px; display:flex; justify-content:space-between; align-items:baseline; font-size:15px; }
.lw .tm .fam p span { font:600 15px ui-monospace, Menlo, monospace; color:var(--accent); }
.lw .tm .names { font:13px/1.5 ui-monospace, Menlo, monospace; color:var(--mute); overflow-wrap:anywhere; }
.lw .tm .files { font:15px/1.7 ui-monospace, Menlo, monospace; }
@container (max-width: 820px) { .lw .tm .row2, .lw .tm .stat { grid-template-columns:1fr; } .lw .tm .fams { grid-template-columns:1fr 1fr; } }
`;

const chips = (names, hot = []) => `<div class="tools">${names.map((n) => `<span class="tool ${hot.includes(n) ? "hot" : ""}">${n}</span>`).join("")}</div>`;
// The 21 tools of the measured catalog, by the kind of job they serve (the probe's own grouping).
const FAMILIES = [["SQL", ["list_tables", "describe_table", "run_sql"]], ["semantic layer", ["list_metrics", "query_metrics", "dimension_values"]],
  ["documents", ["search_policies", "get_policy", "list_policies"]], ["chart", ["make_chart"]],
  ["lookups", ["find_customer", "customer_rentals", "payment_history", "film_details", "search_films", "films_by_actor",
    "list_categories", "inventory_check", "store_info", "overdue_rentals", "top_films"]]];
const family = ([name, tools]) => `<div class="fam ${tools.length > 3 ? "wide" : ""}"><p><b>${name}</b><span>${tools.length}</span></p><div class="names">${tools.join(" · ")}</div></div>`;
const handOff = (e) => /^transfer_to_agent|_agent\(request/.test(e.text);
const agent = (name, text, tools, right, cls = "") => `<div class="agent ${cls}"><h4>${name}</h4><p>${text}</p>${chips(tools)}${right ? `<p class="right">${right}</p>` : ""}</div>`;
const events = (list) => `<div class="events">${list.map((e, i) => `<div class="ev ${e.who} ${handOff(e) ? "xfer" : ""} ${e.kind === "says" ? "talks" : ""}" style="animation-delay:${i * 0.12}s"><b>${e.who}</b><i>${e.kind}</i><code>${esc(e.text)}</code></div>`).join("")}</div>`;

const scene = () => `
  <div class="zone" data-on="0"><p class="cap">one agent · one prompt · one database account · ${ONE.tools} tools</p>
    <div class="fams">${FAMILIES.map(family).join("")}</div>
    <div class="stat"><div class="good"><span class="mid ok">${ONE.right} of ${ONE.runs}</span><p>runs whose first tool was the right kind</p></div>
      <div><span class="mid">≈ ${ONE.prompt}</span><p>prompt tokens on every call, before the question</p></div>
      <div class="bad"><span class="mid hot">1</span><p>set of instructions, rights and owners for every job</p></div></div></div>
  <div class="tree" data-on="1">
    ${agent("front_desk", "Hand every question to the specialist whose description fits it.", ["transfer_to_agent"], "", "on")}
    <div class="stub"></div><div class="fork"></div>
    <div class="row2">${agent("sql_agent", "Answers questions about the rental data: films, customers, rentals, payments, stores.", ["describe_table", "run_sql"], "connects as agent_ro, read-only")}
      ${agent("docs_agent", "Answers questions about rules and policies: fees, refunds, opening hours, membership.", ["search_policies"], "no run_sql: it can only search the documents")}</div>
  </div>
  <div class="zone" data-on="2"><p class="cap">the run's events, by author</p>${events(HANDOFF)}</div>
  <div class="zone" data-on="3"><p class="cap">the same session, two more questions</p>${events(NEXT)}</div>
  <div class="zone" data-on="4"><p class="cap">AgentTool: every event is the root's</p>${events(ASTOOL)}</div>
  <div class="cols" data-on="5">
    <div class="zone"><p class="cap">AGENTS_DIR</p><div class="files">/work/agents/<br>└── agh_team/<br>&nbsp;&nbsp;&nbsp;&nbsp;├── __init__.py<br>&nbsp;&nbsp;&nbsp;&nbsp;└── agent.py &nbsp;<span class="dim">root_agent</span></div></div>
    <div class="zone"><p class="cap">http://localhost:8000</p><p>choose <code>agh_team</code>, ask a policy question and a data question, and open the events: the <code>transfer_to_agent</code> call is the hand-off.</p></div>
  </div>`;

export default staged({ key: "tm", label: "A team of agents", css: CSS, steps, scene });
