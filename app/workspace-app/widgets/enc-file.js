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
// Re-measured 2026-11-23 on the 346 MB file page 01 writes (ORDER BY station_id, captured_at), in one
// held lab call; timings are the middle of three runs (all cores: 40.9–51.7, 57.5–64.6, 42.3–50.5,
// 40.3–61.9 ms; one core: 160.6–168.7, 247.0–274.7, 152.0–161.3, 152.8–191.8 ms).
const CAPTURED = {
  cols: [["captured_at", 207.4, "PLAIN"], ["last_reported", 207.4, "PLAIN"], ["bikes_available", 16.3, "dictionary"],
    ["ebikes_available", 6.6, "dictionary"], ["docks_available", 5.6, "dictionary"], ["bikes_disabled", 3.4, "dictionary"],
    ["docks_disabled", 3.4, "dictionary"], ["3 yes/no, each", 3.2, "PLAIN"], ["vehicle_types", 0.1, "dictionary"],
    ["legacy_id", 0.1, "dictionary"], ["name", 0.1, "dictionary"], ["station_id", 0.0, "dictionary"], ["system_id", 0.0, "dictionary"]],
  files: [
    { enc: "timestamps plain", codec: "not compressed", encoded: 460.0, disk: 460.0, readMb: 213.0, ms: 48.8, oneCore: 168.4 },
    { enc: "timestamps plain", codec: "compressed", encoded: 460.1, disk: 345.5, readMb: 157.8, ms: 63.4, oneCore: 252.2 },
    { enc: "timestamps as differences", codec: "not compressed", encoded: 67.5, disk: 67.5, readMb: 16.7, ms: 49.1, oneCore: 160.9 },
    { enc: "timestamps as differences", codec: "compressed", encoded: 67.5, disk: 31.9, readMb: 1.0, ms: 46.8, oneCore: 156.0 },
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
    { stop: "Why it pays", title: "Undoing the squeeze costs less than moving what it saved", decisive: true,
      note: `On one core, undoing ${Math.round(f[1].readMb)} MB of compressed bytes took about <b>${p1.undo} ms</b>. The ${p1.saved} MB it saved would take about <b>${p1.move} ms</b> to move over a 1 Gbit/s network, and the files of a lake come over a network. On top of a good encoding there is little left to undo: ${p2.undo < 5 ? "too little to measure" : `${p2.undo} ms`}.` },
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

function payRow(y, label, sub, w, val, cls, late) {
  return `${t(44, y - 7, label, `l${cls === "acc" ? " acc" : ""}`)}${t(44, y + 13, sub, "lbl l")}
    ${hbar(270, y - 13, w, 26, `${cls}${late ? " late" : ""}`)}${t(282 + Math.max(3, w), y + 1, val, val.startsWith("~") ? `big l ${cls}` : `lbl l ${cls}`)}`;
}

function pays(D) {
  const ps = pairs(D), k = 340 / Math.max(...ps.map((p) => p.move));
  const pair = (p, i) => { const y = 10 + i * 180;
    return `${zone(24, y, 712, 168, p.enc.toUpperCase())}${t(44, y + 50, `compression saved ${p.saved} MB of reading`, "h l")}
      ${payRow(y + 90, "move those bytes", "over a 1 Gbit/s network", p.move * k, `~${fmt(p.move)} ms`, "hot", false)}
      ${payRow(y + 136, "undo the squeeze", "one core, measured", p.undo * k, p.undo < 5 ? "too small to measure" : `~${p.undo} ms`, "acc", true)}`; };
  return ps.map(pair).join("");
}

const scene = (D) => `<svg viewBox="0 0 760 372">
  ${on("0", inFile(D))}${on("1", fourWrites(D))}${on("2", timed(D))}${on("3", pays(D))}</svg>`;

export default widget({ key: "ef", label: "Encoding and compression in a real file", css: CSS, steps, scene, captured: CAPTURED });
