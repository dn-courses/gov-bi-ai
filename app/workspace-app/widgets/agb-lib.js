// agb-lib — what the widgets of "Tools the model can use" and "Answers code can use" share. Built on
// ag1-lib's look (zones, tool definitions, the sequence diagram, the chat widget), with three
// additions: a widget shell with an `after` hook (for Play buttons and games), a horizontal bar
// chart drawn from a chart spec and its rows, and a few marks of its own. Not a widget: it has no
// default export a page should name.
import { CSS as AG1, code, esc, fmt, json, sequence, tooldef, zone } from "./ag1-lib.js";
import { conversation, wireChat } from "@widget-lib/chat.js";
import { stepper } from "@widget-lib/stepper.js";

export { code, esc, fmt, json, sequence, tooldef, zone };

// Every model reply drawn by these widgets was recorded with this model, on the date beside its data.
export const MODEL = "gemini-3.5-flash-lite";
export const talk = (messages, options = {}) => conversation(messages, { model: MODEL, recorded: true, ...options });

const CSS = `
.lw .agb { gap:16px; }
.lw .agb .q { display:flex; gap:14px; align-items:baseline; padding:11px 18px; border-radius:12px; background:var(--accent-bg); border:1.5px solid var(--accent); font-size:18px; font-weight:500; }
.lw .agb .q i { font-style:normal; font:650 12px system-ui, sans-serif; letter-spacing:.1em; text-transform:uppercase; color:var(--accent); flex:none; }
.lw .agb .rec { font-size:13px; color:var(--mute); margin-top:10px; }
.lw .agb mark { background:var(--accent-bg); color:var(--accent); font-weight:600; border-radius:4px; padding:0 3px; }
.lw .agb mark.hot { background:var(--hot-bg); color:var(--hot); } .lw .agb mark.ok { background:var(--ok-bg); color:var(--ok); }
.lw .agb .cap b { overflow-wrap:anywhere; }
.lw .agb .runs { display:grid; gap:6px; }
.lw .agb .run { display:grid; grid-template-columns:64px minmax(0, 1fr); gap:12px; align-items:baseline; padding:8px 12px; border-radius:9px; background:var(--cell); border-left:3px solid var(--line); font:14px/1.5 ui-monospace, Menlo, monospace; overflow-wrap:anywhere; animation:lw-in .35s both; }
.lw .agb .run:nth-child(2) { animation-delay:.08s; } .lw .agb .run:nth-child(3) { animation-delay:.16s; }
.lw .agb .run > i { font:650 12px system-ui, sans-serif; font-style:normal; color:var(--mute); letter-spacing:.07em; text-transform:uppercase; }
.lw .agb .run.hot { background:var(--hot-bg); color:var(--hot); border-left-color:var(--hot); } .lw .agb .run.ok { background:var(--ok-bg); color:var(--ok); border-left-color:var(--ok); }
.lw .agb .verdict { padding:10px 14px; border-radius:10px; background:var(--cell); border-left:4px solid var(--mute); font-size:15px; line-height:1.5; }
.lw .agb .verdict.ok { background:var(--ok-bg); color:var(--ok); border-left-color:var(--ok); } .lw .agb .verdict.hot { background:var(--hot-bg); color:var(--hot); border-left-color:var(--hot); }
.lw .agb table.t { width:100%; border-collapse:collapse; font-size:15px; }
.lw .agb table.t th { text-align:left; font:650 12px system-ui, sans-serif; letter-spacing:.07em; text-transform:uppercase; color:var(--mute); padding:4px 14px 8px 0; }
.lw .agb table.t td { padding:8px 14px 8px 0; border-top:1px solid var(--line); vertical-align:top; }
.lw .agb table.t td.m { font:14px ui-monospace, Menlo, monospace; } .lw .agb table.t td.n { font:14px ui-monospace, Menlo, monospace; text-align:right; }
.lw .agb table.t td.ok { color:var(--ok); } .lw .agb table.t td.hot { color:var(--hot); }
.lw .agb .arrow { align-self:center; justify-self:center; color:var(--accent); font-size:24px; opacity:.8; }
.lw .agb .play { all:unset; cursor:pointer; display:inline-flex; gap:8px; align-items:center; padding:7px 16px; border-radius:999px; background:var(--accent); color:var(--accent-ink); font:650 14px system-ui, sans-serif; pointer-events:auto; }
.lw .agb .play[disabled] { opacity:.45; cursor:default; }
.lw .agb svg.chart { width:100%; height:auto; display:block; }
.lw .agb svg.chart text { font:500 13px system-ui, sans-serif; fill:var(--ink); dominant-baseline:middle; }
.lw .agb svg.chart text.v { font:600 13px ui-monospace, Menlo, monospace; fill:var(--mute); animation:agb-fade .35s .6s both; }
.lw .agb svg.chart text.v.top { fill:var(--ok); }
.lw .agb svg.chart text.ttl { font:650 16px system-ui, sans-serif; }
.lw .agb svg.chart text.ax { font:500 12px system-ui, sans-serif; fill:var(--mute); }
.lw .agb svg.chart rect.b { fill:var(--accent); opacity:.85; transform-origin:left; transform-box:fill-box; animation:agb-grow .65s cubic-bezier(.2,.7,.2,1) both; }
.lw .agb svg.chart rect.b.top { fill:var(--ok); opacity:1; }
.lw .agb svg.chart path.base { stroke:var(--line); stroke-width:1.5; }
@keyframes agb-grow { from { transform:scaleX(0); } to { transform:none; } }
@keyframes agb-fade { from { opacity:0; } to { opacity:1; } }
@media (prefers-reduced-motion: reduce) { .lw .agb svg.chart rect.b, .lw .agb svg.chart text.v, .lw .agb .run { animation:none; } }
`;

// A widget: steps [{ stop, title, note, decisive? }], view(step, at) → the scene's HTML, rebuilt on
// every step; after(root, at) runs once it is in the page (bind a Play button or a game there).
export const widget = ({ label, css = "", steps, view, after }) => ({
  render({ model, el }) {
    const ui = stepper({
      el, model, label, css: AG1 + CSS + css, steps: () => steps,
      draw({ at, body }) {
        body.innerHTML = `<div class="ag1 agb" data-at="${at}">${view(steps[at], at)}</div>`;
        wireChat(body);
        after?.(body.firstElementChild, at);
      },
    });
    ui.show(Number(model?.get?.("start") ?? 0));
    return () => ui.destroy();
  },
});

export const question = (text, label = "the question") => `<div class="q"><i>${label}</i><span>${text}</span></div>`;
export const cols = (parts, template) => `<div class="cols" style="--cols:${template ?? parts.map(() => "minmax(0,1fr)").join(" ")}">${parts.join("")}</div>`;
// A zone caption that names a call: the label in small capitals, the call as code, case kept.
export const callcap = (label, call) => `${label}<b>${esc(call)}</b>`;
// Recorded runs, one row each: [label, text, tone].
export const runs = (rows) => `<div class="runs">${rows.map(([label, text, tone = ""]) => `<div class="run ${tone}"><i>${label}</i><span>${esc(text)}</span></div>`).join("")}</div>`;
export const verdict = (html, tone = "") => `<p class="verdict ${tone}">${html}</p>`;
export const rows = (head, body) => `<table class="t"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${
  body.map((r) => `<tr>${r.map((c) => (Array.isArray(c) ? `<td class="${c[1]}">${c[0]}</td>` : `<td>${c}</td>`)).join("")}</tr>`).join("")}</tbody></table>`;

const money = (v) => (Number.isInteger(v) ? fmt(v) : v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

// A horizontal bar chart, as your code would draw it from a chart spec and the rows its query
// returned. spec: { title, x, y }; data: [[label, value]]. The largest bar is drawn in the ok colour.
// All bars grow together; the values fade in once the bars have reached them.
export function barChart(spec, data, { w = 760, row = 24, left = 130 } = {}) {
  const max = Math.max(...data.map(([, v]) => v)), span = w - left - 100, top = 42, h = top + data.length * row + 28;
  const bars = data.map(([label, v], i) => {
    const y = top + i * row, bw = Math.max(2, (v / max) * span), tone = v === max ? "top" : "";
    return `<text x="${left - 10}" y="${y + row / 2}" text-anchor="end">${esc(label)}</text>
      <rect class="b ${tone}" x="${left}" y="${y + 4}" width="${bw}" height="${row - 8}" rx="4"/>
      <text class="v ${tone}" x="${left + bw + 8}" y="${y + row / 2}">${money(v)}</text>`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}"><text class="ttl" x="${left}" y="16">${esc(spec.title)}</text>
    <path class="base" d="M${left} ${top} L${left} ${top + data.length * row}"/>${bars}
    <text class="ax" x="${left}" y="${h - 10}">${esc(spec.y)} by ${esc(spec.x)}</text></svg>`;
}
