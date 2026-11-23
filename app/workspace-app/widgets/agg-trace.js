// agg-trace — a trace is a table of events. One recorded run of the warehouse agent, read back from
// Phoenix: drawn as the span tree on a clock (what Phoenix's trace view shows), then as the rows it
// is stored as, then grouped like any fact table. Data: agg-trace-data.js.
import { CSS as RAMP, on, t, widget, zone } from "./ramp-lib.js";
import { TABLE_CSS, table } from "@widget-lib/table.js";
import { QUESTION, SPANS } from "./agg-trace-data.js";

const END = SPANS[0][4];
const sum = (kind, i) => SPANS.filter((s) => s[1] === kind).reduce((a, s) => a + (s[i] ?? 0), 0);
const count = (kind) => SPANS.filter((s) => s[1] === kind).length;
const fmt = (n) => n.toLocaleString("en-US");
const bq = SPANS.filter((s) => s[1] === "UNKNOWN");

const steps = () => [
  { stop: "The tree", title: "One question, ten spans on a clock",
    note: `Each span is one thing that happened, with its start, its length and its parent: the run, three model calls, two tools, and inside <code>query_metrics</code> the dry run, the run and the fetch of the rows. The second model call's span stays open while its tool runs.` },
  { stop: "Rows", title: "Stored, a trace is rows", decisive: true,
    note: `Phoenix keeps one row per span: name, kind, parent, start, end, and attributes such as the token counts. Its trace view is a drawing of these rows; its REST API returns them.` },
  { stop: "Grouped", title: "Then it is a table like any other",
    note: `Where did ${(END / 1000).toFixed(1)} seconds go? A <code>GROUP BY</code> on the kind says: BigQuery took ${(bq.reduce((a, s) => a + s[4], 0) / 1000).toFixed(1)} s in three calls, the dry run alone ${(bq[0][4] / 1000).toFixed(1)} s, and the model read ${fmt(sum("LLM", 5))} tokens over ${count("LLM")} calls.` },
];

const CSS2 = `${TABLE_CSS("agr")}
.lw .agr text.cap { font-size:12px; }
.lw .agr .LLM { fill:var(--accent); } .lw .agr .TOOL { fill:var(--ok); }
.lw .agr .UNKNOWN { fill:var(--hot); } .lw .agr .CHAIN, .lw .agr .AGENT { fill:var(--mute); opacity:.75; }
.lw .agr .span { transform-box:fill-box; transform-origin:left center; transition:transform .6s ease; }
.lw .agr .st:not(.on) .span { transform:scaleX(0); }
.lw .agr .tick { stroke:var(--line); stroke-width:1; }
.lw .agr .band { fill:var(--cell); opacity:.45; }
.lw .agr text.sm { font:500 12px system-ui, sans-serif; fill:var(--mute); }
.lw .agr text.tokn { font:600 12px ui-monospace, Menlo, monospace; fill:var(--accent); }
.lw .agr text.tokn.in { fill:var(--accent-ink); }
.lw .agr text.q { font:500 14px system-ui, sans-serif; fill:var(--ink); text-anchor:start; }
.lw .agr text.code { fill:var(--ink); }
`;

const depth = (s) => ({ "": 0, invocation: 1, agent_run: 2, query_metrics: 3 })[s[2]];
const X0 = 306, W = 410, ROW = 26, Y0 = 86;
const sx = (ms) => X0 + (W * ms) / END;

// The token label goes after the bar, or before it when it would run past the panel.
const tokens = (s, y, w) => { if (!s[5]) return "";
  const text = `${fmt(s[5])} in · ${s[6]} out`, after = sx(s[3]) + w + 8;
  if (after + text.length * 7.3 < 728) return t(after, y + 9, text, "tokn l");
  return w > text.length * 7.3 + 16 ? t(sx(s[3]) + 8, y + 9, text, "tokn in l") : t(sx(s[3]) - 8, y + 9, text, "tokn r"); };

const spanRow = (s, i) => { const y = Y0 + i * ROW, w = Math.max(3, sx(s[3] + s[4]) - sx(s[3]));
  return `${i % 2 ? "" : `<rect class="band" x="26" y="${y - 4}" width="708" height="${ROW - 1}" rx="5"/>`}
    ${t(36 + depth(s) * 14, y + 9, s[0], "mono l")}
    <rect class="span ${s[1]}" x="${sx(s[3])}" y="${y + 1}" width="${w}" height="16" rx="4"/>${tokens(s, y, w)}`; };

const LEGEND = [["LLM", "model call"], ["TOOL", "tool"], ["UNKNOWN", "BigQuery"], ["AGENT", "run"]];
const legend = (y) => { let x = 380;
  return LEGEND.map(([k, label]) => { const at = x; x += label.length * 7 + 44; return `<rect class="key ${k}" x="${at}" y="${y - 6}" width="14" height="12" rx="3"/>${t(at + 20, y, label, "sm l")}`; }).join(""); };

const tree = () => { const bottom = Y0 + SPANS.length * ROW;
  return on("0", `${zone(14, 14, 732, 372, "THE TRACE · AS PHOENIX DRAWS IT")}
  ${t(30, 56, QUESTION, "q")}
  ${[0, 1000, 2000, 3000, 4000, 5000].map((ms) => `<path class="tick" d="M${sx(ms)} ${Y0 - 8} L${sx(ms)} ${bottom}"/>${t(sx(ms), bottom + 14, `${ms / 1000} s`, "sm mid")}`).join("")}
  ${SPANS.map(spanRow).join("")}
  ${legend(33)}`); };

const rows = () => on("1", `${zone(14, 14, 732, 372, "PHOENIX · GET /v1/projects/warehouse_agent/spans")}
  ${table(30, 76, ["name", "kind", "parent", "start ms", "ms", "in", "out"],
    SPANS.map((s) => [s[0].replace(" · dry run", "").replace(" · run", ""), s[1], s[2] || "–", fmt(s[3]), fmt(s[4]), s[5] == null ? "" : fmt(s[5]), s[6] ?? ""]), { cap: "spans — one row each", rowH: 26 })}`);

const KINDS = [["CHAIN", "CHAIN"], ["AGENT", "AGENT"], ["LLM", "LLM"], ["TOOL", "TOOL"], ["UNKNOWN", "UNKNOWN · BigQuery"]];
const hl = (v, on) => (on ? [v, "chg"] : v);
const GROUPED = () => KINDS.map(([k, label]) => [hl(label, k === "UNKNOWN" || k === "LLM"), count(k), hl(fmt(sum(k, 4)), k === "UNKNOWN"),
  k === "LLM" ? hl(fmt(sum(k, 5)), true) : "", k === "LLM" ? fmt(sum(k, 6)) : ""]);

const grouped = () => on("2", `${zone(14, 14, 732, 372, "THE SAME ROWS, GROUPED")}
  <rect class="term" x="30" y="48" width="700" height="80" rx="10"/>
  ${["SELECT span_kind, count(*), sum(ms), sum(tokens_in), sum(tokens_out)", "FROM spans WHERE trace_id = 'a594d694…'", "GROUP BY span_kind;"]
    .map((l, i) => t(46, 68 + i * 22, l, "code")).join("")}
  ${table(30, 168, ["span_kind", "spans", "sum of ms", "tokens in", "tokens out"], GROUPED(), { cap: "grouped" })}
  ${t(30, 370, "spans nest, so the sums of parents overlap their children: add up the leaves", "sm l")}`);

const scene = () => `<svg viewBox="0 0 760 400">${tree()}${rows()}${grouped()}</svg>`;

export default widget({ key: "agr", label: "A trace is a table", css: RAMP("agr") + CSS2, steps, scene });
