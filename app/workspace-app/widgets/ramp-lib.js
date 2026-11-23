// ramp-lib — what the seminar's opening widgets (ramp-, cc-, dw-) share: the SVG pieces of one quiet
// look, on top of the shared scene shell. Not a widget itself: it has no default export.
import { scene as build } from "@widget-lib/scene.js";
import { stepper } from "@widget-lib/stepper.js";

// A widget is its steps, its drawing and its captured facts; the shell does the rest.
export const widget = (options) => ({ render: build({ stepper, ...options }) });

// Shown only on the listed steps ("0 2 3"), or from a step on.
export const on = (steps, inner, cls = "") => `<g class="st ${cls}" data-on="${steps}">${inner}</g>`;
export const from = (step, inner, cls = "") => `<g class="st ${cls}" data-from="${step}">${inner}</g>`;

export const t = (x, y, text, cls = "") => `<text class="${cls}" x="${x}" y="${y}">${text}</text>`;
export const zone = (x, y, w, h, caption = "") =>
  `<rect class="zone" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/>${caption ? t(x + 16, y + 19, caption, "cap") : ""}`;
export const box = (x, y, w, h, cls = "") => `<rect class="box ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>`;
export const pill = (x, y, w, h, cls = "") => `<rect class="pill ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>`;

// A box or pill with its label centred in it.
export const node = (x, y, w, h, label, cls = "", textCls = "") =>
  `${box(x, y, w, h, cls)}${t(x + w / 2, y + h / 2 + 1, label, textCls)}`;
export const chip = (x, y, w, h, label, cls = "", textCls = "") =>
  `${pill(x, y, w, h, cls)}${t(x + w / 2, y + h / 2 + 1, label, textCls)}`;

// A straight edge with one small head at its end.
export function arrow(x1, y1, x2, y2, cls = "on") {
  const a = Math.atan2(y2 - y1, x2 - x1), s = 8;
  const wing = (d) => `${x2 - s * Math.cos(a + d)} ${y2 - s * Math.sin(a + d)}`;
  return `<path class="edge ${cls}" d="M${x1} ${y1} L${x2} ${y2} M${wing(0.55)} L${x2} ${y2} L${wing(-0.55)}"/>`;
}
export const line = (x1, y1, x2, y2, cls = "") => `<path class="edge ${cls}" d="M${x1} ${y1} L${x2} ${y2}"/>`;

export const svg = (w, h, inner) => `<svg viewBox="0 0 ${w} ${h}">${inner}</svg>`;

// What every widget here adds to the shared look: bigger key numbers, a terminal, entrance motion.
export const CSS = (k) => `
.lw .${k} text.huge { font:700 30px ui-monospace, Menlo, monospace; }
.lw .${k} text.num { font:700 20px ui-monospace, Menlo, monospace; }
.lw .${k} text.h { font:650 16px system-ui, sans-serif; }
.lw .${k} text.mid { text-anchor:middle; }
.lw .${k} text.code { font:13px ui-monospace, SFMono-Regular, Menlo, monospace; font-weight:400; text-anchor:start; white-space:pre; }
.lw .${k} .st { transform:translateY(6px); transition:opacity .55s, transform .55s; }
.lw .${k} .st.on { transform:none; }
.lw .${k} .box.you { fill:var(--accent-bg); stroke:var(--accent); }
.lw .${k} .box.them { fill:var(--cell); stroke:var(--line); }
.lw .${k} .box.ok { fill:var(--ok-bg); stroke:var(--ok); }
.lw .${k} .pill.ok { fill:var(--ok-bg); stroke:var(--ok); }
.lw .${k} .pill.warm { fill:var(--hot-bg); stroke:var(--hot); }
.lw .${k} .edge.hot { stroke:var(--hot); stroke-width:2.5; }
.lw .${k} .edge.dash { stroke-dasharray:5 6; }
.lw .${k} .term { fill:var(--code); stroke:var(--line); stroke-width:1; }
`;
