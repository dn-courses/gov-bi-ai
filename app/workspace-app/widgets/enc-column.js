// enc-column — one column of the bike-share file, encoded: why it is many bytes that repeat, a
// dictionary that turns names into short codes (Play), runs of equal codes, what sorting does to the
// runs (Play), and compression as a general squeeze of the bytes on top of the encoding.
import { arrow, fmt, on, t, widget, zone, extra } from "./col-lib.js";

// Measured 2026-11-23 with the page's own cells (lab :3111, DuckDB 2.0, station_status.parquet):
//   values, writtenMb, distinct   count(*), sum(strlen(name)) / 1e6, count(DISTINCT name)
//   dictKb, bits, codesMb         the distinct names' bytes; ceil(log2(1000)); 25.92M × 10 bits
//   runs / byTimeRuns             equal neighbours counted with lag() in station order / in time order
//   byStationMb / byTimeMb        the name column written alone, sorted each way (parquet_metadata)
//   zIn, zRep, zRand              zlib.compress of b"NYC,JC,BOS,CHI,DC,SF," * 1000 and of random bytes
const CAPTURED = {
  values: 25920000, writtenMb: 952, distinct: 1000, dictKb: 36.7, bits: 10, codesMb: 32.4,
  runLen: 25920, runs: 1000, byTimeRuns: 25920000, byStationMb: 0.1, byTimeMb: 41.1,
  zIn: 21000, zRep: 97, zRand: 21016,
  names: ["Station 1 — Grove St PATH", "Station 2 — Harvard Square at Mass Ave", "Station 3 — Clark St &amp; Elm St"],
};

const steps = (D) => [
  { stop: "The need", title: "One column: many bytes, and most of them repeat",
    note: `The <code>name</code> column of <code>station_status.parquet</code> holds <b>${fmt(D.values)} values</b>, <b>${D.writtenMb} MB</b> written out one after another, and only <b>${fmt(D.distinct)}</b> of them are different. A denormalized table repeats the station's name on every poll, and that repetition is exactly what an encoding eats.` },
  { stop: "Dictionary", title: "A dictionary: each name once, then short codes",
    note: `Press <b>Play</b>. A new name goes into the dictionary once and gets a number; the column keeps only the numbers. ${fmt(D.distinct)} names fit in ${D.bits}-bit codes, so ${D.writtenMb} MB becomes <b>${D.codesMb} MB</b> of codes and a ${D.dictKb} KB dictionary. Nothing is lost: a code looks its name back up.` },
  { stop: "Runs", title: "Runs: a value and how many times in a row",
    note: `The file holds the polls station by station, so each code repeats ${fmt(D.runLen)} times in a row. A run stores the code once and the count: the whole column is <b>${fmt(D.runs)} runs</b> in place of ${fmt(D.values)} codes.` },
  { stop: "Sorting", title: "Sorting makes the runs", decisive: true,
    note: `Polls arrive by time: station 1, 2, 3, then 1, 2, 3 again. No two neighbours are equal, so there are ${fmt(D.byTimeRuns)} runs. Press <b>Play</b> to sort by station. Written alone, the column is <b>${D.byTimeMb} MB</b> in arrival order and <b>${D.byStationMb} MB</b> sorted.` },
  { stop: "Squeeze", title: "Compression: a general squeeze on top",
    note: `After the encoding, a compressor squeezes the bytes. It knows nothing about columns: where a stretch of bytes appeared before, it writes a pointer back to it. Repetition shrinks, ${fmt(D.zIn)} bytes to ${D.zRep}; bytes with no pattern do not shrink at all.` },
];

const CSS = extra("ec") + `
.lw .ec text.cap { font-size:12px; }
.lw .ec .cell { fill:var(--cell); stroke:var(--line); stroke-width:1; }
.lw .ec .s0 { fill:var(--accent-bg); stroke:var(--accent); } .lw .ec .s1 { fill:var(--ok-bg); stroke:var(--ok); }
.lw .ec .s2 { fill:var(--hot-bg); stroke:var(--hot); }
.lw .ec .tile { fill:var(--cell); stroke:var(--line); stroke-width:1; }
.lw .ec .tick.hot { fill:var(--hot); } .lw .ec .tick.acc { fill:var(--accent); } .lw .ec .tick { fill:var(--mute); }
.lw .ec text.sm { font:12px ui-monospace, SFMono-Regular, Menlo, monospace; }
.lw .ec text.code { font:600 15px ui-monospace, Menlo, monospace; }
.lw .ec text.num { font:700 30px ui-monospace, Menlo, monospace; text-anchor:start; }
.lw .ec .fade { transition:opacity .4s; } .lw .ec .fade.gone { opacity:.22; } .lw .ec .ph.gone, .lw .ec .ush.gone { opacity:0; }
.lw .ec .ush { transition:opacity .35s; }
.lw .ec .pop { opacity:0; transition:opacity .45s; } .lw .ec .pop.in { opacity:1; }
.lw .ec .mv { transition:transform .9s cubic-bezier(.65,0,.35,1); }
.lw .ec .bar.hot { fill:var(--hot); } .lw .ec .bar.acc { fill:var(--accent); }
.lw .ec .play { cursor:pointer; } .lw .ec .st.on .play { pointer-events:auto; }
.lw .ec .play rect { fill:var(--accent); stroke:none; } .lw .ec .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .ec .play.busy { opacity:.45; pointer-events:none; }
.lw .ec .badge { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1; }
.lw .ec .ptr { fill:none; stroke:var(--accent); stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
`;

const ROWS = [0, 0, 0, 1, 1, 1, 2, 2, 2]; // the station of each drawn poll, as the file holds them
const RY = (i) => 48 + i * 26;
const playBtn = (x, y, k) => `<g class="play" data-k="${k}"><rect x="${x}" y="${y}" width="96" height="32" rx="16"/>${t(x + 48, y + 17, "▶ Play")}</g>`;
const chip = (x, y, s, w = 34, h = 22) => `<rect class="cell s${s}" x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/>${t(x + w / 2, y + h / 2 + 1, s, "code")}`;

// The column of names, drawn as it lies in the file: three stations, three polls of each shown.
const names = (D, fade, w = 314, cls = "mono l") => ROWS.map((s, i) => `<g class="${fade ? "fade nm" : ""}" data-i="${i}">
  <rect class="cell s${s}" x="40" y="${RY(i)}" width="${w}" height="22" rx="5"/>${t(50, RY(i) + 12, D.names[s], cls)}</g>`).join("");

// A figure on its own card: a coloured mark, a small caption, the number, and what it counts.
const tile = (y, cap, value, sub, cls) => `<rect class="tile" x="388" y="${y}" width="348" height="104" rx="12"/>
  <rect class="tick ${cls}" x="388" y="${y + 18}" width="4" height="68" rx="2"/>${t(410, y + 24, cap, "cap")}
  ${t(410, y + 58, value, `num ${cls}`)}${t(410, y + 86, sub, "lbl l")}`;

function need(D) {
  return `${zone(24, 14, 346, 342, "name — AS THE FILE HOLDS IT")}${names(D, false)}
    ${t(40, 304, `· · · ${fmt(D.values)} values`, "lbl l")}${t(40, 326, `${fmt(D.runLen)} polls of each station`, "lbl l")}
    ${tile(14, "VALUES", fmt(D.values), "one per poll", "")}
    ${tile(133, "WRITTEN OUT", `${D.writtenMb} MB`, "one name after another", "hot")}
    ${tile(252, "DIFFERENT", fmt(D.distinct), `names — each one ${fmt(D.runLen)} times`, "acc")}`;
}

const sized = (y, label, w, val, cls) => `${t(424, y, label, "lbl l")}
  <rect class="bar ${cls}" x="512" y="${y - 9}" width="${Math.max(3, w)}" height="18" rx="4"/>${t(Math.max(3, w) + 522, y + 1, val, "big l")}`;

function dictionary(D) {
  const codes = ROWS.map((s, i) => `<g class="pop cd" data-i="${i}"><path class="edge" d="M342 ${RY(i) + 11} H352"/>${chip(354, RY(i), s)}</g>`).join("");
  const entries = [0, 1, 2].map((s) => `<g class="pop de" data-s="${s}">${chip(424, 52 + s * 32, s, 28, 24)}
    ${t(462, 65 + s * 32, D.names[s], "sm l")}</g>`).join("");
  return `${zone(24, 14, 372, 342, "name  →  CODE")}${names(D, true, 296, "sm l")}${codes}${playBtn(40, 310, "dict")}
    ${t(148, 327, "one poll at a time", "lbl l")}
    ${zone(408, 14, 338, 164, "THE DICTIONARY — EACH NAME ONCE")}${t(577, 98, "empty until a name arrives", "lbl ph fade")}${entries}
    ${t(424, 160, `· · · ${fmt(D.distinct)} names, ${D.bits}-bit codes`, "lbl l pop sz")}
    ${zone(408, 190, 338, 166, "THE WHOLE COLUMN")}
    ${sized(236, "written out", 140, `${D.writtenMb} MB`, "hot")}
    <g class="pop sz">${sized(282, "codes", (140 * D.codesMb) / D.writtenMb, `${D.codesMb} MB`, "acc")}
    ${sized(328, "dictionary", 0, `${D.dictKb} KB`, "acc")}</g>`;
}

function runs(D) {
  const cells = ROWS.map((s, i) => chip(40, RY(i), s)).join("");
  const groups = [0, 1, 2].map((s) => { const y = RY(s * 3), mid = y + 37;
    return `<path class="edge" d="M84 ${y + 2} h8 v70 h-8"/>${t(102, mid, `${fmt(D.runLen)} in a row`, "lbl l")}
      ${arrow(226, mid, 404, mid)}<rect class="cell s${s}" x="420" y="${mid - 20}" width="220" height="40" rx="20"/>
      ${t(530, mid + 1, `${s}  ×  ${fmt(D.runLen)}`, "big")}`; }).join("");
  return `${zone(24, 14, 712, 342, "")}${t(40, 33, "THE CODES, IN FILE ORDER", "cap")}${t(420, 33, "STORED AS RUNS — A CODE AND A COUNT", "cap")}
    ${cells}${groups}${t(40, 304, `· · · station 4, 5, … ${fmt(D.distinct)}`, "lbl l")}
    ${t(420, 300, `${fmt(D.runs)} runs in all`, "big l acc")}${t(420, 324, `in place of ${fmt(D.values)} codes`, "lbl l")}`;
}

// Twelve polls (3 stations × 4) in arrival order; Play moves each to its place in station order.
const ARRIVE = Array.from({ length: 12 }, (_, i) => ({ s: i % 3, p: Math.floor(i / 3) }));
const CX = (k) => 58 + k * 54;
const sortRow = (D, y, label, runsN, mb, cls) => { const w = Math.max(3, (380 * mb) / D.byTimeMb);
  return `${t(44, y - 6, label, "l")}${t(44, y + 15, `${fmt(runsN)} runs`, "lbl l")}
    <rect class="bar ghost" x="270" y="${y - 12}" width="380" height="24" rx="5"/><rect class="bar ${cls}" x="270" y="${y - 12}" width="${w}" height="24" rx="5"/>
    ${t(662, y + 1, `${mb} MB`, `big l ${cls}`)}`; };

function sorting(D) {
  const cells = ARRIVE.map(({ s, p }, i) => `<g class="mv" data-to="${s * 4 + p}" data-from="${i}" style="transform:translate(${CX(i)}px,0px)">
    ${chip(0, 60, s, 46, 40)}${t(23, 116, `00:${String(p * 5).padStart(2, "0")}`, "lbl")}</g>`).join("");
  const shorts = ARRIVE.map((_, i) => `<rect class="bar ghost ush" x="${CX(i)}" y="134" width="46" height="8" rx="4"/>`).join("");
  const pills = [0, 1, 2].map((s) => `<g class="pop rn"><rect class="cell s${s}" x="${CX(s * 4)}" y="130" width="208" height="30" rx="15"/>${t(CX(s * 4) + 104, 146, `${s} × 4`, "big")}</g>`).join("");
  return `${zone(24, 14, 712, 168, "")}${t(40, 33, "AS THE POLLS ARRIVE — BY TIME", "cap ord")}${cells}${shorts}${pills}
    <rect class="badge" x="616" y="20" width="104" height="28" rx="14"/>${t(668, 35, "runs: 12", "big rc")}${playBtn(500, 18, "sort")}
    ${zone(24, 196, 712, 160, "THE WHOLE name COLUMN, WRITTEN ALONE — SIZE AFTER ENCODING")}
    ${sortRow(D, 250, "in arrival order", D.byTimeRuns, D.byTimeMb, "hot")}${sortRow(D, 314, "sorted by station", D.runs, D.byStationMb, "acc")}`;
}

const TEXT = "NYC,JC,BOS,CHI,DC,SF,", CW = 162, C0 = 112;
const chunk = (x, y, cls) => `<rect class="cell ${cls}" x="${x}" y="${y}" width="${CW}" height="26" rx="6"/>${t(x + 6, y + 14, TEXT, `sm l${cls ? "" : " dim"}`)}`;
const stage = (x, label, sub, cls) => `<rect class="pill ${cls}" x="${x}" y="22" width="140" height="40" rx="20"/>${t(x + 70, 43, label)}${t(x + 70, 80, sub, "lbl")}`;
const zbar = (D, y, label, out, cls) => `${t(44, y + 1, label, "l")}<rect class="bar ghost" x="200" y="${y - 10}" width="320" height="20" rx="5"/>
  <rect class="bar ${cls}" x="200" y="${y - 10}" width="${Math.max(3, (320 * out) / D.zIn)}" height="20" rx="5"/>${t(536, y + 1, `${fmt(D.zIn)} → ${fmt(out)} bytes`, "mono l")}`;

function squeeze(D) {
  const back = C0 + CW + 40;
  return `${stage(40, "values", "a column of names", "")}${stage(220, "encode", "knows it is a column", "")}
    ${stage(400, "squeeze", "knows only bytes", "hit")}${stage(580, "file", "on disk", "")}
    ${arrow(184, 42, 216, 42, "")}${arrow(364, 42, 396, 42, "")}${arrow(544, 42, 576, 42, "")}
    ${zone(24, 100, 712, 146, "A REPEAT BECOMES A POINTER BACK")}
    ${t(40, 148, "bytes", "lbl l")}${chunk(C0, 135, "s0")}${chunk(C0 + 168, 135, "")}${chunk(C0 + 336, 135, "")}
    ${t(C0 + 512, 148, "· · · 1,000 times", "lbl l")}
    ${t(40, 214, "squeezed", "lbl l")}${chunk(C0, 201, "s0")}
    <rect class="pill hit" x="${C0 + 168}" y="199" width="236" height="30" rx="15"/>${t(C0 + 286, 215, "go back 21 bytes and copy")}
    <path class="ptr" d="M${back} 199 C ${back - 10} 178, ${C0 + 100} 176, ${C0 + 81} 198 M${C0 + 75} 191 L${C0 + 81} 198 L${C0 + 89} 193"/>
    ${zone(24, 258, 712, 98, `${fmt(D.zIn)} BYTES IN, COMPRESSED`)}${zbar(D, 296, "repeating text", D.zRep, "acc")}${zbar(D, 330, "random bytes", D.zRand, "hot")}`;
}

const scene = (D) => `<svg viewBox="0 0 760 370">
  ${on("0", need(D))}${on("1", dictionary(D))}${on("2", runs(D))}${on("3", sorting(D))}${on("4", squeeze(D))}</svg>`;

// Play on the dictionary step: row by row, the name dims, its code appears, a new name enters the dictionary.
function playDict(root) {
  reset(root);
  root.querySelector('[data-k="dict"]').classList.add("busy");
  root.querySelector(".ph").classList.add("gone");
  ROWS.forEach((s, i) => later(root, 200 + i * 480, () => {
    root.querySelector(`.nm[data-i="${i}"]`).classList.add("gone");
    root.querySelector(`.cd[data-i="${i}"]`).classList.add("in");
    root.querySelector(`.de[data-s="${s}"]`).classList.add("in");
  }));
  later(root, 200 + ROWS.length * 480, () => {
    root.querySelectorAll(".sz").forEach((e) => e.classList.add("in"));
    root.querySelector('[data-k="dict"]').classList.remove("busy");
  });
}

// Play on the sorting step: every poll slides to its place in station order, then the runs show.
function playSort(root) {
  reset(root);
  root.querySelector('[data-k="sort"]').classList.add("busy");
  root.querySelectorAll(".ush").forEach((e) => e.classList.add("gone"));
  later(root, 150, () => root.querySelectorAll(".mv").forEach((g) => { g.style.transform = `translate(${CX(Number(g.dataset.to))}px,0px)`; }));
  later(root, 1200, () => {
    root.querySelectorAll(".rn").forEach((e) => e.classList.add("in"));
    root.querySelector(".rc").textContent = "runs: 3";
    root.querySelector(".ord").textContent = "SORTED BY STATION, THEN TIME";
    root.querySelector('[data-k="sort"]').classList.remove("busy");
  });
}

const later = (root, ms, fn) => root._timers.push(setTimeout(fn, ms));
function reset(root) {
  (root._timers || []).forEach(clearTimeout);
  root._timers = [];
  root.querySelectorAll(".gone, .in, .busy").forEach((e) => e.classList.remove("gone", "in", "busy"));
  root.querySelectorAll(".mv").forEach((g) => { g.style.transform = `translate(${CX(Number(g.dataset.from))}px,0px)`; });
  root.querySelector(".rc").textContent = "runs: 12";
  root.querySelector(".ord").textContent = "AS THE POLLS ARRIVE — BY TIME";
}

function after(root, at) {
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.querySelector('[data-k="dict"]').addEventListener("click", () => root.dataset.at === "1" && playDict(root));
    root.querySelector('[data-k="sort"]').addEventListener("click", () => root.dataset.at === "3" && playSort(root));
  }
  if (root.dataset.shown !== String(at)) { root.dataset.shown = String(at); reset(root); }
}

export default widget({ key: "ec", label: "Encoding a column", css: CSS, steps, scene, captured: CAPTURED, after });
