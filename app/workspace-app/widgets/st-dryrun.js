// st-dryrun — the dry run: a cloud warehouse prices a query in bytes before running it. The meter
// is the columns the query must read; some answers are kept with the table. (Clustering in the
// warehouse belongs to the Partitioning page.)
// Dry runs from the page's own bigquery cells, 2026-11-23 (and _measurements.md, 2026-11-16/21):
//   gbfs.station_status: 1,803,699,574 rows, 167.2 GB; columns system_id 18.6 GB, station_id 42.6,
//   captured_at 14.4, num_bikes_available 13.1; "the other 9 columns" = 167.2 - those four = 78.5 GB
//   AVG(num_bikes_available), one day           27.5 GB
//   COUNT(*), the whole table                   0 bytes
//   MIN, MAX of captured_at                     14.4 GB
// The real run of MIN/MAX (integrator, 2026-11-23, cache off, gbfs.station_status; not a page cell):
//   dry run 14,429,596,592 B, billed 14,430,502,912 B; S00 read 1,803,699,574 rows in 3,060 pieces,
//   wrote 3,060 partial rows; S01 one row; 3.2 s elapsed, about 21 slot-minutes.
// DuckDB's footer answer, 705 kB: this page's st-footer cells (EXPLAIN ANALYZE, Data Read 704.7 kB).
import { CSS, on, t, widget, zone } from "./ramp-lib.js";

const CAPTURED = {
  rows: "1,803,699,574", tableGb: 167,
  cols: [["station_id", 42.6], ["system_id", 18.6], ["captured_at", 14.4], ["num_bikes_available", 13.1], ["the other 9 columns", 78.5]],
  day: "27.5 GB", count: "0 B", minmax: "14.4 GB",
  run: { rows: "1,803,699,574", pieces: "3,060", billed: "14.43 GB", secs: "3.2 s", slotMin: 21 }, duck: "705 kB",
};

const steps = (D) => [
  { stop: "The meter", title: "A warehouse prices a query before it runs it", decisive: true,
    note: `BigQuery, a cloud warehouse, answers a <b>dry run</b> with the bytes the query would read, and runs nothing. One day of 127 is priced at <b>${D.day}</b>: the two columns it names, read whole.` },
  { stop: "Written down", title: "Some answers cost nothing",
    note: `<code>COUNT(*)</code> of the whole table is priced at <b>0 bytes</b>: the row count is kept with the table. Its first and last moment are not: <code>MIN</code> and <code>MAX</code> read the column, ${D.minmax}. BigQuery keeps min/max statistics for every block, but it uses them only to skip blocks a filter rules out, so an unfiltered <code>MIN(captured_at)</code> reads, and on-demand bills, the whole column: about 8 bytes a row for a <code>TIMESTAMP</code>. DuckDB answered the same from the footer, reading ${D.duck}.` },
];

const PX = 5; // px per GB in the column chart
// The table's columns as bars; the class names which steps tint which column.
const colRow = ([name, gb], i) => {
  const y = 44 + i * 26, cls = { captured_at: "c-day c-mm", num_bikes_available: "c-day" }[name] ?? "";
  return `${t(214, y + 9, name, "r mono")}<rect class="bar col ${cls}" x="230" y="${y}" width="${gb * PX}" height="16" rx="4"/>
    ${t(240 + gb * PX, y + 9, `${gb} GB`, "l mono dim")}`;
};

// A brace beside the tinted bars, adding them up to the dry run's price.
const brace = (y0, y1, text) => `<path class="brace" d="M420 ${y0} h8 V${y1} h-8 M428 ${(y0 + y1) / 2} h8"/>${t(444, (y0 + y1) / 2 + 1, text, "l mono acc")}`;
const columns = (D) => `${zone(14, 8, 732, 178, `gbfs.station_status — ${D.rows} ROWS, ${D.tableGb} GB`)}${D.cols.map(colRow).join("")}
  ${on("0", brace(96, 138, `= ${D.day}`))}${on("1", brace(96, 112, `= ${D.minmax}`))}`;

const query = (x, y, lines, w = 340) => `<rect class="term" x="${x - 14}" y="${y - 16}" width="${w}" height="${lines.length * 19 + 14}" rx="8"/>
  ${lines.map((s, i) => t(x, y + i * 19, s, "l code")).join("")}`;
const meter = (x, y, w, text, cls = "") => `<rect class="meter ${cls}" x="${x}" y="${y}" width="${w}" height="30" rx="15"/>${t(x + 16, y + 16, text, "l lbl mtext")}`;

const priced = (D) => `${zone(14, 198, 732, 172, "A DRY RUN")}
  ${query(48, 246, ["SELECT AVG(num_bikes_available)", "FROM   gbfs.station_status", "WHERE  captured_at >= '2026-09-01'", "  AND  captured_at <  '2026-09-02'"], 380)}
  ${meter(34, 328, 380, `✓  This query would read ${D.day}. Not run.`)}
  ${t(560, 262, D.day, "huge acc")}${t(560, 292, "two columns, whole", "lbl")}${t(560, 314, "for one day of 127", "lbl")}`;

const kept = (D) => `${zone(14, 198, 360, 172, "THE WHOLE TABLE")}${zone(386, 198, 360, 172, "THE FIRST AND LAST MOMENT")}
  ${query(48, 254, ["SELECT COUNT(*)", "FROM   gbfs.station_status"], 320)}${t(194, 326, D.count, "huge ok")}${t(194, 354, "the row count is kept with the table", "lbl")}
  ${query(420, 248, ["SELECT MIN(captured_at),", "       MAX(captured_at)", "FROM   gbfs.station_status"], 320)}${t(566, 326, D.minmax, "huge hot")}${t(566, 354, "read: the whole column", "lbl")}`;

// The real run of MIN/MAX: the plan's two stages and what it cost, against DuckDB's footer.
const run = (D) => `${zone(14, 382, 732, 112, "THE REAL RUN OF MIN, MAX — THE INSTRUCTOR'S, CACHE OFF")}
  ${t(34, 424, `S00  read ${D.run.rows} rows in ${D.run.pieces} pieces`, "l mono")}${t(486, 424, `→ ${D.run.pieces} partial rows`, "l mono")}
  ${t(34, 448, "S01  one row", "l mono")}
  ${t(34, 478, `billed ${D.run.billed} · ${D.run.secs} · about ${D.run.slotMin} slot-minutes`, "l mono hot")}
  ${t(726, 478, `DuckDB, from its footer: ${D.duck}`, "r mono ok")}`;

// Each step is only as tall as its content.
const HEIGHT = [378, 502];
const after = (root, at) => root.querySelector("svg").setAttribute("viewBox", `0 0 760 ${HEIGHT[at]}`);

const scene = (D) => `<svg viewBox="0 0 760 ${HEIGHT[0]}">
  ${on("0 1", columns(D))}
  ${on("0", priced(D))}
  ${on("1", kept(D) + run(D))}
</svg>`;

const css = CSS("sdr") + `
.lw .sdr text.huge { font:700 30px ui-monospace, Menlo, monospace; }
.lw .sdr .bar.col { fill:var(--mute); opacity:.45; transition:fill .5s, opacity .5s; }
.lw .sdr[data-at="0"] .bar.c-day, .lw .sdr[data-at="1"] .bar.c-mm { fill:var(--accent); opacity:1; }
.lw .sdr .meter { fill:var(--ok-bg); stroke:var(--ok); stroke-width:1; }
.lw .sdr text.mtext { fill:var(--ok); font-weight:600; }
.lw .sdr text.cap { font-size:12px; }
.lw .sdr .brace { fill:none; stroke:var(--accent); stroke-width:1.5; stroke-linejoin:round; }
.lw .sdr .term { fill:var(--cell); }
`;

export default widget({ key: "sdr", label: "The dry run", css, steps, scene, captured: CAPTURED, after });
