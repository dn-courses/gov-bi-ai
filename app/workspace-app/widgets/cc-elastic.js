// cc-elastic — elasticity as a mechanism: load that is not flat, the two directions capacity can
// grow in, who decides to grow it, how an autoscaler decides, why it lags, going idle, and
// serverless. SKETCHES throughout: every curve is an invented shape, the axes carry no numbers, and
// the 60% target, the two-machine minimum and the ten-machine maximum are example settings, not
// anyone's defaults. Nothing here is measured, and the widget says "sketch" on screen.
import { CSS, arrow, chip, node, on, svg, t, widget, zone } from "./cc-lib.js";

const X0 = 70, X1 = 700, BASE = 300;
const xs = (n) => (i) => X0 + (i * (X1 - X0)) / n;
const line = (vals) => { const x = xs(vals.length - 1); return vals.map((v, i) => `${i ? "L" : "M"}${x(i)} ${BASE - v}`).join(" "); };
const area = (vals) => `${line(vals)} L${X1} ${BASE} L${X0} ${BASE} Z`;
const stairs = (vals) => { const x = xs(vals.length); return `M${X0} ${BASE - vals[0]} ` + vals.map((v, i) => `L${x(i)} ${BASE - v} L${x(i + 1)} ${BASE - v}`).join(" "); };
const axes = (left, right) => `<path class="axis" d="M${X0} 56 L${X0} ${BASE} L${X1} ${BASE}"/>${t(X0 - 14, 70, "load", "lbl r")}${t(X0, BASE + 22, left, "lbl l")}${t(X1, BASE + 22, right, "lbl r")}`;

// One month with a month-end peak; owned capacity is a flat line above the peak.
const MONTH = [30, 34, 30, 44, 38, 32, 30, 36, 48, 40, 34, 30, 32, 38, 46, 40, 34, 32, 36, 44, 60, 90, 140, 190, 200, 170, 90, 44, 34, 30];
const OWNED = 222;

// One rising morning: the capacity an autoscaler adds follows the load a little late.
const RISE = [30, 30, 34, 44, 62, 88, 120, 150, 172, 184, 188, 184, 170, 150, 124, 96, 70, 52, 40, 34];
const LATE = RISE.map((_, i) => Math.ceil(Math.max(RISE[Math.max(i - 2, 0)], RISE[Math.max(i - 3, 0)]) / 30) * 30 + 12);
const short = () => { const x = xs(RISE.length); return RISE.map((v, i) => (v > LATE[i] ? `<rect class="short" x="${x(i)}" y="${BASE - v}" width="${x(1) - x(0)}" height="${v - LATE[i]}"/>` : "")).join(""); };

// Two working days with nothing at night: capacity that goes to zero with the load.
const DAYS = [0, 0, 0, 0, 30, 90, 130, 140, 120, 80, 20, 0, 0, 0, 0, 0, 40, 100, 150, 130, 110, 60, 10, 0];
const FOLLOW = DAYS.map((v) => (v ? Math.ceil(v / 40) * 40 + 12 : 0));

const steps = () => [
  { stop: "Load", title: "Work is not flat, and owned capacity is",
    note: `A reporting system is quiet most of the month and very busy for a few days at its end. A machine cannot be bought for three days, so it is sized for the busiest hour and paid for in full. <b>Elasticity</b> is capacity that follows the curve instead.` },
  { stop: "Up or out", title: "Capacity grows in two directions",
    note: `<b>Scale up</b>: replace the machine with a bigger one. Simple, but there is a largest machine, and the change usually means a restart. <b>Scale out</b>: add machines side by side and spread the work. No ceiling to speak of, but the work must be divisible.` },
  { stop: "Who", title: "Someone, or something, has to decide",
    note: `A person can do it when a report is slow. A schedule can do it when the busy hours are known in advance. A rule can do it by watching the system, which is <b>autoscaling</b>.` },
  { stop: "Rule", title: "An autoscaler holds a number near a target", decisive: true,
    note: `You choose a measurement that tracks load (processor use, requests waiting in a queue), a target for it, and a floor and a ceiling on the number of machines. Above the target it adds machines; below, it removes them. The ceiling is what limits the bill.` },
  { stop: "Lag", title: "It reacts; it does not predict",
    note: `A new machine takes time to start, so capacity arrives after the load does, and for a while requests wait. Removing machines is delayed on purpose (a <b>cooldown</b>), so a brief dip does not undo the work. Known peaks are better met by a schedule.` },
  { stop: "Idle", title: "Down to nothing",
    note: `If the floor is zero, the service stops when nobody uses it and costs nothing overnight or on a weekend. The price is the first request after a pause: it waits while something starts (a <b>cold start</b>).` },
  { stop: "Serverless", title: "Serverless: there is no machine to size",
    note: `The last step: you stop choosing machines at all. You send a request or a query, the provider runs it on capacity it already has, and bills for that one piece of work. Scaling and idling still happen; they are no longer yours to configure. You give up control over the hardware, and long or unusual work may not fit.` },
];

const machine = (x, y, w, h, cls = "") => node(x, y, w, h, "", cls);

const directions = `
  ${zone(24, 16, 346, 330, "SCALE UP — A BIGGER MACHINE")}
  ${machine(70, 200, 60, 60)}${arrow(140, 230, 170, 230, "")}${machine(180, 150, 150, 110, "hit")}
  ${t(100, 282, "before", "lbl")}${t(255, 282, "after", "lbl")}
  ${t(197, 90, "has a ceiling", "h hot")}${t(197, 116, "usually a restart", "lbl")}
  ${zone(390, 16, 346, 330, "SCALE OUT — MORE MACHINES")}
  ${chip(488, 150, 150, 34, "spreads the work", "ok", "ok")}
  ${[0, 1, 2, 3].map((i) => `${machine(420 + i * 74, 214, 60, 60, i ? "hit" : "")}<path class="edge" d="M563 184 L${450 + i * 74} 214"/>`).join("")}
  ${t(450, 296, "before", "lbl")}${t(598, 296, "added", "lbl")}
  ${t(563, 90, "no real ceiling", "h ok")}${t(563, 116, "the work must be divisible", "lbl")}`;

const WHO = [
  ["A person", "when someone notices it is slow", "late, and needs someone awake", ""],
  ["A schedule", "every month-end, every morning at eight", "right when the peak is known", ""],
  ["A rule", "watches a measurement and acts on it", "autoscaling: handles what nobody planned", "hit"],
];
const who = `${zone(24, 16, 712, 330, "THREE WAYS TO DECIDE")}
  ${WHO.map(([name, how, verdict, cls], i) => `${node(50, 52 + i * 94, 660, 78, "", cls)}${t(80, 78 + i * 94, name, `h l ${cls ? "acc" : ""}`)}
    ${t(80, 104 + i * 94, how, "lbl l")}${t(690, 91 + i * 94, verdict, `r ${cls ? "acc" : "dim"}`)}`).join("")}`;

const SLOTS = 10, RUNNING = 5, FLOOR = 2;
const rule = `${zone(24, 16, 712, 330, "ONE RULE — AN EXAMPLE SETTING")}
  ${t(60, 62, "processor use, averaged over the machines", "lbl l")}
  <rect class="track" x="60" y="78" width="640" height="26" rx="13"/><rect class="fill hotfill" x="60" y="78" width="544" height="26" rx="13"/>
  <path class="mark" d="M444 68 L444 114"/>${t(444, 130, "target 60%", "acc")}${t(604, 130, "now 85%", "hot")}
  ${arrow(380, 150, 380, 182)}${t(396, 166, "above the target: add machines", "l h")}
  ${Array.from({ length: SLOTS }, (_, i) => `<rect class="slot ${i < FLOOR ? "floor" : i < RUNNING ? "run" : i < RUNNING + 2 ? "new" : ""}" x="${60 + i * 65}" y="200" width="54" height="54" rx="8"/>`).join("")}
  ${t(119, 276, "floor: 2", "lbl")}${t(254, 276, "running", "lbl")}${t(417, 276, "being added", "ok")}${t(644, 276, "ceiling: 10", "lbl")}
  ${t(380, 320, "below the target, the newest machines are removed again", "lbl")}`;

const serverless = `
  ${chip(60, 120, 170, 44, "a request", "hit", "acc")}${chip(60, 200, 170, 44, "a query", "hit", "acc")}
  ${arrow(236, 142, 330, 170)}${arrow(236, 222, 330, 196)}
  ${zone(336, 60, 400, 250, "THE PROVIDER'S CAPACITY — NOT YOURS TO SIZE")}
  ${Array.from({ length: 40 }, (_, i) => `<rect class="grain ${i % 7 === 2 || i % 11 === 5 ? "lit" : ""}" x="${362 + (i % 10) * 35}" y="${100 + Math.floor(i / 10) * 34}" width="28" height="24" rx="4"/>`).join("")}
  ${t(536, 262, "runs it, then takes the capacity back", "lbl")}
  ${node(60, 290, 250, 44, "", "ok")}${t(185, 313, "billed per request, per query", "ok")}
  ${t(145, 60, "no machine count", "h")}${t(145, 84, "no floor, no ceiling", "lbl")}`;

const scene = () => svg(760, 362, `
  ${on("0", `${zone(24, 16, 712, 330, "ONE MONTH OF LOAD — A SKETCH")}${axes("day 1", "day 30")}
    <path class="idle" d="M${X0} ${BASE - OWNED} L${X1} ${BASE - OWNED} L${X1} ${BASE} L${X0} ${BASE} Z"/><path class="work" d="${area(MONTH)}"/>
    <path class="cap-line" d="M${X0} ${BASE - OWNED} L${X1} ${BASE - OWNED}"/><path class="demand" d="${line(MONTH)}"/>
    ${t(X0 + 8, BASE - OWNED - 12, "owned: sized for the peak", "l hot")}${t(300, 150, "bought, and idle", "h hot")}${t(560, 130, "month-end", "h acc")}`)}
  ${on("1", directions)}${on("2", who)}${on("3", rule)}
  ${on("4", `${zone(24, 16, 712, 330, "ONE BUSY MORNING — A SKETCH")}${axes("early", "noon")}
    <path class="work" d="${area(RISE)}"/>${short()}<path class="stairs" d="${stairs(LATE)}"/><path class="demand" d="${line(RISE)}"/>
    ${t(250, 120, "requests wait here", "h hot")}${arrow(262, 132, 300, 176, "hot")}
    ${t(470, 60, "capacity, added in steps", "ok")}${t(385, 322, "and removed late, on purpose", "lbl")}`)}
  ${on("5", `${zone(24, 16, 712, 330, "TWO WORKING DAYS — A SKETCH")}${axes("night", "night")}
    <path class="work" d="${area(DAYS)}"/><path class="stairs" d="${stairs(FOLLOW)}"/><path class="demand" d="${line(DAYS)}"/>
    ${t(425, 170, "nothing runs,", "h ok")}${t(425, 194, "nothing is billed", "h ok")}
    ${t(196, 96, "the first request waits", "hot")}${arrow(196, 108, 178, 262, "hot")}`)}
  ${on("6", serverless)}
`);

const css = CSS("ce") + `
.lw .ce .axis { fill:none; stroke:var(--line); stroke-width:1.5; }
.lw .ce .demand { fill:none; stroke:var(--accent); stroke-width:3; stroke-linejoin:round; }
.lw .ce .work { fill:var(--accent-bg); opacity:.7; }
.lw .ce .idle { fill:var(--hot-bg); }
.lw .ce .short { fill:var(--hot); opacity:.55; }
.lw .ce .cap-line { fill:none; stroke:var(--hot); stroke-width:2.5; }
.lw .ce .stairs { fill:none; stroke:var(--ok); stroke-width:2.5; stroke-linejoin:round; }
.lw .ce .track { fill:var(--cell); } .lw .ce .hotfill { fill:var(--hot-bg); stroke:var(--hot); }
.lw .ce .mark { stroke:var(--accent); stroke-width:3; }
.lw .ce .slot { fill:var(--panel); stroke:var(--line); stroke-dasharray:3 4; }
.lw .ce .slot.floor, .lw .ce .slot.run { fill:var(--accent-bg); stroke:var(--accent); stroke-dasharray:none; }
.lw .ce .slot.new { fill:var(--ok-bg); stroke:var(--ok); stroke-dasharray:none; }
.lw .ce .grain { fill:var(--cell); stroke:var(--line); } .lw .ce .grain.lit { fill:var(--accent-bg); stroke:var(--accent); }
`;

export default widget({ key: "ce", label: "Elasticity", css, steps, scene });
