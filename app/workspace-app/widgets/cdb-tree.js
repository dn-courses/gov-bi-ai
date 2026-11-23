// cdb-tree — choosing a store as a short chain of questions, walked once per dataset and workload:
// a hard constraint first, then the workload, then how often it is queried. Each step is one case
// and lights its path. No numbers; the cases are the lesson's own.
import { extra, t, widget, zone } from "./cdb-lib.js";

const CASES = [
  null,
  ["a permit-lookup portal", "thousands of single-record", "reads a minute"],
  ["spending, by department", "by year, over a decade:", "dashboards refreshed all day"],
  ["one analyst, one question", "raw export files", "already in a bucket"],
  ["heavy reporting scans", "on classified data:", "the system must be air-gapped"],
  ["an operational system", "flat load, 24 hours a day,", "all year"],
  ["one agency", "a records system, and reports", "over years of the same data"],
];

const steps = () => [
  { stop: "The tree", title: "Name the workload, and the store falls out",
    note: `Three questions, asked per dataset and workload, not per agency. The vendor's name is the last thing decided. "We are a Google shop" and "we have always run our own" are both ways of skipping the questions.` },
  { stop: "A portal", title: "Single rows, right now: managed relational",
    note: `Single-row reads and writes, sensitive to latency, are what a row engine is for. With no hard constraint, let the provider operate it.` },
  { stop: "A dashboard", title: "Big scans, asked all day: a cloud warehouse",
    note: `Many rows, few columns, queried often enough that owning the layout pays: load it in, partition it, cluster it.` },
  { stop: "Export files", title: "Big scans, asked rarely: query the lake in place",
    note: `The data already sits in object storage and the question comes twice a quarter. A load step would cost more than it saves.` },
  { stop: "Classified", title: "A hard constraint is asked before the workload", decisive: true,
    note: `The workload points at a warehouse, and it does not get a vote. In Israel residency alone no longer decides this: both providers have an in-country region. Classification, an air-gap and your own approval path still do.` },
  { stop: "Flat load", title: "A constraint is not a habit",
    note: `The cloud's saving is elasticity: pay for the peaks, almost nothing when idle. A load that never dips has no idle to save, and an owned box can be the cheaper answer. That is an argument. "We have always run it ourselves" is not.` },
  { stop: "Two stores", title: "One agency usually lands in two places",
    note: `The records system on managed relational, and a reporting copy of the same data in a warehouse. That is not indecision; it is two workloads, each on the engine built for it.` },
];

// The steps on which each node and edge is part of the lit path.
const ON = { top: "1 2 3 4 5 6", c: "1 2 3 4 5 6", onprem: "4 5", w: "1 2 3 6", managed: "1 6", often: "2 3 6", warehouse: "2 6", lake: "3" };
const lit = (key) => ON[key].split(" ").map((s) => `s${s}`).join(" ");

const CSS = (k) => extra(k) + [1, 2, 3, 4, 5, 6].map((s) => `
.lw .${k}[data-at="${s}"] .n.s${s} { fill:var(--accent-bg); stroke:var(--accent); }
.lw .${k}[data-at="${s}"] .n.leaf.s${s} { fill:var(--ok-bg); stroke:var(--ok); }
.lw .${k}[data-at="${s}"] .edge.s${s} { stroke:var(--accent); stroke-width:3; }
.lw .${k}[data-at="${s}"] text.s${s} { fill:var(--ink); }`).join("") + `
.lw .${k} .n { fill:var(--cell); stroke:var(--line); stroke-width:1.5; filter:drop-shadow(0 2px 5px rgba(0,0,0,.22)); transition:fill .5s, stroke .5s; }
.lw .${k} .n.leaf { stroke-dasharray:none; }
.lw .${k} text.e { font:500 13px system-ui, sans-serif; fill:var(--mute); transition:fill .5s; }
`;

const node = (key, x, y, w, l1, l2 = "", leaf = "") => `<rect class="n ${leaf} ${lit(key)}" x="${x - w / 2}" y="${y - 24}" width="${w}" height="48" rx="${leaf ? 8 : 24}"/>
  ${l2 ? t(x, y - 8, l1) + t(x, y + 11, l2, "lbl") : t(x, y + 1, l1)}`;
const edge = (key, d, label, lx, ly) => `<path class="edge ${lit(key)}" d="${d}"/>${label ? t(lx, ly, label, `e ${lit(key)}`) : ""}`;

const scene = () => `<svg viewBox="0 0 760 420">
  ${zone(14, 10, 732, 400)}
  ${edge("c", "M330 62 L330 84")}
  ${edge("onprem", "M250 108 L118 108 L118 180", "yes", 184, 96)}
  ${edge("w", "M410 108 L490 108 L490 180", "no", 450, 96)}
  ${edge("managed", "M420 204 L330 204 L330 266", "single rows, low latency", 330, 252)}
  ${edge("often", "M560 204 L620 204 L620 266", "big scans", 668, 236)}
  ${edge("warehouse", "M590 314 L510 314 L510 338", "yes", 548, 304)}
  ${edge("lake", "M650 314 L672 314 L672 338", "no", 700, 304)}
  ${node("top", 330, 38, 260, "a dataset and its workload")}
  ${node("c", 330, 108, 180, "a hard constraint?")}
  ${node("onprem", 118, 204, 180, "on-prem RDBMS", "or self-run, isolated", "leaf")}
  ${node("w", 490, 204, 160, "which workload?")}
  ${node("managed", 330, 290, 190, "managed relational", "RDS · Aurora · Cloud SQL", "leaf")}
  ${node("often", 620, 290, 170, "queried often?")}
  ${node("warehouse", 510, 362, 150, "cloud warehouse", "", "leaf")}
  ${node("lake", 672, 362, 136, "query the lake", "", "leaf")}
  ${t(30, 262, "A HARD CONSTRAINT IS ONE OF", "cap")}
  ${["classification, or an air-gap", "a flat load: no idle to save", "a latency floor at the edge", "data that may not leave a site"].map((s, i) => t(30, 290 + i * 24, s, "lbl l")).join("")}
  ${CASES.map((c, i) => c ? `<g class="st" data-on="${i}">${t(536, 30, "THE CASE", "cap") + t(536, 56, c[0], "l acc") + t(536, 80, c[1], "lbl l") + t(536, 100, c[2], "lbl l")}</g>` : "").join("")}
</svg>`;

export default widget({ key: "tr", label: "Choosing a store", css: CSS("tr"), steps, scene, captured: {} });
