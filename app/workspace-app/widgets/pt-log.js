// pt-log — a table format, as a concept: a folder of files cannot say which files are the table
// while someone writes; a log of small entries, each listing the data files of one version, can.
// The log points at the data files; a file no entry lists is not part of the table.
// Row counts: the page's Python cells, run on 2026-11-23 through the lab (one day = 288,000 rows).
import { arrow, box, extra, fmt, on, from, pill, t, widget, zone } from "./col-lib.js";
import { code, ptCss } from "./pt-lib.js";

const CAPTURED = { dayRows: 288000 };

const steps = (D) => [
  { stop: "A folder", title: "Which files are the table right now?",
    note: `A writer is adding a day while a query lists the folder, and a correction wrote a new copy of another day beside the old one. Listing the folder finds half a file and both copies.` },
  { stop: "The log", title: "A log lists the files of each version", decisive: true,
    note: `Data files are written once and never changed. A new version of the table is one small <b>log entry</b> that lists its data files: <code>v1</code> lists two days, ${fmt(2 * D.dayRows)} rows.` },
  { stop: "A new file", title: "A file is in the table only when an entry lists it",
    note: `The third day is written, and only then <code>v2</code> is committed. A query reads one entry and exactly its files, so a reader of <code>v1</code> never sees the new file. This log, kept as files beside the data, is a <b>table format</b>: Apache Iceberg and Delta Lake are two.` },
];

const CSS = (k) => extra(k) + ptCss(k) + `
.lw .${k} .box.new { stroke-dasharray:5 4; fill:none; stroke:var(--hot); }
.lw .${k} .half { fill:var(--hot); opacity:.3; }
.lw .${k} .box.v { transition:fill .5s, stroke .5s; }
.lw .${k}[data-at="1"] .box.v1, .lw .${k}[data-at="2"] .box.v2 { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .${k} .edge.e { stroke:var(--line); }
.lw .${k}[data-at="1"] .edge.e1, .lw .${k}[data-at="2"] .edge.e2 { stroke:var(--accent); stroke-width:2.5; }
`;

// Step 0: one folder, listed by a query. The two arrows into trouble are drawn hot.
const FOLDER = [["day=2026-08-01/data_0.parquet", "", "the first copy"], ["day=2026-08-01/data_1.parquet", "", "its correction"],
  ["day=2026-08-02/data_0.parquet", "", ""], ["day=2026-08-03/data_0.parquet", "new", "still being written"]];
const folder = () => on("0", zone(14, 10, 732, 330, "partitioning_by_day/ — READ BY LISTING THE FOLDER")
  + `<rect class="half" x="301" y="231" width="150" height="42" rx="6"/>`
  + FOLDER.map(([name, cls, what], i) => box(300, 44 + i * 62, 300, 44, name, cls, "mono")
    + (what ? t(614, 66 + i * 62, what, `lbl l ${i ? "hot" : ""}`) : "")).join("")
  + pill(40, 150, 200, 44, "a query lists it", "hit", "acc")
  + [0, 1, 2, 3].map((i) => arrow(244, 172, 294, 66 + i * 62, i % 2 ? "hot" : "on")).join("")
  + t(30, 318, "Half a file, and the same day twice: the folder cannot say which files are the table now.", "l"));

// Steps 1-2: data files on the left, log entries on the right, an arrow from each entry to each file it lists.
const FILE_X = 40, FILE_W = 280, LOG_X = 470, LOG_W = 250, rowY = (i) => 52 + i * 64;
const FILES = ["day=2026-08-01/data_0.parquet", "day=2026-08-02/data_0.parquet", "aug-03.parquet"];
const ENTRIES = [["v0", "v0.json", "lists day 1", [0], 1], ["v1", "v1.json", "lists days 1, 2", [0, 1], 1], ["v2", "v2.json", "lists days 1, 2, 3", [0, 1, 2], 2]];
const link = (v, f, cls) => {
  const y1 = rowY(v) + 20, y2 = rowY(f) + 20;
  return `<path class="edge e ${cls}" d="M${LOG_X - 6} ${y1} C${LOG_X - 70} ${y1} ${FILE_X + FILE_W + 70} ${y2} ${FILE_X + FILE_W + 8} ${y2}
    M${FILE_X + FILE_W + 18} ${y2 - 7} L${FILE_X + FILE_W + 8} ${y2} L${FILE_X + FILE_W + 18} ${y2 + 7}"/>`;
};
const entry = ([cls, name, what, files, step], i) => from(step, files.map((f) => link(i, f, `e${cls.slice(1)}`)).join("")
  + `<rect class="box v ${cls}" x="${LOG_X}" y="${rowY(i)}" width="${LOG_W}" height="40" rx="20"/>`
  + t(LOG_X + 18, rowY(i) + 20, name, "mono l") + t(LOG_X + 100, rowY(i) + 20, what, "lbl l"));
const log = (D) => from(1, zone(14, 10, 340, 230, "DATA FILES — WRITTEN ONCE") + zone(380, 10, 366, 230, "THE LOG — ONE ENTRY PER VERSION")
  + FILES.slice(0, 2).map((f, i) => box(FILE_X, rowY(i), FILE_W, 40, f, "", "mono")).join("")
  + ENTRIES.map(entry).join("")
  + on("1", zone(14, 252, 732, 100, "A READER")
    + code(30, 302, "v1.json", "acc") + t(130, 302, `→ exactly its two files: ${fmt(2 * D.dayRows)} rows`, "l acc")
    + t(30, 336, "Nothing in the folder decides what the table is. The newest entry does.", "lbl l")));
const newFile = (D) => on("2", box(FILE_X, rowY(2), FILE_W, 40, FILES[2], "hit", "mono acc")
  + zone(14, 252, 732, 100, "TWO READERS")
  + code(30, 302, "v1.json") + t(130, 302, `${fmt(2 * D.dayRows)} rows, before and after the new file`, "l")
  + code(30, 334, "v2.json", "acc") + t(130, 334, `${fmt(3 * D.dayRows)} rows, from the moment v2.json exists`, "l acc"));

const scene = (D) => `<svg viewBox="0 0 760 362">${folder()}${log(D)}${newFile(D)}</svg>`;

export default widget({ key: "ptg", label: "A table format: the log", css: CSS("ptg"), steps, scene, captured: CAPTURED });
