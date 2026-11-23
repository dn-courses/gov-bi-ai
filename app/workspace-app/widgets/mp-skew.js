// mp-skew — one big key makes one busy worker: an exact median per system sends each system's rows
// to one worker, NYC holds 60% of them, and the stage ends only when its worker does. More workers
// change nothing: one key is still one worker. Step 0 has Play.
// Numbers: the page's own Python cells, run 2026-11-23 in the lesson app on the postgres lab, three
// runs: worker times 9, 4, 20–21 and 48–49 ms; the average worker 20–21 ms. Rows are deterministic.
import { LOOK, OWNS, beats, bindPlays, fmt, on, play, snap, stop, t, tag, tile, widget, zone } from "./mp-lib.js";

const CAPTURED = {
  inbox: [120000, 60000, 300000, 720000], ms: [9, 4, 20, 48], avgMs: 20,
  eight: [120000, 0, 300000, 0, 0, 60000, 0, 720000], eightKey: ["BOS", "", "CHI", "", "", "PDX", "", "NYC"],
};

const steps = (D) => [
  { stop: "One big key", title: "One big key, one busy worker", decisive: true,
    note: `The exact median per system needs each system's values together, so the key is the system. Press <b>Play</b>: NYC's ${fmt(D.inbox[3])} rows all land on worker 3, and the others finish and wait. A stage takes as long as its slowest worker: about <b>${D.ms[3]} ms</b>, while the average worker needed ${D.avgMs}. This is <b>skew</b>.` },
  { stop: "More workers", title: "More workers do not split a key",
    note: `Eight workers instead of four: half of them get no system at all, and NYC's ${fmt(D.inbox[3])} rows are still on one. Skew belongs to the data and the key together; the same rows keyed by station came out even.` },
];

const CSS = LOOK("sk") + `
.lw .sk .track { fill:var(--cell); }
.lw .sk .idle { fill:none; stroke:var(--line); stroke-dasharray:5 4; }
.lw .sk .rows { fill:var(--kb); stroke:var(--k); stroke-width:1.5; transform:scaleX(0); }
.lw .sk .work { fill:var(--k); transform:scaleX(0); }
.lw .sk.lv1 .rows { transform:scaleX(1); transition-duration:.8s; }
.lw .sk.lv2 .work { transform:scaleX(1); }
.lw .sk .wait { stroke:var(--mute); stroke-width:2; stroke-dasharray:3 5; stroke-linecap:round; }
.lw .sk .hand { stroke:var(--hot); stroke-width:2; transition:transform linear; }
.lw .sk .avg { stroke:var(--accent); stroke-width:1.5; stroke-dasharray:4 4; }
.lw .sk .msg { opacity:0; transition:opacity .4s; } .lw .sk .msg.shown { opacity:1; }
`;

// Step 0: four lanes on one clock. The inbox bar is a worker's rows; the time bar is its work,
// drawn at the same speed on every worker, so each ends at its measured milliseconds.
const IN0 = 156, INW = 80, T0 = 330, TW = 330, laneY = (w) => 84 + w * 50;
const tx = (ms) => T0 + (TW * ms) / 48;
const lane = (D, w) => { const s = OWNS[w], y = laneY(w), inw = (INW * D.inbox[w]) / D.inbox[3], end = tx(D.ms[w]);
  return `<g class="k-${s}">${tag(66, y, `worker ${w}`, "lit")}${t(114, y + 1, s, "kt l")}
    <rect class="grow rows" x="${IN0}" y="${y - 12}" width="${inw}" height="24" rx="5"/>${t(IN0 + inw + 8, y + 1, fmt(D.inbox[w]), "v l")}
    <rect class="track" x="${T0}" y="${y - 12}" width="${TW}" height="24" rx="5"/>
    <rect class="grow work" data-w="${w}" x="${T0}" y="${y - 12}" width="${end - T0}" height="24" rx="5"/>
    ${w < 3 ? `<path class="wait msg m${w}" d="M${end + 6} ${y} H${tx(48) - 4}"/>` + `<rect class="track msg m${w}" x="${(end + tx(48)) / 2 - 34}" y="${y - 10}" width="68" height="20"/>` + t((end + tx(48)) / 2, y + 1, "waiting", `lbl msg m${w}`) : ""}
    ${t(733, y + 1, `${D.ms[w]} ms`, `big r msg m${w} ${w === 3 ? "hot" : ""}`)}</g>`; };

const four = (D) => on("0", zone(11, 10, 738, 280, "EACH WORKER SORTS THE VALUES OF THE SYSTEM IT OWNS")
  + t(IN0, 48, "ROWS IN ITS INBOX", "cap") + t(T0, 48, "ITS WORK, ON ONE CLOCK →", "cap")
  + [0, 1, 2, 3].map((w) => lane(D, w)).join("")
  + `<path class="avg msg m3" d="M${tx(D.avgMs)} 62 V262"/>` + t(tx(D.avgMs), 274, `the average worker: ${D.avgMs} ms`, "lbl msg m3")
  + `<path class="hand" d="M${T0} 62 V262"/>`
  + zone(11, 302, 738, 88) + tile(27, 328, "THE STAGE ENDS WITH THE SLOWEST WORKER", "—", "hot clock")
  + tile(420, 328, "THE AVERAGE WORKER", `${D.avgMs} ms`, "dim msg m3")
  + play(641, 330));

// Step 1: eight lanes, the same rows by system.
const px = (rows, max) => (360 * rows) / max;
const lane8 = (D, n, w) => { const y = 56 + w * 42, s = D.eightKey[w];
  return `<g class="${s ? `k-${s}` : ""}">${tag(66, y, `worker ${w}`, s ? "lit" : "")}${s ? t(122, y + 1, s, "kt l") : ""}
    ${n ? `<rect class="track" x="190" y="${y - 12}" width="360" height="24" rx="5"/><rect class="chip in" x="190" y="${y - 12}" width="${px(n, D.inbox[3])}" height="24" rx="5"/>`
    : `<rect class="idle" x="190" y="${y - 12}" width="360" height="24" rx="5"/>`}
    ${t(n ? 200 + px(n, D.inbox[3]) : 370, y + 1, n ? `${fmt(n)} rows` : "idle", n ? "v l" : "lbl")}</g>`; };
const eight = (D) => on("1", zone(11, 10, 738, 380, "THE SAME ROWS BY SYSTEM, EIGHT WORKERS")
  + D.eight.map((n, w) => lane8(D, n, w)).join(""));

const scene = (D) => `<svg viewBox="0 0 760 400">${four(D)}${eight(D)}</svg>`;

// Play: rows arrive, then every worker works on one clock; each stops at its measured ms.
const SCALE = 75; // animation ms per measured ms: 48 ms plays in 3.6 s
function run(root, D, b) {
  root.querySelectorAll(".work").forEach((g) => { g.style.transitionDuration = `${D.ms[+g.dataset.w] * SCALE}ms`; });
  const clock = root.querySelector(".clock"), hand = root.querySelector(".hand");
  const done = D.ms.map((ms, w) => [ms, w]).sort((a, c) => a[0] - c[0]);
  let last = 0;
  beats(root, [[60, () => root.classList.add("lv1")],
    [900, () => { root.classList.add("lv2"); hand.style.transitionDuration = `${D.ms[3] * SCALE}ms`; hand.style.transform = `translateX(${TW}px)`; }],
    ...done.map(([ms, w]) => { const wait = (ms - last) * SCALE; last = ms;
      return [wait, () => { root.querySelectorAll(`.m${w}`).forEach((m) => m.classList.add("shown")); clock.textContent = `${ms} ms`; }]; })], b);
}

function reset(root) {
  root.classList.remove("lv1", "lv2");
  root.querySelectorAll(".msg").forEach((m) => m.classList.remove("shown"));
  const clock = root.querySelector(".clock"), hand = root.querySelector(".hand");
  if (clock) clock.textContent = "—";
  if (hand) { hand.style.transitionDuration = "0ms"; hand.style.transform = "none"; }
}

function after(root) {
  bindPlays(root, { 0: (r, b) => run(r, CAPTURED, b) });
  stop(root);
  snap(root, () => reset(root));
}

export default widget({ key: "sk", label: "Skew", css: CSS, steps, scene, captured: CAPTURED, after });
