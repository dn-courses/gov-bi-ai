// mp-split — many machines, one aggregate: four workers each scan a share at once, reduce it to a
// few partial rows (system, sum, count), send each partial row to the worker its system hashes to,
// and the owners finish their keys before one worker gathers the answer. Steps 1–4 have Play.
// Numbers: the page's own Python cells, run 2026-11-23 in the lesson app on the postgres lab
// (rows are deterministic). The sample rows are the cells' generator, drawn by mp-lib's bikes();
// owners are crc32(system) % 4, as the cells print. The capture's row count: _measurements.md.
import { LOOK, OWNS, SYSTEMS, at, beats, bikes, bindPlays, countUp, fmt, move, on, play, snap, stop, t, tag, tile, widget, zone } from "./mp-lib.js";
import { TABLE_CSS, table } from "@widget-lib/table.js";

const CAPTURED = {
  lab: 25920000, capture: 1803699574, rows: 1200000, share: 300000,
  // partials[w][k]: worker w's [sum, count] for SYSTEMS[k] — the cell's printout.
  partials: [[[1980015, 180000], [600006, 75000], [420038, 30000], [90006, 15000]],
    [[1980013, 180000], [599999, 75000], [420043, 30000], [89995, 15000]],
    [[1980011, 180000], [599992, 75000], [419903, 30000], [89997, 15000]],
    [[1980009, 180000], [600002, 75000], [420082, 30000], [89999, 15000]]],
  answer: { NYC: "11.0", CHI: "8.0", BOS: "14.001", PDX: "6.0" },
};

const steps = (D) => [
  { stop: "One machine", title: "One machine: every core is already scanning",
    note: `A scan on one machine is bounded by its cores and its disk, and the laptop's 12 cores are all busy. The real capture has <b>${fmt(D.capture)}</b> rows, seventy times this lab's table, and the same machine would have the same cores for it.` },
  { stop: "Shares", title: "Many machines, each scanning a share",
    note: `Cut the ${fmt(D.rows)} rows into four shares and give each to a machine with its own cores, memory and disk (MIMD). Press <b>Play</b>: all four scan at the same moment, so the scan takes as long as one share.` },
  { stop: "Partial", title: "Each worker reduces its own share first",
    note: `The question: the average bikes per system. Press <b>Play</b>: each worker turns its ${fmt(D.share)} rows into four <b>partial rows</b>, a sum and a count per system. Sixteen rows leave the scan, not ${fmt(D.rows)}.` },
  { stop: "Exchange", title: "Each partial row goes to the worker that owns its key", decisive: true,
    note: `A system belongs to one worker: the hash of its name, modulo 4. Press <b>Play</b>: every partial row travels to its owner, so each worker ends up with all four rows of one system. This move is the <b>exchange</b>.` },
  { stop: "Final", title: "The owner finishes its key, then one worker gathers",
    note: `Press <b>Play</b>: each owner adds up four sums and four counts and only then divides. Then the four answers go to one worker, which returns them.` },
];

const CSS = TABLE_CSS("sp") + LOOK("sp") + `
.lw .sp .aft { opacity:0; transition:opacity .5s; } .lw .sp .bef { transition:opacity .5s; }
.lw .sp.lv1 .aft { opacity:1; } .lw .sp.lv1 .bef { opacity:0; }
.lw .sp text.v.s { font-size:12px; }
.lw .sp .chassis { fill:var(--cell); stroke:var(--line); }
.lw .sp .core { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .sp .busy { fill:var(--accent); }
.lw .sp .disk { fill:var(--cell); stroke:var(--mute); stroke-width:1.5; }
.lw .sp .final rect { fill:var(--kb); stroke:var(--k); stroke-width:2; }
.lw .sp .track { fill:var(--cell); }
.lw .sp .scan { fill:var(--accent); transform:scaleX(0); transition-duration:2s; }
.lw .sp.lv1 .scan { transform:scaleX(1); }
.lw .sp .sweep { fill:var(--accent); opacity:0; }
.lw .sp.lv1 .sweep { animation:sp-sweep 2s linear 1 forwards; }
@keyframes sp-sweep { 0% { opacity:.28; transform:translateY(0); } 85% { opacity:.28; transform:translateY(120px); } 100% { opacity:0; transform:translateY(120px); } }
.lw .sp .shr { transform-box:fill-box; transform-origin:50% 50%; transition:transform .6s ease-in, opacity .5s; }
.lw .sp .own { fill:none; stroke:var(--k); stroke-width:2; opacity:0; transition:opacity .6s; }
.lw .sp[data-at="4"] .own, .lw .sp[data-at="3"].lv1 .own { opacity:.9; }
.lw .sp[data-at="3"].lv1 .own { transition-delay:2.2s; }
.lw .sp .slot { fill:none; stroke:var(--line); stroke-width:1.5; stroke-dasharray:5 4; }
`;

const COLX = (i) => 11 + i * 186, CX = (i) => COLX(i) + 90, SLOT = (k) => 136 + k * 40, W4 = [0, 1, 2, 3];

// Step 0: one machine with every core busy, fed by one disk; the two tables' rows to scale.
const cores = () => Array.from({ length: 12 }, (_, i) => { const x = 66 + (i % 4) * 50, y = 62 + Math.floor(i / 4) * 50;
  return `<rect class="core" x="${x}" y="${y}" width="40" height="40" rx="7"/><rect class="busy" x="${x + 7}" y="${y + 28}" width="26" height="5" rx="2.5"/>`; }).join("");
const machine = (D) => on("0", zone(11, 10, 300, 400, "ONE MACHINE")
  + `<rect class="chassis" x="44" y="42" width="234" height="174" rx="14"/>` + cores()
  + t(161, 240, "every core scanning", "h")
  + `<path class="arw" d="M161 318 V266 M155 273 L161 266 L167 273"/>`
  + `<path class="disk" d="M131 322 v34 a30 9 0 0 0 60 0 v-34 a30 9 0 0 0 -60 0 a30 9 0 0 0 60 0"/>`
  + t(161, 388, "one disk feeding them", "lbl")
  + zone(323, 10, 426, 400, "ROWS TO SCAN")
  + t(343, 76, "this lab's table", "l") + `<rect class="bar on in" x="343" y="92" width="${Math.max(5, (386 * D.lab) / D.capture)}" height="26" rx="4"/>`
  + t(362, 106, fmt(D.lab), "big l acc")
  + t(343, 164, "the real capture", "l") + `<rect class="bar warm in" x="343" y="180" width="386" height="26" rx="4"/>`
  + t(343, 232, fmt(D.capture), "huge l hot")
  + t(343, 318, "70 times the rows,", "h l") + t(343, 346, "the same cores", "h l dim"));

// A few of share w's rows, as the cells generate them, with a dot in the system's colour.
function shareTable(w) {
  const m = 300 * w, pick = [["NYC", 0, m], ["NYC", 1, m], ["CHI", 0, m], ["BOS", 0, m], ["PDX", 0, m], ["NYC", 0, m + 1]];
  const x = COLX(w) + 16, y = 118;
  const rows = pick.map(([s, n, min]) => [`${s}-${n}`, min, bikes(s, n, min)]);
  const dots = pick.map(([s], j) => `<circle class="dot k-${s}" cx="${x - 8}" cy="${y + 34 + j * 24 + 12}" r="4"/>`).join("");
  return `<g class="shr">${table(x, y, ["station", "min", "bikes"], rows, { pad: 12, rowH: 24 })}${dots}</g>`;
}
const sweep = (w) => `<rect class="sweep" x="${COLX(w) + 18}" y="153" width="144" height="22" rx="4"/>`;

const column = (D, w) => zone(COLX(w), 60, 180, 278) + `<rect class="own k-${OWNS[w]}" x="${COLX(w)}" y="60" width="180" height="278" rx="12"/>`
  + on("1 2", tag(CX(w), 82, `worker ${w}`) + t(CX(w), 104, `minutes ${300 * w}–${300 * w + 299}`, "v dim"))
  + on("3 4", `<g class="k-${OWNS[w]}">${tag(CX(w), 82, `worker ${w}`, "lit")}</g>` + t(CX(w), 104, `owns ${OWNS[w]}`, `kt k-${OWNS[w]}`))
  + on("1", shareTable(w) + sweep(w) + `<rect class="track" x="${COLX(w) + 16}" y="308" width="148" height="8" rx="4"/>`
    + `<rect class="grow scan" x="${COLX(w) + 16}" y="308" width="148" height="8" rx="4"/>` + t(CX(w), 328, `${fmt(D.share)} rows`, "lbl"))
  + on("2", shareTable(w))
  + on("2", `<g class="aft">${heads(w)}</g>`) + on("3 4", heads(w));
const heads = (w) => t(COLX(w) + 14, 123, "system", "lbl l") + t(COLX(w) + 109, 123, "sum", "lbl r") + t(COLX(w) + 169, 123, "count", "lbl r");

// A partial row: worker w's sum and count for system k. It starts in its own column.
const prow = (D, w, k) => { const [s] = SYSTEMS[k], [sum, n] = D.partials[w][k];
  return `<g class="mv prow lift k-${s}" data-w="${w}" data-k="${k}" ${at(COLX(w) + 6, SLOT(k), "opacity:0")}>
    <rect class="chip" width="168" height="30" rx="8"/>${t(8, 16, s, "kt l")}${t(103, 16, fmt(sum), "v s r")}${t(163, 16, fmt(n), "v s r")}</g>`; };

// The owner's merged row, then its answer, which travels to the gathering worker.
const finalCard = (D, w) => { const s = OWNS[w], k = SYSTEMS.findIndex((x) => x[0] === s);
  const sum = W4.reduce((a, v) => a + D.partials[v][k][0], 0), n = W4.reduce((a, v) => a + D.partials[v][k][1], 0);
  return `<g class="fade final lift k-${s}" data-w="${w}" style="opacity:0"><rect x="${COLX(w) + 6}" y="150" width="168" height="104" rx="12"/>
    ${t(CX(w), 172, s, "kt")}${t(CX(w), 200, `${fmt(sum)} ÷ ${fmt(n)}`, "v")}${t(CX(w), 232, `= ${D.answer[s]}`, "huge")}</g>`; };
const ansX = (j) => 214 + j * 104;
const answer = (D, w) => { const s = OWNS[w];
  return `<g class="mv ans lift k-${s}" data-w="${w}" ${at(COLX(w) + 42, 214, "opacity:0")}><rect class="chip" width="96" height="30" rx="8"/>
    ${t(8, 16, s, "kt l")}${t(88, 16, D.answer[s], "v r")}</g>`; };

// The status band under the columns: one counter on the left, what changed beside it, and Play.
const band = (step, label, start, before, after) => on(String(step), zone(11, 348, 738, 62)
  + tile(27, 368, label, start, "acc ctr") + t(292, 380, before, "l bef") + t(292, 380, after, "l aft") + play(641, 363));
const gather = () => on("4", zone(11, 348, 738, 62) + t(27, 370, "WORKER 0", "cap") + t(27, 390, "gathers", "lbl l")
  + W4.map((j) => `<rect class="slot" x="${ansX(j)}" y="364" width="96" height="30" rx="8"/>`).join("") + play(641, 363));

const scene = (D) => `<svg viewBox="0 0 760 420">
  ${machine(D)}
  ${on("1 2 3 4", zone(11, 10, 738, 40))}
  ${on("1", t(27, 31, `station_status — ${fmt(D.rows)} polls in arrival order, cut into four shares`, "mono l"))}
  ${on("2 3 4", t(27, 31, "SELECT system, avg(bikes) FROM polls GROUP BY system", "mono l"))}
  ${on("1 2 3 4", W4.map((w) => column(D, w)).join(""))}
  ${on("2 3 4", W4.map((w) => [0, 1, 2, 3].map((k) => prow(D, w, k)).join("")).join("") + W4.map((w) => finalCard(D, w)).join(""))}
  ${band(1, "ROWS SCANNED", "0", "four machines, four shares", `in the time of one share: ${fmt(D.share)}`)}
  ${band(2, "ROWS LEAVING THE SCAN", fmt(D.rows), `each worker holds ${fmt(D.share)} rows`, "4 partial rows per worker")}
  ${band(3, "PARTIAL ROWS CROSSING", "0", "owner = crc32(system) % 4", "of 16: the other 4 were already home")}
  ${gather()}
  ${on("4", W4.map((w) => answer(D, w)).join(""))}
</svg>`;

// Where a partial row stands on step `step` at level `lv` (0 before Play, 1 or 2 after).
function placeRow(g, step, lv) {
  const w = +g.dataset.w, k = +g.dataset.k, o = SYSTEMS[k][3];
  const there = step > 3 || (step === 3 && lv), hidden = step === 2 && !lv;
  const y = hidden ? 196 : there ? SLOT(step === 4 && lv ? 1.5 : w) : SLOT(k);
  g.style.transitionDelay = step === 2 && lv ? `${250 + k * 110}ms` : step === 3 && lv ? `${k * 450}ms` : step === 4 && lv ? `${w * 60}ms` : "0ms";
  move(g, COLX(there ? o : w) + 6, y);
  g.style.opacity = hidden || (step === 4 && lv) ? 0 : 1;
}

function place(root, step, lv) {
  root.classList.toggle("lv1", lv >= 1);
  root.querySelectorAll(".shr").forEach((g) => {
    const gone = step === 2 && lv; g.style.opacity = gone ? 0 : 1; g.style.transform = gone ? "scaleY(.12)" : "none"; });
  root.querySelectorAll(".prow").forEach((g) => placeRow(g, step, lv));
  root.querySelectorAll(".final").forEach((g) => { g.style.opacity = step === 4 && lv ? 1 : 0; g.style.transitionDelay = lv === 1 ? ".6s" : "0s"; });
  root.querySelectorAll(".ans").forEach((g) => { const w = +g.dataset.w;
    g.style.transitionDelay = lv === 2 ? `${w * 140}ms` : "0ms";
    move(g, lv === 2 ? ansX(w) : COLX(w) + 42, lv === 2 ? 364 : 214); g.style.opacity = lv === 2 ? 1 : 0; });
}

const ctr = (root, step) => root.querySelector(`.st[data-on="${step}"] .ctr`);
const setText = (el, text) => () => { if (el) el.textContent = text; };
const plays = {
  1: (root, b) => beats(root, [[60, () => place(root, 1, 1)], ...countUp(ctr(root, 1), 0, CAPTURED.rows, 2000, 10)], b),
  2: (root, b) => beats(root, [[60, () => place(root, 2, 1)], [900, setText(ctr(root, 2), "16")], [500, () => {}]], b),
  3: (root, b) => beats(root, [[60, () => place(root, 3, 1)], [1150, setText(ctr(root, 3), "3")],
    [450, setText(ctr(root, 3), "6")], [450, setText(ctr(root, 3), "9")], [450, setText(ctr(root, 3), "12")]], b),
  4: (root, b) => beats(root, [[60, () => place(root, 4, 1)], [1700, () => place(root, 4, 2)], [1600, () => {}]], b),
};

function after(root, step) {
  bindPlays(root, plays);
  stop(root);
  snap(root, () => {
    place(root, step, 0);
    [[1, "0"], [2, fmt(CAPTURED.rows)], [3, "0"]].forEach(([s, v]) => setText(ctr(root, s), v)());
  });
}

export default widget({ key: "sp", label: "Partial, exchange, final", css: CSS, steps, scene, captured: CAPTURED, after });
