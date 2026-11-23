// table — how every widget draws a database table and a schema, in SVG, so they look the same
// everywhere. Pure functions returning SVG markup; TABLE_CSS(k) is the look, scoped to a widget's key.
//
//   table(x, y, cols, rows, { cap, pad, w, rowH })   a table as its rows: a title, a header band, rows
//   schema(nodes, links)                             tables as cards, an arrow from each table to
//                                                    the table it references; a card may show its row count

// 13px monospace is 0.6em a character.
export const CW = 7.8;
const PAD = 20;

// A value: a plain value, or [value, class] — "chg" tints the cell in the accent (what this step
// changed), "rep" in the warm colour (a value that repeats).
const val = (c) => (Array.isArray(c) ? { v: String(c[0]), k: c[1] } : { v: String(c), k: "" });

// The width of each column: its longest value or its name, whichever is wider.
export const widths = (cols, data, pad = PAD) =>
  cols.map((c, i) => Math.ceil(Math.max(c.length, ...data.map((r) => val(r[i]).v.length)) * CW) + pad);
export const tableWidth = (cols, data, w = widths(cols, data)) => w.reduce((a, b) => a + b, 0);
export const tableHeight = (data, rowH = 26) => 34 + data.length * rowH + 6;

// The small glyph that says "a table".
const icon = (x, y) => `<path class="tb-icon" d="M${x} ${y} h13 v11 h-13 z M${x} ${y + 4} h13 M${x + 5} ${y + 4} v7"/>`;

// The title above a table: its name in monospace and, after " — ", a few plain words.
function title(x, y, cap) {
  const [name, ...rest] = cap.split(" — ");
  return `${icon(x + 1, y - 22)}<text class="tb-title" x="${x + 21}" y="${y - 16}">${name}${
    rest.length ? `<tspan class="tb-sub" dx="10">${rest.join(" — ")}</tspan>` : ""}</text>`;
}

export function table(x, y, cols, data, { cap = "", pad = PAD, w = widths(cols, data, pad), rowH = 26, cls = "" } = {}) {
  const total = tableWidth(cols, data, w), h = tableHeight(data, rowH), r = 10;
  const xs = w.map((_, i) => x + w.slice(0, i).reduce((a, b) => a + b, 0));
  const cells = data.map((row, j) => row.map((c, i) => {
    const { v, k } = val(c), cy = y + 34 + j * rowH + rowH / 2 + 1;
    return `${k ? `<rect class="hl ${k}" x="${xs[i] + 3}" y="${cy - rowH / 2 + 3}" width="${w[i] - 6}" height="${rowH - 6}" rx="5"/>` : ""}<text class="mono l ${k}" x="${xs[i] + pad / 2}" y="${cy}">${v}</text>`;
  }).join("")).join("");
  const rules = data.slice(1).map((_, j) => `<path class="tb-rule" d="M${x + 8} ${y + 34 + (j + 1) * rowH} h${total - 16}"/>`).join("");
  return `<g class="tb ${cls}">${cap ? title(x, y, cap) : ""}
    <rect class="tb-card" x="${x}" y="${y}" width="${total}" height="${h}" rx="${r}"/>
    <path class="tb-head" d="M${x} ${y + 32} v${r - 32} a${r} ${r} 0 0 1 ${r} ${-r} h${total - 2 * r} a${r} ${r} 0 0 1 ${r} ${r} v${32 - r} z"/>
    ${cols.map((c, i) => `<text class="mono l tb-col" x="${xs[i] + pad / 2}" y="${y + 17}">${c}</text>`).join("")}
    ${rules}${cells}</g>`;
}

// A schema: tables as cards placed by their centre, and an arrow from each table to the table it
// references (the foreign key's direction). nodes: [[name, cx, cy, cls, rows]] — cls "fact" draws the
// table in the accent, "now" outlines it as this step's, "off" fades it; rows (a number or a string,
// optional) is printed at the card's right end as the table's row count. links: [[from, to]] by index.
const count = (rows) => (rows === undefined || rows === "" ? "" : typeof rows === "number" ? rows.toLocaleString("en-US") : String(rows));
const nodeW = (name, rows = "") => Math.max(118, Math.ceil(name.length * 8.4) + 52) + (rows ? Math.ceil(rows.length * 7.2) + 14 : 0);
// Where the line from a box's centre towards (tx, ty) leaves the box.
function edge(cx, cy, w, h, tx, ty, gap) {
  const dx = tx - cx, dy = ty - cy, s = Math.min(Math.abs((w / 2 + gap) / (dx || 1e-9)), Math.abs((h / 2 + gap) / (dy || 1e-9)));
  return [cx + dx * s, cy + dy * s];
}
export function schema(nodes, links = [], { h = 38 } = {}) {
  const box = nodes.map(([name, cx, cy, cls = "", rows]) => ({ name, cx, cy, cls, rows: count(rows), w: nodeW(name, count(rows)) }));
  const arrows = links.map(([a, b]) => {
    const A = box[a], B = box[b];
    const [x1, y1] = edge(A.cx, A.cy, A.w, h, B.cx, B.cy, 3), [x2, y2] = edge(B.cx, B.cy, B.w, h, A.cx, A.cy, 5);
    const ang = Math.atan2(y2 - y1, x2 - x1), wing = (d) => `${x2 - 9 * Math.cos(ang + d)} ${y2 - 9 * Math.sin(ang + d)}`;
    return `<path class="sc-link" d="M${x1} ${y1} L${x2} ${y2} M${wing(0.5)} L${x2} ${y2} L${wing(-0.5)}"/>`;
  }).join("");
  const cards = box.map(({ name, cx, cy, cls, rows, w }) => `<g class="sc-node ${cls}"><rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="10"/>
    ${icon(cx - w / 2 + 13, cy - 6)}<text class="mono l" x="${cx - w / 2 + 34}" y="${cy + 1}">${name}</text>${
    rows ? `<text class="sc-rows" x="${cx + w / 2 - 12}" y="${cy + 1}">${rows}</text>` : ""}</g>`).join("");
  return `<g class="sc">${arrows}${cards}</g>`;
}

export const TABLE_CSS = (k) => `
.lw .${k} .sc text { font:400 13px ui-monospace, SFMono-Regular, Menlo, monospace; fill:var(--ink); text-anchor:start; dominant-baseline:middle; }
.lw .${k} .sc text.sc-rows { font-size:12px; fill:var(--mute); text-anchor:end; }
.lw .${k} .sc-node.off { opacity:.4; }
.lw .${k} .tb-card { fill:var(--panel); stroke:var(--line); stroke-width:1; filter:drop-shadow(0 3px 8px rgba(0,0,0,.28)); }
.lw .${k} .tb-head { fill:var(--cell); }
.lw .${k} .tb-rule { stroke:var(--line); stroke-width:1; opacity:.6; }
.lw .${k} .tb-icon { fill:none; stroke:var(--accent); stroke-width:1.5; stroke-linejoin:round; }
.lw .${k} text.tb-title { font:650 14px ui-monospace, SFMono-Regular, Menlo, monospace; fill:var(--ink); text-anchor:start; }
.lw .${k} .tb-sub { font:500 13px system-ui, sans-serif; fill:var(--mute); }
.lw .${k} text.tb-col { fill:var(--mute); font-weight:600; }
.lw .${k} .hl { stroke-width:1.5; transition:fill .5s, stroke .5s; }
.lw .${k} .hl.chg { fill:var(--accent-bg); stroke:var(--accent); }
.lw .${k} .hl.rep { fill:var(--hot-bg); stroke:var(--hot); }
.lw .${k} text.chg { fill:var(--accent); font-weight:700; }
.lw .${k} text.rep { fill:var(--hot); font-weight:700; }
.lw .${k} .sc-node rect { fill:var(--panel); stroke:var(--line); stroke-width:1.5; filter:drop-shadow(0 2px 6px rgba(0,0,0,.25)); }
.lw .${k} .sc-node.fact rect { fill:var(--accent-bg); stroke:var(--accent); }
.lw .${k} .sc-node.fact text { fill:var(--accent); font-weight:700; }
.lw .${k} .sc-node.now rect { stroke:var(--accent); }
.lw .${k} .sc-link { fill:none; stroke:var(--mute); stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
`;
