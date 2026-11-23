// cost-ground — the same two engines on the row store's ground: one row by its key, and one changed
// value. Each step draws what each engine touches and the two times to scale; the last puts all three
// contests of the page on one board, who wins and by how much. Adapted from col-cmp-other.
import { on, t, widget, zone, arrow, extra } from "./col-lib.js";

// Measured 2026-11-23 through the app's /api/cell, this page's cells, in one semaphore call after page
// 01 rewrote station_status.parquet sorted by (station_id, captured_at), 346,091,490 bytes; three runs
// each (Postgres capped at 3 CPUs, the app's DuckDB on 12 threads):
//   one row by key: Postgres Index Scan on station_status_station_time 0.011-0.027 ms warm (0.55 ms
//   the first time), 5 buffers; DuckDB 6.9-7.5 ms, Data Read 2.3 MB. Station 42's 25,920 rows are rows
//   1,062,720-1,088,639 of the sorted file: one row group of 122,880 (the ninth), computed, not printed
//   one changed value: Postgres UPDATE, rolled back, 0.029-0.030 ms warm (2 ms the first time); the
//   Parquet rewrite 0.77-0.90 s, a new file of 346,064,405 bytes (ls -l prints exact bytes)
//   the monthly average, one core each: Postgres 3.47-3.99 s, DuckDB 1.30-1.45 s
const CAPTURED = {
  rowGroups: 211, lookupGroups: 1, columns: 15, lookupMb: 2.3, pgBuffers: 5,
  pgLookupMs: [0.011, 0.027, "0.01–0.03 ms"], duckLookupMs: [6.9, 7.5, "7 ms"],
  pgUpdateMs: [0.03, 0.03, "about 0.03 ms"], rewriteS: [0.77, 0.9, "0.8–0.9 s"], rewriteMb: 346,
  aggregate: { pg: 3.6, duck: 1.33 },
};

// A ratio rounded down to tens (to hundreds above a thousand): what the measurements guarantee at the least.
const floor2 = (x) => { const p = 10 ** Math.max(1, Math.floor(Math.log10(x)) - 1); return Math.floor(x / p) * p; };
const ratios = (D) => ({
  agg: (D.aggregate.pg / D.aggregate.duck).toFixed(1),
  lookup: floor2(D.duckLookupMs[0] / D.pgLookupMs[1]),
  change: floor2((D.rewriteS[0] * 1000) / D.pgUpdateMs[1]),
});

const steps = (D) => [
  { stop: "One row", title: "One row by its key, every column",
    note: `Postgres walks its index down to one page: <b>under ${D.pgLookupMs[2].split("–")[1]}</b>. The column file has no index: its statistics narrow the search to ${D.lookupGroups} of ${D.rowGroups} row groups, and all ${D.columns} columns of it are read: <b>about ${D.duckLookupMs[2]}</b>.` },
  { stop: "One change", title: "Change one value",
    note: `Postgres finds the row through the index and changes it: <b>${D.pgUpdateMs[2]}</b>. A Parquet file cannot be changed in place, so all of it is written again: <b>${D.rewriteMb} MB, ${D.rewriteS[2]}</b>.` },
  { stop: "The score", title: "Each engine on its own ground", decisive: true,
    note: `On the column store's ground it won by about ${ratios(D).agg} times, one core each. On the row store's ground the row store wins by at least ${ratios(D).lookup} times on a lookup and ${ratios(D).change.toLocaleString("en-US")} times on a change. Neither engine is slow: each is built for its own workload.` },
];

const CSS = extra("cgr") + `
.lw .cgr text.cap { font-size:12px; }
.lw .cgr .rg { fill:var(--line); }
.lw .cgr .rg.hit { fill:var(--accent); }
.lw .cgr[data-at="1"] .rg, .lw .cgr[data-at="1"] .rg.hit { fill:var(--hot); }
.lw .cgr .tick { stroke:var(--line); stroke-width:1; }
.lw .cgr .mid { stroke:var(--mute); stroke-width:1.5; }
.lw .cgr text.halo { paint-order:stroke; stroke:var(--panel); stroke-width:8px; stroke-linejoin:round; }
`;

// ── Postgres: a B-tree on (station_id, captured_at), then one heap page ────────────────────────
const LEAVES = 6, PAGES = 14;
const tree = (hot) => {
  const lit = hot ? "warm" : "hit";
  const mid = [70, 153, 236];
  return zone(14, 10, 358, 206, "POSTGRES — B-TREE, THEN ONE PAGE")
    + `<rect class="box hit" x="153" y="44" width="66" height="22" rx="7"/>`
    + mid.map((x, i) => `<path class="edge ${i === 1 ? "on" : ""}" d="M186 66 L${x + 33} 86"/><rect class="box ${i === 1 ? "hit" : ""}" x="${x}" y="86" width="66" height="22" rx="7"/>`).join("")
    + Array.from({ length: LEAVES }, (_, i) => { const x = 40 + i * 52;
      return `<path class="edge ${i === 2 ? "on" : ""}" d="M${mid[Math.floor(i / 2)] + 33} 108 L${x + 22} 126"/><rect class="box ${i === 2 ? "hit" : ""}" x="${x}" y="126" width="44" height="22" rx="7"/>`; }).join("")
    + `<path class="edge ${hot ? "hot" : "on"}" d="M166 148 L${40 + 6 * 22 + 9} 166"/>`
    + Array.from({ length: PAGES }, (_, i) => `<rect class="box ${i === 6 ? lit : ""}" x="${40 + i * 22}" y="166" width="18" height="20" rx="4"/>`).join("");
};

// ── Parquet: 211 row groups in two rows of strips ─────────────────────────────────────────────
const LIT = [8]; // station 42's rows sit in the ninth row group of the sorted file
const groups = (D) => Array.from({ length: D.rowGroups }, (_, i) =>
  `<rect class="rg ${LIT.includes(i) ? "hit" : ""}" x="${404 + (i % 106) * 3}" y="${44 + Math.floor(i / 106) * 22}" width="2.2" height="18" rx="1"/>`).join("");
const parquet = (D) => zone(388, 10, 358, 206, `station_status.parquet — ${D.rowGroups} ROW GROUPS`) + groups(D);
const chunks = (D) => [0, 1].map((r) => Array.from({ length: D.columns }, (_, c) =>
  `<rect class="box hit" x="${404 + c * 21}" y="${108 + r * 28}" width="18" height="22" rx="4"/>`).join("")).join("")
  + `<path class="edge on" d="M431 86 L431 104"/>`;

// ── the bottom: the two times, to scale, each label at the end of its bar ─────────────────────
const B_X = 180, B_W = 420;
const times = (cap, max, a, b) => { const wa = Math.max(4, (a[1] / max) * B_W), wb = (b[1] / max) * B_W;
  return zone(14, 226, 732, 110, cap)
    + t(30, 268, "Postgres, index", "l") + `<rect class="bar on" x="${B_X}" y="258" width="${wa}" height="20" rx="4"/>` + t(B_X + wa + 12, 269, a[2], "big l acc")
    + t(30, 306, "Parquet, DuckDB", "l") + `<rect class="bar ghost" x="${B_X}" y="296" width="${wb}" height="20" rx="10"/>`
    + `<rect class="bar warm" x="${B_X}" y="296" width="${(b[0] / max) * B_W}" height="20" rx="10"/>` + t(B_X + wb + 12, 307, b[2], "big l hot"); };

const lookup = (D) => on("0", tree(false) + t(193, 202, `${D.pgBuffers} pages of 8 kB touched`, "lbl")
  + parquet(D) + chunks(D)
  + t(404, 180, `${D.lookupGroups} of ${D.rowGroups} row groups, all ${D.columns} of its chunks`, "lbl l")
  + t(404, 202, `${D.lookupMb} MB read for one row`, "l acc")
  + times("TIME FOR ONE ROW, EVERY COLUMN — TO SCALE", D.duckLookupMs[1],
    [0, D.pgLookupMs[1], D.pgLookupMs[2]], [D.duckLookupMs[0], D.duckLookupMs[1], D.duckLookupMs[2]]));

const change = (D) => on("1", tree(true) + t(193, 202, "one row changed, found through the index", "lbl")
  + parquet(D) + arrow(566, 90, 566, 118, "hot")
  + `<rect class="box warm" x="416" y="124" width="300" height="36" rx="10"/>` + t(566, 143, "cost_changed.parquet", "mono")
  + t(404, 194, `every row group written again: ${D.rewriteMb} MB`, "l hot")
  + times("TIME TO CHANGE ONE VALUE — TO SCALE", D.rewriteS[1],
    [0, D.pgUpdateMs[1] / 1000, D.pgUpdateMs[2]], [D.rewriteS[0], D.rewriteS[1], D.rewriteS[2]]));

// ── the score: how many times faster the winner was, on a log scale either side of the middle ──
const MID = 380, DEC = 72; // pixels per factor of ten
const lg = (x) => DEC * Math.log10(x);
const axis = () => [1, 2, 3, 4].map((k) => { const n = `${(10 ** k).toLocaleString("en-US")}×`;
  return `<path class="tick" d="M${MID - k * DEC} 50 L${MID - k * DEC} 278 M${MID + k * DEC} 50 L${MID + k * DEC} 278"/>`
    + t(MID - k * DEC, 294, n, "lbl") + t(MID + k * DEC, 294, n, "lbl"); }).join("")
  + `<path class="mid" d="M${MID} 46 L${MID} 282"/>` + t(MID, 294, "even", "lbl");
const scoreRow = ([what, f, side, label], i) => { const y = 92 + i * 72, w = lg(f);
  return t(MID, y - 18, what, "halo")
    + (side === "right"
      ? `<rect class="bar on" x="${MID}" y="${y}" width="${w}" height="24" rx="4"/>` + t(MID + w + 10, y + 13, label, "big l acc halo")
      : `<rect class="bar warm" x="${MID - w}" y="${y}" width="${w}" height="24" rx="4"/>` + (w > 250 ? `<text class="big l" style="fill:var(--accent-ink)" x="${MID - w + 12}" y="${y + 13}">${label}</text>` : t(MID - w - 10, y + 13, label, "big r hot halo")));
};
const score = (D) => { const r = ratios(D);
  const rows = [
    ["The monthly average: every row, three columns, one core each", Number(r.agg), "right", `${r.agg}×`],
    ["One row by its key, every column", r.lookup, "left", `≥ ${r.lookup}×`],
    ["Change one value", r.change, "left", `≥ ${r.change.toLocaleString("en-US")}×`],
  ];
  return on("2", zone(14, 10, 732, 326, "")
    + t(30, 30, "◀ ROW STORE FASTER", "cap") + t(730, 30, "COLUMN STORE FASTER ▶", "cap r")
    + axis() + rows.map(scoreRow).join("")
    + t(30, 320, "each line is ten times the one before it", "lbl l")); };

const scene = (D) => `<svg viewBox="0 0 760 346">${lookup(D)}${change(D)}${score(D)}</svg>`;

export default widget({ key: "cgr", label: "The row store's ground", css: CSS, steps, scene, captured: CAPTURED });
