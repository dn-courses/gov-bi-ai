// agc-shrink — three moves that keep the list small, each drawn on the list itself and measured on
// the recorded run of the SQL agent: a marker in place of an old result, a digest at the door (the
// rows go to the person, the model gets their shape), and compaction of a finished question. Then
// the digest's catch, and all three in one live run.
import { esc, fmt, widget, zone } from "./ag1-lib.js";
import { CSS, key, reqBar, reqBars, src, strip } from "./agc-lib.js";

// RECORDED 2026-11-23 with gemini-3.5-flash-lite (scratch rec20.py, the page's cells end to end).
// The replays re-count the recorded list with count_tokens after each move, request by request;
// "live" is a new run of the agent with all three moves and the one-sentence rule.
const MODEL = "gemini-3.5-flash-lite";
const TOTAL = { sent: 6554, marker: 5067, digest: 4548, compact: 4751, all: 2286 };
const LIVE = { input: 2588, out: 311, sentOut: 2442, again: "list_tables, describe_table(rental)" };
const LAST = { sent: 3081, marker: 2619, digest: 1075, compact: 2480 }; // request 7, the largest
const WROTE = "| 16049 | 2006-02-14 21:06:03+00 | 3537 | 14 | 2006-02-22 01:23:03+00 | 1 | 2006-02-15 21:30:53+00 |";
const HOLDS = "| 16049 | 2022-08-23 21:50:12+00 | 2666 | 393 | 2022-08-30 00:01:12+00 | 2 | 2022-02-16 02:30:53+00 |";

// The recorded list as a strip: [label, tokens-or-sub, tone, grow].
const LIST = {
  sent: [["head", "117", "base", 2], ["Q1", "", "said", 1], ["4 tables", "338", "res", 3], ["rows", "59", "res", 1], ["A1", "", "said", 1],
    ["Q2", "", "said", 1], ["rental", "121", "res", 1.5], ["20 rows", "2,075", "res", 8], ["A2", "", "said", 1]],
  marker: [["head", "117", "base", 2], ["Q1", "", "said", 1], ["marker", "", "res gone", 1], ["marker", "", "res gone", 1], ["A1", "", "said", 1],
    ["Q2", "", "said", 1], ["marker", "", "res gone", 1], ["20 rows", "2,075", "res", 8], ["A2", "", "said", 1]],
  digest: [["head", "117", "base", 2], ["Q1", "", "said", 1], ["4 tables", "338", "res", 3], ["rows", "59", "res", 1], ["A1", "", "said", 1],
    ["Q2", "", "said", 1], ["rental", "121", "res", 1.5], ["shape", "≈ 70", "ok", 1.2], ["A2", "", "said", 1]],
  compact: [["head", "117", "base", 2], ["Q1", "", "said", 1], ["A1", "", "said", 1],
    ["Q2", "", "said", 1], ["rental", "121", "res", 1.5], ["20 rows", "2,075", "res", 8], ["A2", "", "said", 1]],
};

const steps = [
  { stop: "Three moves", title: "Three places to make the list smaller",
    note: `The list is yours, and you may change it before any request. A result can be cut <b>at the door</b>, before it joins the list. It can be replaced by <b>a marker</b> once the model has read it. And a finished question can be <b>compacted</b> to its question and answer.` },
  { stop: "A marker", title: "A marker: the call stays, the old result's body goes",
    note: `Every result but the newest becomes one line: <code>[read earlier: N characters, dropped]</code>. The model still sees that it asked and what it asked. Replayed on the recorded run: <b>${fmt(TOTAL.sent)} → ${fmt(TOTAL.marker)}</b> input tokens.` },
  { stop: "At the door", title: "A digest at the door: the rows go to the person, the model gets their shape",
    note: `<code>run_sql</code> puts the rows on the person's screen and returns their columns and their count. The 2,075-token result becomes about 70. Replayed: <b>${fmt(TOTAL.sent)} → ${fmt(TOTAL.digest)}</b>.` },
  { stop: "The catch", title: "Given no rows, the model wrote twenty of its own",
    note: `Asked for the rows and handed only their shape, the model typed a table anyway, from its memory of the Sakila sample, with 2006 dates. Pagila's rentals are from 2022. A digest changes what the model can know, so the prompt must change with it: one sentence, <i>answer in one sentence and never write rows yourself</i>.` },
  { stop: "Compact", title: "Compaction: a finished question keeps its question and answer",
    note: `When question 1 is answered, its calls and results leave the list. Replayed: <b>${fmt(TOTAL.sent)} → ${fmt(TOTAL.compact)}</b>. What the agent learned about the tables leaves with them.` },
  { stop: "All three", title: "All three, in one live run", decisive: true,
    note: `The same two questions: <b>${fmt(LIVE.input)}</b> input tokens instead of ${fmt(TOTAL.sent)}, and ${fmt(LIVE.out)} output instead of ${fmt(LIVE.sentOut)}. The price of compaction is visible in the run: for question 2 it called ${LIVE.again} again.` },
];

const move = (name, text, tone) => `<div class="move ${tone}"><b>${name}</b><p>${text}</p></div>`;
const before = (which) => zone("The recorded list, first token on the left", strip(LIST.sent)
  + (which ? `<p class="cap" style="margin-top:14px">after the move</p>${strip(LIST[which])}` : "")
  + key([["", "head: system prompt, tools, question"], ["said", "questions and answers"], ["res", "tool results"], ...(which === "digest" ? [["ok", "a digest"]] : [])]));
const totals = (rows, max = TOTAL.sent) => reqBars(rows.map(([label, v, tone]) => reqBar(label, [[v, tone]], max)));
const measured = (which, label) => zone("Input tokens over the 7 requests", totals([["as sent", TOTAL.sent, "base"], [label, TOTAL[which], "ok"]])
  + `<p class="small" style="margin-top:10px">request 7 alone: ${fmt(LAST.sent)} → <b>${fmt(LAST[which])}</b></p>`);

// The two rows cell by cell: a cell the model wrote that the database does not hold is lit.
const cells = (row) => row.split("|").map((c) => c.trim()).filter(Boolean);
const COLS = ["rental_id", "rental_date", "inventory_id", "customer_id", "return_date", "staff_id", "last_update"];
function diff() {
  const wrote = cells(WROTE), holds = cells(HOLDS);
  const line = (label, row, tone) => `<tr class="${tone}"><th>${label}</th>${row.map((c, i) => `<td class="${wrote[i] === holds[i] ? "same" : tone}">${esc(c).replace(" ", "<br>")}</td>`).join("")}</tr>`;
  return `<div class="dwrap"><table class="diff"><tr><th></th>${COLS.map((c) => `<th>${c}</th>`).join("")}</tr>${
    line("the model wrote", wrote, "hot")}${line("the database holds", holds, "ok")}</table></div>`;
}

function catchView() {
  return `<div style="display:grid;gap:14px">${zone("Rental 16049, as the model wrote it and as Pagila holds it", diff(), "hot")}
    ${zone("With one sentence added to the system prompt, it answered", `<p class="said1">The 20 most recent rentals are now displayed on your screen.</p>`, "ok")}</div>`;
}

function allView() {
  return `<div class="cols">${zone("Every move, input tokens", totals([["as sent", TOTAL.sent, "base"], ["a marker", TOTAL.marker, "said"],
    ["the digest", TOTAL.digest, "said"], ["compaction", TOTAL.compact, "said"], ["all three", TOTAL.all, "ok"], ["all three, live", LIVE.input, "ok"]]))}
    ${zone("Output tokens", totals([["as sent", LIVE.sentOut, "res"], ["all three, live", LIVE.out, "ok"]], LIVE.sentOut)
      + `<p class="small" style="margin-top:10px">the rows went to the screen, not through the model</p>`)}</div>`;
}

function view(step, at) {
  const s = src(`recorded 2026-11-23 with ${MODEL}; replays re-count the recorded list, “live” is a new run`);
  if (at === 0) return before() + `<div class="cols" style="--cols:1fr 1fr 1fr">${move("At the door", "The tool returns less: a digest, a count, a preview. The rest goes elsewhere.", "ok")}${
    move("A marker", "A result already read is replaced by one line that says what was there.", "said")}${move("Compact", "A finished question shrinks to its question and its answer.", "said")}</div>`;
  if (at === 3) return catchView() + s;
  if (at === 5) return allView() + s;
  const which = { 1: "marker", 2: "digest", 4: "compact" }[at];
  return `<div style="display:grid;gap:16px">${before(which)}${measured(which, { marker: "with markers", digest: "with the digest", compact: "compacted" }[which])}</div>` + s;
}

const css = CSS + `
.lw .ag1 .move { padding:12px 14px; border-radius:12px; border:1.5px solid var(--line); background:var(--panel); }
.lw .ag1 .move b { font-size:16px; } .lw .ag1 .move p { margin-top:6px; font-size:14px; color:var(--mute); }
.lw .ag1 .move.ok { border-color:var(--ok); } .lw .ag1 .move.said { border-color:var(--accent); }
.lw .ag1 .dwrap { overflow-x:auto; }
.lw .ag1 table.diff { border-collapse:separate; border-spacing:4px; font:13px ui-monospace, Menlo, monospace; }
.lw .ag1 table.diff th { text-align:left; font:600 12px system-ui, sans-serif; color:var(--mute); padding:2px 6px; white-space:nowrap; }
.lw .ag1 table.diff td { padding:7px 9px; border-radius:6px; background:var(--cell); white-space:nowrap; line-height:1.35; animation:lw-in .4s both; }
.lw .ag1 table.diff td.hot { background:var(--hot-bg); color:var(--hot); font-weight:600; }
.lw .ag1 table.diff td.ok { background:var(--ok-bg); color:var(--ok); }
.lw .ag1 table.diff tr.hot th:first-child { color:var(--hot); } .lw .ag1 table.diff tr.ok th:first-child { color:var(--ok); }
.lw .ag1 .said1 { font-size:17px; padding:10px 14px; border-radius:10px; background:var(--ok-bg); border-left:4px solid var(--ok); }
.lw .ag1 .move { animation:lw-in .4s both; } .lw .ag1 .move:nth-child(2) { animation-delay:.1s; } .lw .ag1 .move:nth-child(3) { animation-delay:.2s; }
`;

export default widget({ label: "Keeping the list small", css, steps, view });
