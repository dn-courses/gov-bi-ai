// hangar — work or wait: an aircraft mechanic, the tool cart beside the aircraft, the tool crib
// across the hangar. An analogy: its minutes are round numbers chosen for the story, not measurements.
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const A = { work: 360, wait: 15 }, B = { work: 100, wait: 300 };
const steps = () => [
  { stop: "The hangar", title: "A mechanic, a cart and a tool crib",
    note: `The mechanic works at the aircraft with the few tools the cart holds. Every other tool is in the crib across the hangar: walk over, sign it out, walk back.` },
  { stop: "Job A", title: "Job A: overhaul one engine",
    note: `All but one of the tools it needs are already on the cart. Six hours go on the wrench and one fifteen-minute trip to the crib. The job is slow because there is a lot of <b>work</b>.` },
  { stop: "Job B", title: "Job B: twenty small inspections",
    note: `Five minutes of work each, but each needs a different special tool: twenty trips of fifteen minutes. The job is slow because of the <b>waiting</b>.` },
  { stop: "What helps", title: "Different bottleneck, different fix",
    note: `A second mechanic halves Job A and barely touches Job B. A bigger cart, several tools per trip, or knowing the right shelf helps Job B and does nothing for Job A.` },
  { stop: "In the database", title: "The same hangar, renamed", decisive: true,
    note: `A query works on rows with the pages it has in memory, and waits for every page it has to read from disk. Slow because of work is <b>CPU-bound</b>; slow because of waiting is <b>I/O-bound</b>.` },
];
const CSS = `.lw .hg .db { opacity:0; transition:opacity .6s; } .lw .hg[data-at="4"] .db { opacity:1; }
.lw .hg[data-at="1"] .slot { fill:var(--accent-bg); stroke:var(--accent); } .lw .hg[data-at="1"] .wrench, .lw .hg[data-at="2"] .trip { stroke:var(--accent); stroke-width:2.5; }
.lw .hg[data-at="2"] .trip { stroke:var(--hot); } .lw .hg[data-at="2"] .tool.far { fill:var(--hot-bg); stroke:var(--hot); }
.lw .hg .mine { fill:var(--accent-bg); stroke:var(--accent); } .lw .hg .chip { fill:var(--accent-bg); } .lw .hg .chip.h { fill:var(--hot-bg); }`;
const W = 420, S = W / 400;
const job = (name, what, q, y, on) => `<g class="st" data-from="${on}"><text class="l" x="42" y="${y}">${name}</text><text class="lbl l" x="96" y="${y}">${what}</text>
  <rect class="bar on" x="290" y="${y - 9}" width="${q.work * S}" height="18" rx="3"/><rect class="bar warm" x="${290 + q.work * S + 2}" y="${y - 9}" width="${q.wait * S}" height="18" rx="3"/>
  <text class="mono l acc" x="290" y="${y + 22}">working ${q.work} min</text><text class="mono r hot" x="716" y="${y + 22}">waiting ${q.wait} min · ${Math.round(100 * q.wait / (q.work + q.wait))}%</text></g>`;
const far = new Set([2, 7, 9, 14, 17, 22]);
const scene = () => `<svg viewBox="0 0 760 420">
  <rect class="zone" x="26" y="10" width="330" height="170" rx="12"/><text class="cap" x="42" y="29">AT THE AIRCRAFT</text>
  <path class="edge wrench" d="M150 76 L220 76"/>
  <rect class="pill mine" x="50" y="56" width="100" height="40" rx="20"/><text class="acc" x="100" y="77">mechanic</text>
  <rect class="pill" x="220" y="56" width="110" height="40" rx="20"/><text x="275" y="77">aircraft</text>
  <text class="lbl l" x="50" y="124">tool cart — holds 4</text>
  ${[0, 1, 2, 3].map((i) => `<rect class="box slot" x="${50 + i * 44}" y="136" width="38" height="30" rx="5"/>`).join("")}
  <text class="lbl acc l db" x="50" y="44">a database process</text><text class="lbl acc l db" x="232" y="150">memory</text>
  <rect class="zone" x="490" y="10" width="244" height="170" rx="12"/><text class="cap" x="506" y="29">TOOL CRIB — EVERY TOOL</text>
  ${Array.from({ length: 24 }, (_, i) => `<rect class="box tool ${far.has(i) ? "far" : ""}" x="${506 + (i % 6) * 36}" y="${44 + Math.floor(i / 6) * 32}" width="30" height="24" rx="4"/>`).join("")}
  <text class="lbl acc r db" x="718" y="29">disk</text>
  <path class="edge trip" d="M358 150 L488 150" stroke-dasharray="2 7"/>
  <text class="lbl" x="423" y="112">walk · sign out</text><text class="lbl" x="423" y="130">walk back</text><text class="mono" x="423" y="168">15 min</text>
  <text class="lbl acc db" x="423" y="88">reading a page</text>
  <rect class="zone" x="26" y="192" width="708" height="140" rx="12"/><text class="cap" x="42" y="211">WHERE THE TIME GOES</text>
  ${job("Job A", "overhaul one engine", A, 238, 1)}${job("Job B", "20 inspections, 20 tools", B, 292, 2)}
  <g class="st" data-from="3"><rect class="chip" x="26" y="346" width="344" height="40" rx="20"/><text class="acc" x="198" y="367">work-bound → less work, or more hands</text>
    <rect class="chip h" x="390" y="346" width="344" height="40" rx="20"/><text class="hot" x="562" y="367">wait-bound → fewer trips, or a bigger cart</text></g>
  <text class="big acc db" x="198" y="404">CPU-bound</text><text class="big hot db" x="562" y="404">I/O-bound</text></svg>`;

export default { render: build({ stepper, key: "hg", label: "Work or wait", css: CSS, steps, scene }) };
