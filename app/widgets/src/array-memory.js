// array-memory — an array as one block of memory, one action at a time: any slot is one
// computation away; memory arrives in chunks, so visiting slots in sequence fetches far less often
// than visiting them scattered; then the same two habits in a table's file, an array of pages.
import { DESK, css, drive, last, scaled } from "../lib/joinplay.js";
import { fmt, scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const SLOTS = 16, CHUNK = 4; // slots drawn; slots that arrive together in the toy
// seq / scat: seconds to visit 5,000,000 slots in sequence and in random order (the lesson's Python cell).
const D = { seq: 0.17, scat: 0.92, bytes: 546054144, pages: 66657, page: 55991 };
const SCATTERED = [9, 2, 14, 5, 6, 11, 0, 12, 3, 8, 10, 15, 1, 4, 7, 13];
const TILES = [0, 1, 2, null, D.page, null, D.pages - 1]; // the pages drawn; null is a gap
const chunk = (i) => Math.floor(i / CHUNK);

function jump() {
  const base = { view: "mem", seen: new Set() }, states = [{ ...base, counts: [["slots looked at", 0]], say: `Every slot is 8 bytes wide, so where a slot begins can be computed.` }];
  [5, 13].forEach((i, n) => {
    const calc = `start + ${i} × 8 = start + ${i * 8}`;
    states.push({ ...base, calc, counts: [["slots looked at", n]], say: `Slot ${i} is wanted. It begins ${i} × 8 = ${i * 8} bytes after the start of the block.` });
    states.push({ ...base, calc, slot: i, tone: "hit", counts: [["slots looked at", n + 1]], say: `Go to that address: the value is ${i + 1}. One look, and no slot before it was touched.` });
  });
  states.push({ ...base, calc: `start + 4,199,999 × 8`, counts: [["slots looked at", 2]], say: `Slot 4,199,999 of five million costs the same: one multiplication, one look.` });
  return states;
}
// Visit the slots in `order`. The toy keeps one chunk at hand: a visit outside it is a fetch.
function visit(order, opening, closing) {
  let seen = new Set(), held = -1, fetches = 0;
  const counts = (n) => [["slots visited", n], ["fetches from memory", fetches]];
  const states = [{ view: "mem", tray: true, held, seen, counts: counts(0), say: opening }];
  order.forEach((i, n) => {
    const fetch = chunk(i) !== held;
    fetches += fetch ? 1 : 0; held = chunk(i); seen = new Set([...seen, i]);
    states.push({ view: "mem", tray: true, held, seen, slot: i, tone: fetch ? "miss" : "hit", fly: fetch ? [[`.chunk[data-c="${held}"]`, ".tray"]] : [], counts: counts(n + 1),
      say: fetch ? `Slot ${i} is not at hand. Its whole chunk is fetched: slots ${held * CHUNK} to ${held * CHUNK + CHUNK - 1}.` : `Slot ${i} is already at hand: it arrived with its neighbour.` });
  });
  states.push({ ...last(states), slot: -1, fly: [], say: closing(fetches) });
  return states;
}
function file() {
  const base = { view: "file", pages: [], counts: [] }, calc = `${fmt(D.page)} × 8,192 = byte ${fmt(D.page * 8192)}`;
  return [
    { ...base, say: `The file of orders is an array one size up: ${fmt(D.pages)} pages of 8,192 bytes each, side by side.` },
    { ...base, calc, say: `Page ${fmt(D.page)} is wanted. Every page is the same size, so where it begins is computed.` },
    { ...base, calc, pages: [D.page], say: `Jump there: one page read out of ${fmt(D.pages)}.` },
    { ...base, pages: [0], say: `And a scan of the table reads the pages in sequence, from the first.` },
    { ...base, pages: [0, 1], say: `In sequence the next pages can be fetched ahead of time, like the neighbours in a chunk.` },
    { ...base, pages: [0, 1, 2], say: `Jump to a page, or read pages in sequence: the two ways a database reads a table.` },
  ];
}
const SEQUENCE = visit(Array.from({ length: SLOTS }, (_, i) => i), `Memory is not fetched one slot at a time. It arrives in chunks: here, ${CHUNK} slots together. Visit every slot in sequence.`,
  (n) => `${SLOTS} slots visited with ${n} fetches. Three visits out of four found the slot already at hand.`);
const SCATTER = visit(SCATTERED, `The same ${SLOTS} slots, visited in a scattered order. This toy keeps one chunk at hand.`,
  (n) => `The same ${SLOTS} slots, the same work, and ${n} fetches. Almost every visit paid for a chunk and used one slot of it.`);
const fetches = (states) => last(states).counts[1][1];
const PHASES = [{ states: [{ view: "mem", seen: new Set(), counts: [], say: `${SLOTS} of the slots. Above each, its number. Below, how far from the start it begins.` }] },
  { states: jump(), tick: 1300 }, { states: SEQUENCE, tick: 450 }, { states: SCATTER, tick: 600 }, { plain: true, states: [last(SCATTER)] }, { states: file(), tick: 1400 }];

const steps = () => [
  { stop: "One block", title: "An array is one block of memory",
    note: `5,000,000 numbers of 8 bytes each sit side by side: 40,000,000 bytes in a row, with nothing in between.` },
  { stop: "Jump", title: "Any slot is one computation away",
    note: `Press Play, or Step for one action at a time. No searching: compute the address, go there.` },
  { stop: "In sequence", title: "Neighbours arrive together",
    note: `Press Play. A real machine fetches 64 bytes at a time: eight of these numbers.` },
  { stop: "Scattered", title: "The same slots, in a scattered order",
    note: `Press Play. Each jump lands in another chunk, and the chunk fetched before is wasted.` },
  { stop: "At scale", title: "Same slots, same work, several times the time",
    note: `Nothing changed but the order of the visits. What is paid for is fetching, and reading in sequence fetches the least.` },
  { stop: "In the database", title: "A table's file is an array of pages", decisive: true,
    note: `Press Play. The slot is a page of 8,192 bytes, and the block is a file of ${fmt(D.bytes)} bytes.` },
];

const CSS = `
.lw .am .calc { font:600 16px ui-monospace, Menlo, monospace; text-align:center; min-height:24px; margin-top:12px; color:var(--accent); }
.lw .am .mem { display:grid; grid-template-columns:repeat(${SLOTS / CHUNK}, 1fr); gap:10px; }
.lw .am .chunk { display:grid; grid-template-columns:repeat(${CHUNK}, 1fr); gap:3px; padding:4px; border-radius:10px; border:1.5px solid transparent; transition:border-color .25s, background .25s; }
.lw .am.chunks .chunk { border:1.5px dashed var(--line); } .lw .am.chunks .chunk.held { border-style:solid; border-color:var(--accent); background:var(--accent-bg); }
.lw .am .slot { text-align:center; font:13px ui-monospace, Menlo, monospace; }
.lw .am .slot small { display:block; font-size:11px; color:var(--mute); line-height:1.7; }
.lw .am .slot b, .lw .am .tray b, .lw .am .tile { display:block; padding:8px 0; border-radius:7px; background:var(--cell); border:1.5px solid transparent; font-weight:600; transition:background .25s, border-color .25s, color .25s; }
.lw .am .slot.seen b { border-color:var(--line); color:var(--mute); }
.lw .am .slot.now b, .lw .am .tile.now { border-color:var(--ok); background:var(--ok-bg); color:var(--ok); }
.lw .am .slot.now.miss b { border-color:var(--hot); background:var(--hot-bg); color:var(--hot); }
.lw .am .tray { display:grid; grid-template-columns:repeat(${CHUNK}, 64px); gap:4px; min-height:38px; font:13px ui-monospace, Menlo, monospace; text-align:center; }
.lw .am .tray i { grid-column:1 / -1; font-style:normal; color:var(--mute); text-align:left; align-self:center; }
.lw .am .tiles { display:grid; grid-template-columns:repeat(${TILES.length}, 1fr); gap:8px; align-items:center; text-align:center; font:13px ui-monospace, Menlo, monospace; }
.lw .am .tile small { display:block; font:11px system-ui, sans-serif; color:var(--mute); font-weight:400; }
.lw .am:not(.chunks) .trayc, .lw .am:not(.infile) .filec, .lw .am.infile .memc, .lw .am.infile .trayc { display:none; }
`;
const slot = (i) => `<div class="slot" data-i="${i}"><small>${i}</small><b>${i + 1}</b><small>${i ? "+" + i * 8 : "start"}</small></div>`;
const scene = () => `${DESK}
  <div class="card memc"><h4>Memory: the first ${SLOTS} slots of 5,000,000 · slot number, value, address</h4>
    <div class="mem">${Array.from({ length: SLOTS / CHUNK }, (_, c) => `<div class="chunk" data-c="${c}">${Array.from({ length: CHUNK }, (_, n) => slot(c * CHUNK + n)).join("")}</div>`).join("")}</div>
    <div class="calc"></div></div>
  <div class="card trayc"><h4>At hand: the chunk fetched last</h4><div class="tray"></div></div>
  <div class="card filec"><h4>The file of orders · ${fmt(D.bytes)} bytes = ${fmt(D.pages)} pages × 8,192</h4>
    <div class="tiles">${TILES.map((p) => (p === null ? `<span>· · ·</span>` : `<span class="tile" data-p="${p}"><small>page</small>${fmt(p)}</span>`)).join("")}</div>
    <div class="calc"></div></div>
  ${scaled("The same slots, visited in two orders", `data-on="4"`, ["in sequence", "scattered"], [
    [`${SLOTS} slots`, "the animation", [`${fetches(SEQUENCE)} fetches`], [`${fetches(SCATTER)} fetches`]],
    ["5,000,000 slots", "measured: the Python cell", [`${D.seq} s`, "", "pick"], [`${D.scat} s`, `<b>${(D.scat / D.seq).toFixed(1)}×</b> slower`, "slow"]],
  ])}`;

function draw(root, s) {
  root.classList.toggle("chunks", Boolean(s.tray));
  root.classList.toggle("infile", s.view === "file");
  root.querySelectorAll(".chunk").forEach((c, i) => c.classList.toggle("held", i === s.held));
  root.querySelectorAll(".slot").forEach((el, i) => { el.className = "slot" + (s.seen?.has(i) ? " seen" : "") + (i === s.slot ? ` now ${s.tone ?? ""}` : ""); });
  root.querySelector(".tray").innerHTML = s.held >= 0 ? Array.from({ length: CHUNK }, (_, n) => `<b>${s.held * CHUNK + n + 1}</b>`).join("") : "<i>nothing yet</i>";
  root.querySelectorAll(".tile").forEach((t) => t.classList.toggle("now", (s.pages ?? []).includes(Number(t.dataset.p))));
  root.querySelectorAll(".calc").forEach((c) => { c.textContent = s.calc ?? ""; });
  root.querySelector(".say").textContent = s.say;
  root.querySelector(".counts").innerHTML = s.counts.map(([label, n]) => `<span>${label}<b>${n}</b></span>`).join("");
}

export default { render: build({ stepper, key: "am", label: "An array in memory", css: css("am") + CSS, steps, scene, after: (root, at) => drive(root, at, PHASES, draw) }) };
