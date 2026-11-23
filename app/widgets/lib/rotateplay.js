// rotateplay — a chain of 3, 6 or 12 values balanced one rotation per press: the controls, and the
// drawing of the tree as it moves from one shape to the next. The shapes come from rotations.js.
import { rotationStates } from "./rotations.js";

const SIZES = [3, 6, 12];

export const css = (k) => `
.lw .${k} .rotctl { position:absolute; left:6%; right:6%; top:5%; display:flex; align-items:center; gap:10px; opacity:0; pointer-events:none; transition:opacity .4s; }
.lw .${k} .rotctl.shown { opacity:1; pointer-events:auto; }
.lw .${k} .rotctl button { all:unset; cursor:pointer; padding:5px 13px; border-radius:8px; border:1px solid var(--line); background:var(--bg);
      font:600 14px system-ui, sans-serif; color:var(--ink); transition:background .2s, border-color .2s, color .2s; }
.lw .${k} .rotctl button:hover:not([disabled]) { border-color:var(--accent); }
.lw .${k} .rotctl button:focus-visible { box-shadow:0 0 0 2px var(--accent); }
.lw .${k} .rotctl button[disabled] { opacity:.4; cursor:default; }
.lw .${k} .rotctl .pick { display:flex; gap:4px; }
.lw .${k} .rotctl .pick button.on, .lw .${k} .rotctl .redo { background:var(--accent); border-color:var(--accent); color:var(--accent-ink); }
.lw .${k} .rotctl .lead { color:var(--mute); font-size:14px; margin-right:8px; }
.lw .${k} .rotctl .tally { margin-left:auto; font:13px ui-monospace, Menlo, monospace; color:var(--mute); white-space:nowrap; }`;

export const controls = () => `<div class="rotctl"><span class="pick">${SIZES.map((n) => `<button type="button" data-n="${n}">${n}</button>`).join("")}</span>
  <span class="lead">values</span><button type="button" class="undo">◀ Un-rotate</button><button type="button" class="redo">Rotate ▶</button><span class="tally"></span></div>`;

// Where node i sits in a shape: x never changes (a rotation keeps the left-to-right order), y is its depth.
function spot(i, n, shape) {
  const rise = Math.min(46, 168 / Math.max(1, shape.levels - 1));
  return [90 + (i * 580) / (n - 1), 84 + shape.depth[i] * rise];
}
// Draw the tree a fraction t of the way from shape `from` to shape `to`.
function place(g, n, from, to, t) {
  const at = (i, shape) => spot(i, n, shape);
  const mix = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const upper = (i, shape) => at(shape.parent[i] ?? i, shape); // the root's edge has no length
  for (let i = 0; i < n; i++) {
    const [x, y] = mix(at(i, from), at(i, to)), [px, py] = mix(upper(i, from), upper(i, to));
    g.querySelector(`[data-v="${i}"]`).setAttribute("transform", `translate(${x} ${y})`);
    const edge = g.querySelector(`[data-e="${i}"]`);
    edge.setAttribute("x1", x); edge.setAttribute("y1", y); edge.setAttribute("x2", px); edge.setAttribute("y2", py);
  }
}
// The state lives on the widget's root: the size picked, the shapes, and how many rotations are applied.
function pick(root, n) {
  const rot = (root.rot = { n, states: rotationStates(n), k: 0, frame: 0 });
  const g = root.querySelector(".rot"), r = n > 6 ? 13 : 17;
  g.innerHTML = Array.from({ length: n }, (_, i) => `<line class="edge on" data-e="${i}"/>`).join("") +
    Array.from({ length: n }, (_, i) => `<g class="n hit" data-v="${i}"><circle r="${r}"/><text class="mono" y="1">${(i + 1) * 10}</text></g>`).join("");
  place(g, n, rot.states[0], rot.states[0], 1);
  tell(root);
}
function tell(root) {
  const { n, states, k } = root.rot, last = states.length - 1;
  root.querySelectorAll(".pick button").forEach((b) => b.classList.toggle("on", Number(b.dataset.n) === n));
  root.querySelector(".undo").disabled = k === 0;
  root.querySelector(".redo").disabled = k === last;
  root.querySelector(".tally").textContent = `${states[k].levels} levels · rotation ${k} of ${last}${k === last ? " · balanced" : ""}`;
}
// Apply or undo one rotation, moving the nodes there over a short moment.
function turn(root, by) {
  const rot = root.rot, g = root.querySelector(".rot"), from = rot.states[rot.k], to = rot.states[rot.k + by];
  if (!to) return;
  cancelAnimationFrame(rot.frame);
  rot.k += by;
  tell(root);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return place(g, rot.n, to, to, 1);
  let began;
  const tick = (now) => {
    began ??= now;
    const t = Math.min(1, (now - began) / 550);
    place(g, rot.n, from, to, t * t * (3 - 2 * t));
    if (t < 1) rot.frame = requestAnimationFrame(tick);
  };
  rot.frame = requestAnimationFrame(tick);
}
// Bind the controls once, into the group with class "rot"; show them only while `shown`.
export function rotate(root, shown) {
  root.querySelector(".rotctl").classList.toggle("shown", shown);
  if (root.rot) return;
  pick(root, SIZES[0]);
  root.querySelector(".rotctl").addEventListener("click", (e) => {
    const size = e.target.closest("[data-n]");
    if (size) pick(root, Number(size.dataset.n));
    else if (e.target.closest(".redo")) turn(root, 1);
    else if (e.target.closest(".undo")) turn(root, -1);
  });
}
