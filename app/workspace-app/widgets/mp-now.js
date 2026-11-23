// mp-now — then and now: MapReduce's disk between every step; today's exchange in memory, with
// many stages; plans that change while they run (a join switched to broadcast, as mp-join shows it).
// A concept strip with no measured numbers of its own; the 29–30 stages are the exact median's
// plan from _measurements.md, and step 1 draws that query's SQL (the instructor's run on the page MPP). Sources (read from the papers): Dean & Ghemawat 2004; Snowflake
// 2016; Dremel 2020; Spark's adaptive query execution.
// The timelines are pictures of order (what waits for what), not measured durations.
import { LOOK, arrow, on, t, widget, zone } from "./mp-lib.js";
import { sql, sqlCss } from "./cost-lib.js";

const MEDIAN = "SELECT DISTINCT system_id,\n       PERCENTILE_CONT(num_bikes_available, 0.5)\n         OVER (PARTITION BY system_id) AS median_bikes\nFROM `enjoytech-bq-lab.gbfs.station_status`\nORDER BY system_id;";

const CAPTURED = { medianStages: "29–30" };

const steps = (D) => [
  { stop: "MapReduce", title: "MapReduce, 2004: the same plan, with disk between the steps",
    note: `Map reads a share and reduces it, the shuffle moves its output by key, reduce finishes each key. Every step writes its output to disk before the next reads it, and a question of several steps runs as several jobs, one after another.` },
  { stop: "In memory", title: "Today: the exchange stays in memory",
    note: `Stages hand their rows to the next through memory, and the next starts before the last has finished. So a plan can have many stages: the exact median above had ${D.medianStages}. Spark still writes its shuffle files to local disk by default.` },
  { stop: "Adapt", title: "Plans that change while they run",
    note: `After a stage the engine knows the real sizes and rewrites the rest of the plan: a shuffle join whose side turned out small becomes a broadcast join, a key that turned out huge is split over several workers. Spark calls this adaptive query execution; Dremel, BigQuery's engine, switches a join to broadcast mid-query.` },
];

const CSS = LOOK("nw") + sqlCss("nw") + `
.lw .nw .stp { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .nw .stp.off { fill:var(--cell); stroke:var(--line); }
.lw .nw .stp.hotp { fill:var(--hot-bg); stroke:var(--hot); }
.lw .nw .disk { fill:var(--hot-bg); stroke:var(--hot); stroke-width:1.5; }
.lw .nw .mem { fill:var(--ok-bg); stroke:var(--ok); stroke-width:1.5; }
.lw .nw .pin { stroke:var(--ok); stroke-width:1.5; }
.lw .nw .seg { fill:var(--accent); } .lw .nw .seg.io { fill:var(--hot); }
.lw .nw .tick { fill:var(--accent); opacity:0; }
.lw .nw .st.on .tick { opacity:1; transition:opacity .3s; transition-delay:var(--d); }
.lw .nw .ghost { opacity:.5; }
`;

const step = (x, y, w, label, cls = "") => `<rect class="stp ${cls}" x="${x}" y="${y}" width="${w}" height="40" rx="20"/>${t(x + w / 2, y + 21, label)}`;
const disk = (cx, cy) => `<path class="disk" d="M${cx - 20} ${cy - 13} v26 a20 6 0 0 0 40 0 v-26 a20 6 0 0 0 -40 0 a20 6 0 0 0 40 0"/>`;
const mem = (cx, cy) => `<rect class="mem" x="${cx - 18}" y="${cy - 11}" width="36" height="22" rx="4"/>`
  + [0, 1, 2, 3].map((i) => `<path class="pin" d="M${cx - 12 + i * 8} ${cy + 11} v5 M${cx - 12 + i * 8} ${cy - 11} v-5"/>`).join("");
const seg = (x, y, w, cls = "") => `<rect class="seg in ${cls}" x="${x}" y="${y}" width="${w}" height="22" rx="4"/>`;
const key = (x, y, cls, label) => `<rect class="seg ${cls}" x="${x}" y="${y - 7}" width="14" height="14" rx="3"/>` + t(x + 22, y + 1, label, "lbl l");

// Step 0: one job, a disk after every step; then three jobs on a timeline, disk between each.
const job = (j) => { const x = 27 + j * 236;
  return seg(x, 300, 120) + seg(x + 122, 300, 52, "io") + t(x + 60, 336, `job ${j + 1}`, "lbl") + (j < 2 ? seg(x + 176, 300, 52, "io") : ""); };
const mapreduce = () => on("0", zone(11, 10, 738, 196, "ONE JOB")
  + step(27, 72, 104, "map") + arrow(135, 92, 162) + disk(188, 92) + t(188, 128, "local disk", "lbl")
  + arrow(212, 92, 268) + t(240, 76, "shuffle", "lbl") + step(272, 72, 112, "reduce") + arrow(388, 92, 414)
  + disk(440, 92) + t(440, 128, "distributed files", "lbl") + arrow(464, 92, 490)
  + step(494, 72, 124, "next job…", "off") + t(684, 84, "each step", "lbl") + t(684, 104, "waits for", "lbl") + t(684, 124, "the last", "lbl")
  + t(380, 176, "every arrow passes through a disk", "dim")
  + zone(11, 218, 738, 172, "A QUESTION OF THREE STEPS, IN TIME →")
  + [0, 1, 2].map(job).join("")
  + key(27, 366, "", "compute") + key(140, 366, "io", "written to disk and read back between every job"));

// Step 1: stages overlap in time, memory between them; then a plan of many stages.
const stage = (j) => { const x = 120 + j * 96, y = 46 + j * 32;
  return t(27, y + 12, `stage ${j + 1}`, "l") + seg(x, y, 250) + (j < 3 ? mem(x + 262, y + 27) : ""); };
const memory = (D) => on("1", zone(11, 10, 738, 196, "TODAY: STAGES PIPELINED THROUGH MEMORY, IN TIME →")
  + [0, 1, 2, 3].map(stage).join("") + t(380, 188, "the next stage starts while the last is still sending", "lbl")
  + zone(11, 218, 738, 172, "SO A PLAN CAN HAVE MANY STAGES")
  + Array.from({ length: 30 }, (_, i) => `<rect class="tick" style="--d:${200 + i * 35}ms" x="${27 + i * 23.6}" y="246" width="18" height="28" rx="6"/>`).join("")
  + sql(27, 300, MEDIAN) + t(733, 318, `${D.medianStages} stages`, "h r") + t(733, 342, "with a disk between each,", "lbl r") + t(733, 362, "it would be 30 jobs", "lbl r"));

// Step 2: one plan, before and after the engine sees the real sizes.
const adapt = () => on("2", zone(11, 10, 738, 180, "PLANNED BEFORE THE RUN")
  + `<g class="ghost">${step(27, 50, 150, "scan A", "off") + step(27, 116, 150, "scan B", "off") + arrow(181, 70, 258) + arrow(181, 136, 258)
  + step(262, 83, 210, "shuffle both by key", "hotp") + arrow(476, 103, 520) + step(524, 83, 120, "join", "off")}</g>`
  + t(367, 150, "dropped once scan B's real size is known", "lbl hot")
  + zone(11, 202, 738, 188, "AFTER SCAN B RAN: IT TURNED OUT SMALL")
  + step(27, 240, 150, "scan A") + step(27, 314, 150, "scan B") + t(102, 370, "small", "lbl")
  + arrow(181, 334, 258, "acc") + step(262, 314, 200, "broadcast B") + `<path class="arw acc" d="M462 334 H584 V286 M578 292 L584 286 L590 292"/>`
  + arrow(181, 260, 520) + step(524, 240, 120, "join") + t(350, 248, "A never moves", "h acc"));

const scene = (D) => `<svg viewBox="0 0 760 400">${mapreduce()}${memory(D)}${adapt()}</svg>`;

export default widget({ key: "nw", label: "Then and now", css: CSS, steps, scene, captured: CAPTURED });
