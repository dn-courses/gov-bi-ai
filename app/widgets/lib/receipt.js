// receipt — what the cost widgets share: the planner's prices, the lines of a receipt and their
// look. Every line carries the colour and the shape of the price it is paid at (colours from the
// Okabe-Ito set, told apart without red against green); its formula unfolds on a click.

export const P = { page: 1, row: 0.01, op: 0.0025 }; // seq_page_cost, cpu_tuple_cost, cpu_operator_cost
export const T = { pages: 100, rows: 10000 }; // products
export const money = (x) => x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const n = (x) => x.toLocaleString("en-US");

export const io = (what, count, price) => ({ kind: "seq", what, sum: `${n(count)} × ${price.toFixed(2)}`, cost: count * price });
export const cpu = (what, count, price, shown) => ({ kind: price === P.row ? "row" : "op", what, sum: shown ?? `${n(count)} × ${price}`, cost: count * price });
export const SCAN = [io("read every page", T.pages, P.page), cpu("per-row work: find it, check it, pass it up", T.rows, P.row)];
export const sum = (lines) => lines.reduce((total, l) => total + l.cost, 0);

// One receipt line, appearing `k` beats after the receipt opens. Its formula is folded under it.
export const line = (l, k = 0, cls = "") => `<div class="ln ${cls} ${l.sum ? "fold" : ""}" style="animation-delay:${k * 0.12}s">
  <span class="what"><i class="k ${l.kind}"></i>${l.what}${l.sum ? "<em>▸</em>" : ""}</span><span class="c">${l.shown ?? money(l.cost)}</span><span class="sum">${l.sum ?? ""}</span></div>`;
export const ALL = `<button class="all" type="button"></button>`; // the "show formulas" link

// The look of lines and markers, scoped to a widget's root class `k`.
export const look = (k) => `
.lw .${k} { --seq:#0072b2; --rand:#56b4e9; --row:#e69f00; --op:#f0e442; --start:#cc79a7; }
.lw .${k} i.k { font-style:normal; display:inline-block; width:11px; height:11px; margin-right:9px; box-shadow:0 0 0 1px var(--ink); vertical-align:-1px; }
.lw .${k} .seq { background:var(--seq); } .lw .${k} .rand { background:var(--rand); } .lw .${k} .row { background:var(--row); } .lw .${k} .op { background:var(--op); }
.lw .${k} .mix { background:var(--mute); } .lw .${k} .start { background:var(--start); }
.lw .${k} i.k.rand { border-radius:3px; } .lw .${k} i.k.row, .lw .${k} i.k.mix { border-radius:50%; } .lw .${k} i.k.op { transform:rotate(45deg) scale(.85); }
.lw .${k} .lines { display:grid; gap:8px; font-size:14px; }
.lw .${k} .ln { display:grid; grid-template-columns:1fr max-content; gap:3px 16px; align-items:baseline; animation: lw-in .35s both; }
.lw .${k} .ln.fold { cursor:pointer; } .lw .${k} .ln.fold:hover .what { color:var(--accent); }
.lw .${k} .ln em { font-style:normal; display:inline-block; margin-left:8px; font-size:11px; color:var(--mute); transition:transform .2s; }
.lw .${k} .ln.open em { transform:rotate(90deg); }
.lw .${k} .ln .sum { grid-column:1 / -1; display:none; padding:2px 0 2px 20px; font:13px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .${k} .ln.open .sum { display:block; }
.lw .${k} .ln .c { font:600 15px ui-monospace, Menlo, monospace; text-align:right; }
.lw .${k} .ln.sub { font-weight:600; }
.lw .${k} .all { all:unset; cursor:pointer; font:12px system-ui, sans-serif; letter-spacing:0; text-transform:none; color:var(--accent); }
.lw .${k} .legend { display:flex; flex-wrap:wrap; gap:4px 16px; margin-top:6px; font-size:12px; color:var(--mute); } .lw .${k} .legend i.k { margin-right:6px; }
`;

// Folding: a click on a line opens its formula; the "show formulas" link opens them all and stays
// as chosen from step to step. Call `bind` once on the widget's root, and `apply` after each redraw.
export function folding() {
  let unfolded = false, root;
  const apply = () => {
    root.querySelectorAll(".ln.fold").forEach((ln) => ln.classList.toggle("open", unfolded || ln.classList.contains("keep")));
    root.querySelectorAll(".all").forEach((all) => { all.textContent = unfolded ? "hide formulas" : "show formulas"; });
  };
  const bind = (el) => {
    if (root === el) return;
    root = el;
    root.addEventListener("click", (e) => {
      if (e.target.closest(".all")) { unfolded = !unfolded; return apply(); }
      e.target.closest(".ln.fold")?.classList.toggle("open");
    });
  };
  return { bind, apply };
}
