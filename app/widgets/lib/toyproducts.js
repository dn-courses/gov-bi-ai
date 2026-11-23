// toyproducts — ten rows of a toy `products` table, shared by the widgets that walk a plan over it.
// [product_id, category_id, price_cents]
export const PRODUCTS = [[1, 5, 300], [2, 3, 520], [3, 7, 990], [4, 7, 450], [5, 9, 410], [6, 3, 870], [7, 7, 150], [8, 7, 580], [9, 3, 220], [10, 5, 760]];
export const price = (cents) => (cents / 100).toFixed(2);
// The words every player prints under its sentence: [[label, value], …].
export const tally = (root, counts) => { root.querySelector(".counts").innerHTML = counts.map(([label, n]) => `<span>${label}<b>${n}</b></span>`).join(""); };
// Chips of one node of a plan, and the shared look of a plan drawn as stacked node cards.
export const NODES = (k) => `
.lw .${k} .node { transition:border-color .25s, background .25s; }
.lw .${k} .node h4 { display:flex; gap:10px; align-items:baseline; margin-bottom:8px; color:var(--ink); font-size:13px; }
.lw .${k} .node h4 small { text-transform:none; letter-spacing:0; font-weight:400; font-size:13px; color:var(--mute); }
.lw .${k} .node.ask { border-style:dashed; border-color:var(--accent); }
.lw .${k} .node.on { border-color:var(--accent); background:var(--accent-bg); }
.lw .${k} .chips { display:flex; flex-wrap:wrap; gap:6px; min-height:30px; align-items:center; }
.lw .${k} .chips i { font-style:normal; font-size:13px; color:var(--mute); }
.lw .${k} .c { padding:5px 10px; border-radius:8px; background:var(--cell); border:1.5px solid transparent; font:13px ui-monospace, Menlo, monospace; white-space:nowrap;
      transition:background .25s, border-color .25s, color .25s, opacity .25s; }
.lw .${k} .c.now { border-color:var(--accent); background:var(--bg); color:var(--accent); }
.lw .${k} .c.ok { border-color:var(--ok); background:var(--ok-bg); color:var(--ok); }
.lw .${k} .c.bad { border-color:var(--hot); background:var(--hot-bg); color:var(--hot); }
.lw .${k} .c.past { opacity:.45; } .lw .${k} .c.cut { opacity:.35; text-decoration:line-through; }
.lw .${k} .flow { text-align:center; font-size:12px; color:var(--mute); margin:-8px 0; }
`;
export const node = (cls, title, role) => `<div class="card node ${cls}"><h4>${title}<small>${role}</small></h4><div class="chips"></div></div>`;
// Fill a node's chips. `items`: [[key, text, classes], …]; a chip that moved slides from where it stood.
export function chips(root, cls, items, empty = "nothing yet", moving = false) {
  const box = root.querySelector(`.${cls} .chips`), was = new Map([...box.querySelectorAll(".c")].map((c) => [c.dataset.c, c.getBoundingClientRect().left]));
  box.innerHTML = items.length ? items.map(([key, text, tone = ""]) => `<span class="c ${tone}" data-c="${key}">${text}</span>`).join("") : `<i>${empty}</i>`;
  if (moving) box.querySelectorAll(".c").forEach((c) => { const from = was.get(c.dataset.c);
    if (from !== undefined && Math.abs(from - c.getBoundingClientRect().left) > 1) c.animate([{ transform: `translateX(${from - c.getBoundingClientRect().left}px)` }, { transform: "none" }], { duration: 700, easing: "ease-in-out" }); });
}
