// heap — what the row-version widgets share: a toy table file of small pages whose places hold row
// versions (live, dead or free), the rule for where an update's new version goes, and the picture.
// A file is a list of pages; a page is HOLDS places; a place is null (free) or { k, v, s }:
// the row's key, its value, and "live" | "dead".
export const HOLDS = 4;
export const row = (k, v) => ({ k, v, s: "live" });
export const clone = (file) => file.map((page) => page.map((c) => (c ? { ...c } : null)));
export const count = (file, s) => file.flat().filter((c) => c?.s === s).length;
export const at = (p, n) => `${p},${n}`;
export const addr = (p, n) => `(${p},${n + 1})`;

export function find(file, k) {
  for (let p = 0; p < file.length; p += 1) for (let n = 0; n < HOLDS; n += 1) if (file[p][n]?.k === k && file[p][n].s === "live") return [p, n];
  return null;
}
// Where a new version goes: the row's own page if it has a free place, else the first page that has
// one, else a new page at the end of the file (the file is extended in place).
export function room(file, from) {
  const free = (p) => { const n = file[p].indexOf(null); return n < 0 ? null : [p, n]; };
  const found = free(from) ?? file.map((_, p) => free(p)).find(Boolean);
  if (found) return found;
  file.push(Array(HOLDS).fill(null));
  return [file.length - 1, 0];
}
// One update: { before, written, after, from, to, same, grew } — `written` has both versions live.
export function update(before, k, change) {
  const written = clone(before), from = find(written, k), to = room(written, from[0]);
  written[to[0]][to[1]] = row(k, change(written[from[0]][from[1]].v));
  const after = clone(written);
  after[from[0]][from[1]].s = "dead";
  return { before, written, after, from, to, same: from[0] === to[0], grew: written.length > before.length };
}

export const HEAP_CSS = (k) => `
.lw .${k} .file { display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; }
.lw .${k} .page { padding:10px; border-radius:11px; border:1.5px solid var(--line); display:grid; gap:6px; transition:border-color .25s, background .25s, opacity .4s; }
.lw .${k} .page.absent { display:none; }
.lw .${k} .page.now { border-color:var(--accent); background:var(--accent-bg); }
.lw .${k} .page.full { border-color:var(--hot); }
.lw .${k} .page.locked { border-style:dashed; border-color:var(--hot); opacity:.75; }
.lw .${k} .page > b { font:600 11px system-ui, sans-serif; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); }
.lw .${k} .slot { display:flex; gap:10px; padding:6px 9px; min-height:33px; border-radius:8px; border:1.5px dashed var(--line); font:13px ui-monospace, Menlo, monospace; white-space:nowrap;
      transition:background .25s, border-color .25s, color .25s, opacity .25s; }
.lw .${k} .slot em { font-style:normal; color:var(--mute); }
.lw .${k} .slot.live { background:var(--cell); border:1.5px solid transparent; } .lw .${k} .slot.live em { color:var(--accent); }
.lw .${k} .slot.dead { background:var(--hot-bg); border:1.5px solid transparent; color:var(--hot); } .lw .${k} .slot.dead span { text-decoration:line-through; }
.lw .${k} .slot.dead em { color:var(--hot); }
.lw .${k} .slot.passed { opacity:.4; }
.lw .${k} .slot.now { border-color:var(--accent); background:var(--accent-bg); color:var(--accent); opacity:1; }
.lw .${k} .slot.hit { border-color:var(--ok); background:var(--ok-bg); color:var(--ok); opacity:1; } .lw .${k} .slot.hit em { color:var(--ok); }
.lw .${k} .slot.miss { border-color:var(--hot); opacity:1; }
.lw .${k}.moving .slot.hit, .lw .${k}.moving .page.fresh { animation:${k}-in .5s .3s backwards; }
@keyframes ${k}-in { from { opacity:0; transform:scale(.85); } }
.lw .${k} .others { margin-left:auto; padding:5px 14px; border-radius:999px; font:600 13px system-ui, sans-serif; background:var(--ok-bg); color:var(--ok); }
.lw .${k} .others.wait { background:var(--hot-bg); color:var(--hot); }
.lw .${k} .others:empty { display:none; }
.lw .${k} .card.gone { display:none; }
`;

// A file's picture: `pages` pages drawn, each with its places. `label(c)` prints a version.
export const fileHtml = (cls, title, pages, addresses = true) => `<div class="card ${cls}"><h4>${title}<span class="others"></span></h4>
  <div class="file">${Array.from({ length: pages }, (_, p) => `<div class="page" data-p="${p}"><b>page ${p}</b>${Array.from({ length: HOLDS }, (_, n) =>
    `<div class="slot" data-a="${at(p, n)}">${addresses ? `<em>${addr(p, n)}</em>` : ""}<span></span></div>`).join("")}</div>`).join("")}</div></div>`;

// Paint a file into its picture. mark: { "p,n": "now" | "hit" | "miss" | "passed" }; pmark: { p: "now" | "full" | "locked" | "fresh" }.
export function paintFile(box, file, label, mark = {}, pmark = {}) {
  box.querySelectorAll(".page").forEach((el) => {
    const p = Number(el.dataset.p);
    el.className = "page" + (p >= file.length ? " absent" : "") + (pmark[p] ? ` ${pmark[p]}` : "") + (pmark.all ? ` ${pmark.all}` : "");
  });
  box.querySelectorAll(".slot").forEach((el) => {
    const [p, n] = el.dataset.a.split(",").map(Number), c = file[p]?.[n];
    el.className = "slot " + (c ? c.s : "free") + (mark[el.dataset.a] ? ` ${mark[el.dataset.a]}` : "");
    el.querySelector("span").textContent = c ? label(c) : "";
  });
}
