// agg-gate — the path of one request through the warehouse agent's tool: the agent sends names,
// the compiler writes the SQL with the date filter on the partitioning column, a dry run prices it,
// the gate lets it run under the limit or returns a refusal as data. ▶ Play on the last step replays
// a recorded run: two requests refused, then a narrower one that ran. Data: agg-data.js.
import { CSS as RAMP, arrow, chip, node, on, t, widget, zone } from "./ramp-lib.js";
import { TABLE_CSS, table } from "@widget-lib/table.js";
import { CAPTURED as D } from "./agg-data.js";

const LIMIT = 1000; // MB, the tool's MAX_BYTES

const steps = () => [
  { stop: "Names", title: "The agent sends names, never SQL",
    note: `The request is the semantic layer's names plus a range of days; what is new is what the tool does with it next.` },
  { stop: "SQL", title: "The compiler writes the one statement",
    note: `Every statement reads the partitioned table, filtered on <code>captured_at</code>, its partitioning column. The days are bound as parameters; nothing the agent sent is part of the text.` },
  { stop: "Price", title: "A dry run says what it would read",
    note: `BigQuery plans the statement without running it and returns the bytes it would scan, for nothing. One day by system is ${D.price.day} MB; all of September is ${D.price.month} MB.` },
  { stop: "Run", title: "Under the limit, it runs", decisive: true,
    note: `The job also carries <code>maximum_bytes_billed</code>, so BigQuery itself refuses to bill more than the limit: the gate in your code, and a wall in the warehouse behind it.` },
  { stop: "Refused", title: "Over the limit, the refusal goes back as data",
    note: `Press <b>Play</b>. A recorded run: asked to compare ${D.refused.what}, the agent sent three requests. The first two were refused before anything ran; it read the hint and asked for less.` },
];

const CSS2 = `${TABLE_CSS("agt")}
.lw .agt text.cap { font-size:12px; }
.lw .agt text.code { fill:var(--ink); }
.lw .agt text.code.on { fill:var(--accent); font-weight:600; }
.lw .agt .nm { fill:var(--accent); font-weight:600; }
.lw .agt .lim { stroke:var(--hot); stroke-width:2; stroke-dasharray:5 5; }
.lw .agt .band { fill:var(--cell); opacity:.5; }
.lw .agt .band.on { fill:var(--accent-bg); opacity:.7; }
.lw .agt text.row { font:500 14px system-ui, sans-serif; fill:var(--ink); text-anchor:start; }
.lw .agt text.mb { font:700 17px ui-monospace, Menlo, monospace; text-anchor:end; }
.lw .agt .bar { transition:width .7s ease; }
.lw .agt .st:not(.on) .bar { width:0; }
.lw .agt .pill.on { fill:var(--accent-bg); stroke:var(--accent); filter:none; }
.lw .agt .pill.ok, .lw .agt .pill.warm { filter:none; }
.lw .agt .box.wall { fill:var(--hot-bg); stroke:var(--hot); }
.lw .agt .play { cursor:pointer; pointer-events:auto; }
.lw .agt .play rect { fill:var(--accent); } .lw .agt .play text { fill:var(--accent-ink); font:650 14px system-ui, sans-serif; }
.lw .agt .play.busy { opacity:.45; pointer-events:none; }
.lw .agt .try { opacity:.22; transition:opacity .45s; }
.lw .agt .try.shown { opacity:1; }
.lw .agt .verdict { opacity:0; transform:translateX(-8px); transition:opacity .45s, transform .45s; }
.lw .agt .verdict.shown { opacity:1; transform:none; }
.lw .agt .num.idx { font-size:16px; fill:var(--mute); }
`;

const esc = (l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tint = (l) => esc(l).replace(/\["([a-z_]+)"\]/g, '[<tspan class="nm">"$1"</tspan>]');

const names = () => on("0", `${zone(14, 14, 732, 312, "WHAT THE AGENT SENDS")}
  ${node(40, 136, 150, 60, "the agent", "you", "h")}${arrow(196, 166, 270, 166)}
  ${t(233, 150, "a call", "lbl mid")}
  ${node(278, 66, 448, 196, "", "them")}${t(300, 94, "query_metrics", "h l")}
  ${D.request.map((l, i) => `<text class="code" x="300" y="${134 + i * 26}">${tint(l)}</text>`).join("")}
  ${t(502, 290, "every name is one the model defines", "lbl mid")}`);

const compiled = () => on("1", `${zone(14, 14, 732, 312, "WHAT THE COMPILER WRITES")}
  <rect class="term" x="30" y="48" width="700" height="${D.sql.length * 25 + 18}" rx="10"/>
  ${D.sql.map((l, i) => t(46, 69 + i * 25, esc(l), `code ${/captured_at/.test(l) ? "on" : ""}`)).join("")}
  ${t(30, 296, "bound:", "lbl l")}
  ${chip(82, 282, 196, 28, "@first_day = 2026-09-01", "on", "mono acc")}${chip(288, 282, 192, 28, "@last_day = 2026-09-01", "on", "mono acc")}`);

const priceRow = (max, sx) => ([label, mb], i) => { const y = 84 + i * 72, over = mb > LIMIT;
  return `${t(40, y + 13, label, "row")}${t(270, y + 14, `${mb.toLocaleString("en-US")} MB`, `mb ${over ? "hot" : "acc"}`)}
    <rect class="bar ${over ? "warm" : "on"}" x="290" y="${y}" width="${sx(mb) - 290}" height="26" rx="5"/>`; };

const priced = () => { const max = Math.max(...D.prices.map((p) => p[1])), sx = (mb) => 290 + (420 * mb) / max;
  return on("2", `${zone(14, 14, 732, 312, "DRY RUN · BIKES AVAILABLE BY SYSTEM")}
    ${D.prices.map(priceRow(max, sx)).join("")}
    <path class="lim" d="M${sx(LIMIT)} 62 L${sx(LIMIT)} 300"/>${t(sx(LIMIT) + 8, 56, "the limit: 1 GB", "lbl l hot")}`); };

const ran = () => on("3", `${zone(14, 14, 732, 312, "")}
  ${table(40, 64, D.rows.cols, D.rows.data, { cap: `the result — ${D.rows.mb} MB read` })}
  ${chip(330, 56, 140, 30, "your gate: ran", "ok", "ok")}
  ${node(330, 104, 396, 76, "", "them")}${t(350, 128, "the job carries", "lbl l")}${t(350, 156, "maximum_bytes_billed = 1,000,000,000", "mono l")}
  ${node(330, 196, 396, 76, "", "wall")}${t(350, 220, "a job that would bill more", "lbl l")}${t(350, 248, "fails in BigQuery", "h l hot")}`);

const attempt = ([days, mb, ok], i) => { const y = 100 + i * 58;
  return `<g class="try a${i}"><rect class="band" x="30" y="${y - 22}" width="700" height="44" rx="10"/>
    ${t(50, y, `${i + 1}`, "num idx l")}${t(76, y, `bikes_available by system · ${days}`, "code")}
    ${t(512, y, `${mb} MB`, `mb ${ok ? "acc" : "hot"}`)}</g>
    <g class="verdict v${i}">${chip(536, y - 15, 184, 30, ok ? "ran" : "refused: over 1 GB", ok ? "ok" : "warm", ok ? "ok" : "hot")}</g>`; };

const refused = () => on("4", `${zone(14, 14, 732, 312, "ONE RECORDED RUN · THREE REQUESTS")}
  ${t(76, 56, "REQUEST", "cap")}${t(512, 56, "DRY RUN", "cap r")}${t(546, 56, "GATE", "cap")}
  ${D.attempts.map(attempt).join("")}
  <g class="play"><rect x="30" y="274" width="100" height="34" rx="17"/><text x="80" y="292">▶ Play</text></g>
  <text class="lbl l now" x="146" y="292">not started</text>`);

const scene = () => `<svg viewBox="0 0 760 340">${names()}${compiled()}${priced()}${ran()}${refused()}</svg>`;

function play(root) {
  const still = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const q = (s) => root.querySelector(s), say = (text) => { q(".now").textContent = text; };
  const beats = D.attempts.flatMap(([, mb, ok], i) => [
    () => { q(`.a${i}`).classList.add("shown"); say(`request ${i + 1}: priced at ${mb} MB`); },
    () => { q(`.v${i}`).classList.add("shown"); say(ok ? "under the limit: it ran" : "refused, returned to the agent with a hint"); },
  ]);
  reset(root);
  q(".play").classList.add("busy");
  beats.forEach((act, i) => root._timers.push(setTimeout(() => {
    act(); if (i === beats.length - 1) q(".play").classList.remove("busy");
  }, still ? 0 : 300 + i * 1000)));
}

function reset(root) {
  (root._timers || []).forEach(clearTimeout);
  root._timers = [];
  root.querySelectorAll(".try, .verdict").forEach((g) => g.classList.remove("shown"));
  root.querySelector(".now").textContent = "not started";
  root.querySelector(".play").classList.remove("busy");
}

function after(root) {
  if (!root.dataset.bound) {
    root.dataset.bound = "1";
    root.querySelector(".play").addEventListener("click", () => root.dataset.at === "4" && play(root));
  }
  reset(root);
}

export default widget({ key: "agt", label: "The price gate", css: RAMP("agt") + CSS2, steps, scene, after });
