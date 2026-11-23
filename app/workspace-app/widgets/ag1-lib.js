// ag1-lib — what the opening widgets of the agents part share, and the visual vocabulary the rest
// of the part can reuse:
//   - the conversation itself (a model talking) is always the shared chat widget: `talk(...)` below
//     is `conversation` from widgets/lib/chat.js, and nothing here draws a conversation another way;
//   - the `messages` list your code holds is a mechanism, drawn as a vertical stack of role-tagged
//     records (system, user, assistant, tool) — `stack(...)`. It is the data beside the chat;
//   - a tool call inside an assistant record is the function name and its JSON arguments;
//   - the agent loop is model → your code → tool → your code → model, and one step moves one message.
// Colours are the shell's variables only. Nothing here holds lesson data.
import { CHAT_CSS, conversation, wireChat } from "@widget-lib/chat.js";
import { stepper } from "@widget-lib/stepper.js";

export const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const fmt = (n) => Number(n).toLocaleString("en-US");
// JSON the way a lesson prints it: one line, a space after each colon and comma.
export const json = (value) => JSON.stringify(value).replace(/":/g, '": ').replace(/,"/g, ', "');

export const CSS = CHAT_CSS + `
.lw:has(.ag1) .source { display:none; }
.lw .ag1 { display:grid; gap:16px; font-size:16px; }
.lw .ag1 .cols { display:grid; gap:16px; grid-template-columns:var(--cols, 1fr 1fr); align-items:start; }
.lw .ag1 .zone { background:var(--panel); border:1.5px solid var(--line); border-radius:14px; padding:14px 16px 16px; min-width:0; transition:border-color .4s, opacity .4s; }
.lw .ag1 .zone.on { border-color:var(--accent); } .lw .ag1 .zone.hot { border-color:var(--hot); } .lw .ag1 .zone.ok { border-color:var(--ok); }
.lw .ag1 .zone.off { opacity:.4; }
.lw .ag1 .cap { margin:0 0 10px; font-size:12px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .ag1 .cap b { color:var(--ink); font:600 14px ui-monospace, Menlo, monospace; letter-spacing:0; text-transform:none; margin-left:6px; }
.lw .ag1 .mono, .lw .ag1 pre { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; }
.lw .ag1 pre { margin:0; padding:9px 12px; border-radius:8px; background:var(--cell); font-size:14px; line-height:1.5; white-space:pre-wrap; overflow-wrap:anywhere; }
.lw .ag1 .fresh { animation:lw-in .45s both; }
.lw .ag1 .dim { color:var(--mute); } .lw .ag1 .acc { color:var(--accent); } .lw .ag1 .hotc { color:var(--hot); } .lw .ag1 .okc { color:var(--ok); }
.lw .ag1 p { margin:0; }
.lw .ag1 .small { font-size:13px; color:var(--mute); } .lw .ag1 .small code { font-size:1em; }

/* the conversation: role-tagged cards, newest at the bottom */
.lw .ag1 .stack { display:flex; flex-direction:column; gap:8px; }
.lw .ag1 .msg { border:1.5px solid var(--line); border-left:5px solid var(--mute); border-radius:10px; background:var(--cell); padding:7px 12px; font-size:15px; line-height:1.5; min-width:0; transition:opacity .4s, box-shadow .4s; }
.lw .ag1 .msg.old { opacity:.55; }
.lw .ag1 .msg.fresh { box-shadow:0 0 0 2px var(--accent); }
.lw .ag1 .msg.lost { opacity:.35; border-style:dashed; }
.lw .ag1 .msg .role { display:inline-block; margin-right:8px; padding:1px 9px; border-radius:999px; font:600 12px ui-monospace, Menlo, monospace; letter-spacing:.06em; text-transform:uppercase; background:var(--panel); color:var(--mute); vertical-align:1px; }
.lw .ag1 .msg .by { font-size:13px; color:var(--mute); margin-right:8px; }
.lw .ag1 .msg .text { display:inline; overflow-wrap:anywhere; }
.lw .ag1 .msg.user { border-left-color:var(--accent); } .lw .ag1 .msg.user .role { color:var(--accent); background:var(--accent-bg); }
.lw .ag1 .msg.assistant { border-left-color:var(--ok); } .lw .ag1 .msg.assistant .role { color:var(--ok); background:var(--ok-bg); }
.lw .ag1 .msg.tool { border-left-color:var(--hot); } .lw .ag1 .msg.tool .role { color:var(--hot); background:var(--hot-bg); }
.lw .ag1 .msg.tool .text { font-family:ui-monospace, Menlo, monospace; font-size:14px; white-space:pre-wrap; }
.lw .ag1 .none { font:14px ui-monospace, Menlo, monospace; color:var(--mute); }

/* a tool call: the function's name and its JSON arguments */
.lw .ag1 .call { display:flex; flex-wrap:wrap; align-items:baseline; gap:6px 10px; margin-top:5px; padding:5px 10px; border-radius:8px; background:var(--panel); border:1px dashed var(--line); font:14px ui-monospace, Menlo, monospace; }
.lw .ag1 .call .fn { font-weight:700; color:var(--ink); }
.lw .ag1 .call .args { color:var(--ink); overflow-wrap:anywhere; }
.lw .ag1 .cid { margin-left:auto; padding:0 8px; border-radius:999px; font:12px ui-monospace, Menlo, monospace; color:var(--mute); background:var(--cell); }
.lw .ag1 .cid.link { color:var(--accent-ink); background:var(--accent); font-weight:600; }

/* a tool definition, as the model reads it */
.lw .ag1 .tooldef { border:1.5px solid var(--line); border-radius:12px; background:var(--cell); padding:11px 14px; min-width:0; transition:border-color .4s, opacity .4s; }
.lw .ag1 .tooldef.on { border-color:var(--accent); } .lw .ag1 .tooldef.bad { border-color:var(--hot); } .lw .ag1 .tooldef.good { border-color:var(--ok); } .lw .ag1 .tooldef.off { opacity:.4; }
.lw .ag1 .tooldef .name { font:700 17px ui-monospace, Menlo, monospace; }
.lw .ag1 .tooldef .desc { margin:5px 0 8px; font-size:15px; }
.lw .ag1 .tooldef .param { display:grid; grid-template-columns:minmax(70px, auto) minmax(64px, auto) 1fr; gap:10px; padding:4px 0; border-top:1px solid var(--line); font-size:14px; }
.lw .ag1 .tooldef .param b { font:600 14px ui-monospace, Menlo, monospace; }
.lw .ag1 .tooldef .param i { font:normal 13px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .ag1 .flag { display:inline-block; margin:8px 8px 0 0; padding:2px 10px; border-radius:999px; font:600 12px ui-monospace, Menlo, monospace; background:var(--panel); color:var(--mute); }
.lw .ag1 .flag.on { background:var(--accent); color:var(--accent-ink); }

/* chips, pills, big numbers, bars */
.lw .ag1 .chips { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.lw .ag1 .chip { padding:5px 10px; border-radius:7px; background:var(--cell); border:1px solid var(--line); font:15px ui-monospace, Menlo, monospace; white-space:pre; }
.lw .ag1 .chip.on { background:var(--accent-bg); border-color:var(--accent); color:var(--accent); font-weight:600; }
.lw .ag1 .chip.hot { background:var(--hot-bg); border-color:var(--hot); color:var(--hot); }
.lw .ag1 .pill { display:inline-block; padding:6px 14px; border-radius:999px; background:var(--cell); font-size:15px; transition:background .4s, color .4s; }
.lw .ag1 .pill.on { background:var(--accent); color:var(--accent-ink); font-weight:600; }
.lw .ag1 .pill.hot { background:var(--hot-bg); color:var(--hot); font-weight:600; }
.lw .ag1 .pill.ok { background:var(--ok-bg); color:var(--ok); font-weight:600; }
.lw .ag1 .big { font:700 34px/1.1 ui-monospace, Menlo, monospace; }
.lw .ag1 .bars { display:grid; gap:10px; }
.lw .ag1 .bar { display:grid; grid-template-columns:minmax(170px, 28%) 1fr minmax(120px, auto); gap:12px; align-items:center; font-size:15px; }
.lw .ag1 .bar .track { height:24px; border-radius:6px; background:var(--cell); overflow:hidden; display:flex; }
.lw .ag1 .bar .fill { display:block; height:100%; min-width:3px; background:var(--accent); animation:ag1-grow .6s both; transform-origin:left; }
.lw .ag1 .bar .fill.hot { background:var(--hot); } .lw .ag1 .bar .fill.ok { background:var(--ok); } .lw .ag1 .bar .fill.mute { background:var(--mute); }
.lw .ag1 .bar .val { font:600 17px ui-monospace, Menlo, monospace; text-align:right; }
@keyframes ag1-grow { from { transform:scaleX(0); } to { transform:none; } }

/* the loop: three parties, and the one hop the current step makes */
.lw .ag1 .loop { display:grid; grid-template-columns:1fr auto 1.2fr auto 1fr; align-items:center; gap:8px; }
.lw .ag1 .party { text-align:center; padding:14px 8px; border-radius:14px; border:1.5px solid var(--line); background:var(--cell); transition:border-color .4s, background .4s; }
.lw .ag1 .party b { display:block; font-size:17px; } .lw .ag1 .party span { font-size:13px; color:var(--mute); }
.lw .ag1 .party.on { border-color:var(--accent); background:var(--accent-bg); }
.lw .ag1 .hop { display:grid; gap:4px; justify-items:center; min-width:96px; font-size:13px; color:var(--mute); }
.lw .ag1 .hop i { font-style:normal; font-size:24px; line-height:1; color:var(--line); transition:color .4s; }
.lw .ag1 .hop.on { color:var(--accent); font-weight:600; } .lw .ag1 .hop.on i { color:var(--accent); }
.lw .ag1 .state { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }

/* the loop as a sequence diagram */
.lw .ag1 .seq { width:100%; height:auto; display:block; }
.lw .ag1 .seq text { font:500 14px system-ui, sans-serif; fill:var(--ink); text-anchor:middle; dominant-baseline:middle; }
.lw .ag1 .seq .who { font-weight:650; }
.lw .ag1 .seq .party { fill:var(--cell); stroke:var(--line); }
.lw .ag1 .seq .life { stroke:var(--line); stroke-width:1.5; stroke-dasharray:4 5; fill:none; }
.lw .ag1 .seq .ev path { fill:none; stroke:var(--mute); stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; }
.lw .ag1 .seq .ev.then { opacity:.5; }
.lw .ag1 .seq .ev.now path { stroke:var(--accent); stroke-width:2.5; }
.lw .ag1 .seq .ev.now text { fill:var(--accent); font-weight:650; }
.lw .ag1 .seq .ev.now { animation:lw-in .45s both; }

/* code with one line lit */
.lw .ag1 .code { margin:0; padding:10px 0; border-radius:10px; background:var(--cell); font:14px/1.6 ui-monospace, Menlo, monospace; overflow-x:auto; }
.lw .ag1 .code span { display:block; padding:0 14px; white-space:pre; border-left:3px solid transparent; transition:background .4s; }
.lw .ag1 .code span.on { background:var(--accent-bg); border-left-color:var(--accent); color:var(--accent); font-weight:600; }

@container (max-width: 820px) { .lw .ag1 .cols { grid-template-columns:1fr; } }
`;

// A call id as the API returns it is 29 characters; the drawing keeps its start.
const short = (id) => (id.length > 12 ? id.slice(0, 10) + "…" : id);

export const zone = (cap, inner, cls = "") => `<div class="zone ${cls}">${cap ? `<p class="cap">${cap}</p>` : ""}${inner}</div>`;

// One tool call: { name, args (an object), id }. `link` lights the id, to pair it with its result.
export const call = (c, link) => `<div class="call"><span class="fn">${c.name}</span><span class="args">${esc(json(c.args))}</span>${c.id ? `<span class="cid ${link ? "link" : ""}">id ${short(c.id)}</span>` : ""}</div>`;

// One message card: { role, text, calls: [{ name, args, id }], id (a tool message's tool_call_id), by }.
// state: "fresh" (this step added it), "old" (it was there before), "lost", or "".
export function msg(m, state = "", link = false) {
  const calls = (m.calls ?? []).map((c) => call(c, link)).join("");
  const text = m.text === null ? `<div class="text none">content: None</div>` : m.text === undefined ? "" : `<div class="text">${m.html ? m.text : esc(m.text)}</div>`;
  const id = m.id ? `<span class="cid ${link ? "link" : ""}" style="float:right">tool_call_id ${short(m.id)}</span>` : "";
  return `<div class="msg ${m.role} ${state}">${id}<span class="role">${m.role}</span>${m.by ? `<span class="by">${m.by}</span>` : ""}${text}${calls}</div>`;
}

// The first `upto` messages; the ones whose index is in `fresh` are this step's, the rest are older.
export function stack(messages, upto = messages.length, fresh = [], link = []) {
  const now = [].concat(fresh), linked = [].concat(link);
  return `<div class="stack">${messages.slice(0, upto).map((m, i) => msg(m, now.includes(i) ? "fresh" : now.length ? "old" : "", linked.includes(i))).join("")}</div>`;
}

// A tool definition as the model reads it: { name, description, params: [[name, type, description]], strict }.
export const tooldef = (t, cls = "") => `<div class="tooldef ${cls}"><div class="name">${t.name}</div><div class="desc">${esc(t.description)}</div>${
  (t.params ?? []).map(([name, type, text]) => `<div class="param"><b>${name}</b><i>${type}</i><span>${esc(text ?? "")}</span></div>`).join("")}${
  t.strict === undefined ? "" : `<span class="flag ${t.strict ? "on" : ""}">strict: ${t.strict ? "true" : "not set"}</span>`}</div>`;

// The loop's three parties. `hop` is the one transfer this step makes:
//   "ask" your code → model · "reply" model → your code · "run" your code → tool · "result" tool → your code
export const loop = (hop, labels = {}) => {
  const lit = (name) => (hop === name ? "on" : "");
  const left = hop === "ask" || hop === "reply", right = hop === "run" || hop === "result";
  return `<div class="loop">
    <div class="party ${left ? "on" : ""}"><b>the model</b><span>text in, text out</span></div>
    <div class="hop ${left ? "on" : ""}"><span>${hop === "reply" ? labels.reply ?? "one message" : labels.ask ?? "the whole list"}</span><i>${hop === "reply" ? "→" : hop === "ask" ? "←" : "⇄"}</i></div>
    <div class="party ${hop ? "on" : ""}"><b>your code</b><span>the loop and the list</span></div>
    <div class="hop ${right ? "on" : ""}"><span>${hop === "result" ? labels.result ?? "the result" : labels.run ?? "name + arguments"}</span><i>${hop === "result" ? "←" : hop === "run" ? "→" : "⇄"}</i></div>
    <div class="party ${lit("run")} ${lit("result")}"><b>a tool</b><span>a function you wrote</span></div></div>`;
};

// The loop as a sequence diagram: four parties, one arrow per transfer, added step by step.
// events: [[the step it appears on, from party, to party, label]], parties indexed into PARTIES.
// An arrow of the current step is lit; earlier ones recede.
export const PARTIES = ["the person", "your code", "the model", "a tool"];
const PX = [60, 215, 385, 540], ROW = 38, TOP = 62;
export function sequence(events, at) {
  const shown = events.filter(([from]) => from <= at), live = shown.some(([from]) => from === at);
  const bottom = TOP + events.length * ROW;
  const arrow = ([from, a, b, label], i) => { const y = TOP + i * ROW + 22, x1 = PX[a], x2 = PX[b], d = x2 > x1 ? -1 : 1;
    return `<g class="ev ${from === at ? "now" : live ? "then" : ""}"><text x="${(x1 + x2) / 2}" y="${y - 8}">${esc(label)}</text>
      <path d="M${x1} ${y} L${x2} ${y} M${x2 + d * 9} ${y - 6} L${x2} ${y} L${x2 + d * 9} ${y + 6}"/></g>`; };
  return `<svg class="seq" viewBox="0 0 600 ${bottom + 14}">
    ${PARTIES.map((name, i) => `<path class="life" d="M${PX[i]} 40 L${PX[i]} ${bottom}"/><rect class="party" x="${PX[i] - 62}" y="8" width="124" height="30" rx="15"/><text class="who" x="${PX[i]}" y="24">${name}</text>`).join("")}
    ${shown.map(arrow).join("")}</svg>`;
}

// The agent loop in two panes that change together: the list of messages with their roles, and the
// sequence diagram. step: { n (messages shown), fresh (indexes this step added), state }.
const STATES = ["thinking", "acting", "done"];
export function loopPanes(list, events, step, at) {
  const states = `<div class="state"><span class="cap" style="margin:0">state</span>${STATES.map((s) => `<span class="pill ${s === step.state ? (s === "done" ? "ok" : "on") : ""}">${s}</span>`).join("")}</div>`;
  return `<div class="cols" style="--cols:minmax(0,.85fr) minmax(0,1.4fr)">
    ${zone(`The chat — <b>messages</b>, each with its role · ${step.n} items`, stack(list, step.n, step.fresh))}
    ${zone("The loop — who sends what to whom", sequence(events, at) + `<div style="margin-top:10px">${states}</div>`)}</div>`;
}

export const bar = (label, value, max, text, cls = "") => `<div class="bar"><span>${label}</span><span class="track"><span class="fill ${cls}" style="width:${Math.min(100, (100 * value) / max)}%"></span></span><span class="val">${text ?? fmt(value)}</span></div>`;

export const code = (lines, on = []) => `<pre class="code">${lines.map((line, i) => `<span class="${[].concat(on).includes(i) ? "on" : ""}">${esc(line) || " "}</span>`).join("")}</pre>`;

// The conversation, as the shared chat widget draws it. The sessions in these lessons were recorded
// on 2026-11-21 with gpt-4o-mini; a widget passes `recorded: false` for anything that was not.
export const RECORDED_WITH = "gpt-4o-mini";
export const talk = (messages, options = {}) => conversation(messages, { recorded: true, model: RECORDED_WITH, ...options });

// The first `upto` records of a `messages` list, as the chat widget's messages: an assistant record
// that carries tool calls becomes one "Used <tool>" row per call, and the tool record that answers a
// call (same id) fills that row's response once it is within `upto`.
export function chatOf(records, upto = records.length) {
  const seen = records.slice(0, upto);
  return seen.flatMap((r) => {
    if (r.role === "tool") return [];
    if (r.role !== "assistant" || !r.calls) return [{ role: r.role, text: r.text ?? "" }];
    return r.calls.map((c) => {
      const answer = seen.find((t) => t.role === "tool" && t.id === c.id);
      return { role: "tool", name: c.name, args: c.args, result: answer?.text, error: answer?.error };
    });
  });
}
// Every row of a chat open: `open: all(messages)`.
export const all = (messages) => messages.map((_, i) => i);
// The usual split: the conversation on the left, the mechanism behind it on the right.
export const beside = (chatHtml, mechanism) => `<div class="cols" style="--cols:minmax(0,1fr) minmax(0,1.1fr)">${chatHtml}<div style="display:grid; gap:14px; min-width:0">${mechanism}</div></div>`;

// A widget: steps [{ stop, title, note, decisive? , …its own fields }] and view(step, at) → the scene's HTML.
// The scene is rebuilt on every step; an element with class "fresh" enters with the shell's animation.
export const widget = ({ label, css = "", steps, view }) => ({
  render({ model, el }) {
    const ui = stepper({
      el, model, label, css: CSS + css, steps: () => steps,
      draw({ at, body }) { body.innerHTML = `<div class="ag1" data-at="${at}">${view(steps[at], at)}</div>`; wireChat(body); },
    });
    ui.show(Number(model?.get?.("start") ?? 0));
    return () => ui.destroy();
  },
});
