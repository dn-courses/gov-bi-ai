// task — a tuning task told in five steps: the symptom, what the plan says, a tempting fix that
// does not hold, the fix that does, and the loop the task followed. A widget is one task's facts.
import { fmt, scene as build } from "./scene.js";

const CSS = `
.lw .tk { display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 1.15fr); gap:14px; align-items:start; }
.lw .tk .card { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px 16px; }
.lw .tk h4 { margin:0 0 12px; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .tk pre { margin:0; font:14px/1.55 ui-monospace, Menlo, monospace; white-space:pre-wrap; }
.lw .tk .facts { margin:12px 0 0; padding:0; list-style:none; display:grid; gap:6px; font:13px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .tk .facts b { color:var(--hot); font-weight:600; }
.lw .tk .strip { display:grid; grid-template-columns:repeat(50, 1fr); gap:2px; margin-top:14px; }
.lw .tk .strip i { height:9px; border-radius:2px; background:var(--hot-bg); transition:background .6s; }
.lw .tk .strip i.hit { background:var(--accent); }
.lw .tk[data-at="3"] .strip i:not(.hit), .lw .tk[data-at="4"] .strip i:not(.hit) { background:var(--cell); }
.lw .tk .cap2 { margin:8px 0 0; font-size:13px; color:var(--mute); }
.lw .tk .cap2 .after, .lw .tk[data-at="3"] .cap2 .before, .lw .tk[data-at="4"] .cap2 .before { display:none; }
.lw .tk[data-at="3"] .cap2 .after, .lw .tk[data-at="4"] .cap2 .after { display:inline; }
.lw .tk .tries { display:grid; grid-template-columns:max-content 1fr max-content; gap:14px 14px; align-items:center; }
.lw .tk .try { display:contents; }
.lw .tk .try > * { transition:opacity .6s; } .lw .tk .try.st:not(.on) > * { opacity:0; }
.lw .tk .label { font-weight:600; font-size:14px; } .lw .tk .label small { display:block; font:13px ui-monospace, Menlo, monospace; font-weight:400; color:var(--mute); }
.lw .tk .track { height:16px; border-radius:8px; background:var(--cell); overflow:hidden; }
.lw .tk .track i { display:block; height:100%; width:0; border-radius:8px; transition:width .8s ease-out; }
.lw .tk .try.on .track i { width:var(--w); }
.lw .tk .v { font:600 16px ui-monospace, Menlo, monospace; text-align:right; white-space:nowrap; } .lw .tk .v small { display:block; font:12px system-ui, sans-serif; font-weight:400; color:var(--mute); }
.lw .tk .verdict { grid-column:1 / -1; margin:-6px 0 0; font-size:13px; color:var(--mute); }
.lw .tk .loop { grid-column:1 / -1; display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.lw .tk .loop span { padding:7px 14px; border-radius:999px; background:var(--accent-bg); color:var(--accent); font-weight:600; font-size:14px; }
.lw .tk .loop i { color:var(--mute); font-style:normal; }
.lw .tk:not([data-at="4"]) .loop { display:none; }
@media (max-width: 760px) { .lw .tk { grid-template-columns:1fr; } }
`;
const time = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10000 ? 1 : 2)} s` : ms >= 10 ? `${Math.round(ms)} ms` : `${ms} ms`);
const LOOP = ["symptom", "plan", "hypothesis", "one change", "measure again"];

// task: { label, title, query, facts: [html…], before/tempting/fix: { name, how, ms, pages, verdict }, notes: [5 sentences],
//   strip?: { at, before, after } } — the table as a strip of 150 pieces: all of them read before the fix, and after it only the
//   one at `at` (0–1 along the file) that holds the rows asked for; `before` and `after` are the captions.
const CELLS = 150;
const strip = (s) => `<div class="st" data-from="1"><div class="strip">${Array.from({ length: CELLS }, (_, i) => `<i class="${i === Math.round(s.at * (CELLS - 1)) ? "hit" : ""}"></i>`).join("")}</div>
  <p class="cap2"><span class="before">${s.before}</span><span class="after">${s.after}</span></p></div>`;
export function task({ stepper, key = "tk", ...t }) {
  const tries = [["before", "mute", 0], ["tempting", "hot", 2], ["fix", "accent", 3]];
  const steps = () => [
    { stop: "Symptom", title: t.title, note: t.notes[0] },
    { stop: "Plan", title: "What the plan says", note: t.notes[1] },
    { stop: "Tempting", title: `The tempting fix: ${t.tempting.name}`, note: t.notes[2] },
    { stop: t.fix.stop ?? "The fix", title: t.fix.title ?? `The fix: ${t.fix.name}`, note: t.notes[3] },
    { stop: "The loop", title: "One change, then measure", decisive: true, note: t.notes[4] },
  ];
  const attempt = ([which, colour, from]) => { const a = t[which];
    return `<div class="try st" data-from="${from}"><span class="label">${which === "before" ? "as it is" : a.name}<small>${a.how ?? ""}</small></span>
      <div class="track"><i style="--w:${Math.max(0.5, (100 * a.ms) / t.before.ms)}%;background:var(--${colour})"></i></div>
      <span class="v">${time(a.ms)}<small>${fmt(a.pages)} pages</small></span></div>
      ${a.verdict ? `<p class="verdict st" data-from="${from}">${a.verdict}</p>` : ""}`; };
  const scene = () => `
    <div class="card"><h4>The query</h4><pre>${t.query}</pre>
      <ul class="facts st" data-from="1">${t.facts.map((f) => `<li>${f}</li>`).join("")}</ul>${t.strip ? strip(t.strip) : ""}</div>
    <div class="card"><h4>Time and pages read</h4><div class="tries">${tries.map(attempt).join("")}</div></div>
    <div class="loop">${LOOP.map((s) => `<span>${s}</span>`).join("<i>→</i>")}</div>`;
  return build({ stepper, key, label: t.label, css: CSS, steps, scene });
}
