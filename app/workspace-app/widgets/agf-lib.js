// agf-lib — what the MCP and ADK widgets of the agents part (agf-*) share, on top of ag1-lib's look:
//   - widget(): an HTML view per step, plus `after(root, at)` once it is on screen;
//   - wire(): the messages between an MCP client and server as two lanes, one card per message;
//   - seq(): a run as a sequence diagram, one arrow per hop;
//   - a ▶ Play button: every element of the step marked `pl` is hidden, then shown in page order,
//     once per press; the newest one is marked `cur`. Without a press, the step shows everything
//     (a still picture of the whole run).
// Nothing here holds lesson data. Colours are the shell's variables only.
import { stepper } from "@widget-lib/stepper.js";
import { CSS as AG1, esc, zone } from "./ag1-lib.js";

export { esc, zone };

export const CSS = AG1 + `
.lw:has(.agf) .source { display:none; }
.lw .agf .pl { transition:opacity .35s, transform .35s, box-shadow .35s; }
.lw .agf.playing .pl { opacity:0; transform:translateY(6px); }
.lw .agf.playing .pl.shown { opacity:1; transform:none; }
.lw .agf .bar-top { display:flex; align-items:center; gap:14px; min-height:34px; }
.lw .agf .agf-play { pointer-events:auto; cursor:pointer; border:0; border-radius:999px; padding:7px 18px; background:var(--accent); color:var(--accent-ink); font:650 14px system-ui, sans-serif; box-shadow:0 1px 0 var(--line); transition:opacity .2s, transform .15s; }
.lw .agf .agf-play:hover:not(:disabled) { transform:translateY(-1px); }
.lw .agf .agf-play:disabled { opacity:.45; cursor:default; }
.lw .agf .agf-now { font-size:15px; color:var(--ink); font-weight:500; }
.lw .agf .agf-now:empty::before, .lw .agf .agf-now .dim { color:var(--mute); }

/* two lanes: the client on the left, the server on the right, a card per message */
.lw .agf .lanes { display:grid; gap:12px; position:relative; }
.lw .agf .lanes .ends { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:2px; }
.lw .agf .lanes .end { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:10px; background:var(--cell); border:1.5px solid var(--line); font-size:13px; color:var(--mute); }
.lw .agf .lanes .end b { font:700 13px system-ui, sans-serif; letter-spacing:.09em; text-transform:uppercase; }
.lw .agf .lanes .end.c { border-left:5px solid var(--accent); } .lw .agf .lanes .end.c b { color:var(--accent); }
.lw .agf .lanes .end.s { border-right:5px solid var(--ok); flex-direction:row-reverse; text-align:right; } .lw .agf .lanes .end.s b { color:var(--ok); }
.lw .agf .wm { width:84%; border:1.5px solid var(--line); border-radius:12px; background:var(--cell); padding:9px 12px 10px; min-width:0; }
.lw .agf .wm.req { justify-self:start; border-left:5px solid var(--accent); border-bottom-left-radius:4px; }
.lw .agf .wm.res { justify-self:end; border-right:5px solid var(--ok); border-bottom-right-radius:4px; }
.lw .agf .wm.err { border-right-color:var(--hot); }
.lw .agf .wm.cur.req { box-shadow:0 0 0 2px var(--accent); } .lw .agf .wm.cur.res { box-shadow:0 0 0 2px var(--ok); } .lw .agf .wm.cur.err { box-shadow:0 0 0 2px var(--hot); }
.lw .agf .wm .hd { display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; font:650 14px ui-monospace, Menlo, monospace; margin-bottom:7px; }
.lw .agf .wm.res .hd { flex-direction:row-reverse; }
.lw .agf .wm .dir { padding:2px 10px; border-radius:999px; font:650 12px system-ui, sans-serif; letter-spacing:.04em; white-space:nowrap; }
.lw .agf .wm.req .dir { color:var(--accent); background:var(--accent-bg); } .lw .agf .wm.res .dir { color:var(--ok); background:var(--ok-bg); }
.lw .agf .wm.err .dir { color:var(--hot); background:var(--hot-bg); }
.lw .agf .wm .nt { font:400 13px system-ui, sans-serif; color:var(--mute); }
.lw .agf .wm pre { padding:7px 10px; font-size:13px; line-height:1.5; background:var(--panel); }
.lw .agf mark { background:var(--accent-bg); color:var(--accent); border-radius:3px; padding:0 2px; font-weight:600; }
.lw .agf mark.h { background:var(--hot-bg); color:var(--hot); } .lw .agf mark.k { background:var(--ok-bg); color:var(--ok); }

/* a run as a sequence diagram */
.lw .agf .sq { width:100%; height:auto; display:block; }
.lw .agf .sq text { font:500 13px system-ui, sans-serif; fill:var(--ink); text-anchor:middle; dominant-baseline:middle; }
.lw .agf .sq text.mono { font:13px ui-monospace, Menlo, monospace; }
.lw .agf .sq .who { font-weight:650; font-size:14px; }
.lw .agf .sq .party { fill:var(--cell); stroke:var(--line); stroke-width:1.5; } .lw .agf .sq .party.me { fill:var(--accent-bg); stroke:var(--accent); }
.lw .agf .sq .party.me + text { fill:var(--accent); }
.lw .agf .sq .life { stroke:var(--line); stroke-width:1.5; stroke-dasharray:3 6; fill:none; }
.lw .agf .sq .ev path { fill:none; stroke:var(--mute); stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }
.lw .agf .sq .ev .dot { fill:var(--mute); }
.lw .agf .sq .ev text { paint-order:stroke; stroke:var(--panel); stroke-width:7px; stroke-linejoin:round; }
.lw .agf .sq .ev.mcp path { stroke:var(--accent); stroke-width:2.2; } .lw .agf .sq .ev.mcp text { fill:var(--accent); } .lw .agf .sq .ev.mcp .dot { fill:var(--accent); }
.lw .agf .sq .ev.end path { stroke:var(--ok); stroke-width:2.4; } .lw .agf .sq .ev.end text { fill:var(--ok); font-weight:700; } .lw .agf .sq .ev.end .dot { fill:var(--ok); }
.lw .agf .sq .ev.cur text { font-weight:700; }
.lw .agf.playing .sq .ev.shown .shaft { stroke-dasharray:100; animation:agf-draw .5s ease-out both; }
@keyframes agf-draw { from { stroke-dashoffset:100; } to { stroke-dashoffset:0; } }
`;

// A message: { dir: "req" | "res", head, body (HTML, already escaped/marked), err, note }.
const card = (m) => `<div class="wm pl ${m.dir} ${m.err ? "err" : ""}"><div class="hd"><span class="dir">${m.dir === "req" ? "client → server" : "client ← server"}</span><span>${m.head}</span>${m.note ? `<span class="nt">${m.note}</span>` : ""}</div><pre>${m.body}</pre></div>`;
const ends = (left, right) => `<div class="ends"><div class="end c"><b>client</b><span>${left}</span></div><div class="end s"><b>server</b><span>${right}</span></div></div>`;
export const wire = (messages, left = "", right = "") => `<div class="lanes">${ends(left, right)}${messages.map(card).join("")}</div>`;

// One hop of a sequence diagram: a dot where it leaves, a shaft, a head, and its label above.
const hop = ([a, b, label, cls = ""], y, X) => {
  const x1 = X[a], x2 = X[b], d = x2 > x1 ? -1 : 1;
  return `<g class="ev pl ${cls}"><circle class="dot" cx="${x1}" cy="${y}" r="3.5"/>
    <path class="shaft" pathLength="100" d="M${x1} ${y} L${x2 + d} ${y}"/><path d="M${x2 + d * 9} ${y - 6} L${x2} ${y} L${x2 + d * 9} ${y + 6}"/>
    <text class="mono" x="${(x1 + x2) / 2}" y="${y - 12}">${esc(label)}</text></g>`;
};

// A sequence diagram. parties: [name, cls]; events: [from, to, label, cls]. Each event row is a `pl`.
export function seq(parties, events, { width = 760, row = 34, top = 62 } = {}) {
  const gap = width / parties.length, X = parties.map((_, i) => gap * i + gap / 2), bottom = top + events.length * row;
  const head = ([name, cls = ""], i) => `<path class="life" d="M${X[i]} 44 L${X[i]} ${bottom + 6}"/>
    <rect class="party ${cls}" x="${X[i] - gap / 2 + 8}" y="6" width="${gap - 16}" height="36" rx="18"/><text class="who" x="${X[i]}" y="25">${name}</text>`;
  return `<svg class="sq" viewBox="0 0 ${width} ${bottom + 16}">${parties.map(head).join("")}
    ${events.map((e, i) => hop(e, top + i * row + 20, X)).join("")}</svg>`;
}

export const playBar = (hint) => `<div class="bar-top"><button class="agf-play" type="button">▶ Play</button><span class="agf-now"><span class="dim">${hint}</span></span></div>`;

// Show the step's `pl` elements one at a time; `say(i)` may return a line for each.
function play(view, say, still) {
  const items = [...view.querySelectorAll(".pl")], button = view.querySelector(".agf-play"), now = view.querySelector(".agf-now");
  clearTimers(view);
  view.classList.add("playing");
  items.forEach((n) => n.classList.remove("shown", "cur"));
  button.disabled = true;
  items.forEach((n, i) => view._timers.push(setTimeout(() => {
    items[i - 1]?.classList.remove("cur");
    n.classList.add("shown", "cur");
    const line = say?.(i);
    if (line && now) now.textContent = `${i + 1} / ${items.length} · ${line}`;
    if (i === items.length - 1) button.disabled = false;
  }, still ? 0 : 300 + i * 850)));
}
const clearTimers = (view) => { (view._timers || []).forEach(clearTimeout); view._timers = []; };

// A widget: steps [{ stop, title, note, decisive?, say? (i → line during Play) }], view(step, at) → HTML.
export const widget = ({ label, css = "", steps, view, after }) => ({
  render({ model, el }) {
    const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const ui = stepper({
      el, model, label, css: CSS + css, steps: () => steps,
      draw({ at, body }) {
        const old = body.querySelector(".agf");
        if (old) clearTimers(old);
        body.innerHTML = `<div class="agf ag1" data-at="${at}">${view(steps[at], at)}</div>`;
        const root = body.querySelector(".agf");
        root.querySelector(".agf-play")?.addEventListener("click", () => play(root, steps[at].say, still));
        after?.(root, at);
      },
    });
    ui.show(Number(model?.get?.("start") ?? 0));
    return () => ui.destroy();
  },
});
