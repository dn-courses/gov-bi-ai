// st-skip — skipping: a filter is compared with each row group's minimum and maximum, and works
// only when the file is sorted on the filtered column. Each row group is drawn as the span of time
// its captured_at covers; sorting the rows by time shrinks every span to about ten hours.
// Measured 2026-11-23 in the postgres lab (DuckDB v2.0.0) with the page's own cells, on
// station_status.parquet (station order) and statistics_and_skipping.parquet (the same rows,
// ORDER BY captured_at, station_id, PARQUET_VERSION v2; 211 row groups):
//   footer check, 1 Aug      station order 211 / 211 may hold it; time order 3 / 211 (groups 72-74)
//   EXPLAIN ANALYZE, 1 Aug   station order 211 / 211, 174.4 MB, 40-140 ms (three runs, re-measured 15:30);
//                            time order 3 / 211, 744.5 kB, 8-10 ms (three runs)
//   station_id = 42          station order 1 / 211, 782.3 kB; time order 211 / 211, 22.0 MB
//   column chunks on disk    legacy_id 0.1 -> 10.0 MB, name 0.1 -> 4.4, station_id 0.0 -> 4.0,
//                            system_id 0.0 -> 0.5 (station order -> time order)
//   time-order spans         group 0 Jul 1 00:00-10:10, 72 Jul 31 17:15-Aug 1 03:30,
//                            74 Aug 1 13:45-23:55, 75 Aug 2 00:00-10:10, 210 Sep 28 14:20-23:55
import { CSS, on, t, widget, zone } from "./ramp-lib.js";

const CAPTURED = {
  groups: 211, hits: 3,
  day: { station: ["211 / 211", "174.4 MB", "40–140 ms"], time: ["3 / 211", "744.5 kB", "8–10 ms"] },
  st42: { station: ["1 / 211", "782.3 kB"], time: ["211 / 211", "22.0 MB"] },
  sizes: [["legacy_id", 0.1, 10.0], ["name", 0.1, 4.4], ["station_id", 0.0, 4.0], ["system_id", 0.0, 0.5]],
  // the time-ordered file's spans, in days from Jul 1 00:00 (from its footer)
  spans: [[0, 0, 0.4236], [1, 0.4236, 0.8507], [2, 0.8507, 1.2778], null, [71, 30.2917, 30.7188], [72, 30.7188, 31.1458],
    [73, 31.1458, 31.5729], [74, 31.5729, 31.9965], [75, 32.0, 32.4236], null, [209, 89.1701, 89.5972], [210, 89.5972, 89.9965]],
};

const steps = (D) => [
  { stop: "The check", title: "A filter is compared with each block's minimum and maximum",
    note: `A row group can hold 1 August only if its minimum is before 2 August and its maximum is on or after 1 August. In this file every row group spans the whole quarter, so all <b>${D.groups} of ${D.groups}</b> pass the check.` },
  { stop: "Sorted", title: "Sorted by time, each block spans about ten hours", decisive: true,
    note: `The same rows, written sorted by <code>captured_at</code>. Now only <b>${D.hits} row groups</b> can hold 1 August, and the other ${D.groups - D.hits} are skipped on the footer alone, never read.` },
  { stop: "Side by side", title: "The same query on the two files",
    note: `The same rows and the same answer: ${D.day.station[1]} read in station order, ${D.day.time[1]} sorted by time.` },
  { stop: "One order", title: "A file has one sort order",
    note: `Sorted by time, a filter on the station skips nothing, and the columns that followed the station lose their runs and grow. The sort is chosen for the filter most queries use; for data that arrives over time, that is usually the time.` },
];

const AX0 = 132, AX1 = 720, DAYS = 90, dx = (d) => AX0 + (d / DAYS) * (AX1 - AX0);
const rowY = (k) => 66 + k * 20;
const isHit = (a, b) => a < 32 && b >= 31;

// A row group as a bar across the whole quarter; on the sorted step it shrinks to its own span.
function span(s, k) {
  if (!s) return t(AX0 - 12, rowY(k) + 6, "⋮", "r lbl");
  const [id, a, b] = s, x0 = dx(a), w = Math.max(5, dx(b) - x0), sc = w / (AX1 - AX0);
  return `${t(AX0 - 12, rowY(k) + 6, `group ${id}`, `r lbl gid ${isHit(a, b) ? "hitid" : ""}`)}
    <rect class="rg ${isHit(a, b) ? "hit" : "miss"}" x="${AX0}" y="${rowY(k)}" width="${AX1 - AX0}" height="12" rx="3" style="--a:${x0 - sc * AX0}px;--s:${sc}"/>`;
}

const axis = () => `<path class="axis" d="M${AX0} 310 L${AX1} 310"/>
  ${[["Jul 1", 0], ["Aug 1", 31], ["Sep 1", 62], ["Sep 28", 89]].map(([l, d]) => `<path class="axis" d="M${dx(d)} 306 V314"/>${t(dx(d), 326, l, "lbl")}`).join("")}
  <rect class="band" x="${dx(31)}" y="52" width="${dx(32) - dx(31)}" height="252"/>${t(dx(31.5), 44, "WHERE captured_at is 1 August", "lbl acc")}`;

// The 48 hours around 1 August, drawn to their own scale: the five row groups near the day.
const ZX0 = 476, ZX1 = 716, ZA = 30.5, ZB = 32.5;
const zx = (d) => ZX0 + ((Math.min(ZB, Math.max(ZA, d)) - ZA) / (ZB - ZA)) * (ZX1 - ZX0);
const zoomRow = ([id, a, b], i) => {
  const y = 100 + i * 24, hit = isHit(a, b);
  return `${t(ZX0 - 10, y + 7, `group ${id}`, `r lbl ${hit ? "acc" : ""}`)}
    <rect class="zb ${hit ? "hit" : "miss"}" x="${zx(a)}" y="${y}" width="${zx(b) - zx(a)}" height="14" rx="3"/>`;
};
const zoom = (D) => `<rect class="lens" x="${dx(30.29) - 6}" y="${rowY(4) - 6}" width="${dx(32.42) - dx(30.29) + 12}" height="${rowY(8) - rowY(4) + 24}" rx="6"/>
  <path class="lead" d="M${dx(32.42) + 6} ${rowY(4) - 6} L404 58 M${dx(32.42) + 6} ${rowY(8) + 18} L404 258"/>
  <rect class="zpanel" x="404" y="58" width="332" height="200" rx="10"/>${t(420, 78, "ZOOM — 48 HOURS, TO SCALE", "cap")}
  <rect class="band" x="${zx(31)}" y="92" width="${zx(32) - zx(31)}" height="130"/>
  ${D.spans.filter((s) => s && s[0] >= 71 && s[0] <= 75).map(zoomRow).join("")}
  <path class="axis" d="M${ZX0} 226 L${ZX1} 226"/>
  ${[30.5, 31, 31.5, 32, 32.5].map((d) => `<path class="axis" d="M${zx(d)} 222 V230"/>`).join("")}
  ${t(zx(31), 244, "Aug 1", "lbl")}${t(zx(32), 244, "Aug 2", "lbl")}`;

const chart = (D) => `${zone(14, 8, 732, 330)}
  ${on("0", t(30, 27, "STATION_STATUS.PARQUET — IN STATION ORDER", "cap"))}
  ${on("1", t(30, 27, "STATISTICS_AND_SKIPPING.PARQUET — THE SAME ROWS, SORTED BY TIME", "cap"))}
  ${axis()}${D.spans.map(span).join("")}
  ${on("0", `<rect class="bandtop" x="${dx(31)}" y="52" width="${dx(32) - dx(31)}" height="252"/>`)}
  ${on("1", zoom(D), "zl")}
  ${on("0", t(380, 362, `${D.groups} of ${D.groups} row groups may hold the day: all are read`, "h hot"))}
  ${on("1", t(380, 362, `${D.hits} of ${D.groups} may hold the day: ${D.groups - D.hits} skipped without being read`, "h acc"))}`;

// One measure, as two bars on one scale over a faint full-scale track: station order, then time order.
function pair(y, label, sub, [a, b], [va, vb], max, w = 380) {
  const wa = Math.max(4, (w * a) / max), wb = Math.max(4, (w * b) / max);
  return `${t(40, y + 16, label, "l h")}${t(40, y + 38, sub, "l lbl")}
  <rect class="track" x="230" y="${y}" width="${w}" height="20" rx="6"/><rect class="bar warm grow" x="230" y="${y}" width="${wa}" height="20" rx="6"/>
  ${t(242 + wa, y + 11, va, "l mono hot")}
  <rect class="track" x="230" y="${y + 28}" width="${w}" height="20" rx="6"/><rect class="bar on grow" x="230" y="${y + 28}" width="${wb}" height="20" rx="6"/>
  ${t(242 + wb, y + 39, vb, "l mono acc")}`;
}

const sideBySide = (D) => `${zone(14, 8, 732, 362, "AVG(bikes_available) FOR 1 AUGUST")}
  <rect class="key warm" x="230" y="42" width="12" height="12" rx="3"/>${t(250, 49, "in station order", "l lbl")}
  <rect class="key on" x="390" y="42" width="12" height="12" rx="3"/>${t(410, 49, "sorted by time", "l lbl")}
  ${pair(82, "row groups read", `of ${D.groups} in the file`, [211, 3], [D.day.station[0], D.day.time[0]], 211)}
  <path class="rule" d="M40 160 H720"/>
  ${pair(184, "data read", "from the file", [174.4, 0.7445], [D.day.station[1], D.day.time[1]], 174.4)}
  <path class="rule" d="M40 262 H720"/>
  ${pair(286, "time", "three runs each", [90, 9], [`about ${D.day.station[2]}`, `about ${D.day.time[2]}`], 90)}`;

const sizeRow = ([c, a, b], i) => `${t(406, 124 + i * 46, c, "l mono")}
  <rect class="bar warm" x="510" y="${112 + i * 46}" width="${Math.max(2, a * 10)}" height="10" rx="3"/>
  <rect class="bar on grow" x="510" y="${124 + i * 46}" width="${Math.max(2, b * 10)}" height="10" rx="3"/>${t(520 + b * 10, 130 + i * 46, `${a.toFixed(1)} → ${b.toFixed(1)} MB`, "l mono acc")}`;

const verdict = (y, label, groups, bytes, warm) => `<rect class="vcard ${warm ? "warm" : "cool"}" x="30" y="${y}" width="330" height="96" rx="10"/>
  ${t(48, y + 24, label, `l lbl ${warm ? "hot" : "acc"}`)}
  ${t(48, y + 54, groups, `l huge ${warm ? "hot" : "acc"}`)}${t(342, y + 54, bytes, `r mono ${warm ? "hot" : "acc"}`)}
  ${t(48, y + 80, "row groups read", "l lbl")}`;

const oneOrder = (D) => `${zone(14, 8, 362, 362, "WHERE station_id = 42")}
  ${verdict(44, "in station order", D.st42.station[0], D.st42.station[1], true)}
  ${verdict(156, "sorted by time", D.st42.time[0], D.st42.time[1], false)}
  ${t(34, 286, "every row group holds all 1,000", "l lbl")}${t(34, 306, "stations for about ten hours", "l lbl")}
  ${zone(390, 8, 356, 362, "COLUMNS THAT FOLLOWED THE STATION")}${t(406, 78, "compressed size on disk", "l lbl")}
  <rect class="key warm" x="406" y="44" width="12" height="12" rx="3"/>${t(424, 51, "station order", "l lbl")}
  <rect class="key on" x="536" y="44" width="12" height="12" rx="3"/>${t(554, 51, "time order", "l lbl")}
  ${D.sizes.map(sizeRow).join("")}
  ${t(406, 316, "sorted by time, their runs are broken up", "l lbl")}`;

const scene = (D) => `<svg viewBox="0 0 760 378">
  ${on("0 1", chart(D))}
  ${on("2", sideBySide(D))}
  ${on("3", oneOrder(D))}
</svg>`;

const css = CSS("ssk") + `
.lw .ssk text.cap { font-size:12px; }
.lw .ssk text.huge { font:700 26px ui-monospace, Menlo, monospace; }
.lw .ssk .axis { fill:none; stroke:var(--line); stroke-width:1.5; }
.lw .ssk .band { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1; stroke-dasharray:3 3; opacity:.8; }
.lw .ssk .rg { fill:var(--hot); transform-box:view-box; transform-origin:0 0; transition:transform .9s ease, opacity .5s .9s, fill .5s .9s; }
.lw .ssk[data-at="1"] .rg { transform:translateX(var(--a)) scaleX(var(--s)); }
.lw .ssk[data-at="1"] .rg.hit { fill:var(--accent); }
.lw .ssk[data-at="1"] .rg.miss { fill:var(--mute); opacity:.3; }
.lw .ssk text.gid { transition:fill .5s .9s; }
.lw .ssk[data-at="1"] text.hitid { fill:var(--accent); font-weight:700; }
.lw .ssk .st.zl.on { transition-delay:.9s; }
.lw .ssk .bandtop { fill:none; stroke:var(--accent); stroke-width:1.5; }
.lw .ssk .lens { fill:none; stroke:var(--accent); stroke-width:1.5; }
.lw .ssk .lead { fill:none; stroke:var(--accent); stroke-width:1; stroke-dasharray:4 4; opacity:.7; }
.lw .ssk .zpanel { fill:var(--cell); stroke:var(--accent); stroke-width:1.5; filter:drop-shadow(0 4px 12px rgba(0,0,0,.25)); }
.lw .ssk .zb.hit { fill:var(--accent); } .lw .ssk .zb.miss { fill:var(--mute); opacity:.45; }
.lw .ssk .track { fill:var(--cell); }
.lw .ssk .key.warm { fill:var(--hot); } .lw .ssk .key.on { fill:var(--accent); }
.lw .ssk .rule { stroke:var(--line); stroke-width:1; opacity:.6; }
.lw .ssk .vcard { stroke-width:1.5; } .lw .ssk .vcard.warm { fill:var(--hot-bg); stroke:var(--hot); }
.lw .ssk .vcard.cool { fill:var(--accent-bg); stroke:var(--accent); }
.lw .ssk .grow { transform-box:fill-box; transform-origin:left center; transform:scaleX(0); transition:transform .8s cubic-bezier(.2,.7,.2,1) .25s; }
.lw .ssk .st.on .grow { transform:none; }
`;

export default widget({ key: "ssk", label: "Skipping row groups", css, steps, scene, captured: CAPTURED });
