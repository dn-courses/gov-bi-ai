// col-lib — what the later columnar-mpp widgets share: the scene shell and a few SVG pieces, so each
// widget file is only its steps, its captured numbers and its drawing. Not a widget itself.
import { fmt, scene as build } from "@widget-lib/scene.js";
import { stepper } from "@widget-lib/stepper.js";

export { fmt };

// A widget: `export default widget({ key, label, css, steps, scene, captured })`.
export const widget = (spec) => ({ render: build({ stepper, ...spec }) });

// Shown only on the steps listed ("0 2"), or from a step on.
export const on = (steps, inner) => `<g class="st" data-on="${steps}">${inner}</g>`;
export const from = (step, inner) => `<g class="st" data-from="${step}">${inner}</g>`;

export const t = (x, y, text, cls = "") => `<text class="${cls}" x="${x}" y="${y}">${text}</text>`;

export const zone = (x, y, w, h, cap = "") =>
  `<rect class="zone" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/>${cap ? t(x + 16, y + 19, cap, "cap") : ""}`;

export const pill = (x, y, w, h, label, cls = "", tcls = "") =>
  `<rect class="pill ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>${label ? t(x + w / 2, y + h / 2 + 1, label, tcls) : ""}`;

export const box = (x, y, w, h, label = "", cls = "", tcls = "") =>
  `<rect class="box ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>${label ? t(x + w / 2, y + h / 2 + 1, label, tcls) : ""}`;

export const bar = (x, y, w, cls = "", h = 16) =>
  `<rect class="bar ${cls}" x="${x}" y="${y}" width="${Math.max(2, w)}" height="${h}" rx="3"/>`;

// A straight edge with a small open head at its end.
export function arrow(x1, y1, x2, y2, cls = "on") {
  const a = Math.atan2(y2 - y1, x2 - x1), s = 8;
  const head = (d) => `${x2 - s * Math.cos(a + d)} ${y2 - s * Math.sin(a + d)}`;
  return `<path class="edge ${cls}" d="M${x1} ${y1} L${x2} ${y2} M${head(0.6)} L${x2} ${y2} L${head(-0.6)}"/>`;
}

// Shared additions to the scene look, scoped to a widget's key.
export const extra = (k) => `
.lw .${k} text.huge { font:700 26px ui-monospace, Menlo, monospace; }
.lw .${k} text.h { font:600 16px system-ui, sans-serif; }
.lw .${k} .pill.warm { fill:var(--hot-bg); stroke:var(--hot); }
.lw .${k} .pill.ok { fill:var(--ok-bg); stroke:var(--ok); }
.lw .${k} .box.ok { fill:var(--ok-bg); stroke:var(--ok); }
.lw .${k} .bar.ok { fill:var(--ok); }
.lw .${k} .bar.ghost { fill:var(--mute); opacity:.25; }
.lw .${k} .edge.hot { stroke:var(--hot); stroke-width:2.5; }
.lw .${k} .edge.dash { stroke-dasharray:5 6; }
`;

// The lab table's 127 daily partitions (2026-07-13 … 2026-11-16) as a grid of tiles, 32 to a row,
// inside a zone 732 wide. `cls(i)` names the classes of day i; SEP1 is the tile of 2026-09-01.
export const DAYS = 127, SEP1 = 50, SEP30 = 79;
export const dayTiles = (cls = () => "") => Array.from({ length: DAYS }, (_, i) =>
  `<rect class="box day ${cls(i)}" x="${30 + (i % 32) * 22}" y="${44 + Math.floor(i / 32) * 24}" width="18" height="18" rx="3"/>`).join("");
