// agf-adk-split — agents, ADK: what a framework takes over from the hand-written agent and what stays
// yours. The pieces are the hand-written SQL agent's own (its loop, cap, declarations, history,
// dispatch, printing; its tools, prompt, role and checks); the ADK names are those of google-adk
// 2.15.0 as the page's cells use them (Runner, RunConfig.max_llm_calls, sessions, events, the eight
// *_callback parameters of Agent, read in the lab on 2026-11-23). Nothing else is measured.
import { CSS as RAMP, node, on, t, widget, zone } from "./ramp-lib.js";

const PLUMBING = [
  ["the loop: call, run, append, repeat", "a runner drives the loop"],
  ["the turn cap", "RunConfig(max_llm_calls=…)"],
  ["a declaration typed for each tool", "read from signature + docstring"],
  ["the message list", "a session holds the history"],
  ["printing what happened", "a stream of events"],
  ["(nothing: edit the loop)", "callbacks: before/after model, tool"],
];
const YOURS = ["the tools: what can be done", "the prompt: what the words mean", "the data: which role reads what", "the checks: is the answer right"];

const steps = () => [
  { stop: "All yours", title: "The hand-written agent: every line is yours",
    note: `Half of it is plumbing that every agent repeats: the loop, the cap, the declarations, the history, the printing. The other half is what only this agent knows.` },
  { stop: "Taken over", title: "A framework takes the plumbing", decisive: true,
    note: `The loop, the cap, the declarations, the history and the record of a run move into the framework. It adds one thing: <b>callbacks</b>, hooks where your code runs before or after each model call and tool call.` },
  { stop: "Still yours", title: "What no framework can write for you",
    note: `Which tools exist and how they fail, what the prompt says, which role reads the data, and whether the answer is right. A framework runs these; it cannot decide them.` },
];

const CSS = RAMP("as") + `
.lw .as text.cap { font-size:12px; }
.lw .as .box.fw { fill:var(--cell); stroke:var(--line); }
.lw .as .box.mine { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .as .box.new { fill:var(--ok-bg); stroke:var(--ok); stroke-width:1.5; }
.lw .as .st.dimmed.on { opacity:.4 !important; }
.lw .as text.sm { font:500 14px system-ui, sans-serif; }
.lw .as text.cd { font:13px ui-monospace, Menlo, monospace; }
.lw .as .st.on .slide { animation:as-in .6s both; }
.lw .as .st.on .slide:nth-of-type(2n) { animation-delay:.08s; }
@keyframes as-in { from { opacity:0; transform:translateX(-14px); } to { opacity:1; transform:none; } }
`;

// Both columns share one grid: six rows from y=62 to y=326 on the left, four on the right.
const TOP = 62, ROW = 44, H = 36, YROW = 66, YH = 54;
const plumb = (labels, cls, textCls) => labels.map((s, i) => `<g class="slide">${node(44, TOP + i * ROW, 336, H, s, cls(i), textCls(i))}</g>`).join("");
const yours = () => YOURS.map((s, i) => node(424, TOP + i * YROW, 292, YH, s, "mine", "sm acc")).join("");
const foot = (x, text, cls = "lbl") => t(x, 350, text, cls);

const allYours = () => on("0", `${zone(24, 4, 712, 364, "YOUR CODE · ONE PYTHON FILE")}
  ${t(212, 47, "HOW IT RUNS", "cap mid")}${t(570, 47, "WHAT IT KNOWS", "cap mid")}
  ${PLUMBING.slice(0, 5).map(([a], i) => node(44, TOP + i * ROW, 336, H, a, "fw", "sm")).join("")}
  ${yours()}
  ${foot(212, "the same in every agent")}${foot(570, "this agent only")}`);

const takenOver = () => on("1", `${zone(24, 18, 376, 350, "THE FRAMEWORK · ADK")}${zone(404, 18, 332, 350, "YOUR CODE")}
  ${plumb(PLUMBING.map(([, b]) => b), (i) => (i === 5 ? "new" : "fw"), (i) => (i === 5 ? "cd ok" : "cd"))}
  ${yours()}${foot(212, "written once, for every agent")}${foot(570, "this agent only")}`);

const stillYours = () => `${on("2", `${zone(24, 18, 376, 350, "THE FRAMEWORK · ADK")}
  ${PLUMBING.map(([, b], i) => node(44, TOP + i * ROW, 336, H, b, "fw", "cd dim")).join("")}`, "dimmed")}
  ${on("2", `${zone(404, 18, 332, 350, "YOURS, WHATEVER THE FRAMEWORK")}${yours()}
  ${foot(570, "a framework runs these, it cannot decide them", "lbl acc")}`)}`;

const scene = () => `<svg viewBox="0 0 760 380">${allYours()}${takenOver()}${stillYours()}</svg>`;

export default widget({ key: "as", label: "What a framework takes over", css: CSS, steps, scene });
