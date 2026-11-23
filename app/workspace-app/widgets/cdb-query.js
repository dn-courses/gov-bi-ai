// cdb-query — one ordinary report query read line by line: the filter prunes partitions, the select
// list picks columns, the estimate follows from both, and the BI tool above it does not change.
// Sizes: modules/columnar-mpp/_measurements.md; `careful` is this query's dry run of 2026-11-21 (366.5 MB).
import { DAYS, bar, extra, on, pill, arrow, t, widget, zone } from "./cdb-lib.js";

const CAPTURED = { all: 167.2, careful: 0.37, columns: 13 };

const steps = (D) => [
  { stop: "The filter", title: "The WHERE line decides which partitions are opened",
    note: `A range on the partitioning column, with constants. <b>1 of ${DAYS}</b> daily partitions is read; the other ${DAYS - 1} do not count toward the bytes at all.` },
  { stop: "The columns", title: "The SELECT list decides which columns are read",
    note: `Two columns are named, and the filter needs a third. The other ${D.columns - 3} of the table's ${D.columns} are never touched.` },
  { stop: "The estimate", title: "Both together are the estimate", decisive: true,
    note: `${D.careful} GB. The careless version of the same report, <code>SELECT *</code> with no date, is ${D.all} GB: the same engine, the same table, and about ${Math.round(D.all / D.careful / 10) * 10} times the bytes.` },
  { stop: "Your BI tool", title: "The dashboard does not change; what is under it does",
    note: `A BI tool connects to any of these services the way it connects to your database today: it sends SQL to an endpoint. What changed is underneath, and it is now in the hands of whoever writes the query.` },
];

const CSS = (k) => extra(k) + `
.lw .${k} text.q { font:15px ui-monospace, SFMono-Regular, Menlo, monospace; font-weight:400; text-anchor:start; transition:fill .5s, opacity .5s; }
.lw .${k}[data-at="0"] text.q:not(.w), .lw .${k}[data-at="1"] text.q:not(.s) { opacity:.4; }
.lw .${k}[data-at="0"] text.q.w, .lw .${k}[data-at="1"] text.q.s { fill:var(--accent); font-weight:600; }
.lw .${k}[data-at="3"] text.q { opacity:.4; }
`;

const QUERY = [
  ["SELECT system_id,", "s"], ["       AVG(num_bikes_available) AS avg_bikes", "s"], ["FROM gbfs.station_status_partitioned", ""],
  ["WHERE captured_at >= '2026-09-01' AND captured_at < '2026-09-02'", "w"], ["GROUP BY system_id;", ""],
];
const tiles = Array.from({ length: DAYS }, (_, i) => `<rect class="box ${i === 50 ? "hit" : ""}" x="${40 + (i % 64) * 10.6}" y="${218 + Math.floor(i / 64) * 16}" width="8" height="11" rx="2" ${i === 50 ? "" : 'opacity=".4"'}/>`).join("");
const cols = (n) => Array.from({ length: n }, (_, i) => `<rect class="box ${i < 2 ? "hit" : i === 2 ? "ok" : ""}" x="${40 + i * 52}" y="214" width="44" height="46" rx="4" ${i > 2 ? 'opacity=".4"' : ""}/>`).join("");

const scene = (D) => `<svg viewBox="0 0 760 392">
  ${zone(14, 10, 732, 150, "A REPORT: THE AVERAGE NUMBER OF BIKES PER SYSTEM, FOR ONE DAY")}
  ${QUERY.map(([line, cls], i) => `<text class="q ${cls}" x="40" y="${52 + i * 23}" xml:space="preserve">${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>`).join("")}
  ${zone(14, 172, 732, 210)}

  ${on("0", t(30, 191, "PARTITION PRUNING", "cap") + tiles + t(40, 290, `1 of ${DAYS}`, "huge l acc") + t(190, 292, "partitions read", "lbl l")
    + t(40, 346, "Written as a function of the column, the same filter would have opened them all.", "lbl l"))}
  ${on("1", t(30, 191, `PROJECTION — THE TABLE'S ${D.columns} COLUMNS`, "cap") + cols(D.columns)
    + t(40, 284, "system_id · num_bikes_available", "l acc") + t(300, 284, "captured_at, for the filter", "l ok")
    + t(40, 330, `3 of ${D.columns}`, "huge l acc") + t(190, 332, "columns read; SELECT * would have read them all", "lbl l"))}
  ${on("2", t(30, 191, "THE DRY RUN", "cap")
    + t(40, 224, "this query", "l acc") + bar(220, 215, 3, "on", 18) + t(232, 225, `${D.careful} GB`, "big l acc")
    + t(40, 262, "SELECT *, no date", "l") + bar(220, 253, 400, "warm", 18) + t(630, 263, `${D.all} GB`, "big l hot")
    + t(40, 316, "Partitioning, columns and the price of a byte, visible in one ordinary report.", "l")
    + t(40, 350, "Clustering by system_id is the fourth lever: add AND system_id = … to use it.", "lbl l"))}
  ${on("3", t(30, 191, "THE CONNECTION STORY IS THE FAMILIAR ONE", "cap")
    + pill(40, 216, 180, 44, "your dashboard", "", "") + arrow(226, 238, 290, 238) + t(258, 222, "SQL", "lbl") + pill(296, 216, 160, 44, "an endpoint", "", "")
    + arrow(462, 238, 526, 238) + pill(532, 204, 190, 30, "your database, today", "", "lbl") + pill(532, 242, 190, 30, "a cloud warehouse", "hit", "acc")
    + t(40, 310, "does not change", "lbl l") + t(190, 310, "the tool, the SQL, the model behind the report", "l")
    + t(40, 346, "changes", "lbl l hot") + t(190, 346, "what a query costs, and who decides it", "l hot"))}
</svg>`;

export default widget({ key: "qy", label: "Reading one report query", css: CSS("qy"), steps, scene, captured: CAPTURED });
