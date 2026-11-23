// st-footer — some answers are already written down: count, min and max of a whole Parquet file
// come from its footer, with no row read; sum has to read; a filter turns the footer's answer back
// into a read. Steps 1-3 of col-exec-footer, adapted to this page (its "Runs" step is page 06's).
// Measured on 2026-11-23 in the postgres lab (DuckDB v2.0.0), with the page's own cells:
//   footer     parquet_metadata('station_status.parquet'), captured_at -> 211 row groups, 25,920,000
//              rows, 122,880 rows each; every row group's captured_at runs 2026-07-01 00:00 to 2026-09-28 23:55
//   no scan    EXPLAIN of count(*), min, max -> one node, "Column Data Scan ~1 row";
//              EXPLAIN ANALYZE -> Data Read 704.6 kB, Total Time 0.0000s
//   sum        EXPLAIN ANALYZE sum(bikes_available) -> PARQUET_SCAN, Row Groups Scanned 211 / 211,
//              25,920,000 rows, Data Read 17.0 MB
//   filter     max(captured_at) WHERE captured_at < '2026-07-02' -> 211 / 211 row groups, 288,000 rows
//              kept, Data Read 158.0 MB (re-measured after page 01 rewrote the file); on statistics_and_skipping.parquet (sorted by time) 3 / 211, 512.2 kB
import { TABLE_CSS, table } from "@widget-lib/table.js";
import { CSS, arrow, chip, node, on, svg, t, widget, zone } from "./ramp-lib.js";

const CAPTURED = {
  groups: 211, rows: "25,920,000", perGroup: "122,880", lastRows: "115,200", first: "2026-07-01 00:00", last: "2026-09-28 23:55",
  footerKB: "705 kB", sumMB: 17.0, filterMB: 158.0, kept: "288,000", sortedGroups: 3, sortedKB: "512.2 kB",
};

const steps = (D) => [
  { stop: "Written down", title: "Some answers are already written down",
    note: `The footer holds each row group's row count and each column's smallest and largest value. A count of the whole file is ${D.groups} numbers added; its first and last moment are the smallest of ${D.groups} minimums and the largest of ${D.groups} maximums.` },
  { stop: "No scan", title: "So the engine reads no rows at all", decisive: true,
    note: `<code>count(*)</code>, <code>min</code> and <code>max</code> of the whole file come back from a plan of one node, after reading ${D.footerKB} of footer. <code>sum</code> is not written down anywhere: it reads all ${D.groups} row groups of the column.` },
  { stop: "A filter", title: "A filter turns it back into a read",
    note: `The footer has the maximum of each row group, not the maximum of the rows before 2 July. Every row group of this file spans the whole quarter, so none can be skipped: ${D.filterMB} MB read to keep ${D.kept} rows. On the copy sorted by time, ${D.sortedGroups} row groups and ${D.sortedKB}.` },
];

const FOOT = ["row group", "rows", "min captured_at", "max captured_at"];
const footer = (D, hot = "") => [
  ["0", D.perGroup, D.first, [D.last, hot]], ["1", D.perGroup, D.first, [D.last, hot]], ["2", D.perGroup, D.first, [D.last, hot]],
  ["…", "…", "…", "…"], [`${D.groups - 1}`, D.lastRows, D.first, [D.last, hot]],
];

// The footer on the left; on the right, the three answers it gives, each from one of its columns.
const answer = (y, label, value, from) => `${node(556, y, 190, 80, "", "hit")}
  ${t(572, y + 19, label, "l lbl acc")}${t(572, y + 43, value, "l big acc")}${t(572, y + 65, from, "l lbl")}
  ${arrow(488, y + 40, 548, y + 40)}`;

const written = (D) => `${table(20, 72, FOOT, footer(D), { cap: `the footer — one entry per row group, ${D.groups} of them` })}
  ${answer(34, "count(*)", D.rows, `${D.groups} row counts added`)}
  ${answer(124, "min(captured_at)", D.first, `smallest of ${D.groups} minimums`)}
  ${answer(214, "max(captured_at)", D.last, `largest of ${D.groups} maximums`)}
  ${chip(150, 318, 460, 34, "no value of the column is read", "ok", "ok")}`;

const plans = (D) => `${zone(20, 12, 352, 340, "COUNT, MIN, MAX OF THE FILE")}
  ${t(196, 56, "the whole plan: one node", "lbl")}
  ${node(66, 78, 260, 56, "Column Data Scan · ~1 row", "hit", "mono")}
  ${t(196, 222, D.footerKB, "huge acc")}${t(196, 252, "read: the footer only", "lbl")}
  ${chip(86, 290, 220, 34, "no row group scanned", "ok", "ok")}
  ${zone(388, 12, 352, 340, "SUM(bikes_available)")}
  ${node(434, 44, 260, 40, "Ungrouped Aggregate", "", "mono")}${arrow(564, 120, 564, 88)}
  ${node(434, 120, 260, 56, "", "warm")}${t(564, 140, "PARQUET_SCAN", "mono")}${t(564, 160, `${D.groups} / ${D.groups} row groups`, "mono hot")}
  ${t(564, 222, `${D.sumMB} MB`, "huge hot")}${t(564, 252, `read: ${D.rows} values`, "lbl")}
  ${chip(454, 290, 220, 34, "every row group scanned", "warm", "hot")}`;

const filtered = (D) => `<rect class="term" x="40" y="10" width="420" height="30" rx="8"/>${t(56, 26, "max(captured_at) WHERE captured_at &lt; '2026-07-02'", "l mono acc")}
  ${table(40, 76, FOOT, footer(D, "rep"), { cap: "the footer — each entry's maximum is the end of September" })}
  ${t(380, 282, "no entry says what the largest value before 2 July is", "h hot")}
  ${t(210, 324, `${D.groups} / ${D.groups} row groups`, "big hot")}${t(210, 350, "read", "lbl")}
  ${t(560, 324, `${D.filterMB} MB`, "big hot")}${t(560, 350, `read to keep ${D.kept} rows`, "lbl")}`;

const scene = (D) => svg(760, 364, `
  ${on("0", written(D))}
  ${on("1", plans(D))}
  ${on("2", filtered(D))}
`);

const css = CSS("sft") + TABLE_CSS("sft") + `
.lw .sft text.big { font:700 24px ui-monospace, Menlo, monospace; }
.lw .sft .box.hit text.big, .lw .sft text.big.l { font:700 15px ui-monospace, Menlo, monospace; }
.lw .sft text.cap { font-size:12px; }
.lw .sft text.huge { font:700 28px ui-monospace, Menlo, monospace; }
.lw .sft text.h { font:650 16px system-ui, sans-serif; }
`;

export default widget({ key: "sft", label: "Answers from the footer", css, steps, scene, captured: CAPTURED });
