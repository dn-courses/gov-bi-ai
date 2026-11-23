// ag1-loop — the agent loop, one message a step: your code sends the list to the model, the model
// returns one message, a tool call is run by your code and its result appended, and the loop ends
// when a message comes back with no tool call. Two panes that change together: the list of
// messages with their roles (Gemini's: user and model), and the loop as a sequence diagram.
import { widget, zone } from "./ag1-lib.js";
import { GCSS, gpanes } from "./aga-lib.js";

// RECORDED on 2026-11-23 with gemini-3.5-flash-lite (scratch recording e3): the real loop, with
// run_sql running on the preview's Pagila and returning {"rows": …}. One run of three; all three
// asked for this query first and answered 1,000 ("We have" twice, "There are" once).
const RECORDED = {
  call: { name: "run_sql", args: { query: "SELECT count(*) FROM film" }, id: "call_2114887430769800474" },
  result: { rows: [[1000]] },
  answer: "We have 1,000 films in the database.",
};

const LIST = [
  { role: "user", text: "How many films do we have?" },
  { role: "model", calls: [RECORDED.call] },
  { role: "user", resps: [{ name: "run_sql", response: RECORDED.result, id: RECORDED.call.id }] },
  { role: "model", text: RECORDED.answer },
];
const CFG = ["system_instruction", "tools: run_sql"];

const CSS = GCSS + `
.lw .ag1 .three { display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; align-items:stretch; }
.lw .ag1 .three .zone { display:grid; align-content:start; gap:6px; }
.lw .ag1 .three .says { font-size:18px; font-weight:600; }
.lw .ag1 .three .exit { margin-top:6px; padding:4px 10px; justify-self:start; border-radius:8px; font-size:14px; font-weight:600; background:var(--cell); color:var(--mute); }
.lw .ag1 .three .ok .exit { background:var(--ok-bg); color:var(--ok); } .lw .ag1 .three .on .exit { background:var(--accent-bg); color:var(--accent); } .lw .ag1 .three .hot .exit { background:var(--hot-bg); color:var(--hot); }
@container (max-width: 820px) { .lw .ag1 .three { grid-template-columns:1fr; } }
`;

const steps = [
  { stop: "Start", title: "The list starts with the question", n: 1, fresh: [0],
    note: `An <b>agent</b> is a loop that calls the model, lets it ask for actions, runs them and feeds the results back, until the model says it is done.` },
  { stop: "Think", title: "Thinking: the list goes out, one message comes back", n: 2, fresh: [1], state: "thinking",
    note: `The message is a request to run a tool. Your code appends it to the list.` },
  { stop: "Act", title: "Acting: your code runs the tool and appends the result", n: 3, fresh: [2], state: "acting",
    note: `The query runs in your process. Its result goes into the list as a function response, the third message.` },
  { stop: "Think", title: "Thinking again: the model now reads the result", n: 4, fresh: [3], state: "thinking",
    note: `The whole list goes out again, result included. This time a plain message comes back.` },
  { stop: "Done", title: "Done: a message with no tool call ends the loop", n: 4, fresh: [3], state: "done", decisive: true,
    note: `That is the only exit signal there is. The loop returns the message to the person who asked.` },
  { stop: "Each turn", title: "On every turn the model does one of three things",
    note: `To the loop, the third looks exactly like the first: a plain message. Which state it went wrong in — thinking, acting, done — is the first question of every debugging session.` },
];

const kind = (cap, says, exit, cls) => zone(cap, `<p class="says">${says}</p><span class="exit">${exit}</span>`, cls);

function three() {
  return `<div class="three">
    ${kind("“I can answer”", "a plain message", "the loop exits", "ok")}
    ${kind("“I need to act”", "one or more tool calls", "the loop runs them and goes round again", "on")}
    ${kind("Stuck", "an apology, or something made up", "also a plain message: the loop exits", "hot")}</div>`;
}

function view(step, at) {
  if (at === 5) return three();
  return gpanes(LIST, EVENTS, step, at, CFG);
}

// [step it appears on, from party, to party, label]
const EVENTS = [
  [0, 0, 1, "the question"],
  [1, 1, 2, "the list · 1 message"],
  [1, 2, 1, "a tool call"],
  [2, 1, 3, "run_sql(query)"],
  [2, 3, 1, "the result: 1000"],
  [3, 1, 2, "the list · 3 messages"],
  [3, 2, 1, "plain text: no tool call"],
  [4, 1, 0, "the answer"],
];
export default widget({ label: "The agent loop", css: CSS, steps, view });
