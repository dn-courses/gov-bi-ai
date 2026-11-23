// contest — one question put through several ways of doing the same work, with the clock deciding:
// a row per contender with what it had to do, its time, and how many times slower than the fastest.
// A widget is its contenders, its questions and its steps. Buttons let any question be picked again.
import { cards, time } from "./cards.js";
import { times } from "./joinplay.js";
import { scene as build } from "./scene.js";

const CSS = (k) => cards(k) + `
.lw .${k} .asks { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
.lw .${k} .asks button { font:600 14px system-ui, sans-serif; padding:6px 14px; border-radius:999px; border:1px solid var(--line); background:var(--cell); color:var(--mute); cursor:pointer; }
.lw .${k} .asks button[aria-pressed=true] { background:var(--accent-bg); border-color:var(--accent); color:var(--accent); }
.lw .${k} .q { display:flex; flex-wrap:wrap; gap:6px 18px; align-items:baseline; }
.lw .${k} .q code { font:15px ui-monospace, Menlo, monospace; } .lw .${k} .q span { font-size:14px; color:var(--mute); }
.lw .${k} .paths { display:grid; grid-template-columns:minmax(0, 1.5fr) minmax(0, 1fr) max-content; gap:16px 18px; align-items:center; }
.lw .${k} .row { display:contents; }
.lw .${k} .name { font-weight:600; font-size:15px; } .lw .${k} .name small { display:block; font-weight:400; font-size:13px; color:var(--mute); }
.lw .${k} .tag { display:inline-block; margin-left:8px; padding:1px 8px; border-radius:999px; background:var(--accent-bg); color:var(--accent); font-size:12px; font-weight:600; }
.lw .${k} .tag.pick { background:var(--cell); color:var(--mute); }
.lw .${k} .row:not(.win) .tag.best, .lw .${k} .row:not(.pick) .tag.pick { display:none; }
.lw .${k} .track { height:18px; border-radius:9px; background:var(--cell); overflow:hidden; }
.lw .${k} .track i { display:block; height:100%; border-radius:9px; background:var(--hot); transition:width .5s ease-out, background .3s; }
.lw .${k} .row.win .track i { background:var(--accent); }
.lw .${k} .v { text-align:right; font:600 20px ui-monospace, Menlo, monospace; white-space:nowrap; color:var(--hot); }
.lw .${k} .row.win .v { color:var(--accent); }
.lw .${k} .v small { display:block; font:13px system-ui, sans-serif; font-weight:400; color:var(--mute); }
.lw .${k} .row.cannot .v { color:var(--mute); } .lw .${k} .row.cannot .name { color:var(--mute); }
.lw .${k} .foot2 { margin:12px 0 0; font-size:13px; color:var(--mute); }
`;

// contenders: [[key, name], …]. cases: [{ label, ask, rows, win, pick?, <key>: [ms, what it had to do, extra?] }, …]
// `win` is the fastest; `pick` the planner's choice when that is another one. A time of null: this contender cannot do it at all. `heading` titles the comparison, `foot` ends it.
export function contest({ stepper, key, label, contenders, cases, steps, heading, foot }) {
  const scene = () => `
    <div class="card"><h4>The question</h4>
      <div class="asks">${cases.map((c, i) => `<button type="button" data-case="${i}" aria-pressed="false">${c.label}</button>`).join("")}</div>
      <div class="q"><code></code><span></span></div></div>
    <div class="card"><h4>${heading}</h4><div class="paths">
      ${contenders.map(([id, name]) => `<div class="row" data-path="${id}"><span class="name">${name}<span class="tag best"></span><span class="tag pick">the planner's choice</span><small></small></span>
        <div class="track"><i></i></div><span class="v"><span></span><small></small></span></div>`).join("")}</div>
      <p class="foot2">${foot}</p></div>`;
  function show(root, n) {
    const c = cases[n], slowest = Math.max(...contenders.map(([id]) => c[id][0] ?? 0)), best = c[c.win][0], pick = c.pick ?? c.win;
    root.querySelectorAll(".asks button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.case) === n)));
    root.querySelector(".q code").textContent = c.ask;
    root.querySelector(".q span").textContent = c.rows;
    root.querySelectorAll(".row").forEach((row) => {
      const [ms, why, extra = ""] = c[row.dataset.path], win = row.dataset.path === c.win;
      row.classList.toggle("win", win);
      row.classList.toggle("pick", row.dataset.path === pick && pick !== c.win);
      row.querySelector(".tag.best").textContent = pick === c.win ? "fastest · the planner's choice" : "fastest";
      row.querySelector(".name small").textContent = why;
      row.classList.toggle("cannot", ms === null);
      row.querySelector(".track i").style.width = ms === null ? "0" : `${Math.max(0.6, (100 * ms) / slowest)}%`;
      row.querySelector(".v span").textContent = ms === null ? "cannot" : time(ms);
      row.querySelector(".v small").textContent = ms === null ? extra : [win ? "" : `${times(ms, best)} slower`, extra].filter(Boolean).join(" · ");
    });
  }
  function after(root, at) {
    if (!root.dataset.bound) { root.dataset.bound = "1"; root.querySelectorAll(".asks button").forEach((b) => b.addEventListener("click", () => show(root, Number(b.dataset.case)))); }
    if (root.dataset.step !== String(at)) { root.dataset.step = String(at); show(root, Math.min(at, cases.length - 1)); } // a step picks its question; after that the buttons are free
  }
  return { render: build({ stepper, key, label, css: CSS(key), steps, scene, after }) };
}
