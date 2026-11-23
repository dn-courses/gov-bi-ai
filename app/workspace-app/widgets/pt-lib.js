// pt-lib — what the Partitioning page's widgets share: one look (captions, code chips, metered bars,
// big numbers), a Play button that runs a scene once, and the 90 day folders drawn as a calendar.
// Not a widget itself.
import { t } from "./col-lib.js";

// The look shared by the five widgets, scoped to a widget's key.
export const ptCss = (k) => `
.lw .${k} text.cap { font:650 12px system-ui, sans-serif; letter-spacing:.08em; }
.lw .${k} text.kpi { font:700 26px ui-monospace, Menlo, monospace; }
.lw .${k} .code { fill:var(--cell); stroke:var(--line); stroke-width:1; }
.lw .${k} .code.acc { fill:var(--accent-bg); stroke:var(--accent); }
.lw .${k} .code.hot { fill:var(--hot-bg); stroke:var(--hot); }
.lw .${k} .track { fill:var(--line); opacity:.45; }
.lw .${k} .card { fill:var(--cell); stroke:var(--line); stroke-width:1; }
.lw .${k} .card.acc { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .${k} .card.hot { fill:var(--hot-bg); stroke:var(--hot); stroke-width:1.5; }
.lw .${k} .st.on .grow { animation:ptgrow .8s cubic-bezier(.2,.7,.2,1) both; transform-box:fill-box; transform-origin:left center; }
@keyframes ptgrow { from { transform:scaleX(0); } }
.lw .${k} .st.on .res:not(.show) .grow { animation:none; }
.lw .${k} .res { opacity:0; transition:opacity .5s; }
.lw .${k} .res.show { opacity:1; }
.lw .${k} .dy { transition:opacity .35s; }
.lw .${k} .dy rect { fill:var(--cell); stroke:var(--line); stroke-width:1; transition:fill .35s, stroke .35s; }
.lw .${k} .dy text { font:500 12px ui-monospace, Menlo, monospace; fill:var(--mute); transition:fill .35s; }
.lw .${k} .dy.x { opacity:.2; }
.lw .${k} .dy.d rect { fill:var(--accent-bg); stroke:var(--accent); stroke-width:2; }
.lw .${k} .dy.d text { fill:var(--accent); font-weight:700; }
.lw .${k} .dy.o rect { fill:var(--hot-bg); stroke:var(--hot); }
.lw .${k} .dy.o text { fill:var(--hot); }
`;

// A line of code on a chip, sized to its text (13px mono ≈ 7.8 px a character).
export const code = (x, y, text, tone = "") =>
  `<rect class="code ${tone}" x="${x}" y="${y - 14}" width="${Math.round(text.length * 7.8 + 24)}" height="28" rx="7"/>${t(x + 12, y, text, `mono l ${tone}`)}`;

// A labelled bar on a faint track: the track is the scale, the bar grows in when its step shows.
export const meter = ({ x, y, w, full, label = "", value, cls = "on", tone = "acc", lx = 30 }) =>
  (label ? t(lx, y + 8, label, `l ${tone}`) : "")
  + `<rect class="track" x="${x}" y="${y}" width="${full}" height="16" rx="8"/>`
  + `<rect class="bar grow ${cls}" x="${x}" y="${y}" width="${Math.max(4, w)}" height="16" rx="8"/>`
  + t(x + full + 14, y + 9, value, `big l ${tone}`);

// A big number with a short label under it.
export const stat = (x, y, value, label, tone = "", anchor = "l") =>
  t(x, y, value, `kpi ${anchor} ${tone}`) + t(x, y + 26, label, `lbl ${anchor}`);

// The 90 day folders of partitioning_by_day (2026-07-01 … 2026-09-28) as three month calendars,
// seven days to a row. Day i is a group `.dy` with data-i="i"; `cls(i)` adds its classes.
export const MONTHS = [["JULY", 31], ["AUGUST", 31], ["SEPTEMBER", 28]];
export const AUG1 = 31;
export function calendar({ x = 30, y, w = 28, h = 22, gap = 4, cls = () => "" }) {
  let i = 0;
  return MONTHS.map(([name, n], m) => {
    const x0 = x + m * (7 * (w + gap) + 16);
    const days = Array.from({ length: n }, (_, d) => {
      const dx = x0 + (d % 7) * (w + gap), dy = y + 18 + Math.floor(d / 7) * (h + gap);
      const g = `<g class="dy ${cls(i)}" data-i="${i}"><rect x="${dx}" y="${dy}" width="${w}" height="${h}" rx="5"/>${t(dx + w / 2, dy + h / 2 + 1, d + 1)}</g>`;
      i += 1;
      return g;
    }).join("");
    return t(x0, y + 4, `${name} 2026`, "cap") + days;
  }).join("");
}

// The Play button: drawn inside a step, clickable only on the visible step.
export const playCss = (k) => `
.lw .${k} .play { cursor:pointer; }
.lw .${k} .st.on .play { pointer-events:auto; }
.lw .${k} .play rect { fill:var(--accent); stroke:none; filter:drop-shadow(0 2px 6px rgba(0,0,0,.3)); transition:opacity .3s; }
.lw .${k} .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .${k} .play:hover rect { opacity:.85; }
.lw .${k} .play.busy { opacity:.45; pointer-events:none; }
`;

export const playButton = (x, y, cls = "") =>
  `<g class="play ${cls}"><rect x="${x}" y="${y}" width="96" height="32" rx="16"/><text x="${x + 48}" y="${y + 17}">▶ Play</text></g>`;

// Run `beats` ([delay ms, action] pairs) once; a new run or a step change cancels the old one.
export function run(root, beats, button) {
  stop(root);
  button?.classList.add("busy");
  let at = 0;
  root._timers = beats.map(([gap, act]) => { at += gap; return setTimeout(act, at); });
  root._timers.push(setTimeout(() => button?.classList.remove("busy"), at + 50));
}

export function stop(root) {
  (root._timers ?? []).forEach(clearTimeout);
  root._timers = [];
  root.querySelectorAll(".play.busy").forEach((b) => b.classList.remove("busy"));
}

// Bind each Play button once: `plays` maps a step number to its run(root).
export function bind(root, plays) {
  if (root.dataset.bound) return;
  root.dataset.bound = "1";
  root.querySelectorAll(".play").forEach((b) => b.addEventListener("click", () => {
    const step = Number(root.dataset.at);
    if (b.closest(".st")?.classList.contains("on")) plays[step]?.(root, b);
  }));
}
