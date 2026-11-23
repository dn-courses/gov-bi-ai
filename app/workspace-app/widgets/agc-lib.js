// agc-lib — what the "seeing why it chose" and "context and cost" widgets share, on top of ag1-lib's
// HTML scenes: requests drawn as stacked bars to one scale, a prompt drawn as a strip of blocks
// (first token on the left), a legend, a one-line run listing, and the line that names a recording.
// Colours are the shell's variables only. Nothing here holds lesson data.
import { esc, fmt } from "./ag1-lib.js";

export const CSS = `
.lw .ag1 .rq { display:grid; gap:8px; }
.lw .ag1 .rq .r { display:grid; grid-template-columns:136px minmax(0,1fr) 78px; gap:14px; align-items:center; font-size:14px; transition:opacity .4s; }
.lw .ag1 .rq.noted .r { grid-template-columns:88px minmax(0,1fr) 60px minmax(0,272px); }
.lw .ag1 .rq .r.dim { opacity:.35; }
.lw .ag1 .rq .r > span:first-child { color:var(--mute); font-family:ui-monospace, Menlo, monospace; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lw .ag1 .rq .track { display:flex; gap:2px; height:22px; border-radius:6px; background:var(--cell); overflow:hidden; }
.lw .ag1 .rq .seg { height:100%; min-width:3px; border-radius:4px; background:var(--mute); animation:ag1-grow .55s both; transform-origin:left; }
.lw .ag1 .rq .seg.base { background:var(--mute); } .lw .ag1 .rq .seg.res { background:var(--hot); } .lw .ag1 .rq .seg.said { background:var(--accent); }
.lw .ag1 .rq .seg.ok { background:var(--ok); } .lw .ag1 .rq .seg.ghost { background:transparent; border:1.5px dashed var(--line); }
.lw .ag1 .rq .val { font:600 15px ui-monospace, Menlo, monospace; text-align:right; font-variant-numeric:tabular-nums; }
.lw .ag1 .rq .note { font:13px ui-monospace, Menlo, monospace; color:var(--mute); overflow-wrap:anywhere; }
.lw .ag1 .rq .r.on .note { color:var(--accent); font-weight:600; } .lw .ag1 .rq .r.on > span:first-child { color:var(--ink); font-weight:600; }
@container (max-width: 720px) { .lw .ag1 .rq.noted .r { grid-template-columns:84px minmax(0,1fr) 60px; } .lw .ag1 .rq.noted .note { grid-column:2 / -1; margin-top:-6px; } }
.lw .ag1 .key { display:flex; flex-wrap:wrap; gap:6px 20px; margin-top:12px; font-size:13px; color:var(--mute); }
.lw .ag1 .key i { display:inline-block; width:12px; height:12px; border-radius:3px; margin-right:7px; vertical-align:-1px; background:var(--mute); }
.lw .ag1 .key i.res { background:var(--hot); } .lw .ag1 .key i.said { background:var(--accent); } .lw .ag1 .key i.ok { background:var(--ok); }
.lw .ag1 .strip { display:flex; gap:4px; align-items:stretch; overflow-x:auto; padding-bottom:2px; }
.lw .ag1 .blk { flex-basis:0; min-width:fit-content; padding:9px 9px; border-radius:8px; background:var(--cell); border:1.5px solid var(--line); text-align:center;
  font-size:13px; font-weight:600; white-space:nowrap; animation:lw-in .4s both; }
.lw .ag1 .blk small { display:block; font:500 12px ui-monospace, Menlo, monospace; opacity:.85; margin-top:2px; }
.lw .ag1 .blk.base { background:var(--panel); } .lw .ag1 .blk.res { background:var(--hot-bg); border-color:var(--hot); color:var(--hot); }
.lw .ag1 .blk.said { background:var(--accent-bg); border-color:var(--accent); color:var(--accent); }
.lw .ag1 .blk.ok { background:var(--ok-bg); border-color:var(--ok); color:var(--ok); }
.lw .ag1 .blk.gone { opacity:.45; border-style:dashed; background:transparent; }
.lw .ag1 .runl { display:grid; gap:3px; font:13.5px/1.45 ui-monospace, Menlo, monospace; }
.lw .ag1 .runl > div { display:grid; grid-template-columns:26px 62px minmax(0,1fr); gap:8px; padding:5px 10px; border-radius:7px; border-left:3px solid transparent; animation:lw-in .4s both; }
.lw .ag1 .runl > div > span { overflow-wrap:anywhere; }
.lw .ag1 .runl .k { color:var(--mute); }
.lw .ag1 .runl .on { background:var(--accent-bg); border-left-color:var(--accent); }
.lw .ag1 .runl .bad { background:var(--hot-bg); border-left-color:var(--hot); }
.lw .ag1 .runl .good { background:var(--ok-bg); border-left-color:var(--ok); }
.lw .ag1 .runl .same > span { color:var(--mute); }
.lw .ag1 .src { margin:2px 0 0 4px; font-size:12.5px; color:var(--mute); }
.lw .ag1 .src::before { content:"●"; font-size:12px; margin-right:7px; color:var(--line); }
.lw .ag1 .stat { display:grid; gap:3px; } .lw .ag1 .stat b { font:700 30px/1.1 ui-monospace, Menlo, monospace; font-variant-numeric:tabular-nums; }
.lw .ag1 .stat span { font-size:13px; color:var(--mute); line-height:1.4; }
`;

// One request bar: segs [[tokens, tone]], drawn against `max`; `text` defaults to the sum; `note`
// adds a fourth column (the bars then go in reqBars(rows, true)).
export const reqBar = (label, segs, max, { text, cls = "", note } = {}) => `<div class="r ${cls}"><span>${label}</span><span class="track">${
  segs.filter(([v]) => v > 0).map(([v, tone]) => `<span class="seg ${tone}" style="width:${(100 * v) / max}%"></span>`).join("")}</span><span class="val">${
  text ?? fmt(segs.reduce((a, [v]) => a + v, 0))}</span>${note === undefined ? "" : `<span class="note">${note}</span>`}</div>`;
export const reqBars = (rows, noted = false) => `<div class="rq ${noted ? "noted" : ""}">${rows.join("")}</div>`;

export const key = (items) => `<div class="key">${items.map(([tone, text]) => `<span><i class="${tone}"></i>${text}</span>`).join("")}</div>`;

// A prompt as a strip of blocks: [label, sub, tone, grow]. The first token is on the left.
export const strip = (blocks) => `<div class="strip">${blocks.map(([label, sub, tone = "", grow = 1]) =>
  `<div class="blk ${tone}" style="flex-grow:${grow}">${label}${sub ? `<small>${sub}</small>` : ""}</div>`).join("")}</div>`;

// A run, one line per message part: [index, kind, text, state] with state "", "on", "bad", "good" or "same".
export const runList = (lines) => `<div class="runl">${lines.map(([i, kind, text, state = ""], n) =>
  `<div class="${state}" style="animation-delay:${n * 0.05}s"><span class="k">${i}</span><span class="k">${kind}</span><span>${esc(text)}</span></div>`).join("")}</div>`;

export const src = (text) => `<p class="src">${text}</p>`;
export const stat = (value, label, cls = "") => `<div class="stat"><b class="${cls}">${value}</b><span>${label}</span></div>`;
