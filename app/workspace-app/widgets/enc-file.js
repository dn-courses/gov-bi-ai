// enc-file — encoding and compression in the real Parquet file: where its bytes are, the same rows
// written four ways (encoding off/on × compression off/on), one query timed on each, and why undoing
// the squeeze costs less than moving the bytes it saved.
import { fmt, on, t, widget, zone, extra } from "./col-lib.js";

// Measured 2026-11-23 with the page's own cells (lab :3111, DuckDB 2.0, 25.92M rows, 12 cores):
//   cols    parquet_metadata('station_status.parquet'): size after encoding (MB) and encoding, per column
//   files   parquet_metadata of the four writes: after encoding / on disk (MB)
//   ms      SELECT count(DISTINCT captured_at), sum(docks_available) — best of 5, all cores
//   readMb  the on-disk size of those two columns in each file
//   oneCore the same query with SET threads = 1, best of 3
// Re-measured 2026-11-23 on the 346 MB file page 01 writes (ORDER BY station_id, captured_at): the
// page's own cells, run through the lesson app in one held lab call, and the widget shows exactly the
// statistic they print (best of 5; one core, best of 3). A second run of the same cells in that call
// printed 36.8, 46.6, 34.0, 33.9 ms and 137.7, 235.2, 148.4, 149.0 ms.
const CAPTURED = {
  cols: [["captured_at", 207.4, "PLAIN"], ["last_reported", 207.4, "PLAIN"], ["bikes_available", 16.3, "dictionary"],
    ["ebikes_available", 6.6, "dictionary"], ["docks_available", 5.6, "dictionary"], ["bikes_disabled", 3.4, "dictionary"],
    ["docks_disabled", 3.4, "dictionary"], ["3 yes/no, each", 3.2, "PLAIN"], ["vehicle_types", 0.1, "dictionary"],
    ["legacy_id", 0.1, "dictionary"], ["name", 0.1, "dictionary"], ["station_id", 0.0, "dictionary"], ["system_id", 0.0, "dictionary"]],
  files: [
    { enc: "timestamps plain", codec: "not compressed", encoded: 460.0, disk: 460.0, readMb: 213.0, ms: 36.7, oneCore: 135.7 },
    { enc: "timestamps plain", codec: "compressed", encoded: 460.1, disk: 345.5, readMb: 157.8, ms: 46.7, oneCore: 233.9 },
    { enc: "timestamps as differences", codec: "not compressed", encoded: 67.5, disk: 67.5, readMb: 16.7, ms: 33.0, oneCore: 148.3 },
    { enc: "timestamps as differences", codec: "compressed", encoded: 67.5, disk: 31.9, readMb: 1.0, ms: 33.4, oneCore: 151.4 },
  ],
  linkMBps: 125, // a 1 Gbit/s network moves 125 MB a second: arithmetic, not a measurement
};

const pairs = (D) => [[D.files[0], D.files[1]], [D.files[2], D.files[3]]].map(([raw, sq]) => ({
  enc: raw.enc, saved: Math.round((raw.readMb - sq.readMb) * 10) / 10,
  move: Math.round(((raw.readMb - sq.readMb) / D.linkMBps) * 1000), undo: Math.max(0, Math.round(sq.oneCore - raw.oneCore)),
}));

const steps = (D) => {
  const [p1, p2] = pairs(D), f = D.files, ts = D.cols[0][1] + D.cols[1][1];
  return [
    { stop: "In the file", title: "Where the file's bytes are",
      note: `For every column the file records its encoding and its size after encoding: ${f[0].encoded} MB in all. Names, ids and systems take almost nothing: a dictionary and long runs. The two timestamp columns are written <code>PLAIN</code>, eight bytes a value and every value different: <b>${Math.round(ts)} MB</b> of the ${Math.round(f[0].encoded)}.` },
    { stop: "Four writes", title: "The same rows, written four ways",
      note: `A newer version of the format writes a timestamp as its difference from the one before: +5 minutes, again and again, which is a run. The encoded file falls from ${Math.round(f[0].encoded)} MB to <b>${Math.round(f[2].encoded)} MB</b>. Compression then squeezes what the encoding left: ${Math.round(f[0].encoded)} → ${Math.round(f[1].disk)} MB, and ${Math.round(f[2].encoded)} → <b>${Math.round(f[3].disk)} MB</b>.` },
    { stop: "Timed", title: "Compressed or not, about the same time",
      note: `One query reads <code>captured_at</code> and <code>docks_available</code> from each file, best of five. The well-encoded files read ${f[2].readMb} MB or ${f[3].readMb} MB and take the same <b>~${Math.round(f[3].ms)} ms</b>. With plain timestamps, undoing the squeeze of ${Math.round(f[1].readMb)} MB adds about ${Math.round(f[1].ms - f[0].ms)} ms, shared by all the cores.` },
    { stop: "The trade", title: "Compression trades CPU for bytes moved", decisive: true,
      note: `Measured here, on one core with the file already in memory: <b>${Math.round(f[1].oneCore)} ms</b> compressed against ${Math.round(f[0].oneCore)} ms not. Compression cost about ${p1.undo} ms and bought nothing on this laptop. What it bought is ${Math.round(p1.saved)} MB not stored and not moved. Over a 1 Gbit/s network those MB take about ${p1.move} ms (arithmetic, not measured): when the file comes over a network, as from a lake, compression wins; on local disk or in cache it does not. With a good encoding first it is nearly free, ${Math.round(f[2].oneCore)} against ${Math.round(f[3].oneCore)} ms: engines encode first and compress second.` },
  ];
};

const CSS = extra("ef") + `
.lw .ef text.cap { font-size:12px; }
.lw .ef text.tg { font:600 12px system-ui, sans-serif; }
.lw .ef .bar.hot { fill:var(--hot); } .lw .ef .bar.acc { fill:var(--accent); } .lw .ef .bar.dim { fill:var(--mute); opacity:.7; }
.lw .ef .bar.enc { fill:none; stroke:var(--mute); stroke-width:1.5; stroke-dasharray:4 4; }
.lw .ef .tag { fill:var(--cell); stroke:var(--line); stroke-width:1; }
.lw .ef .tag.hot { fill:var(--hot-bg); stroke:var(--hot); } .lw .ef .tag.acc { fill:var(--accent-bg); stroke:var(--accent); }
.lw .ef .rule { stroke:var(--line); stroke-width:1; }
.lw .ef .grow { transform-box:fill-box; transform-origin:left center; transform:scaleX(0); transition:transform .9s ease-out .15s; }
.lw .ef .grow.late { transition-delay:.9s; }
.lw .ef .st.on .grow { transform:scaleX(1); }
`;

const hbar = (x, y, w, h, cls) => `<rect class="bar grow ${cls}" x="${x}" y="${y}" width="${Math.max(3, w)}" height="${h}" rx="4"/>`;
const mb = (v) => `${v.toFixed(1)} MB`;
const rule = (y) => `<path class="rule" d="M40 ${y} H720"/>`;
const tag = (x, y, label, cls) => `<rect class="tag ${cls}" x="${x}" y="${y}" width="84" height="20" rx="10"/>${t(x + 42, y + 11, label, `tg${cls ? ` ${cls}` : " dim"}`)}`;

function inFile(D) {
  const X = 214, k = 330 / D.cols[0][1], ts = D.cols[0][1] + D.cols[1][1];
  const rows = D.cols.map(([name, size, encoding], i) => { const y = 52 + i * 23, cls = encoding === "PLAIN" && size > 100 ? "hot" : encoding === "PLAIN" ? "" : "acc";
    return `${t(X - 12, y + 9, name, `mono r${i > 6 ? " dim" : ""}`)}${hbar(X, y, size * k, 17, cls || "dim")}
      ${t(X + Math.max(3, size * k) + 10, y + 9, mb(size), "mono l")}${tag(640, y - 1, encoding, cls)}`; }).join("");
  return `${zone(24, 14, 712, 346, "station_status.parquet — EACH COLUMN, SIZE AFTER ENCODING")}${rows}
    ${t(372, 112, `↑ the two timestamps: ${Math.round(ts)} MB of ${Math.round(D.files[0].encoded)}`, "lbl l hot")}`;
}

const LEGEND = `<rect class="bar enc" x="452" y="26" width="24" height="14" rx="3"/>${t(484, 34, "after encoding", "lbl l")}
  <rect class="bar acc" x="606" y="26" width="24" height="14" rx="3"/>${t(638, 34, "on disk", "lbl l")}`;

function writeRow(D, f, y, k) {
  const sq = f.codec === "compressed", cls = sq ? (f.encoded > 100 ? "hot" : "acc") : "dim";
  return `${t(56, y + 16, f.codec, `l ${sq ? cls : "dim"}`)}<rect class="bar enc" x="200" y="${y}" width="${f.encoded * k}" height="30" rx="4"/>
    ${hbar(200, y, f.disk * k, 30, cls)}${t(200 + f.encoded * k + 12, y + 16, `${Math.round(f.disk)} MB`, "big l")}`;
}

function fourWrites(D) {
  const k = 400 / D.files[0].encoded, f = D.files;
  return `${zone(24, 14, 712, 346, "")}${t(40, 33, "THE SAME 25.9M ROWS, FOUR FILES", "cap")}${LEGEND}
    ${t(40, 68, "timestamps plain", "h l")}${t(196, 68, "older format version, the default", "lbl l")}
    ${writeRow(D, f[0], 84, k)}${writeRow(D, f[1], 126, k)}${rule(180)}
    ${t(40, 206, "timestamps as differences", "h l")}${t(266, 206, "newer format version", "lbl l")}
    ${writeRow(D, f[2], 222, k)}${writeRow(D, f[3], 264, k)}`;
}

function timedRow(D, f, y, kMb, kMs) {
  const cls = f.codec === "compressed" ? "acc" : "dim";
  return `${t(56, y, f.codec, `l${cls === "acc" ? " acc" : " dim"}`)}
    ${hbar(250, y - 11, f.readMb * kMb, 22, cls)}${t(258 + Math.max(3, f.readMb * kMb), y + 1, mb(f.readMb), "mono l")}
    ${hbar(510, y - 11, f.ms * kMs, 22, cls)}${t(518 + f.ms * kMs, y + 1, `${f.ms.toFixed(1)} ms`, "big l")}`;
}

function timed(D) {
  const f = D.files, kMb = 150 / f[0].readMb, kMs = 140 / Math.max(...f.map((x) => x.ms));
  return `${zone(24, 14, 712, 346, "")}${t(250, 36, "MB READ", "cap")}${t(250, 58, "captured_at + docks_available", "lbl l")}
    ${t(510, 36, "TIME, ALL CORES", "cap")}${t(510, 58, "best of 5", "lbl l")}${rule(76)}
    ${t(40, 104, "timestamps plain", "h l")}${timedRow(D, f[0], 132, kMb, kMs)}${timedRow(D, f[1], 172, kMb, kMs)}${rule(204)}
    ${t(40, 232, "timestamps as differences", "h l")}${timedRow(D, f[2], 260, kMb, kMs)}${timedRow(D, f[3], 300, kMb, kMs)}`;
}

const msRow = (y, label, ms, k, cls) => `${t(44, y + 9, label, "l")}${hbar(230, y, ms * k, 18, cls)}${t(240 + ms * k, y + 10, `${Math.round(ms)} ms`, `big l ${cls}`)}`;

// The trade in four rows, top to bottom: measured cost, what it bought, the network arithmetic, encode first.
function pays(D) {
  const f = D.files, [p1, p2] = pairs(D), k = 300 / p1.move;
  return `${zone(24, 6, 712, 92, "1 · MEASURED HERE — ONE CORE, THE FILE ALREADY IN MEMORY")}
    ${msRow(38, "not compressed", f[0].oneCore, k, "dim")}${msRow(64, "compressed", f[1].oneCore, k, "hot")}
    ${t(560, 50, `cost ~${p1.undo} ms`, "big l hot")}${t(560, 72, "bought nothing here", "lbl l")}
    ${zone(24, 104, 712, 56, "2 · WHAT THOSE MS BOUGHT")}${t(44, 144, `${Math.round(p1.saved)} MB not stored and not moved`, "h l")}
    ${t(560, 144, `${f[0].readMb.toFixed(1)} → ${f[1].readMb.toFixed(1)} MB read`, "lbl l")}
    ${zone(24, 166, 712, 102, "3 · ARITHMETIC, NOT MEASURED — OVER A 1 GBIT/S NETWORK")}
    ${msRow(198, `move ${Math.round(p1.saved)} MB`, p1.move, k, "hot")}${msRow(224, "undo the squeeze", f[1].oneCore - f[0].oneCore, k, "acc")}
    ${t(44, 256, "from a lake or object storage, compression wins; from local disk or cache, it does not", "lbl l")}
    ${zone(24, 274, 712, 92, "4 · ENCODE FIRST (TIMESTAMPS AS DIFFERENCES) — ONE CORE, MEASURED")}
    ${msRow(306, "not compressed", f[2].oneCore, k, "dim")}${msRow(332, "compressed", f[3].oneCore, k, "acc")}
    ${t(470, 318, p2.undo < 5 ? "compression nearly free" : `cost ~${p2.undo} ms`, "big l acc")}${t(470, 340, "encode first, compress second", "lbl l")}`;
}

const scene = (D) => `<svg viewBox="0 0 760 372">
  ${on("0", inFile(D))}${on("1", fourWrites(D))}${on("2", timed(D))}${on("3", pays(D))}</svg>`;

export default widget({ key: "ef", label: "Encoding and compression in a real file", css: CSS, steps, scene, captured: CAPTURED });
