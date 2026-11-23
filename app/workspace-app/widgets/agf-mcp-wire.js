// agf-mcp-wire — agents, MCP: the Pagila server and the exchange with it, message by message.
// Every message below crossed a real pipe: captured 2026-11-23 in the lab's Python (mcp 2.3.0) by the
// page's own cells, which start mcp_pagila_server.py and write JSON-RPC lines to its stdin by hand.
// Bodies are reflowed for reading; where a part is left out, the drawing says "…".
import { esc, playBar, widget, wire, zone } from "./agf-lib.js";

const m = (s, re, cls = "") => esc(s).replace(re, (x) => `<mark class="${cls}">${x}</mark>`);

const MESSAGES = {
  hello: [
    { dir: "req", head: "initialize", body: m(`{"jsonrpc": "2.0", "id": 1, "method": "initialize",
 "params": {"protocolVersion": "2025-11-25", "capabilities": {},
            "clientInfo": {"name": "by-hand", "version": "0"}}}`, /2025-11-25/g) },
    { dir: "res", head: "result", note: "the version, and what it offers", body: m(`{"jsonrpc": "2.0", "id": 1, "result": {
  "protocolVersion": "2025-11-25",
  "serverInfo": {"name": "pagila", "version": ""},
  "capabilities": {"tools": {"listChanged": false},
                   "resources": {"listChanged": false, "subscribe": false},
                   "prompts": {"listChanged": false}}}}`, /2025-11-25|"tools"|"resources"|"prompts"/g) },
    { dir: "req", head: "notifications/initialized", note: "no id: no reply", body: esc(`{"jsonrpc": "2.0", "method": "notifications/initialized"}`) },
  ],
  list: [
    { dir: "req", head: "tools/list", body: m(`{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}`, /"tools\/list"/) },
    { dir: "res", head: "result", note: "three tools, found at run time", body: m(`{"jsonrpc": "2.0", "id": 2, "result": {"tools": [
  {"name": "list_tables", "description": "List the tables of …", "inputSchema": {…}},
  {"name": "describe_table", "description": "Columns and types of …", "inputSchema": {…}},
  {"name": "run_sql",
   "description": "Run one read-only PostgreSQL SELECT and return at most 50 rows.",
   "inputSchema": {"type": "object", "required": ["query"],
                   "properties": {"query": {"title": "Query", "type": "string"}}}}]}}`, /"(list_tables|describe_table|run_sql)"/g) },
  ],
  call: [
    { dir: "req", head: "tools/call", body: m(`{"jsonrpc": "2.0", "id": 3, "method": "tools/call",
 "params": {"name": "run_sql",
            "arguments": {"query": "SELECT count(*) AS films FROM film"}}}`, /"run_sql"|"arguments"/g) },
    { dir: "res", head: "result", body: m(`{"jsonrpc": "2.0", "id": 3, "result": {
  "content": [{"type": "text",
               "text": "{\\"columns\\": [\\"films\\"], \\"rows\\": [[\\"1000\\"]]}"}],
  "isError": false}}`, /1000|false/g, "k") },
  ],
  bad: [
    { dir: "req", head: "tools/call", body: m(`{"id": 4, … {"name": "run_sql", "arguments": {"query": "SELECT count(*) FROM movies"}}}`, /movies/) },
    { dir: "res", head: "result", note: "the tool's own error (the text shown unescaped)", body: m(`{"id": 4, "result": {"content": [{"type": "text", "text":
     {"error": "relation "movies" does not exist …",
      "hint": "fix the SQL; check names with describe_table"}}],
  "isError": false}}`, /does not exist|hint|false/g, "h") },
    { dir: "req", head: "tools/call", body: m(`{"id": 5, … {"name": "drop_table", "arguments": {"table_name": "film"}}}`, /drop_table/) },
    { dir: "res", err: true, head: "result", note: "no such tool: the server says so", body: m(`{"id": 5, "result": {"content": [{"type": "text", "text": "Unknown tool: drop_table"}],
  "isError": true}}`, /Unknown tool: drop_table|true/g, "h") },
  ],
};

const SOURCE = `@mcp.tool()
def <mark>run_sql</mark>(<mark>query: str</mark>) -> dict:
    """<mark class="k">Run one read-only PostgreSQL SELECT and
    return at most 50 rows.</mark>"""
    try:
        with psycopg.connect(AGENT_URL) as conn:
            …`;
const LISTED = `{"name": "<mark>run_sql</mark>",
 "description": "<mark class="k">Run one read-only PostgreSQL
                 SELECT and return at most 50 rows.</mark>",
 "inputSchema": {
   "type": "object",
   "required": ["query"],
   "properties": {<mark>"query": {"type": "string"}</mark>}}}`;

const exchange = (key, hint) => playBar(hint) + zone("", wire(MESSAGES[key], "writes to the server's stdin", "answers on its stdout"));
const SAY = (lines) => (i) => lines[i];

const steps = [
  { stop: "The server", title: "A tool is a decorated function",
    note: `<code>MCPServer</code> reads each function: its name, its docstring and its type hints become what a client is told. The three SQL tools, served from a file of their own.` },
  { stop: "Handshake", title: "Client and server agree on a version",
    note: `One JSON message per line. The client names the protocol revision it speaks; the server answers with the one they will use and what it offers: tools, resources, prompts.`,
    say: SAY(["the client opens: initialize, version 2025-11-25", "the server agrees, and lists what it offers", "the client confirms; a notification gets no reply"]) },
  { stop: "Discovery", title: "The client asks what tools there are", decisive: true,
    note: `<code>tools/list</code>. The client did not know the tools in advance: it learns them now, each with a description and a JSON Schema for its arguments.`,
    say: SAY(["tools/list: what can you do?", "three tools, each with a schema"]) },
  { stop: "A call", title: "One request, one result",
    note: `<code>tools/call</code> names the tool and passes the arguments. The result is a list of content blocks; here one text block, the JSON the function returned.`,
    say: SAY(["tools/call run_sql, with a query", "the rows, as text"]) },
  { stop: "Failures", title: "Two kinds of failure on the wire",
    note: `A bad query comes back as the tool's own error, with <code>isError: false</code>: the tool ran. A tool the server does not have comes back from the server itself, with <code>isError: true</code>. Neither breaks the connection.`,
    say: SAY(["a query on a table that does not exist", "the tool's own error, isError: false", "a tool the server does not have", "the server's error, isError: true"]) },
];

function view(step, at) {
  if (at === 0) return `<div class="cols" style="--cols:minmax(0,1fr) auto minmax(0,1fr); align-items:stretch">${zone("mcp_pagila_server.py · what you write", `<pre>${SOURCE}</pre>`)}<span class="acc" style="font:700 26px system-ui; align-self:center">→</span>${zone("tools/list · what a client is told", `<pre>${LISTED}</pre><p class="small" style="margin-top:8px">from the real reply; the <code>title</code> fields left out</p>`, "on")}</div>`;
  return exchange(["", "hello", "list", "call", "bad"][at], "press Play to send the messages one at a time");
}

export default widget({ label: "The MCP exchange", steps, view });
