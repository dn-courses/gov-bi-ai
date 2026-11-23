// cc-rent — owning machines against renting them, then the five characteristics that make a rental
// "cloud" (NIST SP 800-145, September 2011), each shown on the same pool of machines.
// A drawing of a definition: there are no measured numbers in it, and it states none.
import { CSS, arrow, chip, node, on, svg, t, widget, zone } from "./cc-lib.js";

const FIVE = [
  ["On-demand self-service", "You ask a program, not a person. No ticket, no purchase order, no waiting for someone to rack a machine."],
  ["Broad network access", "Everything is reached over the network with standard clients: a browser, a command line, a program calling an API."],
  ["Resource pooling", "Software cuts each physical server into <b>virtual machines</b>, and the pieces on one server belong to different customers. Each customer sees only her own machines; the hardware underneath is shared, and she neither knows nor chooses which server she is on."],
  ["Rapid elasticity", "What you hold grows and shrinks with the need: three machines on a quiet morning, twelve at the end of the month, one overnight. How that is done has its own picture below."],
  ["Measured service", "Use is metered — machine-hours, gigabytes stored, gigabytes read — and the bill is the meter's reading, not the price of a machine."],
];

const steps = () => [
  { stop: "Own", title: "On-prem: the organisation owns the machines",
    note: `On-premises, a server is requested, approved, bought, delivered and racked. Then it is owned for years, at the size you guessed on the day you ordered it, whether it is busy or idle.` },
  { stop: "Rent", title: "The cloud: you rent them, by the hour", decisive: true,
    note: `Someone else's computers, plus the software to hand them out and bill for them, offered as a service anyone can use by herself. You take capacity when you need it and give it back when you do not.` },
  ...FIVE.map(([name, note], i) => ({ stop: name.split(" ").at(-1), title: `${i + 1} of 5 — ${name}`, note })),
];

const COLS = 10, ROWS = 5;
const cells = () => Array.from({ length: COLS * ROWS }, (_, i) => {
  const cls = [i < 3 ? "m3" : "", i < 12 ? "m12" : "", i === 0 ? "m1" : "", i >= 12 && i % 3 === 0 ? "tb" : "", i >= 12 && i % 3 === 1 ? "tc" : ""].join(" ");
  return `<rect class="mc ${cls}" x="${332 + (i % COLS) * 40}" y="${96 + Math.floor(i / COLS) * 36}" width="34" height="28" rx="5"/>`;
}).join("");

const CHAIN = ["request", "approval", "purchase", "delivery", "racked"];

const own = () => `${zone(24, 16, 712, 330, "AN ON-PREM DATA CENTRE")}
  ${[0, 1, 2, 3].map((i) => `${node(70 + i * 160, 56, 130, 120, "", "hit")}${[0, 1, 2].map((j) => `<rect class="slot" x="${84 + i * 160}" y="${72 + j * 32}" width="102" height="22" rx="4"/>`).join("")}`).join("")}
  ${CHAIN.map((c, i) => `${chip(46 + i * 138, 212, 116, 36, c, "", "")}${i ? arrow(46 + i * 138 - 20, 230, 46 + i * 138 - 4, 230, "") : ""}`).join("")}
  ${t(380, 284, "weeks to months before the first query runs", "h hot")}
  ${t(380, 316, "then the same size for years — a purchase, on the capital budget", "lbl")}`;

const pool = () => `${zone(310, 16, 426, 330, "A PROVIDER'S DATA CENTRES — ONE POOL")}${cells()}
  ${t(523, 70, "machines, storage, network", "lbl")}`;

// Resource pooling: the provider's servers at the bottom, the software that cuts them up in the
// middle, and on top the virtual machines each customer sees — three customers' pieces on one server.
const OWNERS = ["a", "b", "a", "c", "a", "b", "b", "c", "", "a", "", "c"];
const shared = () => `
  ${[["you", "hit", "acc", 150], ["customer B", "ok", "ok", 320], ["customer C", "warm", "hot", 490]].map(([l, c, tc, x]) => chip(x, 8, 120, 32, l, c, tc)).join("")}
  ${zone(24, 52, 712, 84, "VIRTUAL MACHINES — WHAT EACH CUSTOMER SEES")}
  ${OWNERS.map((o, i) => `<rect class="vm ${o}" x="${52 + Math.floor(i / 3) * 172 + (i % 3) * 50}" y="84" width="44" height="36" rx="6"/>`).join("")}
  ${node(24, 150, 712, 38, "virtualisation — software that cuts each server into pieces and keeps them apart", "hit", "acc")}
  ${zone(24, 202, 712, 112, "PHYSICAL SERVERS — WHAT THE PROVIDER OWNS")}
  ${[0, 1, 2, 3].map((i) => `${node(50 + i * 172, 236, 148, 58, "", "")}${t(124 + i * 172, 256, `server ${i + 1}`, "")}${t(124 + i * 172, 278, "CPU · memory · disk", "lbl")}
    <path class="edge" d="M${124 + i * 172} 236 L${124 + i * 172} 188 M${124 + i * 172} 150 L${124 + i * 172} 122"/>`).join("")}
  ${t(380, 340, "one server carries pieces of three customers; an empty piece is rented to the next one who asks", "lbl")}`;

const side = (title, lines, cls = "acc") => `${t(160, 180, title, `h ${cls}`)}${lines.map((l, i) => t(160, 210 + i * 22, l, "lbl")).join("")}`;

const scene = () => svg(760, 362, `
  ${on("0", own())}
  ${on("1 2 3 5 6", pool())}
  ${on("1 2 5 6", `${chip(90, 70, 140, 44, "you", "hit", "h acc")}`)}
  ${on("1", `${arrow(234, 92, 326, 106)}${side("minutes, not months", ["take three machines now", "give them back tonight", "pay for the hours between"])}
    ${t(523, 300, "a rental, on the running budget", "h")}`)}
  ${on("2", `${arrow(234, 92, 326, 106)}${chip(240, 52, 60, 30, "API", "ok", "ok")}${side("no person in between", ["a console, a command,", "or your own program"])}`)}
  ${on("3", `${[["a browser", 40], ["a terminal", 116], ["a program", 192]].map(([l, y]) => `${chip(60, y, 200, 40, l, "hit", "acc")}${arrow(264, y + 20, 326, 140 + (y - 116) / 6)}`).join("")}
    ${t(160, 270, "from the office, from home,", "lbl")}${t(160, 292, "from another data centre", "lbl")}`)}
  ${on("4", shared())}
  ${on("5", `${side("grows and shrinks", ["a quiet morning: 3", "the end of the month: 12", "overnight: 1"])}${t(523, 300, "shown: the end of the month", "lbl")}`)}
  ${on("6", `${side("the bill is the meter", ["machine-hours", "gigabytes stored", "gigabytes read"])}
    ${node(400, 286, 246, 44, "", "ok")}${t(523, 309, "used → metered → billed", "ok")}`)}
`);

const lit = (sel) => `${sel} { fill:var(--accent-bg); stroke:var(--accent); }`;
const css = CSS("cr") + `
.lw .cr .mc { fill:var(--cell); stroke:var(--line); stroke-width:1; transition:fill .6s, stroke .6s; }
.lw .cr .vm { fill:var(--panel); stroke:var(--line); stroke-width:1; stroke-dasharray:3 4; }
.lw .cr .vm.a { fill:var(--accent-bg); stroke:var(--accent); stroke-dasharray:none; }
.lw .cr .vm.b { fill:var(--ok-bg); stroke:var(--ok); stroke-dasharray:none; }
.lw .cr .vm.c { fill:var(--hot-bg); stroke:var(--hot); stroke-dasharray:none; }
.lw .cr .slot { fill:var(--panel); stroke:var(--accent); stroke-width:1; }
${lit(`.lw .cr[data-at="1"] .m3, .lw .cr[data-at="2"] .m3, .lw .cr[data-at="3"] .m3, .lw .cr[data-at="4"] .m3, .lw .cr[data-at="6"] .m3, .lw .cr[data-at="5"] .m12, .lw .cr .mc.on3`)}
.lw .cr[data-at="4"] .tb, .lw .cr .mc.tbon { fill:var(--ok-bg); stroke:var(--ok); }
.lw .cr[data-at="4"] .tc, .lw .cr .mc.tcon { fill:var(--hot-bg); stroke:var(--hot); }
`;

export default widget({ key: "cr", label: "Owning and renting", css, steps, scene });
