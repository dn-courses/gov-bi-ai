// agt5-judge — a model as judge, calibrated before it is trusted. Ten captured answers with a
// person's label; the judge (a rubric, a case, a verdict with its reason); the vague rubric measured
// against the labels; the four questions that calibrate it; the calibrated judge on fresh answers;
// and what it costs and cannot see. Every run is recorded in agt5-judge-data.js.
import { bar, esc, widget, zone } from "./ag1-lib.js";
import { BLIND, CASES, COST, EXAMPLE, FRESH, MODEL, STRONG, WEAK } from "./agt5-judge-data.js";

const steps = [
  { stop: "Ten answers", title: "Answers no value check can grade",
    note: `Ten answers of the warehouse agent, captured with every call it made. A person labelled each one and wrote why. Half are bad, and four of the five bad ones carry a number the tool really returned.` },
  { stop: "The judge", title: "A model as judge: a rubric, a case, a verdict",
    note: `The rubric is the instruction; the question, the calls with their results and the answer are the message. Structured output returns a reason and then a verdict, so code can count them.` },
  { stop: "Measure it", title: "The judge is a component: measure it against the labels", decisive: true,
    note: `The vague rubric agrees with the person on 6 or 7 of ten (${WEAK.runs.join(", ")} in six runs). Its reasons show why: it rewards a number and some context, and the bad answers have both.` },
  { stop: "Calibrate", title: "Say what the person checked",
    note: `Each disagreement is something the person checked and the rubric never asked. Too lenient pushes the rubric one way, too strict the other. Written down as rules, they moved the agreement to ${STRONG.runs.join(", ")} in six runs.` },
  { stop: "Its limits", title: "What a judge costs, and what it cannot see",
    note: `A model call per answer; verdicts that can move between runs; and the same blind spot as the agent: when the tool's number is wrong, the judge has nothing to disagree with.` },
  { stop: "Fresh answers", title: "Then grade answers nobody has labelled",
    note: `Three new questions to the warehouse agent, each answer graded by the calibrated rubric. You are the person now: read each reason and decide whether you agree.` },
];

const CSS = `
.lw .ag1 .grid { display:grid; gap:10px; grid-template-columns:repeat(2, minmax(0,1fr)); }
.lw .ag1 .case { border:1.5px solid var(--line); border-radius:10px; background:var(--cell); padding:9px 12px; font-size:14px; line-height:1.45; min-width:0; }
.lw .ag1 .case.bad { border-left:5px solid var(--hot); } .lw .ag1 .case.good { border-left:5px solid var(--ok); }
.lw .ag1 .case .hd { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:4px; }
.lw .ag1 .case .q { font-weight:600; } .lw .ag1 .case .a { color:var(--mute); margin-top:3px; }
.lw .ag1 .tag { font:12px ui-monospace, Menlo, monospace; padding:1px 8px; border-radius:999px; background:var(--panel); color:var(--mute); }
.lw .ag1 .pill.sm { padding:2px 10px; font-size:13px; }
.lw .ag1 table.t { width:100%; border-collapse:collapse; font-size:14px; }
.lw .ag1 table.t td, .lw .ag1 table.t th { padding:6px 9px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
.lw .ag1 table.t tr:last-child td { border-bottom:none; }
.lw .ag1 table.t th { font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .ag1 table.t tr.miss td:first-child { box-shadow:inset 3px 0 0 var(--hot); }
.lw .ag1 .why { font-size:14px; line-height:1.45; padding:8px 12px; border-radius:8px; background:var(--cell); margin-top:8px; }
.lw .ag1 .why b { font:600 13px ui-monospace, Menlo, monospace; }
.lw .ag1 .arrow { text-align:center; font-size:26px; color:var(--accent); align-self:center; }
@container (max-width: 820px) { .lw .ag1 .grid { grid-template-columns:1fr; } }
`;

const label = (v) => `<span class="pill sm ${v === "good" ? "ok" : "hot"}">${v}</span>`;
const byId = Object.fromEntries(CASES.map((c) => [c.id, c]));

const caseCard = (c) => `<div class="case ${c.human}"><div class="hd"><code>${c.id}</code>${label(c.human)}<span class="tag">${c.kind}</span></div>
  <div class="q">${esc(c.question)}</div><div class="a">${esc(c.excerpt)}</div></div>`;
const cases = () => `<div class="grid">${CASES.map(caseCard).join("")}</div>`;

const judgeView = () => `<div class="cols" style="--cols:minmax(0,1.3fr) auto minmax(0,1fr)">
  <div style="display:grid; gap:12px; min-width:0">${zone("system_instruction · the rubric", `<pre>${esc(EXAMPLE.rubric)}</pre>`, "on")}
  ${zone("contents · the case", `<pre>${esc(EXAMPLE.shown)}</pre>`)}</div><div class="arrow">→</div>
  ${zone(`response_schema=Verdict · ${MODEL}`, `<pre>${esc(JSON.stringify(EXAMPLE.verdict, null, 1))}</pre>
    <p class="small" style="margin-top:8px">the person said <b>${byId[EXAMPLE.id].human}</b>: ${esc(byId[EXAMPLE.id].why)}</p>`, "hot")}</div>`;

const row = (c) => { const j = WEAK.verdicts[c.id], miss = j !== c.human;
  return `<tr class="${miss ? "miss" : ""}"><td><code>${c.id}</code></td><td>${label(c.human)}</td><td>${label(j)}</td><td class="dim">${miss ? "disagrees" : ""}</td></tr>`; };
const missNote = ([id, side, reason]) => `<div class="why"><b>${id}</b> <span class="tag">${side}</span><br>judge: ${esc(reason)}<br><span class="dim">person: ${esc(byId[id].why)}</span></div>`;

const measure = () => `<div class="cols" style="--cols:minmax(0,.9fr) minmax(0,1.1fr)">
  ${zone(`one run · agreement <b>${WEAK.shown} of 10</b>`, `<table class="t"><thead><tr><th>case</th><th>person</th><th>judge</th><th></th></tr></thead><tbody>${CASES.map(row).join("")}</tbody></table>`)}
  ${zone("the disagreements, with the judge's reasons", WEAK.misses.map(missNote).join(""), "hot")}</div>`;

const runs = (name, list, cls) => list.map((n, i) => bar(`${name}, run ${i + 1}`, n, 10, `${n} / 10`, cls)).join("");
const side = (name) => WEAK.misses.filter(([, s]) => s === name).map(([id]) => `<div class="why"><b>${id}</b><br><span class="dim">the person checked:</span> ${esc(byId[id].why)}</div>`).join("");

const calibrate = () => `<div class="cols" style="--cols:minmax(0,1.1fr) minmax(0,1fr)">
  <div style="display:grid; gap:12px; min-width:0">${zone("too lenient · the rubric must ask more", side("too lenient"), "hot")}
  ${zone("too strict · the rubric must allow it", side("too strict"), "on")}</div>
  ${zone("agreement with the person", `<div class="bars">${runs("vague", WEAK.runs, "hot")}${runs("calibrated", STRONG.runs, "ok")}</div>`)}</div>`;

const freshRow = (f) => `<div class="case ${f.verdict}"><div class="hd">${label(f.verdict)}<span class="q">${esc(f.question)}</span></div>
  <div class="a">${esc(f.answer)}</div><div class="why"><b>judge</b> · ${esc(f.reason)}</div>${f.note ? `<p class="small hotc" style="margin-top:6px">${esc(f.note)}</p>` : ""}</div>`;
const fresh = () => `<div style="display:grid; gap:10px">${FRESH.map(freshRow).join("")}</div>`;

const limits = () => `<div class="cols" style="--cols:repeat(3, minmax(0,1fr))">
  ${zone("it costs a call", `<p class="big">${COST.calls}</p><p class="small">model calls to grade ten answers, about ${COST.tokensIn.toLocaleString("en-US")} tokens in and ${COST.tokensOut} out each, ${COST.seconds} second for all ten at once</p>`)}
  ${zone("it varies", `<p class="big">${WEAK.runs.join(" · ")}</p><p class="small">the same vague rubric on the same ten answers, six runs</p>`)}
  ${zone("it shares the blind spot", `${label(BLIND.verdict)}<p class="small" style="margin-top:8px">${esc(BLIND.reason)}</p><p class="small" style="margin-top:6px">the hour was 15 in the tool's rows and 11 in the table</p>`, "hot")}</div>`;

const VIEWS = [cases, judgeView, measure, calibrate, limits, fresh];
const view = (step, at) => VIEWS[at]() + (at === 4 ? "" : `<p class="small">recorded on ${MODEL}, 2026-11-24</p>`);

export default widget({ label: "Calibrating a judge", css: CSS, steps, view });
