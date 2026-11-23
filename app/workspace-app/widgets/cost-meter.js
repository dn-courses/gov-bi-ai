// cost-meter — what a warehouse's meter counts. On demand: the bytes a query reads, priced per TiB
// (Play: the three columns of the monthly average are read and the meter ticks into dollars); the same
// query run by a dashboard's audience; LIMIT reads the whole column. Capacity: slot time reserved.
// Sizes: dry runs from the app's bigquery cell, 2026-11-23 (monthly average on gbfs.station_status
// 46.1 GB, LIMIT 10 13.1 GB); column sizes, elapsed (about 2 s), slot time (2,281 slot-seconds, about 38 slot-minutes; the
// median 407-538) and its 31.7 GB from day1-reference/_measurements.md. $6.25 per TiB is BigQuery's
// documented US on-demand price. The audience (50 viewers, 4 opens a day, 22 days) is an example.
import { extra, fmt, on, pill, t, widget, zone } from "./col-lib.js";

const TIB_GB = 2 ** 40 / 1e9; // 1,099.5 GB
const PRICE = 6.25;
const dollars = (gb) => (gb / TIB_GB) * PRICE;

const CAPTURED = {
  cols: [["captured_at", 14.4], ["system_id", 18.6], ["num_bikes_available", 13.1]],
  monthly: 46.1, elapsed: 2, limitGb: 13.1, viewers: 50, opens: 4, days: 22,
  avg: { gb: 46.1, slot: [38] }, median: { gb: 31.7, slot: [407, 538] },
};

const usd = (x) => (x >= 100 ? `$${fmt(Math.round(x))}` : `$${x.toFixed(2)}`);

const steps = (D) => [
  { stop: "One query", title: "The meter counts bytes read",
    note: `Press <b>Play</b>. The monthly average reads three columns of 1.8 billion rows, <b>${D.monthly} GB</b>. On demand, every TiB read costs $${PRICE}: this run costs <b>${usd(dollars(D.monthly))}</b>.` },
  { stop: "Every viewer", title: "A dashboard runs it for every viewer", decisive: true,
    note: `${D.viewers} people open the tile ${D.opens} times a day: ${D.viewers * D.opens} runs a day, <b>${usd(dollars(D.monthly) * D.viewers * D.opens * D.days)}</b> a month for one tile. Whoever writes the query sets that number.` },
  { stop: "LIMIT", title: "Bytes read, not rows returned",
    note: `Ten rows come back, and the whole column, <b>${D.limitGb} GB</b>, is read and billed to find them.` },
  { stop: "Capacity", title: "The other meter: slots reserved",
    note: `With capacity billing you rent slots by the hour and bytes are not billed. The bill then follows the work, and a query that sorts can be cheap in bytes and dear in slots.` },
];

const CSS = extra("cmt") + `
.lw .cmt text.cap { font-size:12px; }
.lw .cmt .fill { transform-box:fill-box; transform-origin:left center; transform:scaleX(0); transition:transform 0s linear; }
.lw .cmt .track { fill:var(--cell); }
.lw .cmt .tile { fill:var(--cell); stroke:var(--line); stroke-width:1; }
.lw .cmt .tile.acc { fill:var(--accent-bg); stroke:var(--accent); }
.lw .cmt .tile.hot { fill:var(--hot-bg); stroke:var(--hot); stroke-width:1.5; }
.lw .cmt .play { cursor:pointer; pointer-events:none; }
.lw .cmt .st.on .play { pointer-events:auto; }
.lw .cmt .play rect { fill:var(--accent); } .lw .cmt .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .cmt .play.busy { opacity:.45; pointer-events:none; }
.lw .cmt text.odo { font:700 34px ui-monospace, Menlo, monospace; }
.lw .cmt text.x { font:600 15px ui-monospace, Menlo, monospace; fill:var(--mute); }
.lw .cmt .run { fill:var(--hot); opacity:0; transition:opacity .35s; }
.lw .cmt .st.on .run { opacity:.9; }
.lw .cmt .seg { fill:var(--hot); opacity:.85; }
.lw .cmt .seg.first { fill:var(--accent); opacity:1; }
`;

// ── step 0: three columns read, then the bytes become dollars ──────────────────────────────────
const TX = 236, TW = 400, MAX = 18.6;
const lanes = (D) => D.cols.map(([name, gb], i) => { const y = 64 + i * 34, w = (TW * gb) / MAX;
  return t(30, y + 1, name, "mono l") + `<rect class="track" x="${TX}" y="${y - 9}" width="${w}" height="18" rx="9"/>`
    + `<rect class="bar on fill" x="${TX}" y="${y - 9}" width="${w}" height="18" rx="9"/>`
    + t(TX + 12 + w, y + 1, `${gb} GB`, "mono l dim"); }).join("");

const odometers = () => `<rect class="tile acc" x="30" y="174" width="270" height="92" rx="14"/>`
  + t(48, 196, "READ", "cap") + t(48, 238, "0.0 GB", "odo l acc gb")
  + t(380, 212, `÷ ${fmt(TIB_GB.toFixed(1))} GB`, "x") + t(380, 236, `× $${PRICE}`, "x")
  + `<rect class="tile hot" x="460" y="174" width="270" height="92" rx="14"/>`
  + t(478, 196, "BILLED", "cap") + t(478, 238, "$0.00", "odo l hot usd");

const one = (D) => on("0", zone(14, 10, 732, 330, "ON DEMAND — THE MONTHLY AVERAGE, gbfs.station_status")
  + `<g class="play"><rect x="634" y="18" width="96" height="30" rx="15"/><text x="682" y="34">▶ Play</text></g>`
  + lanes(D) + odometers()
  + t(30, 296, `${D.monthly} GB ÷ ${fmt(TIB_GB.toFixed(1))} GB in a TiB × $${PRICE} = ${usd(dollars(D.monthly))}`, "mono l")
  + t(30, 320, "the price per TiB is BigQuery's US on-demand list price; the first TiB of each month is free", "lbl l"));

// ── step 1: a day of runs (a column per viewer, a row per open), then the bill multiplies ─────
const GX = 40, GP = 13.6;
const runs = (D) => Array.from({ length: D.viewers * D.opens }, (_, i) => { const c = i % D.viewers, r = Math.floor(i / D.viewers);
  return `<rect class="run" style="transition-delay:${(c * 0.018).toFixed(3)}s" x="${GX + c * GP}" y="${60 + r * GP}" width="10" height="10" rx="2.5"/>`; }).join("");
const tile = (x, cap, cost, how, cls) => `<rect class="tile ${cls}" x="${x}" y="146" width="190" height="100" rx="14"/>`
  + t(x + 16, 168, cap, "cap") + t(x + 16, 204, cost, `huge l ${cls}`) + t(x + 16, 230, how, "lbl l");
const audience = (D) => { const day = D.viewers * D.opens, d1 = dollars(D.monthly);
  return on("1", zone(14, 10, 732, 330, `ONE DASHBOARD TILE — ${D.viewers} VIEWERS × ${D.opens} OPENS = ${day} RUNS A DAY`)
    + runs(D) + t(GX, 126, `each square is one run of ${D.monthly} GB`, "lbl l")
    + tile(30, "ONE RUN", usd(d1), `${D.monthly} GB`, "")
    + t(255, 198, `× ${day}`, "x") + tile(290, "A DAY", usd(d1 * day), `${fmt(Math.round(day * D.monthly / 100) / 10)} TB read`, "")
    + t(510, 198, `× ${D.days}`, "x") + tile(540, "A MONTH", usd(d1 * day * D.days), `${fmt(day * D.days)} runs`, "hot")
    + pill(30, 272, 700, 44, "the cost is fixed when the query is written, not when the bill arrives", "warm", "hot")); };

// ── step 2: LIMIT — the whole column is read, ten values come back ───────────────────────────
const SEG = 48, SX = 30, SW = 700;
const strip = () => Array.from({ length: SEG }, (_, i) =>
  `<rect class="seg${i ? "" : " first"}" x="${SX + (i * SW) / SEG}" y="82" width="${SW / SEG - 2.5}" height="34" rx="3"/>`).join("");
const limit = (D) => on("2", zone(14, 10, 732, 330, "SELECT num_bikes_available … LIMIT 10")
  + t(30, 62, "num_bikes_available, all 1.8 billion values: read and billed", "l") + t(730, 62, `${D.limitGb} GB`, "big r hot")
  + strip() + `<path class="edge on" d="M${SX + 6} 120 L${SX + 6} 156 L${SX + 40} 156"/>`
  + pill(SX + 44, 140, 160, 32, "10 rows returned", "hit", "acc")
  + `<rect class="tile hot" x="30" y="200" width="700" height="108" rx="14"/>`
  + t(52, 224, "BILLED FOR TEN VALUES", "cap") + t(52, 270, usd(dollars(D.limitGb)), "odo l hot")
  + t(200, 264, "the scan comes first; the limit only trims what it produced", "lbl l"));

// ── step 3: the two meters, the same two queries ───────────────────────────────────────────────
const GBX = 3.6, SLX = 0.42;
const bar = (x, y, w, cls) => `<rect class="bar ${cls}" x="${x}" y="${y}" width="${Math.max(4, w)}" height="20" rx="10"/>`;
const q = (x, y, name, w, label, cls) => t(x + 16, y, name, "l") + bar(x + 16, y + 12, w, cls)
  + t(x + 26 + Math.max(4, w), y + 23, label, `big l ${cls === "warm" ? "hot" : "acc"}`);
const capacity = (D) => on("3", zone(14, 10, 280, 330, "ON DEMAND — BYTES READ") + zone(306, 10, 440, 330, "CAPACITY — SLOT TIME USED")
  + q(14, 66, "monthly average", D.avg.gb * GBX, `${D.avg.gb} GB`, "on") + t(30, 124, `${usd(dollars(D.avg.gb))} a run`, "mono l dim")
  + q(14, 166, "exact median", D.median.gb * GBX, `${D.median.gb} GB`, "on") + t(30, 224, `${usd(dollars(D.median.gb))} a run`, "mono l dim")
  + q(306, 66, "monthly average", D.avg.slot.at(-1) * SLX, `about ${D.avg.slot.join("–")} slot-min`, "on")
  + q(306, 166, "exact median", D.median.slot[1] * SLX, `${D.median.slot.join("–")} slot-min`, "warm")
  + pill(30, 272, 248, 40, "the median is cheaper", "hit", "acc")
  + pill(322, 272, 408, 40, "the median takes ten times the slots; others wait", "warm", "hot"));

const scene = (D) => `<svg viewBox="0 0 760 350">${one(D)}${audience(D)}${limit(D)}${capacity(D)}</svg>`;

// Play: the columns fill in the measured elapsed time while both odometers count, once.
function play(root, D) {
  const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, s = still ? 0 : D.elapsed;
  reset(root);
  const button = root.querySelector(".play"), gb = root.querySelector(".gb"), money = root.querySelector(".usd"), start = performance.now();
  button.classList.add("busy");
  requestAnimationFrame(() => root.querySelectorAll(".fill").forEach((b) => { b.style.transitionDuration = `${s}s`; b.style.transform = "scaleX(1)"; }));
  root._clock = setInterval(() => {
    const f = s ? Math.min(1, (performance.now() - start) / 1000 / s) : 1;
    gb.textContent = `${(f * D.monthly).toFixed(1)} GB`;
    money.textContent = `$${(f * dollars(D.monthly)).toFixed(2)}`;
    if (f >= 1) { clearInterval(root._clock); button.classList.remove("busy"); }
  }, 50);
}

function reset(root) {
  clearInterval(root._clock);
  root.querySelectorAll(".fill").forEach((b) => { b.style.transitionDuration = "0s"; b.style.transform = "scaleX(0)"; });
  root.querySelector(".play").classList.remove("busy");
  root.querySelector(".gb").textContent = "0.0 GB";
  root.querySelector(".usd").textContent = "$0.00";
}

function after(root) {
  if (!root.dataset.bound) { root.dataset.bound = "1"; root.querySelector(".play").addEventListener("click", () => root.dataset.at === "0" && play(root, CAPTURED)); }
  reset(root);
}

export default widget({ key: "cmt", label: "The meter", css: CSS, steps, scene, captured: CAPTURED, after });
