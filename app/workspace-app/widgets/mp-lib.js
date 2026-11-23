// mp-lib — what the MPP page's widgets share: the four systems and their colours, the hash that
// picks a row's owner (the same crc32 % workers as the page's Python cells), the rows the cells
// generate, a Play button, metric tiles, and a timeline of beats that runs once per press.
// Not a widget itself.
import { fmt, scene as build } from "@widget-lib/scene.js";
import { stepper } from "@widget-lib/stepper.js";

export { fmt };
export const widget = (spec) => ({ render: build({ stepper, ...spec }) });

// The cells' four systems: [name, stations, refill cycle, the worker crc32(name) % 4 picks].
export const SYSTEMS = [["NYC", 600, 23, 3], ["CHI", 250, 17, 2], ["BOS", 100, 29, 0], ["PDX", 50, 13, 1]];
export const OWNS = ["BOS", "PDX", "CHI", "NYC"]; // worker w owns OWNS[w]
export const sysOf = (name) => SYSTEMS.find((s) => s[0] === name);
// One poll, exactly as the cells make it: bikes = cycle - 1 - (7·s + minute) % cycle.
export const bikes = (system, s, minute) => { const c = sysOf(system)[2]; return c - 1 - ((s * 7 + minute) % c); };

const TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
// zlib.crc32 of an ASCII string, so a drawn row goes where the cell sends it.
export function crc32(text) {
  let c = 0xffffffff;
  for (const ch of text) c = TABLE[(c ^ ch.charCodeAt(0)) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export const owner = (key, workers = 4) => crc32(key) % workers;

export const t = (x, y, text, cls = "") => `<text class="${cls}" x="${x}" y="${y}">${text}</text>`;
export const zone = (x, y, w, h, cap = "") =>
  `<rect class="zone" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/>${cap ? t(x + 16, y + 20, cap, "cap") : ""}`;
export const on = (steps, inner) => `<g class="st" data-on="${steps}">${inner}</g>`;
export const play = (x, y, cls = "") => `<g class="play ${cls}"><rect x="${x}" y="${y}" width="92" height="32" rx="16"/>
  <path d="M${x + 24} ${y + 10} l10 6 l-10 6 z"/><text x="${x + 56}" y="${y + 17}">Play</text></g>`;
export const at = (x, y, more = "") => `style="transform:translate(${x}px,${y}px);${more}"`;
export const move = (el, x, y) => { el.style.transform = `translate(${x}px,${y}px)`; };
// A small capital label over a big value: one measured number, read at a glance.
export const tile = (x, y, label, value, cls = "") => t(x, y, label, "cap") + t(x, y + 26, value, `huge l ${cls}`);
// A worker's name in a rounded tag, centred on (cx, cy).
export const tag = (cx, cy, text, cls = "") =>
  `<g class="tag ${cls}"><rect x="${cx - 40}" y="${cy - 12}" width="80" height="24" rx="12"/>${t(cx, cy + 1, text)}</g>`;
// A right-pointing arrow from (x1, y) to (x2, y).
export const arrow = (x1, y, x2, cls = "") =>
  `<path class="arw ${cls}" d="M${x1} ${y} H${x2} M${x2 - 7} ${y - 5} L${x2} ${y} L${x2 - 7} ${y + 5}"/>`;

// The look every MPP widget adds to the shared scene look: system colours, Play, tags, motion.
export const LOOK = (k) => `
.lw .${k} text.cap { font-size:12px; letter-spacing:.08em; }
.lw .${k} .k-NYC { --k:var(--hot); --kb:var(--hot-bg); } .lw .${k} .k-CHI { --k:var(--accent); --kb:var(--accent-bg); }
.lw .${k} .k-BOS { --k:var(--ok); --kb:var(--ok-bg); } .lw .${k} .k-PDX { --k:var(--ink); --kb:var(--cell); }
.lw .${k} .chip { fill:var(--kb); stroke:var(--k); stroke-width:1.5; }
.lw .${k} .dot { fill:var(--k); }
.lw .${k} text.kt { fill:var(--k); font:700 13px ui-monospace, Menlo, monospace; }
.lw .${k} text.v { font:400 13px ui-monospace, SFMono-Regular, Menlo, monospace; }
.lw .${k} text.huge { font:700 26px ui-monospace, Menlo, monospace; }
.lw .${k} text.h { font:600 16px system-ui, sans-serif; }
.lw .${k} .tag rect { fill:var(--cell); stroke:var(--line); }
.lw .${k} .tag text { font:600 13px system-ui, sans-serif; }
.lw .${k} .tag.lit rect { fill:var(--kb, var(--accent-bg)); stroke:var(--k, var(--accent)); }
.lw .${k} .arw { fill:none; stroke:var(--mute); stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; }
.lw .${k} .arw.acc { stroke:var(--accent); stroke-width:2; } .lw .${k} .arw.hot { stroke:var(--hot); stroke-width:2; }
.lw .${k} .lift { filter:drop-shadow(0 3px 6px rgba(0,0,0,.28)); }
.lw .${k} .mv { transition:transform 1.1s cubic-bezier(.45,0,.2,1), opacity .5s; }
.lw .${k} .fade { transition:opacity .5s; }
.lw .${k}.snap .mv, .lw .${k}.snap .fade, .lw .${k}.snap .grow { transition:none !important; }
.lw .${k} .grow { transform-box:fill-box; transform-origin:0 50%; transition:transform linear; }
.lw .${k} .in { transform-box:fill-box; transform-origin:0 50%; transform:scaleX(0); }
.lw .${k} .st.on .in { transform:scaleX(1); transition:transform .9s cubic-bezier(.3,0,.2,1) .2s; }
.lw .${k} .play { cursor:pointer; }
.lw .${k} .st.on .play { pointer-events:auto; }
.lw .${k} .play rect { fill:var(--accent); stroke:none; filter:drop-shadow(0 2px 6px rgba(0,0,0,.25)); }
.lw .${k} .play path { fill:var(--accent-ink); }
.lw .${k} .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .${k} .play:hover rect { filter:brightness(1.08) drop-shadow(0 2px 6px rgba(0,0,0,.25)); }
.lw .${k} .play.busy { opacity:.45; pointer-events:none; }
`;

// Run [wait-before-ms, action] beats once; a new press or a step change cancels the last run.
// With reduced motion every beat lands at once.
export function beats(root, list, button) {
  stop(root);
  const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let t0 = 0;
  button?.classList.add("busy");
  list.forEach(([wait, act], i) => {
    t0 += still ? 0 : wait;
    root._timers.push(setTimeout(() => { act(); if (i === list.length - 1) button?.classList.remove("busy"); }, t0));
  });
}
export function stop(root) {
  (root._timers || []).forEach(clearTimeout);
  root._timers = [];
  root.querySelectorAll(".play.busy").forEach((b) => b.classList.remove("busy"));
}

// Beats that count a number up from `from` to `to` over `ms` into the text element `el`.
export const countUp = (el, from, to, ms, n = 12) =>
  Array.from({ length: n }, (_, i) => [ms / n, () => { if (el) el.textContent = fmt(Math.round(from + ((to - from) * (i + 1)) / n)); }]);

// Put a step's "before" picture in place with no motion, so a Play always starts from it.
export function snap(root, set) {
  root.classList.add("snap");
  set();
  void root.getBoundingClientRect();
  requestAnimationFrame(() => root.classList.remove("snap"));
}

// Bind each step's Play once: plays = { stepIndex: (root, button) => void }.
export function bindPlays(root, plays) {
  if (root.dataset.bound) return;
  root.dataset.bound = "1";
  root.querySelectorAll(".play").forEach((button) => {
    const step = Number(button.closest(".st")?.dataset.on);
    button.addEventListener("click", () => Number(root.dataset.at) === step && plays[step]?.(root, button));
  });
}
