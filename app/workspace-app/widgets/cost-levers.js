// cost-levers — the four levers on a dashboard tile's query, one per step, each a card that shrinks
// the bytes a run reads, and with them its price: name the columns, filter on the partitioning column,
// filter on the clustering column, read a summary table instead of the detail. Each step shows its
// query's SQL (the line the lever adds in the accent) with the bytes its dry run reports beside it;
// the page's cells for the step are the same queries.
// Bytes: dry runs from the app's bigquery cell on gbfs.station_status_partitioned, 2026-11-23:
// SELECT * 167.2 GB; system_id + AVG(num_bikes_available) per system 31.7 GB; the same for one day
// 366.5 MB; the same day, system_id = 'lyft_nyc' 97.9 MB (the page Partitioning's run of that day and
// system read 97.9 MB too); the summary's daily build (one day, per day and system) 366.5 MB. The
// summary's size is computed, not measured (the lab does not build it): 14 systems × 127 days = 1,778
// rows of about 35 logical bytes (DATE 8, STRING about 11, FLOAT64 8, INT64 8), about 60 kB. $6.25
// per TiB, with BigQuery's documented on-demand minimum of 10 MB billed per table a query references,
// so each read of the summary is billed 10 MB; 4,400 runs a month as on the meter (50 viewers × 4
// opens × 22 days). The summary's month: 4,400 reads at 10 MB plus 22 builds at 366.5 MB.
import { extra, fmt, on, from, t, widget, zone } from "./col-lib.js";
import { sql, sqlCss } from "./cost-lib.js";

const TIB_GB = 2 ** 40 / 1e9, PRICE = 6.25, RUNS = 4400, DAYS = 22;
const dollars = (gb) => (gb / TIB_GB) * PRICE;

const TBL = "`enjoytech-bq-lab.gbfs.station_status_partitioned`";
const DAY = "WHERE captured_at >= '2026-09-01' AND captured_at < '2026-09-02'";
const HEAD = `SELECT system_id, AVG(num_bikes_available) AS avg_bikes\nFROM ${TBL}`;
const SQL = {
  star: `SELECT *\nFROM ${TBL};`,
  cols: `${HEAD}\nGROUP BY system_id;`,
  day: `${HEAD}\n${DAY}\nGROUP BY system_id;`,
  sys: `${HEAD}\n${DAY}\n  AND system_id = 'lyft_nyc'\nGROUP BY system_id;`,
  build: `SELECT DATE(captured_at) AS day, system_id,\n       AVG(num_bikes_available) AS avg_bikes\nFROM ${TBL}\n${DAY}\nGROUP BY day, system_id;`,
  read: "SELECT system_id, avg_bikes\nFROM `enjoytech-bq-lab.gbfs.daily_summary`\nWHERE day = '2026-09-01';",
};

const CAPTURED = {
  levers: [
    { name: "Columns", edit: "2 columns of 13", gb: 31.7, label: "31.7 GB" },
    { name: "Partition", edit: "+ one day", gb: 0.3665, label: "366.5 MB" },
    { name: "Clustering", edit: "+ one system", gb: 0.0979, label: "97.9 MB" },
    { name: "Summary", edit: "a daily summary", gb: 0.00006, label: "about 60 kB" },
  ],
  star: 167.2, build: 0.3665, summaryRows: 1778, minimum: 0.01,
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
    note: `A table of daily averages per system, ${fmt(D.summaryRows)} rows, is filled once a day from one partition (${D.levers[1].label}). Every viewer reads it: <b>${D.levers[3].label}</b>, billed <b>10 MB</b>, the minimum per table, ${usd(dollars(D.minimum))} a run.` },
];

const CSS = extra("clv") + sqlCss("clv") + `
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
  return `<rect class="card c${i}" x="${x}" y="40" width="${CW}" height="96" rx="12"/>`
    + t(x + 14, 58, `0${i + 1}`, `num l c${i}`) + t(x + 42, 58, l.name, "l h") + t(x + 14, 82, l.edit, "mono l")
    + from(String(i), t(x + 14, 108, l.label, `fig l c${i}`) + t(x + 14, 126, i === 3 ? "billed 10 MB" : `${usd(dollars(l.gb))} a run`, "lbl l")); };

// ── each step's SQL in a code panel, with what its dry run reports beside each query ────────────
const RX = 572;
const runs = (gb) => `${usd(dollars(gb))} a run`;
const block = (y, cap, text, added, value, sub, before = false) => t(46, y - 22, cap, "cap") + sql(46, y, text, added)
  + t(RX, y - 6, before ? "BEFORE" : "DRY RUN", "cap") + t(RX, y + 18, value, `big l ${before ? "dim" : "acc"}`) + t(RX, y + 38, sub, "lbl l");
const panels = (D) => [
  block(188, "BEFORE: EVERY COLUMN", SQL.star, [], `${D.star} GB`, runs(D.star), true)
    + block(262, "LEVER ONE: TWO COLUMNS", SQL.cols, [0], D.levers[0].label, runs(D.levers[0].gb)),
  block(188, "LEVER TWO: ONE LINE ADDED, ONE DAY", SQL.day, [2], D.levers[1].label, runs(D.levers[1].gb)),
  block(188, "LEVER THREE: ONE LINE ADDED, ONE SYSTEM", SQL.sys, [3], D.levers[2].label, runs(D.levers[2].gb)),
  block(188, "BUILT ONCE A DAY INTO gbfs.daily_summary", SQL.build, [], D.levers[1].label, `${usd(dollars(D.build))} a build`)
    + t(46, 286, "EVERY VIEWER READS", "cap") + sql(46, 308, SQL.read, [0, 1, 2])
    + t(RX, 302, "COMPUTED", "cap") + t(RX, 326, D.levers[3].label, "big l acc") + t(RX, 346, `billed 10 MB · ${usd(dollars(D.minimum))}`, "lbl l"),
].map((inner, i) => on(String(i), inner)).join("");
const code = (D) => `<rect class="code" x="30" y="148" width="700" height="214" rx="12"/>` + panels(D);

// ── one bar on a log scale, 10 kB to 1 TB: 80 px a factor of ten ───────────────────────────────
const LX = 30, DEC = 80, LW = 8 * DEC, RY = 388;
const px = (gb) => DEC * (Math.log10(gb) + 5);
const TICKS = [[1e-5, "10 kB"], [1e-3, "1 MB"], [0.1, "100 MB"], [10, "10 GB"], [1000, "1 TB"]];
const ruler = (D) => TICKS.map(([gb, label]) => `<path class="tick" d="M${LX + px(gb)} ${RY + 70} L${LX + px(gb)} ${RY + 78}"/>` + t(LX + px(gb) + (gb === 1e-5 ? 14 : 0), RY + 92, label, "lbl")).join("")
  + `<rect class="bar ghost" x="${LX}" y="${RY + 12}" width="${px(D.star)}" height="22" rx="11"/>` + t(LX + 14, RY + 24, `SELECT * reads ${D.star} GB`, "lbl l")
  + `<rect class="bar on meter" x="${LX}" y="${RY + 44}" width="${LW}" height="22" rx="11"/>`
  + D.levers.map((l, i) => on(String(i), t(LX + px(l.gb) + 10, RY + 56, i === 3 ? `reads ${l.label} · billed 10 MB, the minimum` : l.label, "big l acc"))).join("");

// ── the month, under a thin rule: the tile's runs, or the summary's 22 builds ─────────────────
const MY = 494;
const month = (D, i) => { const l = D.levers[i], sum = i === 3;
  const cap = sum ? `A MONTH: ${fmt(RUNS)} READS AT 10 MB + ${DAYS} BUILDS` : `A MONTH OF THE TILE, ${fmt(RUNS)} RUNS`;
  const cost = sum ? usd(dollars(D.minimum) * RUNS + dollars(D.build) * DAYS) : usd(dollars(l.gb) * RUNS);
  return on(String(i), t(30, MY + 20, cap, "cap") + t(30, MY + 40, `SELECT * would be ${usd(dollars(D.star) * RUNS)}`, "lbl l")
    + t(730, MY + 30, cost, "huge r acc")); };

const scene = (D) => `<svg viewBox="0 0 760 560">
  ${zone(14, 10, 732, 540, "ONE DASHBOARD TILE, gbfs.station_status_partitioned — FOUR EDITS")}
  ${D.levers.map(card).join("")}
  ${code(D)}
  ${t(30, RY, "BYTES ONE RUN READS — EACH LINE IS TEN TIMES THE NEXT", "cap")}
  ${ruler(D)}
  <path class="rule" d="M30 ${MY} L730 ${MY}"/>
  ${[0, 1, 2, 3].map((i) => month(D, i)).join("")}
</svg>`;

function after(root, at) {
  const bar = root.querySelector(".meter");
  if (bar) bar.style.transform = `scaleX(${px(CAPTURED.levers[at].gb) / LW})`;
}

export default widget({ key: "clv", label: "Four levers, priced", css: CSS, steps, scene, captured: CAPTURED, after });
