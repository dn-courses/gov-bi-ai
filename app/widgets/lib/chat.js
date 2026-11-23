// chat — an agent's conversation drawn the way a chat app shows it, stepped message by message.
//
// The one way a lesson shows a model talking: the person's message in a bubble on the right, the
// model's answer as plain text on the left, and everything the model did in between (a thought, a
// tool call with what it sent and what came back) as a folded row that opens on click. Any course
// that shows an agent uses this, so every agent on every page reads the same.
//
//   import { chat } from "@widget-lib/chat.js";          // from workspace-app/widgets/<name>.js
//   export default chat({
//     label: "The first tool call",
//     model: "gpt-4o-mini",                // printed above the conversation
//     recorded: false,                     // false marks the session as an illustration
//     messages: [
//       { role: "system", text: "You answer questions about the Pagila database." },
//       { role: "user", text: "How many films are there?" },
//       { role: "thinking", text: "I need the film table." , seconds: 2 },
//       { role: "tool", name: "run_sql", args: { query: "SELECT count(*) FROM film" }, result: "1000" },
//       { role: "assistant", text: "There are **1,000** films." },
//     ],
//     steps: [                             // one per stop on the rail; `upto` = messages shown
//       { stop: "Ask", title: "A question arrives", upto: 2, note: "…" },
//       { stop: "Call", title: "The model asks for a tool", upto: 4, open: [3], note: "…" },
//       { stop: "Answer", title: "It answers from the result", upto: 5, decisive: true, note: "…" },
//     ],
//   });
//
// A step may also carry `open` (indexes of rows shown unfolded), `mark` (a RegExp: matches inside
// tool results are highlighted), `waiting` (text of a pulsing "working" row after the last message)
// and `aside` (HTML drawn in a panel beside the conversation — the place for a diagram of what the
// step did). A message may carry `error: true` (a failed tool call) and `note` (a small caption).
//
// To put a conversation inside a widget of your own, use the parts: `CHAT_CSS`, and
// `conversation(messages, { upto, open, mark, waiting, model, recorded })`, which returns its HTML;
// call `wireChat(root)` after inserting it so the folded rows open and close.
import { stepper } from "./stepper.js";

export const CHAT_CSS = `
.lw .chat { display:grid; gap:16px; grid-template-columns:minmax(0,1fr); container-type:inline-size; }
.lw .chat.split { grid-template-columns:minmax(0,1.15fr) minmax(0,1fr); align-items:start; }
@container (max-width: 760px) { .lw .chat.split { grid-template-columns:minmax(0,1fr); } }
.lw .chat-window { background:var(--panel); border:1px solid var(--line); border-radius:14px; overflow:hidden; }
.lw .chat-bar { display:flex; align-items:center; gap:10px; padding:9px 16px; border-bottom:1px solid var(--line);
      font-size:13px; color:var(--mute); }
.lw .chat-bar .spark { width:9px; height:9px; border-radius:50%; background:var(--accent); flex:none; }
.lw .chat-bar b { color:var(--ink); font-weight:600; }
.lw .chat-bar .kind { margin-left:auto; padding:2px 9px; border-radius:999px; background:var(--cell); font-size:12px; }
.lw .chat-bar .kind.sketch { background:var(--hot-bg); color:var(--hot); }
.lw .chat-log { display:flex; flex-direction:column; gap:14px; padding:20px 22px 22px; max-width:820px; margin:0 auto; }
.lw .chat-log > * { animation: lw-in .35s both; min-width:0; }
.lw .chat-log .user { align-self:flex-end; max-width:82%; padding:10px 15px; border-radius:18px 18px 4px 18px;
      background:var(--cell); font-size:16px; white-space:pre-wrap; }
.lw .chat-log .assistant { font-size:16px; line-height:1.55; }
.lw .chat-log .assistant p { margin:0 0 10px; } .lw .chat-log .assistant > :last-child { margin-bottom:0; }
.lw .chat-log pre { margin:0 0 10px; padding:10px 12px; border-radius:8px; background:var(--code); font-size:13.5px;
      white-space:pre-wrap; overflow-wrap:anywhere; }
.lw .chat-log .fold { border:1px solid var(--line); border-radius:10px; font-size:14px; }
.lw .chat-log .fold > button { all:unset; cursor:pointer; display:flex; align-items:center; gap:9px; width:100%;
      box-sizing:border-box; padding:8px 12px; color:var(--mute); }
.lw .chat-log .fold > button::before { content:"›"; font-size:16px; transition:transform .2s; }
.lw .chat-log .fold.open > button::before { transform:rotate(90deg); }
.lw .chat-log .fold > button b { color:var(--ink); font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-weight:600; }
.lw .chat-log .fold > button:focus-visible { box-shadow:0 0 0 2px var(--accent); border-radius:10px; }
.lw .chat-log .fold .inside { display:none; padding:2px 12px 12px; }
.lw .chat-log .fold.open .inside { display:block; }
.lw .chat-log .fold .inside h5 { margin:8px 0 4px; font-size:12px; letter-spacing:.08em; text-transform:uppercase;
      color:var(--mute); font-weight:600; }
.lw .chat-log .fold .inside pre { margin:0; }
.lw .chat-log .fold.fresh { border-color:var(--accent); }
.lw .chat-log .fold.fresh > button, .lw .chat-log .fold.fresh > button b { color:var(--accent); }
.lw .chat-log .fold.error { border-color:var(--hot); }
.lw .chat-log .fold.error > button, .lw .chat-log .fold.error > button b { color:var(--hot); }
.lw .chat-log .fold.think > button { font-style:italic; }
.lw .chat-log .fold.system { background:var(--cell); border-color:transparent; }
.lw .chat-log .tag { margin-left:auto; font-size:12px; }
.lw .chat-log mark { background:var(--hot-bg); color:var(--hot); font-weight:600; border-radius:3px; }
.lw .chat-log .caption { margin:-8px 0 0; font-size:12.5px; color:var(--mute); }
.lw .chat-log .working { color:var(--mute); font-size:14px; }
.lw .chat-log .working::before { content:"● "; color:var(--accent); animation: chat-pulse 1.2s 3; }
.lw .chat-aside { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px 18px; }
@keyframes chat-pulse { 50% { opacity:.25; } }
`;

const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const shown = (value) => (typeof value === "string" ? value : JSON.stringify(value, null, 2));

// The little Markdown a model answers in: fenced code, inline code, bold, paragraphs.
function prose(text) {
  const inline = (p) => esc(p.trim()).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  return text.trim().split(/```\w*\n([\s\S]*?)```/).map((part, i) => (i % 2
    ? `<pre>${esc(part.trimEnd())}</pre>`
    : part.split(/\n\s*\n/).filter((p) => p.trim()).map((p) => `<p>${inline(p)}</p>`).join(""))).join("");
}

const marked = (text, mark) => (mark ? esc(text).replace(mark, (hit) => `<mark>${hit}</mark>`) : esc(text));

function fold(i, kind, head, inside, { open, fresh, error }) {
  const state = [kind, open ? "open" : "", fresh ? "fresh" : "", error ? "error" : ""].filter(Boolean).join(" ");
  return `<div class="fold ${state}"><button data-fold="${i}" aria-expanded="${open ? "true" : "false"}">${head}</button><div class="inside">${inside}</div></div>`;
}

function row(message, i, view) {
  const at = { open: view.open.has(i), fresh: i === view.upto - 1, error: message.error };
  const caption = message.note ? `<p class="caption">${message.note}</p>` : "";
  if (message.role === "user") return `<div class="user">${esc(message.text)}</div>${caption}`;
  if (message.role === "assistant") return `<div class="assistant">${prose(message.text)}</div>${caption}`;
  if (message.role === "system")
    return fold(i, "system", "System prompt", `<pre>${esc(message.text)}</pre>`, at) + caption;
  if (message.role === "thinking") {
    const head = `Thought${message.seconds ? ` for ${message.seconds} seconds` : ""}`;
    return fold(i, "think", head, `<pre>${esc(message.text)}</pre>`, at) + caption;
  }
  const head = `${message.error ? "Failed" : "Used"} <b>${esc(message.name)}</b>${message.tag ? `<span class="tag">${message.tag}</span>` : ""}`;
  const request = message.args === undefined ? "" : `<h5>Request</h5><pre>${esc(shown(message.args))}</pre>`;
  const response = message.result === undefined ? "" : `<h5>${message.error ? "Error" : "Response"}</h5><pre>${marked(shown(message.result), view.mark)}</pre>`;
  return fold(i, "tool", head, request + response, at) + caption;
}

// The conversation as HTML: the first `upto` messages, with the rows in `open` unfolded.
export function conversation(messages, { upto = messages.length, open = [], mark, waiting, model, recorded = true } = {}) {
  const view = { upto, open: new Set(open), mark };
  const kind = recorded ? `<span class="kind">recorded session</span>` : `<span class="kind sketch">illustration, not a recording</span>`;
  const bar = `<div class="chat-bar"><span class="spark"></span>${model ? `<b>${esc(model)}</b>` : "the model"}${kind}</div>`;
  const rows = messages.slice(0, upto).map((message, i) => row(message, i, view)).join("");
  const working = waiting ? `<div class="working">${waiting}</div>` : "";
  return `<div class="chat-window">${bar}<div class="chat-log">${rows}${working}</div></div>`;
}

// Make the folded rows under `root` open and close. `onToggle(index, open)` hears each click.
export function wireChat(root, onToggle) {
  root.querySelectorAll("[data-fold]").forEach((button) =>
    button.addEventListener("click", () => {
      const open = button.parentElement.classList.toggle("open");
      button.setAttribute("aria-expanded", open ? "true" : "false");
      onToggle?.(Number(button.dataset.fold), open);
    }));
}

// A whole widget: one conversation, revealed step by step.
export const chat = ({ label, model, recorded = true, messages, steps, css = "" }) => ({
  render({ model: host, el }) {
    let last = -1, opened = new Set();
    const ui = stepper({
      el, model: host, label, css: CHAT_CSS + css, steps: () => steps,
      draw({ at, body }) {
        const step = steps[at];
        if (at !== last) opened = new Set(step.open ?? []);
        last = at;
        const talk = conversation(messages, { upto: step.upto ?? messages.length, open: [...opened], mark: step.mark, waiting: step.waiting, model, recorded });
        const aside = step.aside ? `<div class="chat-aside">${step.aside}</div>` : "";
        body.innerHTML = `<div class="chat ${aside ? "split" : ""}">${talk}${aside}</div>`;
        wireChat(body, (i, open) => (open ? opened.add(i) : opened.delete(i)));
      },
    });
    ui.show(Number(host?.get?.("start") ?? 0));
    return () => ui.destroy();
  },
});
