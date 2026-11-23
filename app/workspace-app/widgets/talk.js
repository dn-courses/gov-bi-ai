// talk — a recorded session of the model, replayed turn by turn: the tool calls it made, what each
// returned, and its answer, then what that answer measured to. Nothing here is live and nothing is
// retyped: the turns come from `recorded.json`, bundled from the module's `_lab/transcripts`.
import { stepper } from "@widget-lib/stepper.js";
import { ASK_CSS, given } from "./ask.js";
import recorded from "./recorded.json";

const CSS = ASK_CSS + `
.lw .talk { display:grid; gap:14px; }
.lw .talk .turns { display:flex; flex-direction:column; gap:8px; }
.lw .talk .turn { animation: lw-in .35s both; min-width:0; }
.lw .talk .who { margin-bottom:4px; }
.lw .talk .call pre { background:var(--accent-bg); color:var(--accent); border-left:3px solid var(--accent); }
.lw .talk .result pre { border-left:3px solid var(--line); font-size:13px; }
.lw .talk .result pre.all { white-space:pre; overflow-x:auto; }
.lw .talk .result mark { background:var(--hot-bg); color:var(--hot); font-weight:600; }
.lw .talk .more { all:unset; cursor:pointer; margin-top:4px; font-size:12px; color:var(--accent); }
.lw .talk .say { padding:10px 12px; border-radius:8px; background:var(--cell); font-size:15px; }
.lw .talk .say p { margin:0 0 8px; } .lw .talk .say > :last-child { margin-bottom:0; }
.lw .talk .say pre { background:var(--panel); margin:0 0 8px; }
.lw .talk .waiting { padding:10px 12px; border-radius:8px; background:var(--hot-bg); color:var(--hot); font-size:15px; }
.lw .talk .waiting::before { content:"● "; animation: talk-pulse 1.2s infinite; }
.lw .talk .pick { display:flex; flex-wrap:wrap; gap:8px; }
.lw .talk .pick button { all:unset; cursor:pointer; padding:7px 16px; border-radius:999px; background:var(--cell); color:var(--mute); font-size:15px; }
.lw .talk .pick button.on { background:var(--accent); color:var(--accent-ink); font-weight:600; }
.lw .talk .tally { margin:0; font-size:13px; color:var(--mute); }
@keyframes talk-pulse { 50% { opacity:.25; } }
`;

const esc = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const flat = (sql) => sql.replace(/\s+/g, " ").replace(/;\s*$/, "").trim();

// The little Markdown a model answers in: fenced code, inline code, bold, paragraphs.
function prose(text, blocks) {
  const parts = text.trim().split(/```\w*\n([\s\S]*?)```/).map((part, i) => i % 2
    ? [`<pre>${esc(part.trimEnd())}</pre>`]
    : part.split(/\n\s*\n/).filter((p) => p.trim()).map((p) => `<p>${esc(p.trim()).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>")}</p>`)).flat();
  return blocks && parts.length > blocks ? parts.slice(0, blocks).join("") + `<p class="hidden">… ${parts.length - blocks} more paragraph${parts.length - blocks > 1 ? "s" : ""} in the recording</p>` : parts.join("");
}

// A plan can run to forty lines of deep indentation. Unless opened, only the first line and the
// lines `focus` matches are shown, without their indentation, and the rest are counted.
function plan(text, focus, open, whole) {
  if (whole) return `<pre>${text.split("\n").map((line) => (focus ? esc(line).replace(focus, (hit) => `<mark>${hit}</mark>`) : esc(line))).join("\n")}</pre>`;
  const lines = text.split("\n");
  const long = lines.length > 9;
  const hit = (line) => focus && focus.test(line);
  const kept = (line, i) => open || !long || i === 0 || hit(line) || /^(ERROR|CANCELLED|Execution Time)/.test(line.trim());
  const out = []; let skipped = 0;
  const gap = () => { if (skipped) out.push(`<span class="hidden">⋯ ${skipped} line${skipped > 1 ? "s" : ""}</span>`); skipped = 0; };
  lines.forEach((line, i) => {
    if (!kept(line, i)) { skipped += 1; return; }
    gap();
    const shown = esc(open || !long ? line : line.replace(/^\s*(->\s*)?/, ""));
    out.push(hit(line) ? `<mark>${shown}</mark>` : shown);
  });
  gap();
  const toggle = long ? `<button class="more" data-open="${open ? "" : "1"}">${open ? "show the lines that matter" : `show all ${lines.length} lines`}</button>` : "";
  return `<pre class="${open ? "all" : ""}">${out.join("\n")}</pre>${toggle}`;
}

function turn(t, talk, open) {
  if (t.call) return `<div class="turn call"><span class="who">the model calls <b>${t.call}(query${t.analyze ? ", analyze=True" : ""})</b></span><pre>${flat(t.query) === flat(talk.query ?? "") ? "the query, as given" : esc(t.query)}</pre></div>`;
  if (t.run) return `<div class="turn call"><span class="who">the agent runs</span><pre>${esc(t.run)}</pre></div>`;
  if (t.result !== undefined) return `<div class="turn result"><span class="who">${talk.agent ? "it gets back" : "the tool returns"}</span>${plan(t.result, talk.focus, open, !talk.agent)}</div>`;
  return `<div class="turn"><span class="who">${talk.agent ? "the agent says" : "the model answers"}</span><div class="say">${prose(t.say, talk.blocks)}</div></div>`;
}

function one(talk, open) {
  if (!talk.run) return `<div class="card case"><h4>database<b>${talk.db}</b></h4>${talk.fact ? `<p class="fact">${talk.fact}</p>` : `<p class="hidden">the model does not know what is in here</p>`}</div>`;
  const run = recorded[talk.run];
  if (!run) return `<div class="card case"><p class="fact">no recording named ${talk.run}</p></div>`;
  const turns = run.turns.slice(0, talk.upto ?? run.turns.length);
  const whole = turns.length === run.turns.length;
  const waiting = whole && !run.finished ? `<div class="turn waiting">${talk.waiting ?? `no result after ${run.stopped_after} seconds; the session was stopped`}</div>` : "";
  const silent = whole && run.finished && !run.turns.some((t) => t.call) && talk.silent ? `<p class="tally">${talk.silent}</p>` : "";
  const done = whole || talk.upto === undefined;
  const tally = done && talk.tally ? `<p class="tally">${talk.tally}</p>` : "";
  const measured = done && talk.measured ? `<p class="res ${talk.verdict === "ok" ? "ok" : talk.verdict === "bad" ? "bad" : ""}">${talk.measured}</p>` : "";
  const fact = talk.fact ? `<p class="fact">${talk.fact}</p>` : "";
  return `<div class="card case ${measured ? talk.verdict ?? "" : ""}"><h4>database<b>${talk.db}</b></h4>${fact}<div class="turns">${silent}${turns.map((t) => turn(t, talk, open)).join("")}${waiting}</div>${tally}${measured}</div>`;
}

// steps: [{ stop, title, note, has, fresh, query, decisive, extra, pick,
//           talks: [{ db, fact, run, agent, upto, query, focus, blocks, silent, waiting, tally, verdict, measured }] }]
// `pick` shows one session at a time, chosen by a switch above it (each talk's `tab` is its label).
// A plan the tool returned is printed complete, and only the text `focus` matches is marked; the
// output of an agent's shell command is long, so there only the lines `focus` matches are shown.
// `run` names a recording (`agent` marks one of an agent with psql: its turns are shell commands); `upto` shows only its first turns; `query` lets a call that repeats the
// given query print as "the query, as given"; `blocks` shows the first paragraphs of the answer.
export const talk = ({ label, steps }) => ({
  render({ model, el }) {
    let open = false, last = -1, shown = 0;
    const ui = stepper({
      el, model, label, css: CSS, steps: () => steps,
      draw({ at, body }) {
        if (at !== last) { open = false; shown = 0; }
        last = at;
        const step = steps[at];
        const talks = (step.talks ?? []).map((t) => ({ query: step.query, ...t }));
        const tabs = step.pick ? `<div class="pick">${talks.map((t, i) => `<button data-i="${i}" class="${i === shown ? "on" : ""}">${t.tab ?? t.fact ?? t.db}</button>`).join("")}</div>` : "";
        const seen = step.pick ? [talks[shown]] : talks;
        const columns = talks.length ? `${tabs}<div class="cases" style="grid-template-columns:repeat(${seen.length}, minmax(0, 1fr))">${seen.map((t) => one(t, open)).join("")}</div>` : "";
        body.innerHTML = `<div class="ask talk">${given(step)}${columns}${step.extra ? `<div class="card extra">${step.extra}</div>` : ""}</div>`;
        body.querySelectorAll(".pick button").forEach((b) => b.addEventListener("click", () => { shown = Number(b.dataset.i); ui.show(at); }));
        body.querySelectorAll(".more").forEach((b) => b.addEventListener("click", () => { open = b.dataset.open === "1"; ui.show(at); }));
      },
    });
    ui.show(Number(model?.get?.("start") ?? 0));
    return () => ui.destroy();
  },
});
