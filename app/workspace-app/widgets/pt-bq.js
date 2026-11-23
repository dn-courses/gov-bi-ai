// pt-bq — the same pruning in a warehouse: 1.8 billion rows partitioned by day,
// a filter on the day answered from the list of partitions, no filter, and a function around the
// column that hides the day from the list.
// Numbers: the page's dry runs on 2026-11-23 (AVG(num_bikes_available)), equal to
// day1-reference/_measurements.md (2026-11-21/22); MIN/MAX 14.4 GB and COUNT(*) 0 B, dry runs of this Scene's cells on the partitioned table;
// flat one day 27.5 GB, this Scene's dry-run cell on gbfs.station_status (all re-run 2026-11-23); partitioned one day
// 218.7 MB; no filter 13.1 GB; EXTRACT(MONTH …) = 9 27.5 GB; September as a range 6.6 GB.
import { DAYS, SEP1, dayTiles, extra, fmt, on, t, widget, zone } from "./col-lib.js";
import { code, meter, ptCss, stat } from "./pt-lib.js";

const CAPTURED = { rows: 1803699574, flatDay: 27.5, day: "218.7 MB", all: 13.1, month: 6.6, fn: 27.5 };

const steps = (D) => [
  { stop: "By day", title: "The same rows, partitioned by day", decisive: true,
    note: `${fmt(D.rows)} rows, partitioned by day. The warehouse keeps a list of its ${DAYS} partitions; the filter is compared with the list, and <b>1 of ${DAYS}</b> is read: ${D.day}, where the table with no layout reads ${D.flatDay} GB.` },
  { stop: "No filter", title: "No filter on the day: nothing to prune with",
    note: `With no date in the <code>WHERE</code>, all ${DAYS} partitions are read, as if the table had no layout. No footer answers it: <code>AVG</code> needs a sum, and statistics hold only counts, minimums and maximums, so every value of the column is read. BigQuery prices by the column's size anyway: a <code>MIN</code>/<code>MAX</code> dry run costs 14.4 GB, only <code>COUNT(*)</code> 0 B.` },
  { stop: "A function", title: "A function around the column hides the day",
    note: `<code>EXTRACT(MONTH …) = 9</code> means September to a person. To the engine it is a value to compute on every row, not a range to compare with the list: all ${DAYS} partitions.` },
];

const CSS = (k) => extra(k) + ptCss(k) + `
.lw .${k} .day { transition:fill .5s, stroke .5s, opacity .5s; }
.lw .${k}[data-at="0"] .day { opacity:.25; }
.lw .${k}[data-at="0"] .day.d { opacity:1; fill:var(--accent-bg); stroke:var(--accent); stroke-width:2; }
.lw .${k}[data-at="1"] .day, .lw .${k}[data-at="2"] .day { fill:var(--hot-bg); stroke:var(--hot); }
`;

const S = 14, FULL = 392; // px per GB; the track is 28 GB
const DAY_WHERE = "WHERE captured_at >= '2026-09-01' AND captured_at < '2026-09-02'";

const top = () => zone(14, 10, 732, 136, `gbfs.station_status_partitioned — ${DAYS} DAILY PARTITIONS`) + dayTiles((i) => (i === SEP1 ? "d" : ""));

const flat = (D, y) => meter({ x: 200, y, w: D.flatDay * S, full: FULL, label: "no layout", value: `${D.flatDay} GB`, cls: "warm", tone: "hot" });

const byDay = (D) => on("0", t(30, 177, "THE SAME DAY, THE SAME QUERY", "cap") + code(30, 212, DAY_WHERE, "acc")
  + flat(D, 246) + meter({ x: 200, y: 280, w: parseFloat(D.day) / 1000 * S, full: FULL, label: "by day", value: D.day })
  + stat(30, 340, `1 of ${DAYS}`, `partitions read; the other ${DAYS - 1} are never opened`, "acc"));

const noFilter = (D) => on("1", t(30, 177, "NO DATE IN THE WHERE", "cap")
  + code(30, 212, "SELECT AVG(num_bikes_available) FROM gbfs.station_status_partitioned", "hot")
  + meter({ x: 200, y: 246, w: D.all * S, full: FULL, label: "by day", value: `${D.all} GB`, cls: "warm", tone: "hot" })
  + stat(30, 340, `${DAYS} of ${DAYS}`, "partitions read: the whole column", "hot"));

const twoWays = (D) => on("2", t(30, 177, "SEPTEMBER, WRITTEN TWO WAYS", "cap")
  + code(30, 212, "captured_at >= '2026-09-01' AND captured_at < '2026-10-01'", "acc")
  + meter({ x: 30, y: 236, w: D.month * S, full: FULL, value: `${D.month} GB · 30 of ${DAYS}` })
  + code(30, 290, "EXTRACT(MONTH FROM captured_at) = 9", "hot")
  + meter({ x: 30, y: 314, w: D.fn * S, full: FULL, value: `${D.fn} GB · ${DAYS} of ${DAYS}`, cls: "warm", tone: "hot" })
  + t(30, 368, "The same rows come back. The dry run is how to tell which one prunes.", "l"));

const scene = (D) => `<svg viewBox="0 0 760 400">${top()}${zone(14, 158, 732, 232)}${byDay(D)}${noFilter(D)}${twoWays(D)}</svg>`;

export default widget({ key: "ptb", label: "Partitioning in a warehouse", css: CSS("ptb"), steps, scene, captured: CAPTURED });
