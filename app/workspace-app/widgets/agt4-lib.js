// agt4-lib — what the two tool-design widgets share: the toolsets that were measured, drawn as the
// model reads them, and a run of the six-question sheet drawn as calls per question. Data in agt4-data.js.
import { esc, fmt, zone } from "./ag1-lib.js";
import { QUESTIONS, SETS } from "./agt4-data.js";

export const CSS = `
.lw .ag1 .sigs { display:grid; gap:6px; }
.lw .ag1 .sig { font:14px ui-monospace, Menlo, monospace; padding:6px 10px; border-radius:8px; background:var(--cell); border-left:4px solid var(--line); overflow-wrap:anywhere; }
.lw .ag1 .sig.hot { border-left-color:var(--hot); } .lw .ag1 .sig.ok { border-left-color:var(--ok); } .lw .ag1 .sig.off { opacity:.45; text-decoration:line-through; }
.lw .ag1 .sig .why { display:block; margin-top:2px; font:13px system-ui, sans-serif; color:var(--mute); }
.lw .ag1 table.t { width:100%; border-collapse:collapse; font-size:14px; }
.lw .ag1 table.t td, .lw .ag1 table.t th { padding:7px 9px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
.lw .ag1 table.t tr:last-child td { border-bottom:none; }
.lw .ag1 table.t th { font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .ag1 table.t .n { text-align:right; font-family:ui-monospace, Menlo, monospace; white-space:nowrap; }
.lw .ag1 table.t tr.mk td { background:var(--accent-bg); }
.lw .ag1 .dots { display:flex; flex-wrap:wrap; gap:3px; }
.lw .ag1 .dot { display:inline-block; padding:1px 7px; border-radius:6px; font:12px ui-monospace, Menlo, monospace; background:var(--panel); border:1px solid var(--line); }
.lw .ag1 .dot.miss { border-color:var(--hot); color:var(--hot); }
.lw .ag1 .score { font:700 26px/1 ui-monospace, Menlo, monospace; }
`;

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const spread = (xs) => (Math.min(...xs) === Math.max(...xs) ? `${xs[0]}` : `${Math.min(...xs)} to ${Math.max(...xs)}`);

// The three runs of one toolset in one line: score, model calls, tool calls, tokens.
export function totals(key) {
  const t = SETS[key].totals;
  return { score: spread(t.map((r) => r.score)), model: Math.round(avg(t.map((r) => r.model))),
    tools: Math.round(avg(t.map((r) => r.tools))), tokens: Math.round(avg(t.map((r) => r.tokens))),
    errors: t.reduce((a, r) => a + r.errors, 0), seconds: avg(t.map((r) => r.seconds)).toFixed(1) };
}

// The toolset as signatures; sig: [text, cls, why].
export const sigs = (list) => `<div class="sigs">${list.map(([text, cls, why]) => `<div class="sig ${cls ?? ""}">${esc(text)}${why ? `<span class="why">${esc(why)}</span>` : ""}</div>`).join("")}</div>`;

// One recorded sheet run: per question, pass or fail, the tool names it called in order, model calls.
const shortName = (call) => call.split("(")[0];
const row = (q, i, r) => `<tr class="${r.pass ? "" : "mk"}"><td>Q${i + 1} ${esc(q)}</td>
  <td><span class="pill ${r.pass ? "ok" : "hot"}">${r.pass ? "pass" : "fail"}</span></td>
  <td><div class="dots">${r.calls.map((c) => `<span class="dot" title="${esc(c)}">${esc(shortName(c))}</span>`).join("") || '<span class="dim">no tool</span>'}</div></td>
  <td class="n">${r.model}</td></tr>`;

export const sheet = (key) => `<table class="t"><thead><tr><th>question</th><th></th><th>tools it called, in order</th><th class="n">model calls</th></tr></thead>
  <tbody>${SETS[key].first.map((r, i) => row(QUESTIONS[i], i, r)).join("")}</tbody></table>`;

// The score and cost of a toolset over its three runs.
export const summary = (key) => {
  const t = totals(key);
  return `<div class="chips"><span class="chip">score <b>${t.score}</b> / ${QUESTIONS.length}</span><span class="chip">${t.model} model calls</span>
    <span class="chip">${t.tools} tool calls</span><span class="chip">${fmt(t.tokens)} tokens</span><span class="chip">${t.seconds} s</span></div>`;
};

export const panel = (title, key, tools) => `<div class="cols" style="--cols:minmax(0,.8fr) minmax(0,1.5fr)">
  ${zone(title, sigs(tools))}
  ${zone("one run of the sheet", `${sheet(key)}<p class="small" style="margin-top:10px">${summary(key)}</p>`)}</div>`;

export { QUESTIONS, SETS };
