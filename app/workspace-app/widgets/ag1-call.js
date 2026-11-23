// ag1-call — the model behind an API: a stateless function from a list of messages to one more
// message. The chat on the left is what a person sees; the request on the right is what was sent.
// On Gemini the list is `contents` (roles "user" and "model"), and the system instruction rides in
// the config beside it.
import { bar, widget, zone } from "./ag1-lib.js";
import { GCSS, config, gmsg, gstack, gtalk, stats } from "./aga-lib.js";

const SYSTEM = "You answer questions about a video-rental business. One sentence.";
const Q1 = "Which customer has spent the most?";
const Q2 = "And who is second?";

// RECORDED on 2026-11-23 with gemini-3.5-flash-lite: the page's own cells, one run (scratch
// recording rec1). `alone`: the follow-up sent without the list. The wording changes from run to run.
const RECORDED = {
  answer1: "John Smith has spent the most at our video-rental business, totaling $450 in rentals and memberships.",
  usage: { prompt: 20, out: 23, thoughts: "None" }, secondPrompt: 48,
  alone: "Blockbuster is the second-largest video-rental business in the market.",
  together: "Jane Doe is second, having spent a total of $380 at our video-rental business.",
};

const LIST = [
  { role: "user", text: Q1 },
  { role: "model", text: RECORDED.answer1 },
  { role: "user", text: Q2 },
];

const ROLES = [
  { who: "system_instruction", by: "written by you, the developer", text: "Standing instructions. Not in the list: it rides in the config, and is sent with every call." },
  { who: "user", by: "written by the person asking", text: "The question or request." },
  { who: "model", by: "written by the model", text: "Its reply. The only kind of message the API ever returns." },
  { who: "user · function_response", by: "written by your code", text: "The result of something the model asked your code to run." },
];

const CSS = GCSS + `
.lw .ag1 .roles .msg { display:grid; grid-template-columns:minmax(220px, 30%) 1fr; gap:2px 14px; align-items:baseline; padding:9px 14px; }
.lw .ag1 .roles .msg .role { justify-self:start; }
.lw .ag1 .roles .msg .by { grid-column:1; grid-row:2; margin:0; }
.lw .ag1 .roles .msg .text { grid-column:2; grid-row:1 / span 2; }
.lw .ag1 .roles .msg.sys .role { color:var(--ink); background:var(--cell); border:1px solid var(--line); }
.lw .ag1 .nots { display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; align-items:stretch; }
.lw .ag1 .nots .zone { display:grid; align-content:start; gap:8px; }
.lw .ag1 .alone { margin-top:10px; padding:8px 12px; border-radius:8px; border-left:4px solid var(--hot); background:var(--hot-bg); font-size:14px; }
.lw .ag1 .alone b { display:block; font:600 12px ui-monospace, Menlo, monospace; letter-spacing:.06em; text-transform:uppercase; color:var(--hot); }
@container (max-width: 820px) { .lw .ag1 .nots { grid-template-columns:1fr; } }
`;

const steps = [
  { stop: "Request", title: "A call sends a model name and a list of messages",
    note: `Take away the chat window and this is what is left: a list, <code>contents</code>. Each message has a <b>role</b> and its <b>parts</b>, here one part of text.` },
  { stop: "Response", title: "It returns one message, and a count of tokens",
    note: `One <code>model</code> message comes back, with <code>usage_metadata</code>: tokens in, tokens out, and tokens spent thinking, which this model at its default did not. All of them are billed.` },
  { stop: "Roles", title: "Two roles in the list, and one instruction beside it",
    note: `The model writes one kind of message. Everything else is text that somebody's code put in the request.` },
  { stop: "Stateless", title: "The second question sends the first one again", decisive: true,
    note: `The API kept nothing. Asked alone, "And who is second?" was answered about video-rental chains. For the model to know what "second" refers to, the conversation is in the request: two messages sent again, one new. (With it, the model named a second customer, as invented as the first.)` },
  { stop: "The bill", title: "Every call pays for everything before it",
    note: `Each turn adds two messages and re-sends all the earlier ones. The SDK's <code>client.chats</code> keeps the list for you, in your process, and sends all of it on every call all the same.` },
  { stop: "Missing", title: "What the API does not have",
    note: `Memory, your data, and a private notepad are not in the function. Whatever looks like one of them is code around the call, maintaining the list.` },
];

const kind = (who) => (who === "model" ? "model" : who === "user" ? "user" : who.startsWith("user") ? "fnresp" : "sys");
const role = (r) => `<div class="msg ${kind(r.who)}"><span class="role">${r.who}</span><span class="by">${r.by}</span><div class="text">${r.text}</div></div>`;

function bill() {
  const sent = [1, 3, 5, 7, 9];
  return zone("Messages sent, call by call — one question and one answer a turn", `<div class="bars lean">${sent.map((n, i) =>
    bar(`call ${i + 1}`, n, 9, `${n} message${n > 1 ? "s" : ""}`, i === sent.length - 1 ? "hot" : "")).join("")}</div>
    <p class="small" style="margin-top:10px"><b class="hotc">${sent.reduce((a, b) => a + b, 0)}</b> messages billed as input over five calls, for a conversation that holds ${sent.at(-1) + 1}</p>`);
}

const not = (cap, text) => zone(cap, `<p>${text}</p>`, "hot");
const missing = () => `<div class="nots">
    ${not("No memory", "Each call starts from the list you send. A name the user gave earlier exists only if it is in that list.")}
    ${not("No data", "It cannot read a database, a file or the web. It can only be sent text.")}
    ${not("No hidden state", "Nothing is kept between calls on the model's side. What it should know mid-task is in the list.")}</div>`;

function request(at, cfg) {
  if (at !== 3) return zone(`Request · <b>model = $GEMINI_MODEL</b>`, cfg + gstack(LIST, 1, at === 0 ? [0] : []), at === 0 ? "on" : "");
  return zone(`Request 2 · <b>contents</b> · 2 sent again, 1 new`, cfg + gstack(LIST, 3, [2]) + `<div style="margin-top:10px">${stats([["tokens in, call 1", RECORDED.usage.prompt], ["tokens in, call 2", RECORDED.secondPrompt, true]])}</div>
    <div class="alone"><b>sent alone, it was answered</b>“${RECORDED.alone}”</div>`, "on");
}

function response() {
  const u = RECORDED.usage;
  return zone(`Response`, gmsg(LIST[1], "fresh") + `<div style="margin-top:10px">${stats([["prompt_token_count", u.prompt], ["candidates_token_count", u.out], ["thoughts_token_count", u.thoughts]], "rows")}</div>`, "on");
}

function view(step, at) {
  if (at === 2) return zone("Who writes what", `<div class="stack roles">${ROLES.map(role).join("")}</div>`);
  if (at === 4) return bill();
  if (at === 5) return missing();
  const chat = gtalk([{ role: "user", text: Q1 }, { role: "assistant", text: RECORDED.answer1 }, { role: "user", text: Q2 }], { upto: at === 0 ? 1 : at === 1 ? 2 : 3 });
  const cfg = config([`system_instruction: "${SYSTEM}"`]);
  return `<div class="cols" style="--cols:minmax(0,1fr) minmax(0,1fr)">${chat}<div style="display:grid; gap:14px; min-width:0">${request(at, cfg)}${at === 1 ? response() : ""}</div></div>`;
}

export default widget({ label: "One call to the model", css: CSS, steps, view });
