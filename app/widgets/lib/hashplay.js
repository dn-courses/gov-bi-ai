// hashplay — what the hash join widgets share: a toy hash table of four buckets (the bucket is the
// remainder of dividing the customer number by 4, so customers 1 and 5 share one), and the two
// temporary files a hash join writes when the table does not fit in memory.
import { CUSTOMERS, ORDERS } from "./joinplay.js";

export const BUCKETS = 4, hash = (id) => id % BUCKETS;
export const SLOT = (b) => `.bucket[data-b="${b}"]`, ENTRY = (b, n) => `${SLOT(b)} span:nth-of-type(${n + 1})`;
export const FILE = (f) => `.file[data-f="${f}"]`, FILED = (f, n) => `${FILE(f)} span:nth-of-type(${n + 1})`;
export const empty = () => Array.from({ length: BUCKETS }, () => []);
export const put = (slots, b, r) => slots.map((rows, i) => (i === b ? [...rows, r] : rows));

export const CSS = (k) => `
.lw .${k} .hline { font:600 15px ui-monospace, Menlo, monospace; text-align:center; min-height:22px; margin-bottom:10px; color:var(--accent); }
.lw .${k} .buckets { display:grid; gap:6px; }
.lw .${k} .bucket, .lw .${k} .file { display:flex; align-items:center; flex-wrap:wrap; gap:6px; min-height:40px; padding:5px 8px; border-radius:9px; border:1.5px dashed var(--line); transition:border-color .25s, background .25s; }
.lw .${k} .bucket.on { border-color:var(--accent); border-style:solid; background:var(--accent-bg); }
.lw .${k} .bucket b { font:600 12px ui-monospace, Menlo, monospace; color:var(--mute); width:16px; }
.lw .${k} .bucket span, .lw .${k} .file span { padding:4px 9px; border-radius:7px; background:var(--cell); border:1.5px solid transparent; font:13px ui-monospace, Menlo, monospace; white-space:nowrap; }
.lw .${k} .bucket span.hit { background:var(--ok-bg); border-color:var(--ok); color:var(--ok); }
.lw .${k} .bucket span.miss { background:var(--hot-bg); border-color:var(--hot); color:var(--hot); }
.lw .${k} .files { display:grid; gap:6px; margin-top:14px; }
.lw .${k} .file { border-color:var(--hot); } .lw .${k} .file.on { border-style:solid; background:var(--hot-bg); }
.lw .${k} .file b { flex:1 1 100%; font:600 11px system-ui, sans-serif; letter-spacing:.06em; text-transform:uppercase; color:var(--hot); }
.lw .${k} .file span.gone { opacity:.35; text-decoration:line-through; }
`;
// The hash table: `slots[b]` lists the customers in bucket b; one bucket and one entry may be lit.
export function table(slots, { line = "", on = -1, entry = -1, tone = "", fresh = false } = {}) {
  return `<div class="hline">${line}</div><div class="buckets">${slots.map((rows, b) => `<div class="bucket ${b === on ? "on" : ""}" data-b="${b}"><b>${b}</b>${
    rows.map((r, n) => `<span class="${b === on && n === entry ? tone : ""} ${fresh && b === on && n === rows.length - 1 ? "new" : ""}">customer ${CUSTOMERS[r][0]}</span>`).join("")}</div>`).join("")}</div>`;
}
// The temporary files: customer rows and order rows set aside for the second batch.
// `read` is how many of each have been read back; `on` lights one file; `fresh` marks its last row as just written.
export function files({ customers = [], orders = [], readC = 0, readO = 0, on = "", fresh = false } = {}) {
  const row = (text, n, read, last) => `<span class="${n < read ? "gone" : ""} ${last ? "new" : ""}">${text}</span>`;
  return `<div class="files"><div class="file ${on === "c" ? "on" : ""}" data-f="c"><b>temporary file · customers of batch 2</b>${customers.map((r, n) => row(`customer ${CUSTOMERS[r][0]}`, n, readC, fresh && on === "c" && n === customers.length - 1)).join("")}</div>
    <div class="file ${on === "o" ? "on" : ""}" data-f="o"><b>temporary file · orders of batch 2</b>${orders.map((l, n) => row(`order ${ORDERS[l][0]}`, n, readO, fresh && on === "o" && n === orders.length - 1)).join("")}</div></div>`;
}
