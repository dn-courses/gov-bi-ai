// pt-cut — how coarse to cut: the same rows cut by month, by day, and by day and station. Each step
// draws its own layout. Too coarse reads a month for a day; too fine turns ten days into ten thousand
// small files, each paying for its own footer.
// Numbers: the page's own cells, run on 2026-11-23 through the lab (DuckDB 2.0.0, EXPLAIN ANALYZE and
// parquet_file_metadata). By month: 3 files, about 132 MB (du -sb, the step's cell: 132,652,041 B
// on 2026-11-23; the partitioned write is not byte-identical from run to run, 132.1-132.7 MB); one day 1 / 3 files; row groups scanned
// 75 / 76, 76 / 76, 74 / 74 and 74 / 76 in four writes (the parallel write cuts row groups differently each
// time, so whether one is skipped is chance: the widget says "every one"), Data Read 22.0-22.2 MB (all re-run on page 01's station-sorted 346 MB file). By day: 1 / 90 files, 3 / 3 row groups, 214.3 kB (the step's own cell, re-run 2026-11-23). Ten days by (day, station_id): 10,000
// files, 76.0 MB, against 10 files, 5.0 MB by day; one station-day file 7,545 bytes with a 2,265-byte
// footer, against 498,386 bytes for a whole day's 1,000 stations (≈ 0.5 kB a station); one day on
// it 1,000 / 10,000 files, 7.9 MB.
import { box, extra, fmt, on, t, widget, zone } from "./col-lib.js";
import { AUG1, calendar, meter, ptCss, stat } from "./pt-lib.js";

const CAPTURED = {
  month: { files: 3, mb: "about 132", groups: 75, dayMb: "about 22" },
  day: { files: 90, dayKb: 214.3 },
  fine: { files: 10000, mb: 76.0, dayFiles: 1000, dayMb: 7.9, fileKb: 7.5, footerKb: 2.3, plainKb: 0.5 },
  ten: { files: 10, mb: 5.0 },
};

const steps = (D) => [
  { stop: "By month", title: "Too coarse: a day costs a month",
    note: `Three parts. A filter on one day still prunes to <b>1 of ${D.month.files}</b>, but that part is a whole month, and the day is spread through it, so the plan scans every row group, or all but one or two, ${D.month.dayMb} MB. How many there are changes from write to write: about ${D.month.groups}.` },
  { stop: "By day", title: "Cut at the period the questions name",
    note: `The questions name days, so one part per day: a day's question opens one file and reads all of it, ${D.day.dayKb} kB, and nothing else.` },
  { stop: "Too fine", title: "Too fine: by day and by station", decisive: true,
    note: `Each day folder is cut again by station: ${fmt(D.fine.dayFiles)} small files a day, each with its own footer, larger than its rows, and one day opens ${fmt(D.fine.dayFiles)} of them: ${D.fine.dayMb} MB against ${D.day.dayKb} kB. The station, with a thousand values, belongs to the sort order inside a day's file, not to the parts.` },
];

const CSS = (k) => extra(k) + ptCss(k) + `
.lw .${k} .tiny { fill:var(--hot-bg); stroke:var(--hot); stroke-width:.6; }
.lw .${k} .box.off { opacity:.35; }
`;

// The bottom band of steps 0 and 1: what one day costs on that cut.
const oneDay = (files, groups, read, tone) => zone(14, 264, 732, 98, "ONE DAY, 2026-08-01")
  + stat(30, 318, files, "folders opened") + stat(290, 318, groups, "row groups read") + stat(730, 318, read, "read", tone, "r");

const MONTHS = ["month=2026-07-01/", "month=2026-08-01/", "month=2026-09-01/"];
const byMonth = (D) => on("0", zone(14, 10, 732, 112, `partitioning_by_month/ — ${D.month.files} FOLDERS, ONE FILE IN EACH — ${D.month.mb} MB`)
  + MONTHS.map((m, i) => box(30 + i * 240, 44, 220, 58, m, i === 1 ? "hit" : "off", `mono ${i === 1 ? "acc" : "dim"}`)).join("")
  + zone(14, 134, 732, 118, `INSIDE month=2026-08-01/ — ABOUT ${D.month.groups} ROW GROUPS, SORTED BY STATION`)
  + Array.from({ length: D.month.groups }, (_, i) => `<rect class="box warm" x="${30 + i * 9.1}" y="168" width="7" height="32" rx="2"/>`).join("")
  + t(30, 230, "Every station's rows of the month include the day asked for: almost every row group may hold it.", "lbl l")
  + oneDay(`1 of ${D.month.files}`, "every one", `${D.month.dayMb} MB`, "hot"));

const byDay = (D) => on("1", zone(14, 10, 732, 242, `partitioning_by_day/ — ${D.day.files} FOLDERS, ONE FILE IN EACH`)
  + calendar({ y: 52, h: 28, cls: (i) => (i === AUG1 ? "d" : "x") })
  + oneDay(`1 of ${D.day.files}`, "3 of 3", `${D.day.dayKb} kB`, "acc"));

// Cut by day AND by station: ten day folders, a thousand station folders inside each, one small file
// in every one; then one of those files, and the two cuts of the same ten days.
const DAYS = ["day=2026-07-01/", "day=2026-07-02/", "day=2026-07-03/", "day=2026-07-04/"];
const dayList = () => zone(14, 10, 190, 240, "partitioning_too_fine/")
  + DAYS.map((d, i) => box(28, 44 + i * 34, 162, 26, d, i === 0 ? "hit" : "", `mono ${i === 0 ? "acc" : ""}`)).join("")
  + t(109, 196, "· · · 10 day folders", "lbl") + t(109, 226, "each cut again by station", "lbl");
const stations = (D) => `<path class="edge on" d="M192 57 L214 57"/>` + zone(216, 10, 318, 240, `ONE DAY: ${fmt(D.fine.dayFiles)} STATION FOLDERS`)
  + Array.from({ length: 1000 }, (_, i) => `<rect class="tiny" x="${232 + (i % 50) * 5.8}" y="${44 + Math.floor(i / 50) * 5.8}" width="4.4" height="4.4" rx="1"/>`).join("")
  + t(232, 184, "station_id=1/ … 1000/, a file in each", "mono l dim")
  + t(232, 212, `one day opens ${fmt(D.fine.dayFiles)} files · ${D.fine.dayMb} MB`, "l hot")
  + t(232, 234, `by day alone: one file · ${D.day.dayKb} kB`, "lbl l");
const anatomy = (D) => {
  const fh = Math.round(110 * D.fine.footerKb / D.fine.fileKb);
  return zone(546, 10, 200, 240, "ONE OF THOSE FILES")
    + `<rect class="box warm" x="566" y="44" width="160" height="${fh}" rx="5"/>`
    + `<rect class="box" x="566" y="${46 + fh}" width="160" height="${108 - fh}" rx="5"/>`
    + t(646, 44 + fh / 2 + 1, `footer ${D.fine.footerKb} kB`, "hot") + t(646, 100 + fh / 2, "288 rows")
    + t(566, 182, `≈ ${D.fine.fileKb} kB a file`, "big l hot") + t(566, 208, "the same rows inside", "lbl l")
    + t(566, 228, `a day's file: ≈ ${D.fine.plainKb} kB`, "lbl l acc");
};
const totals = (D) => zone(14, 262, 732, 100, "TEN DAYS, CUT TWO WAYS")
  + meter({ x: 200, y: 302, w: 300 * D.ten.mb / D.fine.mb, full: 300, label: "by day", value: `${D.ten.files} files · ${D.ten.mb.toFixed(1)} MB` })
  + meter({ x: 200, y: 334, w: 300, full: 300, label: "by day and station", value: `${fmt(D.fine.files)} files · ${D.fine.mb.toFixed(1)} MB`, cls: "warm", tone: "hot" });
const tooFine = (D) => on("2", dayList() + stations(D) + anatomy(D) + totals(D));

const scene = (D) => `<svg viewBox="0 0 760 372">${byMonth(D)}${byDay(D)}${tooFine(D)}</svg>`;

export default widget({ key: "ptc", label: "How coarse to cut", css: CSS("ptc"), steps, scene, captured: CAPTURED });
