// cc-database — the same question for the thing this audience runs: a database. Four ways to have
// one, and which of the work stays with the team. A drawing of the categories (no product is
// explained here; that is the cloud-databases module's subject), with no measured numbers.
import { CSS, MATRIX_CSS, from, legend, matrix, on, svg, t, widget } from "./cc-lib.js";

const ROWS = ["Schema, queries, data quality", "Who may see which data", "Choosing the machine's size", "Backups, failover, engine upgrades", "Operating system: install, patch", "Hardware, disks, power"];
const COLS = ["Your server", "A rented VM", "Managed", "Serverless"];
const KIND = ["on-premises", "IaaS", "PaaS", "PaaS, no machine"];
const YOURS = [6, 5, 3, 2];

const steps = () => [
  { stop: "Yours", title: "The database in your data centre",
    note: `The Oracle, SQL Server or PostgreSQL you run today. Your team owns every row of this list, including the ones nobody enjoys.` },
  { stop: "On a VM", title: "The same engine, installed on a rented machine",
    note: `Only the hardware has moved. You still install the engine, patch the operating system and test the backups. This is IaaS: a data centre you do not have to build.` },
  { stop: "Managed", title: "A managed database: the provider runs the engine", decisive: true,
    note: `The same engine, with the same SQL, operated for you: patches, backups and failover become settings. You still choose how big the machine is, and pay for it while it is on. "Managed" almost always means PaaS.` },
  { stop: "Serverless", title: "Serverless: there is no machine to choose",
    note: `You send SQL and get an answer. Capacity is the provider's problem from one query to the next, and you pay for what each query used. It is still PaaS, one step further along.` },
  { stop: "Stays", title: "What never moves",
    note: `The model, the queries, the quality of the data, and who is allowed to see it. No service model takes those from you — which is why the rest of this seminar is about them.` },
];

const M = matrix({ rows: ROWS, cols: COLS, mine: YOURS.map((n) => ROWS.map((_, r) => r < n)), top: 76, labelW: 250, rowH: 36, gap: 8 });

const scene = () => svg(760, 400, `
  ${M.svg}
  ${KIND.map((k, c) => from(c, t(M.x(c) + M.colW / 2, 30, k, "lbl"))).join("")}
  ${on("0 1 2 3", legend(284, M.bottom + 12))}
  ${on("4", `<rect class="keep" x="18" y="68" width="724" height="96" rx="10"/>${t(380, M.bottom + 20, "yours in every column", "h ok")}`)}
`);

const css = CSS("cd") + MATRIX_CSS("cd", COLS.length) + `.lw .cd .keep { fill:none; stroke:var(--ok); stroke-width:2.5; }`;

export default widget({ key: "cd", label: "Where a database sits", css, steps, scene });
