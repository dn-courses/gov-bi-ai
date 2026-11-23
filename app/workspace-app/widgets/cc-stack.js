// cc-stack — the service models as one question asked layer by layer: who operates this?
// The split per model follows the three definitions in NIST SP 800-145; a drawing of a definition,
// with no measured numbers.
import { CSS, MATRIX_CSS, legend, matrix, on, svg, t, widget } from "./cc-lib.js";

const ROWS = ["Data, and who may see it", "Application", "Runtime and database engine", "Operating system", "Virtual machines", "Servers and disks", "Network", "Building, power, cooling"];
const COLS = ["On-premises", "IaaS", "PaaS", "SaaS"];
const YOURS = [8, 4, 2, 1]; // how many layers, from the top, stay with the customer

const steps = () => [
  { stop: "On-prem", title: "On-premises: every layer is yours",
    note: `From the building to the data. Your organisation buys, installs, patches and repairs all of it, and controls all of it.` },
  { stop: "IaaS", title: "Infrastructure as a service: rent the machine",
    note: `The provider hands you a virtual machine, a disk and a network. From the operating system up nothing has changed: you install, you patch, you back up.` },
  { stop: "PaaS", title: "Platform as a service: rent the engine", decisive: true,
    note: `The provider also runs the operating system and the engine on it — a database, a runtime for your code. You bring the application and the data, and configure the rest instead of operating it.` },
  { stop: "SaaS", title: "Software as a service: rent the finished thing",
    note: `Mail, a BI tool in the browser. You bring your data and decide who may see it; everything under that is someone else's job, and someone else's decision.` },
  { stop: "Trade-off", title: "Less to operate means less to control",
    note: `Moving right, work leaves your team and choices leave with it: which version, which patch night, which setting. One row never moves. The data, and who may see it, stays yours in every column.` },
];

const M = matrix({ rows: ROWS, cols: COLS, mine: YOURS.map((n) => ROWS.map((_, r) => r < n)), top: 50 });

const scene = () => svg(760, 400, `
  ${M.svg}
  ${on("0 1 2 3", legend(230, M.bottom + 14))}
  ${on("4", `<rect class="keep" x="20" y="44" width="720" height="44" rx="9"/>
    <path class="edge on" d="M236 ${M.bottom + 22} L724 ${M.bottom + 22} M714 ${M.bottom + 15} L724 ${M.bottom + 22} L714 ${M.bottom + 29}"/>
    ${t(120, M.bottom + 22, "you operate less", "acc")}`)}
`);

const css = CSS("cs") + MATRIX_CSS("cs", COLS.length) + `.lw .cs .keep { fill:none; stroke:var(--ok); stroke-width:2.5; }`;

export default widget({ key: "cs", label: "Service models", css, steps, scene });
