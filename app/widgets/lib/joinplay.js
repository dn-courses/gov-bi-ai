// joinplay — what the three join widgets share: the two small inputs, a middle work area, the
// joined rows, and a player that walks one algorithm action at a time (Play / Step / Start over).
//
// A widget describes its algorithm as phases, one per stepper step. A phase is a list of states;
// the first is what the step opens on, each next one is one action later. A state is complete:
//   say      the sentence for this action
//   L, R     the row each side is on; tone: "hit" | "miss" colours that pair (toneL / toneR: one side)
//   doneL    Set of finished left rows; markR: { rowIndex: label } for right rows already used
//   orderL, orderR   the order each side's rows stand in (a permutation); a change is animated
//   mid      html of the middle work area
//   out      the joined rows so far; counts: [[label, value], …]
//   fly      [[fromSelector, toSelector], …] rows that travel when this action happens
import { cards } from "./cards.js";

export const ORDERS = [[101, 3], [102, 1], [103, 5], [104, 3], [105, 2], [106, 5]]; // order, its customer
export const CUSTOMERS = [[1, "Ana"], [2, "Ben"], [3, "Chen"], [4, "Dana"], [5, "Eli"]];
export const L = (i) => `.left .row[data-i="${i}"]`, R = (i) => `.right .row[data-i="${i}"]`, LAST = ".out span:last-child";
export const last = (list) => list[list.length - 1];
export const joined = (l, r) => `order ${ORDERS[l][0]} · ${CUSTOMERS[r][1]}`;

export const times = (a, b) => { const x = a / b; return `${x >= 100 ? Math.round(x).toLocaleString("en-US") : x >= 10 ? Math.round(x) : x.toFixed(1)}×`; };

export const css = (k) => cards(k) + `
.lw .${k} { position:relative; }
.lw .${k} .desk { display:flex; align-items:center; gap:10px 14px; flex-wrap:wrap; }
.lw .${k} .desk .say { flex:1 1 100%; margin:0; font:15px system-ui, sans-serif; color:var(--ink); min-height:22px; }
.lw .${k} .desk .counts { margin-left:auto; display:flex; gap:18px; font-size:13px; color:var(--mute); }
.lw .${k} .desk .counts b { font:600 20px ui-monospace, Menlo, monospace; color:var(--accent); margin-left:6px; }
.lw .${k} .desk.still button { visibility:hidden; }
.lw .${k} .top { display:grid; grid-template-columns:1fr 1.15fr 1fr; gap:14px; align-items:start; }
.lw .${k} h4 small { display:block; margin-top:3px; text-transform:none; letter-spacing:0; font-size:12px; font-weight:400; }
.lw .${k} .rows { display:grid; gap:6px; }
.lw .${k} .row { display:flex; justify-content:space-between; gap:8px; padding:7px 10px; border-radius:9px; background:var(--cell); border:1.5px solid transparent;
      font:13px ui-monospace, Menlo, monospace; white-space:nowrap; transition:background .25s, border-color .25s, color .25s, opacity .25s; }
.lw .${k} .row em { font-style:normal; font-size:11px; color:var(--mute); }
.lw .${k} h4.ixh { margin:14px 0 8px; color:var(--ok); }
.lw .${k} .ixs { display:grid; gap:4px; }
.lw .${k} .ix { padding:5px 10px; border-radius:8px; border:1.5px dashed var(--line); font:13px ui-monospace, Menlo, monospace; white-space:nowrap; transition:background .25s, border-color .25s, color .25s, opacity .25s; }
.lw .${k} .ix.done { opacity:.5; }
.lw .${k} .ix.now { border-style:solid; border-color:var(--accent); background:var(--accent-bg); color:var(--accent); opacity:1; }
.lw .${k} .ix.now.hit { border-color:var(--ok); background:var(--ok-bg); color:var(--ok); }
.lw .${k} .ix.now.miss { border-color:var(--hot); background:var(--hot-bg); color:var(--hot); }
.lw .${k} .row.done { opacity:.5; }
.lw .${k} .row.now { border-color:var(--accent); background:var(--accent-bg); color:var(--accent); opacity:1; }
.lw .${k} .row.now.hit { border-color:var(--ok); background:var(--ok-bg); color:var(--ok); }
.lw .${k} .row.now.miss { border-color:var(--hot); background:var(--hot-bg); color:var(--hot); }
.lw .${k} .mid { min-height:120px; }
.lw .${k} .mid .big { font:600 17px ui-monospace, Menlo, monospace; text-align:center; margin:18px 0 6px; }
.lw .${k} .mid .big.hit { color:var(--ok); } .lw .${k} .mid .big.miss { color:var(--hot); }
.lw .${k} .mid p { margin:6px 0 0; font-size:13px; color:var(--mute); text-align:center; }
.lw .${k} .out { display:flex; flex-wrap:wrap; gap:8px; min-height:34px; }
.lw .${k} .out span { padding:6px 12px; border-radius:9px; background:var(--ok-bg); color:var(--ok); border:1.5px solid var(--ok); font:13px ui-monospace, Menlo, monospace; }
.lw .${k} .out i { font-style:normal; font-size:13px; color:var(--mute); align-self:center; }
.lw .${k}.moving .new { animation:${k}-arrive .5s .35s backwards; }
@keyframes ${k}-arrive { from { opacity:0; transform:scale(.8); } }
.lw .${k} .flyer { position:absolute; margin:0; z-index:5; pointer-events:none; box-shadow:0 4px 14px rgba(0,0,0,.4); }
.lw .${k} .measured table { width:100%; border-collapse:collapse; }
.lw .${k} .measured td { padding:10px 0; border-top:1px solid var(--line); font:600 14px system-ui, sans-serif; }
.lw .${k} .measured tr:first-child td { border-top:0; padding-top:0; }
.lw .${k} .measured td small { display:block; font-size:13px; font-weight:400; color:var(--mute); }
.lw .${k} .measured td + td { text-align:right; font:600 17px ui-monospace, Menlo, monospace; white-space:nowrap; padding-left:16px; }
.lw .${k} .measured th { text-align:right; font:600 11px system-ui, sans-serif; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); padding:0 0 10px 16px; }
.lw .${k} .measured td + td small { font:12px system-ui, sans-serif; }
.lw .${k} .measured td.pick { color:var(--accent); } .lw .${k} .measured td.slow { color:var(--hot); }
.lw .${k} .measured:not(.on) { display:none; }
.lw .${k}.plain > :not(.measured) { display:none; }
.lw .${k}.plain .measured td { font-size:16px; padding:14px 0; } .lw .${k}.plain .measured td + td { font-size:22px; } .lw .${k}.plain .measured td small { font-size:14px; }
.lw .${k} .measured td small b { color:var(--accent); font-weight:600; }
`;

// A card of measured facts, shown on the steps named in `on` (a reveal attribute, e.g. `data-from="4"`).
// Each row: [what, detail, value, "pick" | "slow" | ""]; a "pick" row is the planner's choice.
export const measured = (title, on, rows) => `<div class="card measured st" ${on}><h4>${title}</h4><table>${rows.map(([what, detail, value, tone = ""]) =>
  `<tr><td>${what}<small>${detail}</small></td><td class="${tone}">${value}${tone === "pick" ? "<small>the planner's choice</small>" : ""}</td></tr>`).join("")}</table></div>`;

const side = (cls, title, sub, rows, index = "") => `<div class="card set ${cls}"><h4>${title}<small>${sub}</small></h4><div class="rows">${rows}</div>${index}</div>`;
// An index drawn under its table: the entries in key order, each pointing at a row. `entries`: [[rowIndex, text], …].
export const indexList = (title, entries) => `<h4 class="ixh">${title}</h4><div class="ixs">${entries.map(([i, text]) => `<div class="ix" data-i="${i}">${text}</div>`).join("")}</div>`;
// The same join at growing sizes, shown on the steps named in `on`. `head` names the value columns;
// each row: [what, detail, [value, note, tone], …], one cell per column.
export const scaled = (title, on, head, rows) => `<div class="card measured st" ${on}><h4>${title}</h4><table><thead><tr><th></th>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${
  rows.map(([what, detail, ...cells]) => `<tr><td>${what}<small>${detail}</small></td>${cells.map(([value, note = "", tone = ""]) => `<td class="${tone}">${value}<small>${note}</small></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

// The picture: controls first, so they stay put however long the picture below grows.
export const DESK = `<div class="card desk"><p class="say"></p><button class="play go" type="button">▶ Play</button><button class="play quiet one" type="button">Step</button>
    <button class="play quiet again" type="button">Start over</button><div class="counts"></div></div>`;
export const stage = ({ left, right, mid, below = "", orders = ORDERS, customers = CUSTOMERS, indexL = "", indexR = "" }) => `
  ${DESK}
  <div class="top">
    ${side("left", "Orders", left, orders.map(([o, c], i) => `<div class="row" data-i="${i}"><span>order ${o}</span><span>customer ${c}</span></div>`).join(""), indexL)}
    <div class="card mid"><h4>${mid}</h4><div class="work"></div></div>
    ${side("right", "Customers", right, customers.map(([id, name], i) => `<div class="row" data-i="${i}"><span>customer ${id}</span><span>${name}</span><em></em></div>`).join(""), indexR)}
  </div>
  <div class="card result"><h4>Joined rows</h4><div class="out"></div></div>${below}`;

// A row travels: a copy of `from.el` glides from where it stood (`from.box`, measured before the
// picture was redrawn, since a redraw may replace the element) to where `to` is, then disappears.
function fly(root, from, to, ms) {
  if (!from || !to) return;
  const base = root.getBoundingClientRect(), a = from.box, b = to.getBoundingClientRect();
  const copy = from.el.cloneNode(true);
  copy.classList.add("flyer");
  Object.assign(copy.style, { left: `${a.left - base.left}px`, top: `${a.top - base.top}px`, width: `${a.width}px` });
  root.append(copy);
  copy.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(.9)`, opacity: 0.2 }],
    { duration: ms, easing: "ease-in-out" }).finished.then(() => copy.remove(), () => copy.remove());
}

// Put the left rows in a new order, sliding each one from where it stood.
function reorder(box, order, moving) {
  const rows = [...box.children], was = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
  order.forEach((i) => box.append(rows.find((r) => Number(r.dataset.i) === i)));
  if (moving) rows.forEach((r) => r.animate([{ transform: `translateY(${was.get(r) - r.getBoundingClientRect().top}px)` }, { transform: "none" }], { duration: 900, easing: "ease-in-out" }));
}

function paint(root, s, moving) {
  root.classList.toggle("moving", moving);
  const left = root.querySelector(".left .rows");
  [[left, s.orderL], [root.querySelector(".right .rows"), s.orderR]].forEach(([box, given]) => {
    const order = given ?? Array.from({ length: box.children.length }, (_, i) => i);
    if (box.dataset.order !== order.join()) { box.dataset.order = order.join(); reorder(box, order, moving); }
  });
  left.querySelectorAll(".row").forEach((row) => { const i = Number(row.dataset.i);
    row.className = "row" + (s.doneL?.has(i) ? " done" : "") + (s.L === i ? ` now ${s.toneL ?? s.tone ?? ""}` : ""); });
  root.querySelectorAll(".right .row").forEach((row) => { const i = Number(row.dataset.i);
    row.className = "row" + (s.R === i ? ` now ${s.toneR ?? s.tone ?? ""}` : "");
    row.querySelector("em").textContent = s.markR?.[i] ?? "";
  });
  // An index entry lights up with the row it points at.
  root.querySelectorAll(".left .ix").forEach((ix) => { const i = Number(ix.dataset.i);
    ix.className = "ix" + (s.doneL?.has(i) ? " done" : "") + (s.L === i ? ` now ${s.toneL ?? s.tone ?? ""}` : ""); });
  root.querySelectorAll(".right .ix").forEach((ix) => { const i = Number(ix.dataset.i);
    ix.className = "ix" + (s.markR?.[i] ? " done" : "") + (s.R === i ? ` now ${s.toneR ?? s.tone ?? ""}` : ""); });
  root.querySelector(".work").innerHTML = s.mid ?? "";
  const out = s.out ?? [];
  root.querySelector(".out").innerHTML = out.length ? out.map((t, i) => `<span class="${s.fresh && i === out.length - 1 ? "new" : ""}">${t}</span>`).join("") : "<i>none yet</i>";
  root.querySelector(".say").innerHTML = s.say ?? "";
  root.querySelector(".counts").innerHTML = (s.counts ?? []).map(([label, n]) => `<span>${label}<b>${n}</b></span>`).join("");
}

// Bind the buttons once; `enter(at)` opens a step on the first state of its phase. A phase marked
// `plain` shows only the measured cards. `draw` paints one state; the join picture is the default.
export function player(root, phases, draw = paint) {
  const go = root.querySelector(".go"), one = root.querySelector(".one"), again = root.querySelector(".again"), desk = root.querySelector(".desk");
  let phase = phases[0], n = 0, timer = null;
  const stop = () => { clearInterval(timer); timer = null; go.textContent = "▶ Play"; };
  const show = (moving) => {
    const s = phase.states[n], from = moving ? (s.fly ?? []).map(([a]) => root.querySelector(a)).map((el) => el && { el, box: el.getBoundingClientRect() }) : [];
    draw(root, s, moving);
    from.forEach((el, i) => fly(root, el, root.querySelector(s.fly[i][1]), 600));
  };
  const step = () => { if (n >= phase.states.length - 1) return stop(); n += 1; show(true); if (n >= phase.states.length - 1) stop(); };
  go.onclick = () => {
    if (timer) return stop();
    if (n >= phase.states.length - 1) { n = 0; show(false); }
    go.textContent = "❚❚ Pause";
    timer = setInterval(step, phase.tick ?? 900);
  };
  one.onclick = () => { stop(); step(); };
  again.onclick = () => { stop(); n = 0; show(false); };
  return { enter(at) { stop(); phase = phases[at]; n = 0; desk.classList.toggle("still", phase.states.length < 2); root.classList.toggle("plain", Boolean(phase.plain)); show(false); }, stop };
}

// The two calls every join widget makes from its `after(root, at)`.
export function drive(root, at, phases, draw) {
  if (!root.play) root.play = player(root, phases, draw);
  if (root.dataset.step !== String(at)) { root.dataset.step = String(at); root.play.enter(at); }
}
