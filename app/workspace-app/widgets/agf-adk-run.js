// agf-adk-run — agents, ADK: the SQL agent as an ADK agent folder, one run as ADK's events, the dev UI
// over the same folder, and a second agent whose tools come from an MCP server.
// RECORDED on 2026-11-23 with gemini-3.5-flash-lite (google-adk 2.15.0), from the page's own cells in
// the lesson app on the agents lab (scratch run29.out): the declaration ADK derived from run_sql, one
// run of ask(…) (8 events kept in the session; describe_table was asked for twice in one model reply),
// list-apps from the dev UI's server, and the MCP toolset's tool names. This run stopped at the first
// row and missed the tie (Drama also has 152 films; another run of the same cell found it).
// The dev UI step is a sketch, not a capture: its rows are the kinds of event a run makes.
import { esc, playBar, widget, zone } from "./agf-lib.js";

const DECL = {
  name: "run_sql",
  description: "Run one read-only PostgreSQL SELECT and return at most 50 rows.\n\nArgs:\n    query: a single SELECT statement.",
  schema: `{"type": "object", "title": "run_sqlParams",
 "required": ["query"],
 "properties": {"query": {"title": "Query", "type": "string"}}}`,
};

const EVENTS = [
  ["user", "text", "Which film category has the most films, and how many?"],
  ["adk_sql_agent", "call", "list_tables()"],
  ["adk_sql_agent", "response", "list_tables → {'tables': ['actor', 'address', 'category', …]}"],
  ["adk_sql_agent", "call", "describe_table(category) · describe_table(film_category)"],
  ["adk_sql_agent", "response", "describe_table → two column lists"],
  ["adk_sql_agent", "call", "run_sql(SELECT c.name, COUNT(fc.film_id) … ORDER BY film_count DESC LIMIT 1)"],
  ["adk_sql_agent", "response", "run_sql → {'columns': ['name', 'film_count'], 'rows': [['Music', '152']]}"],
  ["adk_sql_agent", "final", "The film category with the most films is Music, with 152 films."],
];
const APPS = ["adk_sql_agent", "adk_sql_agent_mcp"];
const TOOL_NAMES = ["list_tables", "describe_table", "run_sql"];

const CSS = `
.lw .agf .evs { display:grid; gap:6px; }
.lw .agf .ev { display:grid; grid-template-columns:28px 130px 92px 1fr; gap:10px; align-items:center; padding:7px 12px; border-radius:10px; background:var(--cell); border:1.5px solid var(--line); font-size:14px; }
.lw .agf .ev .n { font:600 12px ui-monospace, Menlo, monospace; color:var(--mute); text-align:right; }
.lw .agf .ev .au { font:600 13px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .agf .ev .kd, .lw .agf .kd { justify-self:start; padding:1px 10px; border-radius:999px; font:600 12px ui-monospace, Menlo, monospace; background:var(--panel); color:var(--ink); }
.lw .agf .call .kd, .lw .agf .kd.call { color:var(--accent); background:var(--accent-bg); } .lw .agf .response .kd, .lw .agf .kd.response { color:var(--hot); background:var(--hot-bg); }
.lw .agf .final .kd, .lw .agf .kd.final { color:var(--ok); background:var(--ok-bg); } .lw .agf .ev.final { border-color:var(--ok); }
.lw .agf .ev.call { margin-top:4px; }
.lw .agf .ev.cur { box-shadow:0 0 0 2px var(--accent); } .lw .agf .ev.final.cur { box-shadow:0 0 0 2px var(--ok); }
.lw .agf .ev .tx { font:13px ui-monospace, Menlo, monospace; overflow-wrap:anywhere; }
.lw .agf .tree { font:15px/1.7 ui-monospace, Menlo, monospace; white-space:nowrap; }
.lw .agf .tree .cm { font-size:13px; color:var(--mute); margin-bottom:4px; }
.lw .agf .tree .on { color:var(--accent); font-weight:700; } .lw .agf .tree .g { color:var(--line); }
.lw .agf .fld { display:grid; grid-template-columns:104px 1fr; gap:10px; align-items:start; padding:8px 0; border-top:1px solid var(--line); }
.lw .agf .fld:first-of-type { border-top:0; padding-top:0; }
.lw .agf .fld .k { font:600 12px system-ui, sans-serif; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); padding-top:9px; }
.lw .agf .fld pre.nm { color:var(--accent); font-weight:700; }
.lw .agf .via { display:grid; justify-items:center; gap:4px; color:var(--accent); font:700 24px system-ui, sans-serif; align-self:center; }
.lw .agf .via span { font:500 13px system-ui, sans-serif; color:var(--mute); text-align:center; max-width:110px; }
.lw .agf .win { border:1.5px solid var(--line); border-radius:12px; overflow:hidden; background:var(--cell); }
.lw .agf .chrome { display:flex; align-items:center; gap:7px; padding:8px 12px; background:var(--panel); border-bottom:1px solid var(--line); }
.lw .agf .chrome i { width:11px; height:11px; border-radius:50%; background:var(--line); }
.lw .agf .chrome .url { margin-left:10px; flex:1; padding:3px 12px; border-radius:999px; background:var(--cell); font:13px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .agf .ui { display:grid; grid-template-columns:270px 1fr; }
.lw .agf .ui .side { background:var(--panel); padding:14px; display:grid; gap:7px; align-content:start; border-right:1px solid var(--line); }
.lw .agf .ui .side .cap { margin:6px 0 2px; }
.lw .agf .ui .row { display:flex; align-items:center; gap:8px; padding:4px 8px; border-radius:8px; font:13px ui-monospace, Menlo, monospace; }
.lw .agf .ui .row .kd { min-width:84px; text-align:center; }
.lw .agf .ui .row .n { color:var(--mute); width:14px; text-align:right; }
.lw .agf .ui .row.open { background:var(--accent-bg); outline:1.5px solid var(--accent); }
.lw .agf .ui .peek { margin:0 0 4px 22px; display:grid; gap:4px; font-size:13px; color:var(--mute); border-left:2px solid var(--accent); padding-left:10px; }
.lw .agf .ui .main { padding:16px 18px; display:flex; flex-direction:column; gap:10px; }
.lw .agf .ui .bubble { align-self:flex-end; padding:8px 14px; border-radius:14px 14px 4px 14px; background:var(--accent-bg); color:var(--ink); font-size:14px; }
.lw .agf .ui .bubble.a { align-self:flex-start; border-radius:14px 14px 14px 4px; background:var(--panel); color:var(--mute); }
.lw .agf .ui .tchip { align-self:flex-start; padding:4px 12px; border-radius:999px; border:1.5px solid var(--line); background:var(--panel); font:13px ui-monospace, Menlo, monospace; }
.lw .agf .ui .tchip b { color:var(--accent); margin-right:6px; }
.lw .agf .ui .ask { margin-top:auto; padding:9px 14px; border-radius:999px; border:1.5px solid var(--line); font-size:14px; color:var(--mute); }
.lw .agf .flow { display:grid; grid-template-columns:1fr auto 1fr auto 1fr; gap:10px; align-items:stretch; }
.lw .agf .fcard { border:1.5px solid var(--line); border-radius:12px; background:var(--cell); padding:10px 12px; display:grid; gap:6px; align-content:start; }
.lw .agf .fcard.on { border-color:var(--accent); }
.lw .agf .fcard b { font:700 14px ui-monospace, Menlo, monospace; } .lw .agf .fcard.on b { color:var(--accent); }
.lw .agf .fcard pre { padding:6px 10px; font-size:13px; background:var(--panel); }
.lw .agf .chips { display:flex; flex-wrap:wrap; gap:8px; }
`;

const ev = ([author, kind, text], i) => `<div class="ev pl ${kind}"><span class="n">${i + 1}</span><span class="au">${author}</span><span class="kd">${kind}</span><span class="tx">${esc(text)}</span></div>`;
const fld = (k, v, cls = "") => `<div class="fld"><span class="k">${k}</span><pre class="${cls}">${v}</pre></div>`;

const TREE = `<div class="tree"><div>▾ adk_sql_agent/</div><div><span class="g">├─</span> __init__.py</div><div class="cm"><span class="g">│</span>&nbsp;&nbsp;&nbsp;from . import agent</div><div><span class="g">└─</span> <span class="on">agent.py</span></div><div class="cm">&nbsp;&nbsp;&nbsp;&nbsp;root_agent = Agent(…)</div></div>`;
const folder = () => `<div class="cols" style="--cols:minmax(0,.9fr) auto minmax(0,1.3fr); align-items:center">
  ${zone("$AGENTS_DIR · /work/agents", TREE)}<div class="via">→<span>signature + docstring</span></div>
  ${zone("what ADK made of run_sql", fld("name", DECL.name, "nm") + fld("description", esc(DECL.description)) + fld("parameters", esc(DECL.schema)), "on")}</div>`;

const run = () => playBar("recorded on 2026-11-23 · press Play to replay it")
  + zone("the events of one run · 8 kept in the session", `<div class="evs">${EVENTS.map(ev).join("")}</div>`)
  + zone("", `<p>Music has 152 films, and so does Drama. This run stopped at the first row; nothing in ADK knows that the answer is incomplete.</p>`, "hot");

// The dev UI, sketched: the agents it lists, the rows of a run's events (one opened), the chat.
const ROWS = [["text", "user"], ...TOOL_NAMES.flatMap((n) => [["call", n], ["response", n]]), ["final", "the answer"]];
const evRow = ([kind, what], i) => `<div class="row ${i === 5 ? "open" : ""}"><span class="n">${i + 1}</span><span class="kd ${kind}">${kind}</span>${what}</div>`
  + (i === 5 ? `<div class="peek"><span>request: what went to the model</span><span>response: what came back</span></div>` : "");
const side = () => `<div class="side"><p class="cap">select an agent</p>${APPS.map((a, i) => `<span class="chip ${i ? "" : "on"}">${a}</span>`).join("")}
  <p class="cap">events · open one</p>${ROWS.map(evRow).join("")}</div>`;
const chat = () => `<div class="main"><span class="bubble">Which film category has the most films?</span>
  ${TOOL_NAMES.map((n) => `<span class="tchip"><b>⚡</b>${n}</span>`).join("")}<span class="bubble a">…the answer</span><span class="ask">type a question</span></div>`;
const devUi = () => zone("http://localhost:8000 · a sketch of the page", `<div class="win"><div class="chrome"><i></i><i></i><i></i><span class="url">localhost:8000</span></div><div class="ui">${side()}${chat()}</div></div>`);

const fcard = (title, body, cls = "") => `<div class="fcard ${cls}"><b>${title}</b><pre>${body}</pre></div>`;
const via = (top, bottom) => `<div class="via">→<span>${top}<br>${bottom}</span></div>`;
const mcp = () => `${zone("adk_sql_agent_mcp", `<div class="flow">${fcard("agent.py", "root_agent = Agent(\n  tools=[McpToolset(…)])", "on")}${via("stdio", "tools/list")}
  ${fcard("server.py", `MCPServer("pagila")`)}${via("imports", "")}${fcard("adk_sql_agent/agent.py", "the three functions")}</div>`, "on")}
  ${zone("tools from the server", `<div class="chips">${["describe_table", "list_tables", "run_sql"].map((n) => `<span class="chip on">${n}</span>`).join("")}</div>`)}`;

const steps = [
  { stop: "agent.py", title: "An agent is a folder with a root_agent",
    note: `<code>Agent(name, model, instruction, tools)</code>, with the three plain functions as tools. ADK reads each function's signature and docstring into the declaration you used to type.` },
  { stop: "One run", title: "The runner drives the loop and reports events", decisive: true,
    note: `Press <b>Play</b>. Every model reply and every tool result is an <b>event</b>, kept in the session. The loop, the dispatch and the history are ADK's; the cap is <code>RunConfig(max_llm_calls=10)</code>.`,
    say: (i) => ["the question opens the session", "the model asks for list_tables", "ADK ran your function", "two calls in one reply",
      "both results", "one query", "one row", "a final response: no tool call"][i] },
  { stop: "Dev UI", title: "The same folder, in ADK's own UI",
    note: `<code>adk web</code> lists every folder under <code>AGENTS_DIR</code>. Each question runs the same loop; each event can be opened to see what went to the model and what came back.` },
  { stop: "MCP tools", title: "Tools from an MCP server",
    note: `ADK's agent takes its tools from an MCP server through <code>McpToolset</code>, in place of a list of functions.` },
];

const VIEWS = [folder, run, devUi, mcp];
const view = (step, at) => VIEWS[at]();

export default widget({ label: "The SQL agent in ADK", css: CSS, steps, view });
