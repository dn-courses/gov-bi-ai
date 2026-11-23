// mp-bigquery — the same plan in a real MPP service, read from BigQuery's own stages: no cluster to
// start, the input stage that reduces before it sends, the stages that finish and gather, slot time
// against elapsed time, the same scan with a key that cannot be reduced, and a skewed key.
// All on gbfs.station_status (1.8 billion rows, 167 GB). Where the numbers come from:
//  - monthly average: run once from the app's bigquery cell on 2026-11-22 (elapsed 2.0 s, slot time
//    2,281 s; S00 3,060 inputs, 1,803,699,574 read, 189,720 written, 7.1 MB; S01 306 inputs, 62
//    written; S02 1 input). The page quotes it as about 2 s and 2,281 slot-seconds.
//  - the week (this page's participant cell, run 2026-11-23): 2.6 GB, 1.5 s, 26 slot-seconds; S00 144
//    inputs, 100,478,334 read, 221 written, 7.6 kB; S01 14 inputs, 84 written.
//  - per-minute average, exact median: _measurements.md, "Lesson 06's four queries".
//  - polls per system: this page's skew cell (COUNT(*) per system, the week of 2026-09-01 on
//    gbfs.station_status_partitioned), run 2026-11-23: 1.8 GB, 12 systems, 100,478,334 rows,
//    lyft_nyc 25,275,523 (25 %, as in the whole table: 453,051,661 of 1,803,699,574).
//  - dry run of the monthly average: 46.1 GB, run 2026-11-23.
// The pool's pattern of slots (yours, other queries', free) is a picture, not a measurement.
import { LOOK, fmt, on, t, widget, zone } from "./mp-lib.js";

const CAPTURED = {
  readGb: 46.1,
  month: { rows: 1803699574, inputs: 3060, written: 189720, groups: 62, shuffled: "7.1 MB", aggInputs: 306, slotS: 2281, elapsedS: 2.0 },
  week: { inputs: 144, rows: 100478334, written: 221, shuffled: "7.6 kB", groups: 84, slotS: 26 },
  minute: { written: 1454235574, shuffled: "53.5 GB", stages: 7, elapsed: "1.9–2.2 s" },
  systems: [["lyft_nyc", 25275523], ["lyft_chi", 20680947], ["Bixi_MTL", 11211021], ["cabi", 8729280],
    ["MEX", 6824160], ["lyft_bay", 6398050], ["bluebikes", 6225799], ["bike_barcelona", 5482225]],
  median: { avg: "9–10 s", max: "33–40 s", elapsed: "46–65 s", stages: "29–30" },
};

const steps = (D) => [
  { stop: "No cluster", title: "No cluster to start: slots come from a pool that is always running",
    note: `BigQuery's workers are <b>slots</b>, taken from a pool that runs whether or not anyone asks, and handed to a query the moment it arrives. A cluster of your own (Spark, for one) first has to start its machines. Its dry run: <b>${D.readGb} GB</b>.` },
  { stop: "Partial", title: "S00: 3,060 workers, each reduces its piece before sending",
    note: `S00 cut the scan into <b>${fmt(D.month.inputs)}</b> pieces read at once. Each reduced its rows to one partial row per month and system: ${fmt(D.month.written)} rows (${fmt(D.month.inputs)} × ${D.month.groups}), <b>${D.month.shuffled}</b> sent on. Your week did the same: ${fmt(D.week.rows)} rows in, ${D.week.written} partial rows out.` },
  { stop: "Final", title: "S01 finishes each key, S02 gathers; slot time is the work",
    note: `S01's workers each own some keys and merge their partial rows into the ${D.month.groups} answers; S02 gathers them. <b>Slot time</b> adds up every worker's time: ${fmt(D.month.slotS)} s, about ${Math.round(D.month.slotS / 60)} minutes of work, done in ${D.month.elapsedS.toFixed(1)} s of wall time.` },
  { stop: "By minute", title: "Grouped by minute, the partial rows are nearly the rows", decisive: true,
    note: `Two million groups: a piece holds few rows of each, so reducing first saves little. S00 writes ${fmt(D.minute.written)} rows and sends <b>${D.minute.shuffled}</b>, where by month it sent ${D.month.shuffled}. The service has the network to absorb it: still ${D.minute.elapsed}.` },
  { stop: "Skew", title: "The exact median: the slowest worker holds a big system", decisive: true,
    note: `In your week lyft_nyc has a quarter of the polls, as in the whole table, and an exact median sorts each system's values on one worker. In the sorting stage the average worker computed for ${D.median.avg}, the slowest for <b>${D.median.max}</b>. The query took ${D.median.elapsed}.` },
];

const CSS = LOOK("bq") + `
.lw .bq .slot { fill:var(--panel); stroke:var(--line); }
.lw .bq .slot.other { fill:var(--mute); stroke:none; opacity:.45; }
.lw .bq .slot.mine { transition:fill .35s, stroke .35s; transition-delay:var(--d); }
.lw .bq .st.on .slot.mine { fill:var(--accent); stroke:var(--accent); }
.lw .bq .boot { fill:none; stroke:var(--mute); stroke-dasharray:5 5; }
.lw .bq .sq { fill:var(--accent); opacity:.2; }
.lw .bq .st.on .sq { opacity:1; transition:opacity .4s; transition-delay:var(--d); }
.lw .bq .stg { fill:var(--cell); stroke:var(--line); transition:fill .5s, stroke .5s; }
.lw .bq .stgh { fill:var(--line); opacity:.5; }
.lw .bq[data-at="1"] .s0, .lw .bq[data-at="2"] .s1, .lw .bq[data-at="2"] .s2 { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .bq .e { stroke:var(--line); stroke-width:2; fill:none; stroke-linecap:round; stroke-linejoin:round; transition:stroke .5s; }
.lw .bq[data-at="1"] .e1, .lw .bq[data-at="2"] .e2 { stroke:var(--accent); stroke-width:3; }
.lw .bq .bar.dim2 { fill:var(--accent); opacity:.4; }
`;

const box = (x, y, w, h, cls, id, name) => `<rect class="stg ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/>`
  + `<path class="stgh" d="M${x + 1} ${y + 34} V${y + 12} a11 11 0 0 1 11 -11 H${x + w - 12} a11 11 0 0 1 11 11 V${y + 34} Z"/>`
  + t(x + 14, y + 18, id, "mono l") + t(x + w - 14, y + 18, name, "lbl r");
const flow = (x1, x2, y, cls) => `<path class="e ${cls}" d="M${x1} ${y} H${x2} M${x2 - 8} ${y - 6} L${x2} ${y} L${x2 - 8} ${y + 6}"/>`;

// Step 0: the shared pool — other queries' slots, free ones, and yours lighting up the moment the
// query arrives; beside it, a cluster whose machines must start first.
const slotKind = (i) => ((i * 37) % 11 < 3 ? "other" : (i * 53) % 7 < 3 ? "mine" : "");
const slot = (i) => `<rect class="slot ${slotKind(i)}" style="--d:${((i * 29) % 120) * 7}ms" x="${31 + (i % 15) * 28}" y="${44 + Math.floor(i / 15) * 27}" width="22" height="21" rx="4"/>`;
const legend = (x, y, cls, style, label) => `<rect class="slot ${cls} lg" x="${x}" y="${y - 7}" width="14" height="14" rx="3" style="${style}"/>` + t(x + 22, y + 1, label, "lbl l");
const pool = (D) => on("0", zone(11, 10, 456, 300, "THE POOL — ALWAYS RUNNING, SHARED")
  + Array.from({ length: 120 }, (_, i) => slot(i)).join("")
  + legend(31, 284, "", "fill:var(--accent)", "your query") + legend(151, 284, "other", "", "other queries") + legend(291, 284, "", "", "free")
  + zone(479, 10, 270, 300, "A CLUSTER OF YOUR OWN")
  + [0, 1, 2, 3].map((i) => { const x = 503 + (i % 2) * 116, y = 44 + Math.floor(i / 2) * 84;
    return `<rect class="boot" x="${x}" y="${y}" width="106" height="70" rx="10"/>` + t(x + 53, y + 36, "starting…", "lbl"); }).join("")
  + t(614, 236, "machines start first,", "h") + t(614, 262, "then the first row is read", "lbl")
  + zone(11, 322, 738, 70) + t(27, 350, "-- dry run: the monthly average per system", "mono l dim") + t(27, 374, "three columns of the 167 GB", "lbl l")
  + t(733, 358, `${D.readGb} GB`, "huge r acc"));

// Steps 1–2: the monthly average's three stages, left to right, in the order the data flows.
const squares = () => Array.from({ length: 300 }, (_, i) => { const c = i % 30;
  return `<rect class="sq" style="--d:${c * 22 + (i % 7) * 15}ms" x="${57 + c * 8}" y="${82 + Math.floor(i / 30) * 8}" width="6" height="6" rx="1"/>`; }).join("");
const plan = (D) => on("1 2", zone(11, 10, 738, 250, "THE MONTHLY AVERAGE PER SYSTEM — THREE STAGES")
  + box(27, 38, 300, 206, "s0", "S00", "Input") + squares()
  + t(177, 174, `${fmt(D.month.inputs)} parallel inputs`) + t(177, 194, "a square is about 10 of them", "lbl")
  + t(177, 222, `reads ${fmt(D.month.rows)}, writes ${fmt(D.month.written)}`, "v")
  + flow(333, 421, 142, "e1") + t(377, 122, D.month.shuffled, "big acc") + t(377, 164, "partial rows", "lbl")
  + box(427, 38, 170, 206, "s1", "S01", "Aggregate") + t(512, 120, `${D.month.aggInputs} inputs`) + t(512, 144, "finish each key", "lbl")
  + t(512, 222, `writes ${D.month.groups}`, "v")
  + flow(601, 633, 142, "e2")
  + box(637, 38, 96, 206, "s2", "S02", "") + t(685, 120, "Output") + t(685, 144, "1 input", "lbl") + t(685, 222, `${D.month.groups} rows`, "v"))
  + on("1", zone(11, 272, 738, 120, "YOUR WEEK, FROM THE CELL — THE SAME PLAN, SMALLER")
    + t(27, 322, `${D.week.inputs} parallel inputs`, "l") + t(27, 352, `read ${fmt(D.week.rows)} rows`, "lbl l")
    + t(733, 322, `${D.week.written} partial rows`, "huge r acc") + t(733, 356, `${D.week.shuffled} sent to S01, which wrote ${D.week.groups} answers`, "lbl r"))
  + on("2", zone(11, 272, 738, 120, "WORK AGAINST WALL TIME")
    + t(27, 312, "slot time: every worker's time, added up", "lbl l") + `<rect class="bar on in" x="27" y="324" width="470" height="20" rx="4"/>`
    + t(509, 335, `${fmt(D.month.slotS)} s ≈ ${Math.round(D.month.slotS / 60)} min`, "big l acc")
    + t(27, 370, "elapsed", "lbl l") + `<rect class="bar warm" x="90" y="360" width="3" height="20" rx="1"/>` + t(103, 371, `${D.month.elapsedS.toFixed(1)} s`, "big l hot")
    + t(733, 371, `≈ ${fmt(Math.round(D.month.slotS / D.month.elapsedS / 100) * 100)} slots at once, on average`, "lbl r"));

// Step 3: what S00 wrote and sent, by month and by minute, to one scale.
const meter = (y, label, w, text, hot) => t(27, y + 10, label, "l") + `<rect class="bar in ${hot ? "warm" : "on"}" x="160" y="${y}" width="${Math.max(3, w)}" height="20" rx="4"/>`
  + t(172 + Math.max(3, w), y + 10, text, `big l ${hot ? "hot" : "acc"}`);
const byMinute = (D) => {
  const W = 420;
  return on("3", zone(11, 10, 738, 168, "S00 WRITES — PARTIAL ROWS SENT TO THE NEXT STAGE")
    + meter(50, "by month", (W * D.month.written) / D.minute.written, fmt(D.month.written), false)
    + meter(98, "by minute", W, fmt(D.minute.written), true) + t(27, 152, `the same ${D.readGb} GB read by both`, "lbl l")
    + zone(11, 190, 738, 202, "BYTES THAT CROSS BETWEEN WORKERS")
    + meter(230, "by month", 0, D.month.shuffled, false) + meter(278, "by minute", W, D.minute.shuffled, true)
    + t(27, 340, `${D.minute.stages} stages instead of 3: the engine spreads the exchange over more workers`, "lbl l")
    + t(27, 366, `elapsed: still ${D.minute.elapsed}`, "lbl l"));
};

// Step 4: rows per system, to scale, and the median's sorting stage.
const sysRow = ([name, n], i, max) => { const y = 46 + i * 20, w = (380 * n) / max, hot = i === 0;
  return t(27, y + 8, name, `v l ${hot ? "hot" : ""}`) + `<rect class="bar in ${hot ? "warm" : "dim2"}" x="170" y="${y}" width="${w}" height="15" rx="3"/>`
    + t(180 + w, y + 8, fmt(n), `v l ${hot ? "hot" : "dim"}`); };
const skew = (D) => on("4", zone(11, 10, 738, 208, "POLLS PER SYSTEM, THE WEEK OF 1 SEPTEMBER — EIGHT LARGEST OF 12")
  + D.systems.map((s, i) => sysRow(s, i, D.systems[0][1])).join("")
  + zone(11, 228, 738, 164, "THE MEDIAN'S SORTING STAGE — ONE WORKER'S COMPUTE TIME")
  + t(27, 272, "the average worker", "l") + `<rect class="bar on in" x="200" y="261" width="${(380 * 10) / 40}" height="22" rx="4"/>` + t(305, 272, D.median.avg, "big l acc")
  + t(27, 312, "the slowest worker", "l") + `<rect class="bar warm in" x="200" y="301" width="380" height="22" rx="4"/>` + t(590, 312, D.median.max, "big l hot")
  + t(27, 356, `the query: ${D.median.elapsed}, ${D.median.stages} stages — against 2.0 s and 3 stages for the monthly average`, "lbl l"));

const scene = (D) => `<svg viewBox="0 0 760 400">${pool(D)}${plan(D)}${byMinute(D)}${skew(D)}</svg>`;

export default widget({ key: "bq", label: "The plan in BigQuery", css: CSS, steps, scene, captured: CAPTURED });
