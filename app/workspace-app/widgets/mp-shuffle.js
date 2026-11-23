// mp-shuffle — when the rows themselves must meet: counting how often a station ran empty needs a
// station's polls in order on one worker, but each share holds a slice of every station's time.
// So every row is sent to the worker its station hashes to: the shuffle. Step 1 has Play.
// Numbers: the page's own Python cells, run 2026-11-23 in the lesson app on the postgres lab.
// The polls of NYC-3 are the cells' generator (mp-lib's bikes()). A square is a real row of its
// share: worker w walks its share from row w·1,231 in strides of 7,919 (the cells' row order: per
// minute NYC, CHI, BOS, PDX stations) and keeps the first ten rows bound for each worker, which it
// learns from crc32(station) % 4, as the cell does. Ten of each 40 stay home and 30 cross: 3 in 4,
// as 900,000 of 1,200,000 do.
import { LOOK, at, beats, bikes, bindPlays, countUp, fmt, move, on, owner, play, snap, stop, t, tag, widget, zone } from "./mp-lib.js";

const CAPTURED = {
  rows: 1200000, share: 300000, moved: 900000, alone: 57513, right: 57658, partialRows: 16,
  received: [[296400, 247], [303600, 253], [296400, 247], [303600, 253]],
};

const steps = (D) => [
  { stop: "Rows must meet", title: "Some answers need the rows themselves in one place",
    note: `How often did a station run empty? That needs each station's polls in time order, and each share holds only a slice of that time. Counted share by share and added up, the answer is <b>${fmt(D.alone)}</b>; the right answer is <b>${fmt(D.right)}</b>. No sum and count can repair that.` },
  { stop: "Shuffle", title: "The shuffle: every row goes to the worker that owns its key", decisive: true,
    note: `The key is now the station. Press <b>Play</b>: every worker sends each of its rows to the worker its station hashes to. All <b>${fmt(D.rows)}</b> rows are redistributed and ${fmt(D.moved)} of them cross the network, against ${D.partialRows} partial rows for the average.` },
];

const CSS = LOOK("sh") + `
.lw .sh .w0 { --k:var(--ok); } .lw .sh .w1 { --k:var(--ink); } .lw .sh .w2 { --k:var(--accent); } .lw .sh .w3 { --k:var(--hot); }
.lw .sh .tok { fill:var(--k); transition:transform 1.4s cubic-bezier(.5,0,.25,1); }
.lw .sh .tok.home { opacity:.4; }
.lw .sh .stripe { fill:var(--k); }
.lw .sh .band { fill:var(--cell); opacity:.55; }
.lw .sh .poll { fill:var(--cell); stroke:var(--line); }
.lw .sh .poll.empty { fill:var(--hot-bg); stroke:var(--hot); stroke-width:2; }
.lw .sh .edge2 { stroke:var(--hot); stroke-width:2; stroke-dasharray:6 5; }
.lw .sh .net { fill:var(--accent-bg); stroke:var(--accent); stroke-opacity:.5; }
.lw .sh .netfill { fill:var(--accent); opacity:.18; transform:scaleX(0); }
.lw .sh.lv1 .netfill { transform:scaleX(1); transition-duration:3.2s; }
.lw .sh .meter { transform:scaleX(0); }
.lw .sh.lv1 .meter { transform:scaleX(1); transition-duration:3.2s; }
.lw .sh .aft { opacity:0; transition:opacity .5s; } .lw .sh.lv1 .aft { opacity:1; transition-delay:3s; }
.lw .sh .pillh { fill:var(--hot-bg); stroke:var(--hot); }
`;

// Step 0: NYC-3's polls around the edge between share 0 and share 1.
const MINUTES = [296, 297, 298, 299, 300, 301, 302, 303];
const pollCell = (m, i) => { const x = 70 + i * 80 + (i > 3 ? 20 : 0), v = bikes("NYC", 3, m);
  return `<rect class="poll ${v === 0 ? "empty" : ""}" x="${x}" y="96" width="64" height="52" rx="8"/>`
    + t(x + 32, 116, v, `big ${v === 0 ? "hot" : ""}`) + t(x + 32, 138, `min ${m}`, "lbl"); };
const edge = (D) => on("0", zone(11, 10, 738, 232, "ONE STATION, NYC-3, POLL BY POLL: BIKES AVAILABLE")
  + `<rect class="band" x="56" y="44" width="324" height="120" rx="12"/><rect class="band" x="404" y="44" width="324" height="120" rx="12"/>`
  + tag(218, 70, "worker 0") + t(300, 71, "min 0–299", "lbl l") + tag(566, 70, "worker 1") + t(648, 71, "min 300–599", "lbl l")
  + MINUTES.map(pollCell).join("") + `<path class="edge2" d="M392 44 V164 M392 196 V228"/>`
  + t(392, 180, "1 → 0: it ran empty here", "hot")
  + t(218, 212, "never sees the 0", "dim") + t(566, 212, "sees a 0 with no poll before it", "dim")
  + zone(11, 254, 738, 156, "THE TIMES A STATION RAN EMPTY")
  + t(27, 298, "each worker on its own share, added up", "l") + t(733, 298, fmt(D.alone), "huge r")
  + t(27, 340, "every row of a station in one place", "l") + t(733, 340, fmt(D.right), "huge r acc")
  + `<rect class="pillh" x="27" y="366" width="${fmt(D.right - D.alone).length * 9.6 + 82}" height="28" rx="14"/>`
  + t(41, 381, `${fmt(D.right - D.alone)} missed`, "big l hot")
  + t(fmt(D.right - D.alone).length * 9.6 + 124, 381, "every one at the edge between two shares", "lbl l"));

// Step 1: 40 sample rows per worker, each a square coloured by the worker it goes to.
const COLX = (i) => 11 + i * 186, CX = (i) => COLX(i) + 90, PER = 40, SRC_Y = 52, DST_Y = 236;
const cellXY = (w, n, y0) => [COLX(w) + 20 + (n % 10) * 14, y0 + Math.floor(n / 10) * 14];
function station(i) { // row i of the table, in the cells' order: per minute NYC, CHI, BOS, PDX stations
  const p = i % 1000;
  return p < 600 ? `NYC-${p}` : p < 850 ? `CHI-${p - 600}` : p < 950 ? `BOS-${p - 850}` : `PDX-${p - 950}`;
}
function sample(w) { // the first ten rows bound for each worker, on a stride-7,919 walk of share w
  const got = [], fill = [0, 0, 0, 0];
  for (let n = 0; got.length < PER; n++) {
    const o = owner(station(w * 300000 + ((w * 1231 + n * 7919) % 300000)));
    if (fill[o] < PER / 4) { fill[o]++; got.push(o); }
  }
  return got;
}
const SAMPLE = [0, 1, 2, 3].map(sample);
// Where each square lands: in its owner's inbox, one row per sender, in sending order.
const LANDING = SAMPLE.map((row, w) => { const fill = [0, 0, 0, 0]; return row.map((o) => w * 10 + fill[o]++); });

const tokens = () => SAMPLE.map((row, w) => row.map((o, j) => { const [x, y] = cellXY(w, j, SRC_Y);
  return `<rect class="tok w${o} ${o === w ? "home" : ""}" data-w="${w}" data-j="${j}" width="11" height="11" rx="2" ${at(x, y)}/>`; }).join("")).join("");

const worker = (D, w) => zone(COLX(w), 10, 180, 124) + tag(CX(w), 32, `worker ${w}`) + t(CX(w), 120, `${fmt(D.share)} rows`, "lbl")
  + zone(COLX(w), 192, 180, 150) + `<rect class="stripe w${w}" x="${COLX(w) + 20}" y="196" width="140" height="4" rx="2"/>`
  + t(CX(w), 218, `worker ${w} receives`, "lbl") + t(CX(w), 318, `${fmt(D.received[w][0])} rows`, "v aft");

const meterRow = (y, label, w, value, cls) => t(27, y, label, "lbl l") + `<rect class="track" x="230" y="${y - 7}" width="240" height="14" rx="7" style="fill:var(--cell)"/>`
  + `<rect class="bar ${cls}" x="230" y="${y - 7}" width="${w}" height="14" rx="7"/>` + value;
const footer = (D) => zone(11, 350, 738, 60)
  + meterRow(370, "rows crossing the network", 240, t(482, 371, "0", "big l acc moved-n"), "on grow meter")
  + meterRow(394, "partial rows, for the average", 3, t(482, 395, String(D.partialRows), "big l"), "on")
  + play(641, 364);

const shuffleScene = (D) => on("1", [0, 1, 2, 3].map((w) => worker(D, w)).join("")
  + `<rect class="net" x="11" y="142" width="738" height="42" rx="10"/><rect class="grow netfill" x="11" y="142" width="738" height="42" rx="10"/>`
  + t(27, 164, "NETWORK", "cap") + t(420, 164, "colour: the worker a row goes to · faded: it stays home", "lbl")
  + `<g>${tokens()}</g>` + footer(D));

const scene = (D) => `<svg viewBox="0 0 760 420">${edge(D)}${shuffleScene(D)}</svg>`;

function place(root, lv) {
  root.classList.toggle("lv1", lv > 0);
  root.querySelectorAll(".tok[data-j]").forEach((g) => {
    const w = +g.dataset.w, j = +g.dataset.j, o = SAMPLE[w][j];
    const [x, y] = lv ? cellXY(o, LANDING[w][j], DST_Y) : cellXY(w, j, SRC_Y);
    g.style.transitionDelay = lv ? `${(j * 47) % 1800 + w * 40}ms` : "0ms";
    move(g, x, y);
  });
}

const counter = (root) => root.querySelector(".moved-n");
const plays = {
  1: (root, b) => beats(root, [[60, () => place(root, 1)], ...countUp(counter(root), 0, CAPTURED.moved, 3200, 16), [300, () => {}]], b),
};

function after(root) {
  bindPlays(root, plays);
  stop(root);
  snap(root, () => { place(root, 0); const c = counter(root); if (c) c.textContent = "0"; });
}

export default widget({ key: "sh", label: "The shuffle", css: CSS, steps, scene, captured: CAPTURED, after });
