// cdb-operate — a managed relational service changes who operates the database and nothing else:
// the lower half of the stack moves to the provider, the upper half stays, the edges of a
// lift-and-shift bite, and the engine is still a row engine.
// Measured on the lab's Pagila (PostgreSQL 16): the `film` numbers in the last-but-one step.
import { arrow, bar, box, extra, from, on, pill, t, widget, zone } from "./cdb-lib.js";

const CAPTURED = { pages: 64, needs: 10, row: 429, columns: 14 };

// [what has to be done, moves to the provider]
const LAYERS = [
  ["Where it runs: the region", 0], ["Access control and the data", 0], ["Schema, indexes, queries", 0], ["Sizing the instance", 0],
  ["High availability, replication", 1], ["Backups and failover mechanics", 1], ["OS and engine: install, patch", 1], ["Hardware, power, data centre", 1],
];

const steps = (D) => [
  { stop: "On-prem", title: "On-prem, every layer is yours",
    note: `Someone on your team installs, patches, backs up, tests the restore, plans capacity months ahead and takes the 2 a.m. page. None of it is the work a BI developer is there for.` },
  { stop: "Managed", title: "Managed relational: the same engine, operated for you",
    note: `The provider runs the lower half. You connect to an endpoint and use the same SQL, the same drivers, the same engine. This is the <b>PaaS</b> model from the cloud-concepts module.` },
  { stop: "Still yours", title: "What does not move",
    note: `How the data is modelled, queried, secured and located stays with you, and so does the size of the instance. The provider runs the backup; you still set its policy and test the restore.` },
  { stop: "The edges", title: "Lift-and-shift: the SQL moves, the edges bite",
    note: `Schema and queries come across unchanged. The schedule is lost on four things the provider now controls, and one of them is a contract and not a setting.` },
  { stop: "Not fixed", title: "It is still a row engine", decisive: true,
    note: `A report that averages one column still reads whole rows: <b>${D.pages} of ${D.pages} pages</b> here, to use ${D.needs} bytes of every ${D.row}. Moving the box to a provider changed who patches it, and nothing about what it is good at.` },
  { stop: "Two homes", title: "The right home for records; not the answer for reports",
    note: `Managed relational is where the transactional system goes. "Our reports are too slow, too big" needs a different architecture: storage apart from compute, and the table stored by column.` },
];

const CSS = (k) => extra(k) + `
.lw .${k} .ly { transition:fill .6s, stroke .6s, opacity .6s; }
.lw .${k}:not([data-at="0"]) .ly.m { fill:var(--ok-bg); stroke:var(--ok); }
.lw .${k}[data-at="2"] .ly.k { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .${k}[data-at="4"] .stack, .lw .${k}[data-at="5"] .stack { opacity:.4; }
.lw .${k} .stack { transition:opacity .6s; }
.lw .${k} .col { fill:var(--hot-bg); stroke:var(--hot); stroke-width:1; }
.lw .${k} .col.w { fill:var(--accent); stroke:var(--accent); }
`;

const ly = (i) => 42 + i * 43;
const stack = () => LAYERS.map(([name, moves], i) => `
  <rect class="box ly ${moves ? "m" : "k"}" x="40" y="${ly(i)}" width="262" height="34" rx="6"/>${t(52, ly(i) + 18, name, "l")}
  ${moves ? on("0", t(358, ly(i) + 18, "you", "dim")) + from(1, t(358, ly(i) + 18, "provider", "ok")) : t(358, ly(i) + 18, "you", "acc")}`).join("");

const TOIL = ["patch windows", "backups, and restores tested", "capacity planned months ahead", "the 2 a.m. page"];
const SERVICES = [["AWS", "RDS · Aurora"], ["Google Cloud", "Cloud SQL · AlloyDB"], ["Azure", "Azure Database · Azure SQL"]];
const EDGES = [["engine versions", "a menu, retired on their schedule"], ["extensions and features", "a curated list; no access to the host"],
  ["networking", "private link, firewall, DNS"], ["Oracle licensing", "a contract question, not a config"]];

const scene = (D) => `<svg viewBox="0 0 760 412">
  <g class="stack">${zone(26, 10, 396, 392, "ONE DATABASE — EIGHT THINGS SOMEBODY DOES")}${stack()}</g>
  ${zone(434, 10, 300, 392)}

  ${on("0", t(450, 29, "THE TOIL", "cap") + t(584, 74, "8 of 8", "huge") + t(584, 104, "layers run by your team", "lbl")
    + TOIL.map((s, i) => pill(454, 140 + i * 58, 260, 40, s, "warm", "hot")).join(""))}

  ${on("1", t(450, 29, "THE SAME ENGINES, AS A SERVICE", "cap")
    + SERVICES.map(([cloud, names], i) => t(454, 66 + i * 84, cloud, "lbl l") + pill(454, 80 + i * 84, 260, 40, names, i < 2 ? "hit" : "", i < 2 ? "acc" : "")).join("")
    + t(584, 322, "RDS runs PostgreSQL, MySQL, MariaDB,", "lbl") + t(584, 342, "Oracle, SQL Server and Db2", "lbl") + t(584, 376, "a SELECT runs unchanged", "ok"))}

  ${on("2", t(450, 29, "STAYS WITH YOU", "cap") + t(584, 74, "4 of 8", "huge") + t(584, 104, "and they are the four that matter", "lbl")
    + ["model", "queries", "access", "location"].map((s, i) => pill(454 + (i % 2) * 134, 140 + Math.floor(i / 2) * 56, 126, 40, s, "hit", "acc")).join("")
    + t(584, 286, "backups: the provider runs them,", "lbl") + t(584, 306, "you set the policy and test the restore", "lbl")
    + t(584, 350, "sizing: you pick the instance,", "lbl") + t(584, 370, "they run it", "lbl"))}

  ${on("3", t(450, 29, "WHERE A WEEKEND MOVE GOES WRONG", "cap")
    + EDGES.map(([name, why], i) => pill(454, 50 + i * 86, 260, 40, name, "warm", "hot") + t(584, 108 + i * 86, why, "lbl")).join(""))}

  ${on("4", t(450, 29, `ONE ROW OF film — ${D.columns} COLUMNS`, "cap")
    + `<rect class="col" x="454" y="56" width="260" height="34" rx="3"/><rect class="col w" x="454" y="56" width="${Math.max(6, Math.round(260 * D.needs / D.row))}" height="34" rx="3"/>`
    + t(454, 112, "rating, rental_rate", "l acc") + t(714, 112, "everything else", "r hot")
    + t(454, 162, "the query needs", "lbl l") + t(714, 162, `${D.needs} bytes`, "big r acc")
    + t(454, 194, "a row holds", "lbl l") + t(714, 194, `${D.row} bytes`, "big r hot")
    + t(454, 244, "pages read", "lbl l") + bar(454, 258, 260, "warm") + t(584, 300, `${D.pages} of ${D.pages}`, "huge hot")
    + t(584, 344, "on your server, on RDS, on Cloud SQL:", "lbl") + t(584, 366, "the same plan, the same pages", "lbl"))}

  ${on("5", t(450, 29, "ONE AGENCY, TWO WORKLOADS", "cap")
    + pill(454, 56, 260, 40, "the records system", "", "") + arrow(584, 100, 584, 126) + pill(454, 130, 260, 44, "managed relational", "ok", "ok")
    + t(584, 196, "single-row reads and writes", "lbl")
    + pill(454, 232, 260, 40, "agency-wide reports", "", "") + arrow(584, 276, 584, 302, "hot") + pill(454, 306, 260, 44, "not this engine", "warm", "hot")
    + t(584, 374, "years of history, a few columns", "lbl"))}
</svg>`;

export default widget({ key: "op", label: "Who operates the database", css: CSS("op"), steps, scene, captured: CAPTURED });
