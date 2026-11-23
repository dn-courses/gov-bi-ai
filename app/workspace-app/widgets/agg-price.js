// agg-price — why a free-SQL agent cannot be let loose on the bike-share warehouse: the table,
// the query one recorded run of a model wrote for a plain question, and that query's price drawn to
// scale against a 1 GB limit, the whole table, and one person's daily quota.
import { CSS as RAMP, chip, on, t, widget, zone } from "./ramp-lib.js";
import { TABLE_CSS, schema } from "@widget-lib/table.js";
import { CAPTURED as D } from "./agg-data.js";

const steps = () => [
  { stop: "The warehouse", title: "1.8 billion readings, one per station per minute",
    note: `Two copies of the same rows: <code>station_status</code> with no partitioning, and <code>station_status_partitioned</code>, by day of <code>captured_at</code> and clustered by system and station. BigQuery bills by the bytes a query reads.` },
  { stop: "A free query", title: "A plain question, and the SQL a model wrote for it",
    note: `The model was given the table and its columns and asked: <i>${D.free.question}</i> It wrote SQL that runs. Nothing in it limits the days, so it reads every reading of every station.` },
  { stop: "The bill", title: "Its price, drawn to scale", decisive: true,
    note: `${D.free.gb} GB for one question, against a limit of 1 GB. Each person may read 200 GiB a day: ${Math.floor(200 * 1.0737 / D.free.gb)} such questions and the day is gone. The fix is not a better prompt: it is a tool that cannot send this query.` },
];

const CSS2 = `${TABLE_CSS("agp")}
.lw .agp text.cap { font-size:12px; }
.lw .agp text.sql { font:13px ui-monospace, Menlo, monospace; text-anchor:start; white-space:pre; fill:var(--ink); }
.lw .agp text.sql.hl { fill:var(--hot); font-weight:600; }
.lw .agp .bubble { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .agp .pill.mute { fill:var(--cell); filter:none; stroke:var(--line); stroke-width:1; }
.lw .agp .pill.acc { fill:var(--accent-bg); filter:none; stroke:var(--accent); stroke-width:1; }
.lw .agp .pill.warm { filter:none; }
.lw .agp text.fact { font:500 13px system-ui, sans-serif; fill:var(--mute); }
.lw .agp text.fact.acc { fill:var(--accent); }
.lw .agp .band { fill:var(--cell); opacity:.55; }
.lw .agp text.row { font:500 14px system-ui, sans-serif; fill:var(--ink); text-anchor:end; }
.lw .agp text.row.hot { fill:var(--hot); font-weight:650; }
.lw .agp text.gb { font:700 17px ui-monospace, Menlo, monospace; text-anchor:start; }
.lw .agp .bar { transition:width .7s ease; }
.lw .agp .st:not(.on) .bar { width:0; }
.lw .agp .axis { stroke:var(--line); stroke-width:1; }
`;

// A row of fact chips, each as wide as its words (13px sans ≈ 6.9 px a character).
const facts = (x, y, items) => { let at = x;
  return items.map(([text, cls]) => { const w = Math.ceil(text.length * 6.9) + 24, out = chip(at, y, w, 26, text, cls, `fact ${cls === "acc" ? "acc" : ""}`); at += w + 8; return out; }).join(""); };

const tables = () => on("0", `${zone(14, 14, 732, 344, "DATASET gbfs · BIGQUERY, LOCATION US")}
  ${schema([["station_status", 40 + 157, 92, "", "1,803,699,574 rows"], ["station_status_partitioned", 40 + 207.5, 206, "fact", "1,803,699,574 rows"]])}
  ${facts(40, 124, [["167 GB", "mute"], ["no partitioning", "mute"]])}
  ${facts(40, 238, [["167 GB", "mute"], ["a partition per day · 127 days", "acc"], ["clustered by system_id, station_id", "acc"]])}
  ${t(40, 310, "the same rows, stored twice", "lbl l")}`);

const sqlLine = (l, i) => t(52, 123 + i * 21, l.replace(/</g, "&lt;").replace(/>/g, "&gt;"), `sql ${/FROM `/.test(l) ? "hl" : ""}`);

const query = () => { const w = Math.ceil(D.free.question.length * 7.3) + 32;
  return on("1", `${zone(14, 14, 732, 344, "ONE RECORDED RUN · " + D.free.model.toUpperCase())}
  <rect class="bubble" x="${726 - w}" y="44" width="${w}" height="36" rx="18"/>
  ${t(726 - w / 2, 63, D.free.question, "mid")}${t(726 - w - 12, 63, "asked", "lbl r")}
  <rect class="term" x="34" y="100" width="692" height="${D.free.sql.length * 21 + 16}" rx="10"/>
  ${D.free.sql.map(sqlLine).join("")}
  ${chip(34, 318, 190, 32, `dry run: ${D.free.gb} GB`, "warm", "big hot")}
  ${t(238, 334, "no filter on the days: every reading is read", "lbl l")}`); };

const BARS = () => [["a 1 GB limit", 1, "on"], ["the free query", D.free.gb, "warm"], ["SELECT * on the table", 167.2, ""], ["one person's day: 200 GiB", 214.7, ""]];
const X0 = 262, SPAN = 360;
const bar = ([label, gb, cls], i) => { const y = 58 + i * 70, w = Math.max(3, (SPAN * gb) / 214.7), tone = cls === "warm" ? "hot" : cls === "on" ? "acc" : "";
  return `${i === 1 ? `<rect class="band" x="26" y="${y - 12}" width="708" height="50" rx="10"/>` : ""}
    ${t(X0 - 16, y + 13, label, `row ${i === 1 ? "hot" : ""}`)}
    <rect class="bar ${cls}" x="${X0}" y="${y}" width="${w}" height="26" rx="5"/>
    ${t(X0 + w + 12, y + 14, `${gb.toLocaleString("en-US")} GB`, `gb ${tone}`)}`; };

const bill = () => on("2", `${zone(14, 14, 732, 344, "GB READ, TO SCALE")}
  <path class="axis" d="M${X0} 44 L${X0} 330"/>
  ${BARS().map(bar).join("")}`);

const scene = () => `<svg viewBox="0 0 760 372">${tables()}${query()}${bill()}</svg>`;

export default widget({ key: "agp", label: "What a free query costs", css: RAMP("agp") + CSS2, steps, scene });
