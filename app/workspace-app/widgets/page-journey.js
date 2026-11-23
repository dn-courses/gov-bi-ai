// page-journey — where a page comes from when a query asks for it: the database's cache, the
// operating system's memory, or the disk. Captured data only for now: measured in the lab.
import { DESK, css as playCss, player } from "@widget-lib/joinplay.js";
import { stepper } from "@widget-lib/stepper.js";

const D = {
  cacheMb: 128, cachePages: 16384, dataMb: 1274, dataPages: 163123,
  // One row from each of 4,000 pages of `orders`, in ms: hit / read from OS memory / read from the device
  inOrder: [5, 55, 45], // pages 0 … 3,999
  scattered: [6, 50, 330], // one page in every 16
};
const n = (x) => x.toLocaleString("en-US");

const STEPS = [
  { stop: "Two places", title: "Memory is fast and small, storage is slow and large",
    note: `The database keeps ${D.cacheMb} MB of pages in memory. Its tables are ${n(D.dataMb)} MB on disk. Roughly one page in ten can be in memory at a time.` },
  { stop: "Read", title: "The page is not in memory", produces: "a read",
    note: `A query asks for a page. It is not in the database's memory, so it is fetched from the file and <b>kept</b>. That is a <b>read</b>.` },
  { stop: "Hit", title: "The page is already there", produces: "a hit",
    note: `Ask for the same page again. It is found in memory and nothing outside is touched. That is a <b>hit</b>.` },
  { stop: "Full", title: "Memory is full",
    note: `Every slot is taken, and a query needs a page that is not there. One page has to leave. Which one?` },
  { stop: "Counters", title: "Every page in memory carries a counter",
    note: `Press Play, or Step for one action at a time. Each time a query uses a page, its counter goes up by one, to at most 5. A high counter means "used often lately".` },
  { stop: "Sweep", title: "A hand sweeps round until it finds a page at zero", produces: "the first page found at 0",
    note: `Press Play. When room is needed, a hand moves from slot to slot, taking one off each counter. Pages still in use get theirs raised again before the hand returns.` },
  { stop: "Underneath", title: "A read is not always the disk",
    note: `The operating system keeps its own memory of file pages it served. A read by the database is often answered from there, without the disk.` },
  { stop: "Price", title: "What a read costs depends on where and in what order", decisive: true,
    note: `One row from each of 4,000 pages. A hit costs the same either way. A read from the device is about as cheap as OS memory when the pages follow each other, and ${Math.round(D.scattered[2] / D.scattered[0])} times a hit when they are scattered.` },
];

const CSS = `
.lw .pj { display:grid; gap:10px; }
.lw .pj .zone { position:relative; background:var(--panel); border:1.5px solid var(--line); border-radius:12px; padding:10px 14px 12px;
      transition:border-color .4s, opacity .4s, background .4s; }
.lw .pj h4 { margin:0 0 8px; display:flex; gap:10px; align-items:baseline; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .pj h4 span { font:12px ui-monospace, Menlo, monospace; letter-spacing:0; text-transform:none; }
.lw .pj .who { display:inline-block; padding:6px 14px; border-radius:999px; background:var(--accent-bg); color:var(--accent); font-weight:600; font-size:14px; }
.lw .pj .ask { margin-left:10px; font-size:14px; color:var(--mute); }
.lw .pj .slots { display:grid; grid-template-columns:repeat(16, 1fr); gap:5px; }
.lw .pj .slots i { height:26px; border-radius:5px; background:var(--cell); border:1px solid var(--line); transition:background .4s, border-color .4s, opacity .4s; }
.lw .pj .slots i.used { background:var(--mute); opacity:.45; }
.lw .pj .slots i.page { background:var(--accent); border-color:var(--accent); opacity:1; }
.lw .pj .slots i.out { background:var(--hot-bg); border-color:var(--hot); opacity:1; }
.lw .pj .file { height:26px; border-radius:6px; border:1px solid var(--line); background:
      repeating-linear-gradient(90deg, var(--cell) 0 9px, transparent 9px 11px); position:relative; }
.lw .pj .file b { position:absolute; left:37%; top:-1px; bottom:-1px; width:10px; border-radius:3px; background:var(--accent); opacity:0; transition:opacity .4s; }
.lw .pj .lit { border-color:var(--accent); }
.lw .pj .lit .file b { opacity:1; }
.lw .pj .os { opacity:.35; }
.lw .pj[data-at="6"] .os, .lw .pj[data-at="7"] .os { opacity:1; }
.lw .pj .verdict { position:absolute; right:14px; top:9px; padding:2px 12px; border-radius:999px; font:600 13px ui-monospace, Menlo, monospace; animation: lw-in .4s both; }
.lw .pj .verdict.read { background:var(--hot-bg); color:var(--hot); } .lw .pj .verdict.hit { background:var(--ok-bg); color:var(--ok); }
.lw .pj .clock { display:grid; grid-template-columns:repeat(8, 1fr); gap:10px; padding:6px 0 4px; }
.lw .pj .clock .slot { position:relative; padding:10px 6px 12px; border-radius:10px; background:var(--cell); border:1.5px solid var(--line); text-align:center;
      transition:border-color .3s, background .3s, opacity .3s; }
.lw .pj .clock .slot small { display:block; font:12px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .pj .clock .slot b { display:block; margin-top:4px; font:700 26px ui-monospace, Menlo, monospace; transition:color .3s; }
.lw .pj .clock .slot.zero b { color:var(--hot); }
.lw .pj .clock .slot.at { border-color:var(--accent); background:var(--accent-bg); }
.lw .pj .clock .slot.victim { border-color:var(--hot); background:var(--hot-bg); }
.lw .pj .clock .slot.fresh { border-color:var(--ok); background:var(--ok-bg); }
.lw .pj .clock .slot.fresh b { color:var(--ok); }
.lw .pj .clock .slot.at::after, .lw .pj .clock .slot.victim::after { content:"▲"; position:absolute; left:0; right:0; bottom:-22px; font-size:14px; color:var(--accent); }
.lw .pj .clock .slot.victim::after { color:var(--hot); }
.lw .pj .clockzone { padding-bottom:30px; }
.lw .pj .scale { display:grid; grid-template-columns:max-content 1fr; gap:6px 12px; align-items:center; font-size:14px; }
.lw .pj .bar { height:14px; border-radius:7px; background:var(--mute); min-width:3px; }
.lw .pj .bar.a { background:var(--accent); }
.lw .pj .price { display:grid; grid-template-columns:max-content repeat(3, 1fr); gap:10px 16px; align-items:end; font-size:14px; animation: lw-in .4s both; }
.lw .pj .price .hd { font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--mute); font-weight:600; }
.lw .pj .price .v { font:13px ui-monospace, Menlo, monospace; }
.lw .pj .price .v .bar { margin-bottom:4px; } .lw .pj .price .v .bar.hot { background:var(--hot); } .lw .pj .price .v .bar.ok { background:var(--ok); }
`;

const slots = (at) => Array.from({ length: 16 }, (_, i) => {
  const used = at >= 3 ? true : i < 9;
  const page = (at === 1 || at === 2) && i === 9 ? " page" : at === 3 && i === 4 ? " page" : "";
  const out = at === 3 && i === 9 ? " out" : "";
  return `<i class="${used ? "used" : ""}${page}${out}"></i>`;
}).join("");

const row = (label, [hit, os, disk], max) => `<span>${label}</span>
  <span class="v"><span class="bar ok" style="display:block;width:${(hit / max) * 100}%"></span>${hit} ms</span>
  <span class="v"><span class="bar" style="display:block;width:${(os / max) * 100}%"></span>${os} ms</span>
  <span class="v"><span class="bar hot" style="display:block;width:${(disk / max) * 100}%"></span>${disk} ms</span>`;

// The eviction rule, on eight slots, one action at a time. BEFORE is what the slots hold at first;
// four uses later they hold START, and the hand begins its walk at slot 0.
const NAMES = ["p.12", "p.7", "p.90", "p.3", "p.41", "p.5", "p.66", "p.28"];
const BEFORE = [1, 1, 2, 1, 2, 5, 1, 3], USED = [0, 2, 7, 5];

const slotsOf = (counts, mark = {}) => counts.map((c, i) =>
  `<div class="slot${c === 0 ? " zero" : ""}${mark.at === i ? " at" : ""}${mark.victim === i ? " victim" : ""}${mark.fresh === i ? " fresh" : ""}"><small>${mark.named === i ? "new" : NAMES[i]}</small><b>${c}</b></div>`).join("");

function uses() {
  let counts = [...BEFORE];
  const states = [{ counts, tally: [["uses", 0]], say: `Eight slots of memory. Each holds a page, and a counter of how often it was used lately.` }];
  USED.forEach((i, k) => {
    const full = counts[i] === 5;
    counts = counts.map((c, at) => (at === i ? Math.min(5, c + 1) : c));
    states.push({ counts, mark: { fresh: i }, tally: [["uses", k + 1]], say: full ? `A query uses ${NAMES[i]}. Its counter is already at 5, the most there is, and stays there.` : `A query uses ${NAMES[i]}: its counter goes up to ${counts[i]}.` });
  });
  states.push({ counts, tally: [["uses", USED.length]], say: `Pages that queries keep coming back to have high counters. Pages nobody asks for stay low.` });
  return states;
}
function sweep(start) {
  let counts = [...start], visits = 0;
  const states = [{ counts, mark: { at: 0 }, tally: [["slots visited", 0]], say: `A query needs a page that is not in memory, and every slot is taken. The hand starts at the first slot.` }];
  for (let i = 0; ; i = (i + 1) % counts.length) {
    visits += 1;
    if (counts[i] === 0) {
      states.push({ counts, mark: { victim: i }, tally: [["slots visited", visits]], say: `${NAMES[i]} is already at 0: nobody used it since the hand last passed. It leaves memory.` });
      counts = counts.map((c, at) => (at === i ? 1 : c));
      states.push({ counts, mark: { fresh: i, named: i }, tally: [["slots visited", visits]], say: `The new page takes the slot with a counter of 1. The hand stays here for the next time room is needed.` });
      return states;
    }
    counts = counts.map((c, at) => (at === i ? c - 1 : c));
    states.push({ counts, mark: { at: i }, tally: [["slots visited", visits]], say: `${NAMES[i]} is above 0: one is taken off, leaving ${counts[i]}, and the hand moves on.` });
  }
}
const USES = uses(), SWEEP = sweep(USES.at(-1).counts);
const CLOCK = { 4: { head: "Slots in memory, each with its counter", states: USES, tick: 1300 }, 5: { head: "The hand lowers counters as it passes", states: SWEEP, tick: 800 } };

const clock = (at) => `<div class="pjc">${DESK}</div><div class="zone clockzone"><h4>${CLOCK[at].head}</h4><div class="clock"></div></div>`;
function drawClock(root, s) {
  const zone = root.closest(".pj");
  zone.querySelector(".clock").innerHTML = slotsOf(s.counts, s.mark);
  root.querySelector(".say").textContent = s.say;
  root.querySelector(".counts").innerHTML = s.tally.map(([label, k]) => `<span>${label}<b>${k}</b></span>`).join("");
}

function scene(at) {
  if (at === 0) return `<div class="zone"><h4>Memory against storage, to scale</h4><div class="scale">
    <span>memory</span><span><span class="bar a" style="display:block;width:${(D.cacheMb / D.dataMb) * 100}%"></span></span>
    <span></span><span style="font:13px ui-monospace, Menlo, monospace;color:var(--mute)">${D.cacheMb} MB · ${n(D.cachePages)} pages</span>
    <span>storage</span><span><span class="bar" style="display:block;width:100%"></span></span>
    <span></span><span style="font:13px ui-monospace, Menlo, monospace;color:var(--mute)">${n(D.dataMb)} MB · ${n(D.dataPages)} pages</span></div></div>`;
  if (at === 4 || at === 5) return clock(at);
  if (at === 7) return `<div class="zone"><h4>One row from each of 4,000 pages of orders</h4><div class="price">
    <span></span><span class="hd">hit</span><span class="hd">read, from OS memory</span><span class="hd">read, from the device</span>
    ${row("pages that follow each other", D.inOrder, D.scattered[2])}${row("one page in every 16", D.scattered, D.scattered[2])}</div></div>`;
  const verdict = at === 1 ? `<span class="verdict read">read</span>` : at === 2 ? `<span class="verdict hit">hit</span>` : "";
  const fromDisk = at === 1 || at === 3;
  return `
    <div class="zone"><h4>Your connection</h4><span class="who">backend</span><span class="ask">${at === 3 ? "asks for another page" : "asks for one page of orders"}</span>${verdict}</div>
    <div class="zone${at >= 1 && at <= 3 ? " lit" : ""}"><h4>The database's memory <span>${D.cacheMb} MB · ${n(D.cachePages)} pages</span></h4><div class="slots">${slots(at)}</div></div>
    <div class="zone os${at === 6 ? " lit" : ""}"><h4>The operating system's memory <span>pages of files it served recently</span></h4><div class="file"><b></b></div></div>
    <div class="zone${fromDisk ? " lit" : ""}"><h4>Disk — the files <span>${n(D.dataMb)} MB · ${n(D.dataPages)} pages</span></h4><div class="file"><b></b></div></div>`;
}

function render({ model, el }) {
  let root, play;
  const ui = stepper({
    el, model, label: "Where a page comes from", css: playCss("pjc") + CSS, steps: () => STEPS,
    draw({ at, body }) {
      if (!root) { body.innerHTML = `<div class="pj"></div>`; root = body.querySelector(".pj"); }
      play?.stop();
      play = null;
      root.dataset.at = at;
      root.innerHTML = scene(at);
      if (!CLOCK[at]) return;
      play = player(root.querySelector(".pjc"), [CLOCK[at]], drawClock); // one played phase per clock step
      play.enter(0);
    },
  });
  ui.show(Number(model?.get?.("start") ?? 0));
  return () => { play?.stop(); ui.destroy(); };
}
export default { render };
