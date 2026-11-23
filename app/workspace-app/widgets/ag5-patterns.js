// ag5-patterns — lesson 28: start from a failure that was measured, then each named pattern is the
// same loop with one call added in front of it or behind it. The planner and the critique are
// measured once, in the ag2-plan scene; this scene only frames them.
//
// MEASURED 2026-11-23 in the agents lab, gemini-3.5-flash-lite, the SQL agent of the page's setup
// cell (three tools, turn cap 8) on Pagila:
//  - 9 multi-part questions × 5 runs (45): a part was dropped 0 times (research run, 15:12–15:22 UTC).
//  - QUESTION × 5, plain loop: the longest film was named alone 3 of 5 times (10 films tie at 185
//    min, the SQL ended in LIMIT 1); one run gave a Store 2 count that no query produced.
import { staged } from "./ag4-lib.js";

const M = { asked: 45, dropped: 0, runs: 5, oneFilm: 3, ties: 10, minutes: 185 };
const QUESTION = "Which category has the most films, which store has more customers, and what is the longest film?";

const steps = [
  { stop: "The failure", title: "Every part answered, one of them wrong",
    note: `In ${M.asked} recorded runs of multi-part questions the agent dropped a part <b>${M.dropped}</b> times. What it did do: <code>ORDER BY length DESC LIMIT 1</code> named one longest film in <b>${M.oneFilm} of ${M.runs}</b> runs, while <b>${M.ties}</b> films tie at ${M.minutes} minutes. Once it gave a Store 2 count no query had produced.` },
  { stop: "Plan first", title: "Planner: one call in front of the loop",
    note: `A first call with no tools splits the question into parts; the loop works through them as a checklist. It is the answer to a dropped part, which was not this failure.` },
  { stop: "Reflect", title: "Reflection: one call behind the loop", decisive: true,
    note: `A second call reads the question, the SQL and the draft, and lists flaws; the flaws go back into the loop for another round.` },
  { stop: "Choose", title: "Start with one loop; add a call only for a failure you have seen",
    note: `Each pattern answers one observed failure and adds calls to every question. A rule in the system prompt (“a question about the most or the longest returns every tie”) is cheaper still. Several agents, each with its own prompt and tools, are a pattern of their own.` },
];

const CSS = `
.lw .pt svg { width:100%; height:auto; display:block; }
.lw .pt svg text { font:600 14px system-ui, sans-serif; fill:var(--ink); text-anchor:middle; dominant-baseline:middle; }
.lw .pt svg text.lbl { font-weight:500; font-size:13px; fill:var(--mute); } .lw .pt svg text.acc { fill:var(--accent); } .lw .pt svg text.hot { fill:var(--hot); }
.lw .pt svg .zone { fill:var(--panel); stroke:var(--line); }
.lw .pt svg .pill { fill:var(--cell); stroke:var(--line); }
.lw .pt svg .add { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .pt svg .edge { fill:none; stroke:var(--accent); stroke-width:2.2; stroke-linecap:round; }
.lw .pt svg .ret { fill:none; stroke:var(--hot); stroke-width:2; stroke-dasharray:6 6; stroke-linecap:round; }
.lw .pt .quote { padding:10px 14px; border-radius:12px; background:var(--cell); font-size:16px; }
.lw .pt .facts { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; }
.lw .pt .facts div { padding:14px 16px; border-radius:12px; background:var(--cell); border:1px solid var(--line); } .lw .pt .facts div.bad { background:var(--hot-bg); border-color:var(--hot); }
.lw .pt .facts .mid { font-size:28px; } .lw .pt .facts p { margin:6px 0 0; font-size:14.5px; color:var(--mute); }
.lw .pt .ladder { display:grid; gap:8px; }
.lw .pt .rung { display:grid; grid-template-columns:minmax(0,1fr) 30px minmax(0,1fr); gap:8px; align-items:center; }
.lw .pt .rung span { padding:10px 14px; border-radius:10px; background:var(--cell); font-size:15px; }
.lw .pt .rung span.add { background:var(--accent-bg); color:var(--accent); font-weight:600; }
.lw .pt .rung i { font-style:normal; text-align:center; color:var(--accent); font-size:20px; }
@container (max-width: 820px) { .lw .pt .facts { grid-template-columns:1fr; } }
`;

const arrowDown = (x, y1, y2) => `<path class="edge" d="M${x} ${y1} L${x} ${y2} M${x - 6} ${y2 - 8} L${x} ${y2} L${x + 6} ${y2 - 8}"/>`;
const arrowUp = (x, y1, y2) => `<path class="edge" d="M${x} ${y1} L${x} ${y2} M${x - 6} ${y2 + 8} L${x} ${y2} L${x + 6} ${y2 + 8}"/>`;
const loop = (x, y, w = 200) => `<rect class="zone" x="${x}" y="${y}" width="${w}" height="164" rx="12"/><text class="lbl" x="${x + w / 2}" y="${y + 18}">THE LOOP</text>
  <rect class="pill" x="${x + 20}" y="${y + 32}" width="${w - 40}" height="38" rx="19"/><text class="acc" x="${x + w / 2}" y="${y + 51}">the model</text>
  <rect class="pill" x="${x + 20}" y="${y + 110}" width="${w - 40}" height="38" rx="19"/><text x="${x + w / 2}" y="${y + 129}">run the tool</text>
  ${arrowDown(x + w / 2 - 30, y + 72, y + 108)}${arrowUp(x + w / 2 + 30, y + 108, y + 72)}`;
const pill = (x, y, w, label, cls = "pill", tcls = "") => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="40" rx="20"/><text class="${tcls}" x="${x + w / 2}" y="${y + 21}">${label}</text>`;
const flow = (x1, x2, y) => `<path class="edge" d="M${x1} ${y} L${x2} ${y} M${x2 - 8} ${y - 6} L${x2} ${y} L${x2 - 8} ${y + 6}"/>`;
const bottom = (a, b) => `<text class="lbl" x="380" y="318">${a}</text><text class="acc" x="380" y="350">${b}</text>`;

const planSvg = `<svg viewBox="0 0 760 370">${pill(16, 166, 120, "the question")}${pill(170, 60, 130, "planner call", "add", "acc")}<text class="lbl" x="235" y="44">no tools · schema: parts</text>
  <path class="edge" d="M76 164 C76 100 120 80 168 80"/>${arrowDown(235, 102, 118)}
  <rect class="pill" x="170" y="120" width="130" height="96" rx="10"/><text x="235" y="146">1 category</text><text x="235" y="168">2 store</text><text x="235" y="190">3 longest film</text>
  ${flow(302, 336, 170)}${loop(340, 104)}${flow(542, 610, 186)}${pill(614, 166, 130, "an answer")}${bottom("every part on the list", "+ 1 call on every question")}</svg>`;

const head = (x, y) => `<path class="ret" d="M${x - 6} ${y + 9} L${x} ${y} L${x + 6} ${y + 9}" style="stroke-dasharray:none"/>`;
const reflectSvg = `<svg viewBox="0 0 760 390">${pill(12, 166, 110, "the question")}${flow(124, 156, 186)}${loop(160, 104, 190)}
  ${flow(352, 440, 186)}<text class="lbl" x="396" y="168">draft + SQL</text>
  ${pill(444, 166, 120, "critic call", "add", "acc")}<text class="lbl" x="504" y="140">no tools · schema: flaws</text>
  ${flow(566, 620, 186)}<text class="lbl" x="593" y="168">no flaws</text>${pill(624, 166, 124, "an answer")}
  <path class="ret" d="M504 208 C504 300 255 318 255 272"/>${head(255, 270)}<text class="hot" x="380" y="318">flaws, as a new message</text>
  <text class="lbl" x="380" y="348">the critic is the same model: its blind spots are the draft's</text><text class="acc" x="380" y="374">+ 1 call per round, and the loop again on a flaw</text></svg>`;

const scene = () => `
  <div data-on="0" style="display:grid;gap:14px">
    <div class="quote">“${QUESTION}”</div>
    <pre>SELECT title, length FROM film ORDER BY length DESC NULLS LAST LIMIT 1;\n→ CHICAGO NORTH · 185          (answer: “Longest film: CHICAGO NORTH”)</pre>
    <div class="facts"><div><span class="mid">${M.dropped} of ${M.asked}</span><p>runs that dropped a part of the question</p></div>
      <div class="bad"><span class="mid hot">${M.oneFilm} of ${M.runs}</span><p>runs that named one film; ${M.ties} films are ${M.minutes} minutes long</p></div>
      <div class="bad"><span class="mid hot">1 of ${M.runs}</span><p>runs with a Store 2 count that no query produced</p></div></div></div>
  <div class="zone" data-on="1">${planSvg}</div>
  <div class="zone" data-on="2">${reflectSvg}</div>
  <div class="ladder" data-on="3"><p class="cap">what you saw → what you add</p>
    <div class="rung"><span>nothing yet</span><i>→</i><span class="add">one loop, a few tools, a good prompt</span></div>
    <div class="rung"><span>it drops a part of the question</span><i>→</i><span class="add">a planner call in front</span></div>
    <div class="rung"><span>a wrong answer a reader could spot: a tie cut off, a number from nowhere</span><i>→</i><span class="add">a critic call behind</span></div></div>`;

export default staged({ key: "pt", label: "Patterns built on the loop", css: CSS, steps, scene });
