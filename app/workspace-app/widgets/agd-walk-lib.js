// agd-walk-lib — one question of the end-to-end walkthrough, in two steps: the SQL the agent wrote
// (its path through the tools above it, its query lit), then that query beside the one written by
// hand, an equals sign between them, with both results. The run shown and the count over all runs
// come from agd-recorded.json.
import { REC, chatOf, dots, esc, runs, sql, trace, verdict, widget, zone } from "./agd-lib.js";

// The agent's last run_sql of a run, and what came back.
const lastQuery = (name) => {
  const e = REC[name], rows = e.runs[e.shown].chat.filter((m) => m.role === "tool" && m.name === "run_sql");
  return rows.at(-1);
};
const resultRows = (row) => { try { return JSON.parse(row.result).rows; } catch { return []; } };
const grid = (cols, rows) => `<table class="res"><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${
  rows.map((r, i) => `<tr class="${i === 0 ? "top" : ""}">${r.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const pair = (left, right) => `<div class="cols pair" style="--cols:minmax(0,1fr) auto minmax(0,1fr)">${left}<span class="eq">=</span>${right}</div>`;

// walk({ name, label, titles, notes, right(run), mark, hand: { sql, cols, rows }, answer, verdict })
export function walk(w) {
  const q = lastQuery(w.name), got = resultRows(q), cols = JSON.parse(q.result).columns ?? [];
  const steps = [
    { stop: "The agent", title: w.titles[0], note: w.notes[0] },
    { stop: "By hand", title: w.titles[1], note: w.notes[1], decisive: true },
  ];
  const tally = zone(`${REC[w.name].runs.length} runs of the same question`, runs(dots(w.name, w.right, w.answer)));
  const view = (step, at) => at === 0
    ? `<div class="cols" style="--cols:minmax(0,.9fr) minmax(0,1.1fr)">${chatOf(w.name)}<div class="side">${
      zone("1 · its path through the tools", trace(w.name))}${zone("2 · the SQL it wrote", sql(q.args.query, { good: w.mark }), "on")}${tally}</div></div>`
    : pair(zone("the agent's SQL", sql(q.args.query, { good: w.mark }) + grid(cols, got.slice(0, 5)), "on"),
      zone("written by hand", sql(w.hand.sql, { good: w.mark }) + grid(w.hand.cols, w.hand.rows), "ok")) + zone("", verdict(true, w.answer, w.verdict), "okz");
  const css = `.lw .agd table.res { width:100%; border-collapse:collapse; margin-top:12px; font:14px ui-monospace, Menlo, monospace; }
    .lw .agd table.res th { text-align:left; color:var(--mute); font-weight:600; padding:3px 12px 5px 0; font-size:12px; }
    .lw .agd table.res td { padding:5px 12px 5px 0; border-top:1px solid var(--line); }
    .lw .agd table.res tr.top td { color:var(--ok); font-weight:600; }
    .lw .agd .pair { align-items:stretch; }
    .lw .agd .eq { align-self:center; display:grid; place-items:center; width:40px; height:40px; border-radius:50%; background:var(--ok-bg); color:var(--ok); font:700 22px ui-monospace, Menlo, monospace; }
    @container (max-width: 820px) { .lw .agd .eq { justify-self:center; } }`;
  return widget({ label: w.label, css, steps, view });
}
