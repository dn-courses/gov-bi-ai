// ag2-plan — lesson 28, second scene: a plan and a critique, each one ordinary call with no tools
// whose reply is held to a response schema (Pydantic), so the code around the loop can read it.
//
// RECORDED 2026-11-23 in the agents lab, gemini-3.5-flash-lite, with the page's Plan and Critique
// schemas and the setup cell's agent:
//  - PLAN: the same plan in 5 of 5 runs (15:22 UTC). PLANNED: what those 5 runs answered (all three
//    parts; Music alone, Drama's equal 152 hidden; CHICAGO NORTH alone) — summarised, not verbatim.
//  - CRITIQUE: two of the five critique runs (15:25–15:26 UTC), flaws and final answers verbatim
//    (the final answer of the first is cut after the list of films). Over all five critique runs:
//    a flaw found in 4; final answers with both ties 3; 10–11 model calls instead of 5; once no flaw
//    listed for three LIMIT 1 queries.
import { esc, staged } from "./ag4-lib.js";

const PLAN = { parts: ["Which category has the most films", "which store has more customers", "what is the longest film"] };
const PLANNED = [["Music (152 films)", "Drama also has 152: hidden"], ["Store 1 (326 customers)", "right"], ["CHICAGO NORTH (185 minutes)", "9 more films are 185: hidden"]];
const CAUGHT = {
  flaws: ["The first SQL query for category count had a LIMIT 1, which hid the tie for the category with the most films."],
  answer: "1. Category with the most films: There is a tie between Music and Drama, each having 152 films. 2. Store with more customers: Store 1 has more customers (326 customers, compared to Store 2's 273). 3. Longest film(s): There are 10 films tied for the maximum length of 185 minutes: CHICAGO NORTH, CONTROL ANTHEM, DARN FORRESTER, GANGS PRIDE, HOME PITY, MUSCLE BRIGHT, POND SEATTLE, …",
  calls: 11,
};
const MISSED = { sql: "… ORDER BY film_count DESC LIMIT 1;  … ORDER BY customer_count DESC LIMIT 1;  … ORDER BY length DESC NULLS LAST LIMIT 1;", flaws: [], calls: 5 };

const steps = [
  { stop: "Plan", title: "The plan is a list your code can read",
    note: `One call, no tools, <code>response_schema=Plan</code>: the reply parses into <code>parts: list[str]</code>. It was the same list in 5 of 5 runs. Nothing has run yet; the list could be shown, edited or approved first.` },
  { stop: "Execute", title: "The loop works through the checklist",
    note: `Every part was answered in 5 of 5 runs, with fewer calls than before. And every run hid both ties: the checklist made the model surer, not more careful.` },
  { stop: "Critique", title: "A critique your code can act on", decisive: true,
    note: `<code>response_schema=Critique</code> parses into <code>flaws: list[str]</code>. A non-empty list goes back into the loop; an empty one ends the run. In 5 runs it found a flaw in 4, and 3 final answers reported both ties, at 10–11 model calls instead of 5. Left: a flaw caught and fixed. Right: three <code>LIMIT 1</code> queries and an empty list.` },
];

const CSS = `
.lw .pl .json { font:15px/1.6 ui-monospace, Menlo, monospace; padding:12px 14px; border-radius:10px; background:var(--code); white-space:pre-wrap; }
.lw .pl .json b { color:var(--accent); font-weight:600; }
.lw .pl .chk { display:grid; gap:8px; }
.lw .pl .item { display:grid; grid-template-columns:30px minmax(0,1fr) minmax(0,auto); gap:10px; align-items:center; padding:9px 12px; border-radius:10px; background:var(--cell); font-size:15px; animation:lw-in .35s both; }
.lw .pl .item i { font-style:normal; width:26px; height:26px; border-radius:50%; display:grid; place-items:center; background:var(--ok); color:var(--accent-ink); font:600 13px ui-monospace, Menlo, monospace; }
.lw .pl .item em { font-style:normal; font-size:13.5px; } .lw .pl .item em.hid { color:var(--hot); font-weight:600; } .lw .pl .item em.ok { color:var(--ok); }
.lw .pl .flaw { padding:9px 12px; border-radius:10px; background:var(--hot-bg); color:var(--hot); font-size:14.5px; }
.lw .pl .none { padding:9px 12px; border-radius:10px; background:var(--cell); color:var(--mute); font:14px ui-monospace, Menlo, monospace; }
.lw .pl .ans { margin-top:10px; font-size:14.5px; line-height:1.5; }
`;

const json = (obj) => esc(JSON.stringify(obj, null, 2)).replace(/&quot;|"/g, '"').replace(/"(parts|flaws)"/g, '"<b>$1</b>"');

const scene = () => `
  <div class="cols" data-on="0">
    <div class="zone"><p class="cap">class Plan(BaseModel)</p><pre>parts: list[str]</pre><p class="dim" style="margin:10px 0 0;font-size:14px">no tools attached · response_mime_type="application/json"</p></div>
    <div class="zone"><p class="cap">reply.parsed</p><div class="json">${json(PLAN)}</div></div></div>
  <div class="zone" data-on="1"><p class="cap">the checklist, as the five planned runs answered it</p><div class="chk">
    ${PLANNED.map(([a, verdict], i) => `<div class="item"><i>${i + 1}</i><span>${PLAN.parts[i]}: <b>${a}</b></span><em class="${verdict === "right" ? "ok" : "hid"}">${verdict}</em></div>`).join("")}</div></div>
  <div class="cols" data-on="2">
    <div class="zone"><p class="cap">critique found a flaw · ${CAUGHT.calls} calls</p>${CAUGHT.flaws.map((f) => `<div class="flaw">${esc(f)}</div>`).join("")}
      <p class="ans">${esc(CAUGHT.answer)}</p></div>
    <div class="zone"><p class="cap">critique found none · ${MISSED.calls} calls</p><pre>${esc(MISSED.sql)}</pre>
      <div class="none" style="margin-top:10px">flaws: []</div><p class="ans">Longest film: <b>CHICAGO NORTH</b> (185 minutes)</p></div></div>`;

export default staged({ key: "pl", label: "A plan and a critique, held to a shape", css: CSS, steps, scene });
