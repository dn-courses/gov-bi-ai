// cost-lib — what cost-meter and cost-levers share: a query drawn as its SQL text, readable on a
// projector (13px monospace), one <text> per line with its indentation kept. Not a widget itself.
export const CH = 7.8, LH = 18; // a 13px monospace character's width; a line's height

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The look of the code, scoped to a widget's key.
export const sqlCss = (k) => `
.lw .${k} text.sql { font:400 13px ui-monospace, SFMono-Regular, Menlo, monospace; fill:var(--ink); text-anchor:start; }
.lw .${k} text.sql.add { fill:var(--accent); font-weight:700; }
.lw .${k} .code { fill:var(--cell); stroke:var(--line); stroke-width:1; }
`;

// `text` is the query, a line per line; the lines whose indexes are in `added` are drawn in the accent.
export const sql = (x, y, text, added = []) => text.split("\n").map((line, i) => {
  const pad = line.length - line.trimStart().length, cls = added.includes(i) ? "sql add" : "sql";
  return `<text class="${cls}" x="${x + pad * CH}" y="${y + i * LH}">${esc(line.trimStart())}</text>`;
}).join("");
