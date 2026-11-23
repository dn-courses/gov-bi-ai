// cost-levers — the four levers on a dashboard tile's query, one per step, each a card that shrinks
// the bytes a run reads, and with them its price: name the columns, filter on the partitioning column,
// filter on the clustering column, read a summary table instead of the detail.
// Bytes on gbfs.station_status_partitioned. This page's dry runs (2026-11-23): SELECT * 167.2 GB;
// system_id + AVG(num_bikes_available) per system 31.7 GB. Measured 2026-11-23 and priced here without
// re-running, because the page Partitioning runs these filters: the same for one day 366.5 MB (that
// page prices the one-column day at 218.7 MB); one day of lyft_nyc 97.9 MB, that page's figure; the
// summary's daily build (one day, per system) 366.5 MB. The summary's
// size is computed, not measured: 14 systems × 127 days = 1,778 rows of about 35 logical bytes
// (DATE 8, STRING about 11, FLOAT64 8, INT64 8), about 60 kB. $6.25 per TiB; 4,400 runs a month as on
// the meter (50 viewers × 4 opens × 22 days).
import { extra, fmt, on, from, t, widget, zone } from "./col-lib.js";

const TIB_GB = 2 ** 40 / 1e9, PRICE = 6.25, RUNS = 4400, DAYS = 22;
const dollars = (gb) => (gb / TIB_GB) * PRICE;

const CAPTURED = {
  levers: [
    { name: "Columns", edit: "2 columns of 13", gb: 31.7, label: "31.7 GB" },
    { name: "Partition", edit: "+ one day", gb: 0.3665, label: "366.5 MB" },
    { name: "Clustering", edit: "+ one system", gb: 0.0979, label: "97.9 MB" },
    { name: "Summary", edit: "a daily summary", gb: 0.00006, label: "about 60 kB" },
  ],
  star: 167.2, build: 0.3665, summaryRows: 1778,
};

const usd = (x) => (x >= 100 ? `$${fmt(Math.round(x))}` : x >= 0.01 ? `$${x.toFixed(2)}` : `$${x.toFixed(4)}`);

const steps = (D) => [
  { stop: "Columns", title: "Lever one: name only the columns the tile shows",
    note: `<code>SELECT *</code> reads all 13 columns, ${D.star} GB. The tile needs two: <b>${D.levers[0].label}</b>, ${usd(dollars(D.levers[0].gb))} a run.` },
  { stop: "Partition", title: "Lever two: filter on the partitioning column",
    note: `One day of a daily-partitioned table opens one partition: <b>${D.levers[1].label}</b>, ${usd(dollars(D.levers[1].gb))} a run.` },
  { stop: "Clustering", title: "Lever three: filter on the clustering column",
    note: `The table is clustered by system, so one system's blocks of that day are all that is read: <b>${D.levers[2].label}</b>.` },
  { stop: "Summary", title: "Lever four: read a summary, built once", decisive: true,
    note: `A table of daily averages per system, ${fmt(D.summaryRows)} rows, is filled once a day from one partition (${D.levers[1].label}). Every viewer reads the summary: <b>${D.levers[3].label}</b>.` },
];

const CSS = extra("clv") + `
.lw .clv text.cap { font-size:12px; }
.lw .clv .card { fill:var(--cell); stroke:var(--line); stroke-width:1; transition:fill .5s, stroke .5s; }
.lw .clv text.fig { font:700 17px ui-monospace, Menlo, monospace; fill:var(--ink); transition:fill .5s; }
.lw .clv text.num { font:700 13px ui-monospace, Menlo, monospace; fill:var(--mute); }
.lw .clv .meter { transform-box:fill-box; transform-origin:left center; transition:transform .9s cubic-bezier(.3,.7,.2,1); }
.lw .clv .tick { stroke:var(--line); stroke-width:1; }
.lw .clv .rule { stroke:var(--line); stroke-width:1; }
${[0, 1, 2, 3].map((i) => `.lw .clv[data-at="${i}"] .card.c${i} { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .clv[data-at="${i}"] text.fig.c${i}, .lw .clv[data-at="${i}"] text.num.c${i} { fill:var(--accent); }`).join("\n")}
`;

// ── the four cards: the current one tinted, the ones before it neutral, the ones after it closed ──
const CW = 166, CG = 12;
const card = (l, i) => { const x = 30 + i * (CW + CG);
  return `<rect class="card c${i}" x="${x}" y="40" width="${CW}" height="110" rx="12"/>`
    + t(x + 14, 60, `0${i + 1}`, `num l c${i}`) + t(x + 42, 60, l.name, "l h") + t(x + 14, 86, l.edit, "mono l")
    + from(String(i), t(x + 14, 116, l.label, `fig l c${i}`) + t(x + 14, 136, i === 3 ? "kilobytes a run" : `${usd(dollars(l.gb))} a run`, "lbl l")); };

// ── one bar on a log scale, 10 kB to 1 TB: 80 px a factor of ten ───────────────────────────────
const LX = 30, DEC = 80, LW = 8 * DEC;
const px = (gb) => DEC * (Math.log10(gb) + 5);
const TICKS = [[1e-5, "10 kB"], [1e-3, "1 MB"], [0.1, "100 MB"], [10, "10 GB"], [1000, "1 TB"]];
const ruler = (D) => TICKS.map(([gb, label]) => `<path class="tick" d="M${LX + px(gb)} 248 L${LX + px(gb)} 256"/>` + t(LX + px(gb) + (gb === 1e-5 ? 14 : 0), 270, label, "lbl")).join("")
  + `<rect class="bar ghost" x="${LX}" y="190" width="${px(D.star)}" height="22" rx="11"/>` + t(LX + 14, 202, `SELECT * reads ${D.star} GB`, "lbl l")
  + `<rect class="bar on meter" x="${LX}" y="222" width="${LW}" height="22" rx="11"/>`
  + D.levers.map((l, i) => on(String(i), t(LX + px(l.gb) + 10, 234, l.label, "big l acc"))).join("");

// ── the month, under a thin rule: the tile's runs, or the summary's 22 builds ─────────────────
const month = (D, i) => { const l = D.levers[i], sum = i === 3;
  const cap = sum ? `A MONTH OF THE SUMMARY, BUILT ${DAYS} TIMES` : `A MONTH OF THE TILE, ${fmt(RUNS)} RUNS`;
  const cost = sum ? usd(dollars(D.build) * DAYS) : usd(dollars(l.gb) * RUNS);
  return on(String(i), t(30, 304, cap, "cap") + t(30, 324, `SELECT * would be ${usd(dollars(D.star) * RUNS)}`, "lbl l")
    + t(730, 314, cost, "huge r acc")); };

const scene = (D) => `<svg viewBox="0 0 760 350">
  ${zone(14, 10, 732, 330, "ONE DASHBOARD TILE, gbfs.station_status_partitioned — FOUR EDITS")}
  ${D.levers.map(card).join("")}
  ${t(30, 178, "BYTES ONE RUN READS — EACH LINE IS TEN TIMES THE NEXT", "cap")}
  ${ruler(D)}
  <path class="rule" d="M30 284 L730 284"/>
  ${[0, 1, 2, 3].map((i) => month(D, i)).join("")}
</svg>`;

function after(root, at) {
  const bar = root.querySelector(".meter");
  if (bar) bar.style.transform = `scaleX(${px(CAPTURED.levers[at].gb) / LW})`;
}

export default widget({ key: "clv", label: "Four levers, priced", css: CSS, steps, scene, captured: CAPTURED, after });
