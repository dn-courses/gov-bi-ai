// cc-lib — shared by the cloud-concepts widgets: the common pieces, and the "who operates what"
// matrix two of them draw. Not a widget itself.
export * from "./ramp-lib.js";
import { on, t } from "./ramp-lib.js";

// A responsibility matrix: one row per layer, one column per way of running it. `mine[c][r]` says
// whether the customer operates layer r in column c. Column c appears from step c on and is the
// lit one on its own step; `foot(x, y)` draws under the grid.
export function matrix({ rows, cols, mine, labelW = 196, top = 46, rowH = 32, gap = 6, right = 736 }) {
  const colW = (right - 24 - labelW - 10 * cols.length) / cols.length;
  const x = (c) => 24 + labelW + 10 + c * (colW + 10), y = (r) => top + r * (rowH + gap);
  const labels = rows.map((row, r) => t(24 + labelW, y(r) + rowH / 2 + 1, row, "r lbl row")).join("");
  const columns = cols.map((col, c) => `<g class="st col" data-from="${c}" data-col="${c}">
    ${t(x(c) + colW / 2, top - 18, col, "h")}
    ${rows.map((_, r) => `<rect class="box ${mine[c][r] ? "you" : "them"}" x="${x(c)}" y="${y(r)}" width="${colW}" height="${rowH}" rx="7"/>
      ${t(x(c) + colW / 2, y(r) + rowH / 2 + 1, mine[c][r] ? "you" : "provider", mine[c][r] ? "acc" : "dim")}`).join("")}</g>`).join("");
  return { svg: labels + columns, x, y, colW, bottom: y(rows.length) };
}

// The matrix's own look: the column of the current step is full strength, earlier ones recede.
export const MATRIX_CSS = (k, steps) => `
.lw .${k} .box.you { fill:var(--accent-bg); stroke:var(--accent); }
.lw .${k} .box.them { fill:var(--panel); stroke:var(--line); stroke-dasharray:3 4; }
.lw .${k} .col { transition:opacity .5s; }
${Array.from({ length: steps }, (_, at) => `.lw .${k}[data-at="${at}"] .col.on:not([data-col="${at}"]) { opacity:.45 !important; }`).join("\n")}
`;

export const legend = (x, y) => `<rect class="box you" x="${x}" y="${y}" width="22" height="16" rx="4"/>${t(x + 30, y + 9, "you operate it", "l lbl")}
  <rect class="box them" x="${x + 150}" y="${y}" width="22" height="16" rx="4"/>${t(x + 180, y + 9, "the provider operates it", "l lbl")}`;

