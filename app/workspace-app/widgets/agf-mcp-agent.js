// agf-mcp-agent — agents, MCP: the SQL agent takes its catalog from the server, runs a question
// through it, and picks up a tool added to the server with no change to its own code.
// RECORDED on 2026-11-23 with gemini-3.5-flash-lite (Vertex AI, global), from the page's own cells in
// the lesson app on the agents lab (scratch run6.out): the catalog cell, one run of ask(…) and the
// sample_rows cell. The run made five model calls and five tools/call requests in this order and
// found the tie (Music and Drama, 152 films each; checked by the page's SQL cell). An earlier run
// asked for describe_table three times and also found it; another run may differ.
import { esc, playBar, seq, widget, zone } from "./agf-lib.js";

const TOOLS = [
  ["list_tables", "List the tables of the Pagila database. Takes no arguments.", "[]"],
  ["describe_table", "Columns and types of one table. Call it before writing SQL that reads the table.", `["table_name"]`],
  ["run_sql", "Run one read-only PostgreSQL SELECT and return at most 50 rows.", `["query"]`],
];
const NEW_TOOL = ["sample_rows", "The first five rows of one table, to see what its values look like."];

const PARTIES = [["the person"], ["your code · MCP client", "me"], ["the model"], ["MCP server"]];
const EVENTS = [
  [0, 1, "Which film category has the most films?"],
  [1, 2, "question + 3 declarations from tools/list"],
  [2, 1, "call list_tables()"],
  [1, 3, "tools/call list_tables", "mcp"], [3, 1, "the table names", "mcp"],
  [2, 1, "call describe_table: category, film_category"],
  [1, 3, "tools/call describe_table × 2", "mcp"], [3, 1, "their columns", "mcp"],
  [2, 1, "call run_sql(… ORDER BY film_count DESC LIMIT 1)"],
  [1, 3, "tools/call run_sql", "mcp"], [3, 1, "Music · 152", "mcp"],
  [2, 1, "call run_sql(… every category)"],
  [1, 3, "tools/call run_sql", "mcp"], [3, 1, "Music · 152, Drama · 152, Travel · 151 …", "mcp"],
  [2, 1, "plain text: no tool call", "end"],
  [1, 0, "a tie: Music and Drama, 152 films each", "end"],
];
const SAYS = ["the question arrives", "the list goes out with the catalog the server gave", "model call 1 asks for a tool",
  "your code does not run it: it sends tools/call", "the server ran it and answers", "model call 2: two calls in one reply",
  "each one a tools/call", "the columns come back", "model call 3: a first query", "over MCP again", "one row: Music",
  "model call 4 checks for a tie", "over MCP", "two categories share the top", "model call 5: no tool call, the loop ends", "the answer"];

const CSS = `
.lw .agf .tdef { border:1.5px solid var(--line); border-left:5px solid var(--accent); border-radius:12px; background:var(--cell); padding:10px 14px; display:grid; gap:4px; }
.lw .agf .tdef b { font:700 15px ui-monospace, Menlo, monospace; color:var(--accent); } .lw .agf .tdef span { font-size:14px; line-height:1.45; }
.lw .agf .tdef i { justify-self:start; font:normal 13px ui-monospace, Menlo, monospace; color:var(--mute); background:var(--panel); border-radius:6px; padding:1px 8px; }
.lw .agf .tdef.old { border-left-color:var(--line); } .lw .agf .tdef.old b { color:var(--ink); }
.lw .agf .tdef.new { border-color:var(--ok); border-left-color:var(--ok); background:var(--ok-bg); animation:lw-in .6s .3s both; } .lw .agf .tdef.new b { color:var(--ok); }
.lw .agf .tdef .nb { justify-self:start; font:700 12px system-ui, sans-serif; letter-spacing:.08em; color:var(--ok); }
.lw .agf .defs { display:grid; gap:8px; }
.lw .agf .map { display:grid; grid-template-columns:1fr auto 1fr; gap:14px; align-items:center; font:14px ui-monospace, Menlo, monospace; }
.lw .agf .map .arr { color:var(--accent); font:700 24px system-ui, sans-serif; }
.lw .agf .map .side-cap { font:600 12px system-ui, sans-serif; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); margin-bottom:6px; }
.lw .agf .keys { display:flex; flex-wrap:wrap; gap:8px 20px; margin-bottom:10px; font-size:13px; color:var(--mute); }
.lw .agf .keys span { display:inline-flex; align-items:center; gap:8px; }
.lw .agf .keys i { width:26px; height:0; border-top:2.4px solid var(--mute); }
.lw .agf .keys i.mcp { border-color:var(--accent); } .lw .agf .keys i.end { border-color:var(--ok); }
.lw .agf .same { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; border:1.5px dashed var(--line); font-size:14px; color:var(--mute); }
.lw .agf .same code { color:var(--ink); }
`;

const tdef = ([name, desc, req], cls = "") => `<div class="tdef ${cls}">${cls === "new" ? `<span class="nb">NEW ON THE SERVER</span>` : ""}<b>${name}</b><span>${esc(desc)}</span>${req ? `<i>required: ${esc(req)}</i>` : ""}</div>`;
const mapping = `<div class="map"><div><p class="side-cap">MCP · from the server</p><pre>tool.name
tool.description
tool.input_schema</pre></div><span class="arr">→</span><div><p class="side-cap">Gemini · to the model</p><pre>FunctionDeclaration(
  name=…, description=…,
  parameters_json_schema=…)</pre></div></div>`;
const KEYS = `<div class="keys"><span><i></i>your code and the model</span><span><i class="mcp"></i>over MCP: tools/call and its result</span><span><i class="end"></i>the loop ends</span></div>`;

const steps = [
  { stop: "The catalog", title: "The tool list comes from the server",
    note: `The client starts the server, asks <code>tools/list</code>, and turns each tool into a Gemini function declaration. The names, descriptions and schemas are the server's; nothing is typed twice.` },
  { stop: "The run", title: "The same loop, with the tools in another process", decisive: true,
    note: `Press <b>Play</b>. The loop is unchanged except at one point: where it used to call a Python function, it sends <code>tools/call</code> to the server and passes the result back to the model.`,
    say: (i) => SAYS[i] },
  { stop: "Discovered", title: "A new tool on the server reaches the agent",
    note: `A fourth tool is added to the server file. The agent's code is not touched: the next session asks <code>tools/list</code> again and the model is offered four tools.` },
];

function view(step, at) {
  if (at === 0) return `${zone("tools/list → the declarations the model receives", `<div class="defs">${TOOLS.map((t) => tdef(t)).join("")}</div>`, "on")}
    ${zone("the translation, one line per field", mapping)}`;
  if (at === 1) return playBar("recorded on 2026-11-23 · press Play to replay it") + zone("", KEYS + seq(PARTIES, EVENTS));
  return `<div class="cols">${zone("first session · 3 tools", `<div class="defs">${TOOLS.map(([n, d]) => tdef([n, d], "old")).join("")}</div>`)}
    ${zone("after the server changed · 4 tools", `<div class="defs">${TOOLS.map(([n, d]) => tdef([n, d], "old")).join("")}${tdef(NEW_TOOL, "new")}</div>`, "ok")}</div>
    <div class="same">the agent's code, <code>ask()</code>, is the same in both</div>`;
}

export default widget({ label: "The agent over MCP", css: CSS, steps, view });
