// agf-mcp-why — agents, MCP: why a tool protocol exists, and what it is made of. Three apps and three
// systems wired by hand (each wire written in that app's own tool format), a fourth system, the
// protocol in the middle, the two roles, the two transports, and the three things a server offers.
// Nothing here is measured: the counts are arithmetic on the boxes drawn. The roles of the three
// primitives are the spec's (modelcontextprotocol.io/specification/2026-07-28/server: tools are
// model-controlled, resources application-controlled, prompts user-controlled).
import { CSS as RAMP, arrow, chip, line, node, on, t, widget, zone } from "./ramp-lib.js";

const APPS = ["your SQL agent", "a chat assistant", "an IDE assistant"];
const SYSTEMS = ["Pagila · Postgres", "BigQuery", "the file share", "the ticket system"];
const AY = [90, 180, 270], SY = [70, 150, 230, 310];

const steps = () => [
  { stop: "By hand", title: "Every app wires every tool itself",
    note: `Each app declares each tool in its own format and calls it its own way. Three apps and three systems: <b>nine</b> pieces of glue, each written and kept in step by someone.` },
  { stop: "One more", title: "A fourth system is three more wirings",
    note: `The glue grows as apps <b>×</b> systems. Every new system is work in every app; every new app is work for every system.` },
  { stop: "A protocol", title: "Agree on the plug once", decisive: true,
    note: `<b>MCP</b>, the Model Context Protocol, fixes one way to say "what tools do you have?" and "call this one". Each app speaks it once, each system is wrapped once: apps <b>+</b> systems.` },
  { stop: "Two roles", title: "A client and a server",
    note: `The <b>client</b> sits in the app: it holds the model and the loop. The <b>server</b> owns the tools and runs them. Between them go JSON-RPC requests and results.` },
  { stop: "Transports", title: "The same messages, carried two ways",
    note: `Over <b>stdio</b> the client starts the server as a child process and they talk over its stdin and stdout. Over <b>Streamable HTTP</b> the server is a service at a URL that many clients share.` },
  { stop: "Three offers", title: "What a server can offer",
    note: `<b>Tools</b> the model asks to call, <b>resources</b> the app reads, <b>prompts</b> a person picks. An agent is built on tools; the other two ride on the same connection.` },
];

const CSS = RAMP("mw") + `
.lw .mw text.cap { font-size:12px; }
.lw .mw .edge.x { stroke:var(--hot); stroke-width:1.6; opacity:.8; }
.lw .mw .edge.new { stroke:var(--hot); stroke-width:2.6; opacity:1; }
.lw .mw .bus { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .mw .side { fill:var(--panel); stroke:var(--line); stroke-width:1.5; }
.lw .mw .side.c { stroke:var(--accent); }
.lw .mw .tag { fill:var(--cell); stroke:var(--line); }
.lw .mw .tag.c { fill:var(--accent-bg); stroke:var(--accent); }
.lw .mw text.dot { font:700 14px system-ui, sans-serif; }
.lw .mw .st.on .grow { animation: mw-draw .9s both; }
@keyframes mw-draw { from { stroke-dasharray:0 600; } to { stroke-dasharray:600 0; } }
`;

const heads = () => `${t(30, 36, "APPS", "cap")}${t(540, 36, "SYSTEMS WITH TOOLS", "cap")}`;
const apps = () => APPS.map((name, i) => chip(30, AY[i] - 22, 200, 44, name, i ? "" : "hit", i ? "" : "acc")).join("");
const systems = (n) => SYSTEMS.slice(0, n).map((name, i) => node(540, SY[i] - 20, 190, 40, name, i === 3 ? "warm" : "")).join("");
const wires = (n, cls) => AY.flatMap((a) => SY.slice(0, n).map((b, j) => line(232, a, 538, b, `${j === 3 ? "new" : cls} grow`))).join("");

const byHand = () => on("0", `${heads()}${apps()}${systems(3)}${wires(3, "x")}${t(385, 352, "3 × 3 = 9", "huge hot")}`);
const oneMore = () => on("1", `${heads()}${apps()}${systems(4)}${wires(4, "x")}${t(385, 352, "3 × 4 = 12", "huge hot")}`);

const protocol = () => on("2", `${heads()}${apps()}${systems(4)}
  <rect class="bus" x="352" y="52" width="66" height="276" rx="14"/>${t(385, 190, "MCP", "acc h")}
  ${AY.map((y) => line(232, y, 350, y, "on grow")).join("")}${SY.map((y) => line(420, y, 538, y, "on grow")).join("")}
  ${t(291, 62, "a client, once", "lbl")}${t(479, 50, "a server, once", "lbl")}
  ${t(385, 352, "3 + 4 = 7", "huge acc")}`);

// One side of the two roles: a panel, its duties as rows, and what it holds as a tag at the foot.
function side(x, cls, title, duties, holds) {
  const step = 216 / duties.length;
  return `<rect class="side ${cls}" x="${x}" y="22" width="300" height="324" rx="14"/>
    ${t(x + 150, 48, title, `h ${cls ? "acc" : ""}`)}${t(x + 150, 70, cls ? "INSIDE THE APP" : "OWNS THE TOOLS", "cap mid")}
    ${duties.map((s, i) => `${node(x + 18, 88 + i * step, 264, step - 12, "", "")}${t(x + 38, 88 + i * step + (step - 12) / 2 + 1, String(i + 1), `dot ${cls ? "acc" : "dim"}`)}${t(x + 56, 88 + i * step + (step - 12) / 2 + 1, s, "l")}`).join("")}
    <rect class="tag ${cls}" x="${x + 18}" y="300" width="264" height="32" rx="16"/>${t(x + 150, 317, holds, `lbl ${cls ? "acc" : ""}`)}`;
}
const roles = () => on("3", `${side(24, "c", "Client", ["calls the model", "keeps the conversation", "sends each tool call on", "hands results back"], "the model and the loop")}
  ${side(436, "", "Server", ["says which tools it has", "runs a tool when asked", "returns the result"], "a process of its own, or a service")}
  ${arrow(332, 150, 428, 150)}${arrow(428, 236, 332, 236)}
  ${t(380, 132, "request", "mono acc")}${t(380, 254, "result", "mono acc")}${t(380, 193, "JSON-RPC", "lbl")}`);

const transports = () => on("4", `${zone(24, 20, 712, 160, "STDIO · ONE MACHINE")}
  ${chip(56, 62, 180, 46, "client", "hit", "acc")}${node(524, 62, 180, 46, "server · a child process")}
  ${arrow(240, 76, 520, 76)}${arrow(520, 96, 240, 96)}${t(380, 62, "stdin: one JSON message per line", "mono")}${t(380, 112, "stdout: the replies", "mono")}
  ${t(380, 150, "the client starts the server and owns its lifetime", "lbl")}
  ${zone(24, 196, 712, 160, "STREAMABLE HTTP · OVER THE NETWORK")}
  ${chip(56, 238, 180, 46, "client", "hit", "acc")}${node(524, 238, 180, 46, "server · one URL")}
  ${arrow(240, 252, 520, 252)}${arrow(520, 272, 240, 272)}${t(380, 238, "HTTP POST", "mono")}${t(380, 288, "JSON, or a stream of events", "mono")}
  ${t(380, 326, "a service many clients share, behind your usual authentication", "lbl")}`);

const KINDS = [["Tools", "functions the model", "asks to call", "the model decides", "hit", "acc"],
  ["Resources", "data, by URI, that", "the app reads", "the app decides", "", ""],
  ["Prompts", "templates that", "a person picks", "the person decides", "", ""]];
const offers = () => on("5", `${zone(24, 26, 712, 316, "AN MCP SERVER OFFERS")}
  ${KINDS.map(([name, a, b, who, box, tone], i) => { const x = 52 + i * 228;
    return `<rect class="box ${box}" x="${x}" y="62" width="204" height="218" rx="12"/>${t(x + 102, 104, name, `num ${tone}`)}
      ${t(x + 102, 152, a, "lbl")}${t(x + 102, 174, b, "lbl")}
      <rect class="tag ${tone ? "c" : ""}" x="${x + 18}" y="228" width="168" height="32" rx="16"/>${t(x + 102, 245, who, `mono ${tone}`)}`; }).join("")}
  ${t(380, 314, "tools/list · resources/list · prompts/list: each is discovered the same way", "lbl")}`);

const scene = () => `<svg viewBox="0 0 760 380">${byHand()}${oneMore()}${protocol()}${roles()}${transports()}${offers()}</svg>`;

export default widget({ key: "mw", label: "Why a tool protocol", css: CSS, steps, scene });
