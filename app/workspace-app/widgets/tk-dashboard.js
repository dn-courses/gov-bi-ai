// tk-dashboard — the hands-on task: a dashboard of three tiles, what each reads today, the goal and
// how it is checked, and the same tiles in the warehouse.
// Measured 2026-11-23 in the postgres lab (DuckDB v2.0.0) through the lab semaphore:
//   raw file   EXPLAIN ANALYZE of each tile on station_status.parquet (346 MB, 211 row groups, written
//              ORDER BY station_id, captured_at): T1 164.7 MB, 200/211 row groups · T2 (one station, the
//              quarter) 1.5 MB, 1/211 · T3 174.4 MB, 211/211
//   a layout   partitioned by day (90 files, 46 MB): T1 240 kB, 1/90 files · but T2 8.8 MB, 90/270
//              row groups (worse than today: a day folder holds every station), so T2 stays on the file;
//              a daily summary (8 kB): T3 7.7 kB. Answers identical (EXCEPT both ways: 0 rows).
//   BigQuery   dry runs: T1 flat 46.1 GB → partitioned+clustered 100.8 MB; T2 70.1 GB → 4.1 GB;
//              T3 46.1 GB on both (partitions cannot help a whole-period question).
import { CSS, node, on, svg, t, widget, zone } from "./ramp-lib.js";

const CAPTURED = {
  tiles: [
    { k: "T1", name: "Hourly bikes, one system, one day", raw: 164.7, rawTxt: "165 MB", lay: "240 kB", bq: ["46.1 GB", "101 MB"] },
    { k: "T2", name: "One station, hourly, the whole quarter", raw: 1.5, rawTxt: "1.5 MB", lay: "1.5 MB", bq: ["70.1 GB", "4.1 GB"] },
    { k: "T3", name: "Monthly average per system", raw: 174.4, rawTxt: "174 MB", lay: "8 kB", bq: ["46.1 GB", "46.1 GB"] },
  ],
  file: "346 MB", folder: "46 MB",
};

const steps = (D) => [
  { stop: "The dashboard", title: "An operations dashboard with three tiles",
    note: `Fourteen people open it about twenty times a day. Each tile is one query over the stations' readings. Today every tile reads the one file of ${D.file}.` },
  { stop: "What it reads", title: "What each tile reads today",
    note: `T1 and T3 read almost the whole file for a day's or a month's answer. T2 is already cheap: the file happens to be sorted by station. Whatever you build must not make it dearer.` },
  { stop: "Your goal", title: "Lay the data out for these three questions", decisive: true,
    note: `Write the data again, in any layouts you choose, and rewrite each tile against them. Three checks: the same answers, no tile reading more than today, and layouts that stay small.` },
  { stop: "Warehouse", title: "The same tiles in the warehouse",
    note: `On BigQuery's 1.8 billion rows the table is already partitioned by day and clustered by system and station. Rewrite T1 and T2 for it and dry-run them, then price T3: no partition helps a question about the whole period.` },
];

const tile = (x, y, d, i) => `${node(x, y, 220, 150, "", i === 1 ? "" : "hit")}${t(x + 16, y + 26, d.k, "l h acc")}
  ${t(x + 16, y + 50, d.name.split(", ")[0], "l lbl")}${t(x + 16, y + 70, d.name.split(", ").slice(1).join(", "), "l lbl")}
  ${spark(x + 16, y + 92, i)}`;
// A small chart shape per tile: a day curve, a week line, monthly bars.
function spark(x, y, i) {
  if (i === 2) return [18, 30, 24, 36, 28, 40].map((h, j) => `<rect class="sp" x="${x + j * 30}" y="${y + 46 - h}" width="20" height="${h}" rx="3"/>`).join("");
  const pts = Array.from({ length: 24 }, (_, j) => `${x + j * 8},${y + 30 - (i ? 12 * Math.sin(j / 1.3) : 18 * Math.sin(j / 4))}`).join(" ");
  return `<polyline class="sp-l" points="${pts}"/>`;
}

const reads = (D) => D.tiles.map((d, i) => {
  const y = 70 + i * 86, w = Math.max(4, (d.raw / 180) * 420);
  return `${t(40, y + 4, d.k, "l h acc")}${t(40, y + 26, d.name, "l lbl")}
    <rect class="bar ${i === 1 ? "ok" : "hot"}" x="300" y="${y - 12}" width="${w}" height="30" rx="5"/>${t(310 + w, y + 8, d.rawTxt, "l mono")}`;
}).join("");

const goal = (D) => [["Same answers", "each tile, compared with today's: 0 rows differ"], ["No tile reads more", "EXPLAIN ANALYZE: Data Read, files and row groups"],
  ["Stays small", `what you add stays small beside the ${D.file} file`]]
  .map(([h, s], i) => `${node(60, 40 + i * 98, 640, 80, "", "hit")}${t(90, 76 + i * 98, `${i + 1}`, "l huge acc")}${t(140, 72 + i * 98, h, "l h")}${t(140, 96 + i * 98, s, "l lbl")}`).join("");

const warehouse = (D) => `${t(250, 40, "flat table", "lbl")}${t(520, 40, "partitioned by day, clustered", "lbl")}
  ${D.tiles.map((d, i) => `${t(40, 92 + i * 90, d.k, "l h acc")}${node(170, 66 + i * 90, 160, 44, d.bq[0], "warm", "mono")}
    ${node(420, 66 + i * 90, 200, 44, "?", "", "mono")}`).join("")}
  ${t(380, 340, "your rewrite, priced by a dry run before it runs", "lbl")}`;

const scene = (D) => svg(760, 360, `
  ${on("0", `${D.tiles.map((d, i) => tile(24 + i * 244, 60, d, i)).join("")}${t(380, 270, "station_status.parquet", "mono")}${t(380, 296, `25,920,000 readings · ${D.file}`, "lbl")}`)}
  ${on("1", `${zone(24, 16, 712, 300, "DATA READ PER TILE, FROM THE ONE FILE")}${reads(D)}`)}
  ${on("2", goal(D))}
  ${on("3", warehouse(D))}
`);

const css = CSS("tk") + `
.lw .tk .sp { fill:var(--accent); opacity:.55; } .lw .tk .sp-l { fill:none; stroke:var(--accent); stroke-width:2; stroke-linejoin:round; }
.lw .tk .bar.hot { fill:var(--hot-bg); stroke:var(--hot); stroke-width:1.5; } .lw .tk .bar.ok { fill:var(--ok-bg); stroke:var(--ok); stroke-width:1.5; }
.lw .tk text.h { font:650 16px system-ui, sans-serif; } .lw .tk text.huge { font:700 30px ui-monospace, Menlo, monospace; }
`;

export default widget({ key: "tk", label: "Lay out a dashboard", css, steps, scene, captured: CAPTURED });
