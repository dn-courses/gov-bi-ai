// ag7-lib — what the "from proof of concept to production" widgets share: the quiet SVG look of
// ramp-lib, plus one idea of their own. An element marked data-lit="2 3" is drawn in the accent on
// those steps and goes neutral after them, so the current step's part stands out and the rest of
// the picture stays in place. Not a widget itself: it has no default export.
export * from "./ramp-lib.js";
import { CSS as BASE, widget as base } from "./ramp-lib.js";

// A group that is lit (accent) on the listed steps, and neutral on the others.
export const lit = (steps, inner, cls = "") => `<g class="lt ${cls}" data-lit="${steps}">${inner}</g>`;

function light(root, at) {
  root.querySelectorAll("[data-lit]").forEach((node) => {
    node.classList.toggle("lit", node.dataset.lit.split(" ").map(Number).includes(at));
  });
}

// A widget whose lit groups follow the step.
export const widget = (options) => base({ ...options, after: (root, at) => { light(root, at); options.after?.(root, at); } });

export const CSS = (k) => BASE(k) + `
.lw .${k} text.cap { font-size:12px; }
.lw .${k} text.tag { font:600 13px system-ui, sans-serif; fill:var(--mute); transition:fill .5s; }
.lw .${k} text.tag.l { text-anchor:start; }
.lw .${k} .lit .box, .lw .${k} .lit .pill { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .${k} .lit .edge { stroke:var(--accent); stroke-width:2.5; }
.lw .${k} .lit text.h, .lw .${k} .lit text.tag, .lw .${k} .lit text.mono { fill:var(--accent); }
.lw .${k} .box.warm + text, .lw .${k} .pill.warm + text { fill:var(--hot); }
.lw .${k} .pill.ok + text { fill:var(--ok); }
.lw .${k} .wall { fill:var(--cell); stroke:var(--line); stroke-width:1; }
`;
