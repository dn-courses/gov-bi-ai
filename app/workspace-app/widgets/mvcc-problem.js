// mvcc-problem — why rows have versions: a report adds up four balances while a transfer moves money
// between two of them. With no protection the report is wrong; with locks somebody waits; with
// versions nobody waits and the report is right, at the price of old versions left in the table.
// A toy: nothing here is measured.
import { DESK, css, drive, last } from "@widget-lib/joinplay.js";
import { scene as build } from "@widget-lib/scene.js";
import { stepper } from "@widget-lib/stepper.js";

const NAMES = ["A", "B", "C", "D"], MOVE = 100, TRUTH = 400;
const fresh = () => NAMES.map(() => [{ v: 100, s: "live" }]);
const copy = (rows) => rows.map((versions) => versions.map((c) => ({ ...c })));

// A scenario is built action by action from a running state; `step(change)` records one.
function scenario(open) {
  const s = { rows: fresh(), read: [], cursor: -1, pick: null, report: "not started", transfer: "not started", waited: 0, lock: "", say: open };
  const states = [];
  const snap = () => states.push({ ...s, rows: copy(s.rows), read: [...s.read] });
  snap();
  return { s, states, step(change) { s.fresh = null; s.pick = null; change(s); if (s.transfer === "waiting") s.waited += 1; snap(); } };
}
const total = (s) => s.read.reduce((sum, v) => sum + v, 0);
// The report reads account i: `version` picks which version it takes (the last by default).
const reads = (i, version, why = "") => (s) => {
  const at = version ?? s.rows[i].length - 1, v = s.rows[i][at].v;
  s.cursor = i; s.pick = [i, at]; s.read.push(v); s.report = "running";
  s.say = `The report reads ${NAMES[i]}: $${v}.${why} Its total so far is $${total(s)}.`;
};

function unprotected() {
  const run = scenario(`The report and the transfer run at the same time, and nothing keeps them apart.`);
  run.step(reads(0)); run.step(reads(1));
  run.step((s) => { s.rows[0][0].v -= MOVE; s.fresh = [0, 0]; s.transfer = "running"; s.say = `The transfer takes $${MOVE} out of A. The row is changed where it is: A is now $0.`; });
  run.step((s) => { s.rows[3][0].v += MOVE; s.fresh = [3, 0]; s.transfer = "done"; s.say = `The transfer puts $${MOVE} into D: now $200. The transfer is done.`; });
  run.step(reads(2)); run.step(reads(3));
  run.step((s) => { s.cursor = -1; s.report = "done"; s.verdict = "bad"; s.say = `The report says $${total(s)}. The bank never held $${total(s)}: the report counted the $${MOVE} once in A before it left and again in D after it arrived.`; });
  return run.states;
}
function locked() {
  const run = scenario(`The same two, with a lock: whoever comes first holds the table, and the other waits.`);
  run.step((s) => { s.report = "running"; s.lock = "locked by the report"; s.say = `The report starts and locks the table against changes.`; });
  run.step(reads(0));
  run.step((s) => { s.transfer = "waiting"; s.say = `The transfer wants to change A. The table is locked, so it waits.`; });
  run.step(reads(1)); run.step(reads(2)); run.step(reads(3));
  run.step((s) => { s.cursor = -1; s.report = "done"; s.lock = ""; s.transfer = "running"; s.verdict = "ok"; s.say = `The report says $${total(s)}, which is right, and lets go of the lock.`; });
  run.step((s) => { s.rows[0][0].v -= MOVE; s.rows[3][0].v += MOVE; s.transfer = "done"; s.fresh = [3, 0];
    s.say = `Only now does the transfer run. It waited for the whole report: a report that takes a minute holds every change for a minute. Had the transfer come first, the report would have waited.`; });
  return run.states;
}
function versions() {
  const run = scenario(`The same two again. This time a change does not touch the row: it writes a new version beside it.`);
  run.step((s) => { s.report = "running"; s.say = `The report starts. It will read every row as it is at this moment, whatever happens next.`; });
  run.step(reads(0)); run.step(reads(1));
  const write = (i, v, say) => (s) => { s.rows[i][0].s = "old"; s.rows[i].push({ v, s: "live" }); s.fresh = [i, 1]; s.transfer = "running"; s.say = say; };
  run.step(write(0, 0, `The transfer takes $${MOVE} out of A by writing a <b>new version</b> of the row: $0. The old version, $100, stays where it is.`));
  run.step((s) => { write(3, 200, `The transfer puts $${MOVE} into D the same way: a new version, $200. The transfer is done, and it waited for nobody.`)(s); s.transfer = "done"; });
  run.step(reads(2));
  run.step(reads(3, 0, ` D has two versions; the report takes the one that existed when it started.`));
  run.step((s) => { s.cursor = -1; s.report = "done"; s.verdict = "ok"; s.rows[0][0].s = "dead"; s.rows[3][0].s = "dead";
    s.say = `The report says $${total(s)}: right, and nobody waited. The price is left in the table: two old versions that no query will read again. They are <b>dead rows</b>.`; });
  return run.states;
}

const OPEN = { rows: fresh(), read: [], cursor: -1, report: "not started", transfer: "not started", waited: 0, lock: "",
  say: `A bank with four accounts of $100. One user asks for the total; at the same time another moves $${MOVE} from A to D. The right total is $${TRUTH}, before, during and after.` };
const PHASES = [{ states: [OPEN] }, { states: unprotected(), tick: 1500 }, { states: locked(), tick: 1500 }, { states: versions(), tick: 1700 }];

const steps = () => [
  { stop: "Two at once", title: "One table, a reader and a writer at the same time",
    note: `A database serves many users at once. What should a long read see while the rows it reads are being changed?` },
  { stop: "No protection", title: "Let them run: the report is wrong",
    note: `Press Play, or Step for one action at a time. Watch the total.` },
  { stop: "Locks", title: "Lock the table: right answer, and somebody waits",
    note: `Press Play. Watch the transfer.` },
  { stop: "Versions", title: "Keep the old version: right answer, and nobody waits", decisive: true,
    note: `Press Play. This is <b>MVCC</b>, multi-version concurrency control. Oracle keeps the old versions aside, in undo; PostgreSQL keeps them in the table itself.` },
];

const CSS = `
.lw .mp .top { display:grid; grid-template-columns:1fr 1.5fr 1fr; gap:14px; align-items:start; }
.lw .mp .who p { margin:0 0 10px; font:14px ui-monospace, Menlo, monospace; }
.lw .mp .who .big { font:600 26px ui-monospace, Menlo, monospace; color:var(--accent); }
.lw .mp .who .big.ok { color:var(--ok); } .lw .mp .who .big.bad { color:var(--hot); }
.lw .mp .who small { display:block; font:12px system-ui, sans-serif; color:var(--mute); }
.lw .mp .state { display:inline-block; padding:4px 12px; border-radius:999px; background:var(--cell); font:600 13px system-ui, sans-serif; color:var(--mute); }
.lw .mp .state.running { background:var(--accent-bg); color:var(--accent); } .lw .mp .state.done { background:var(--ok-bg); color:var(--ok); }
.lw .mp .state.waiting { background:var(--hot-bg); color:var(--hot); }
.lw .mp h4 .lock { float:right; color:var(--hot); letter-spacing:0; text-transform:none; font-size:13px; }
.lw .mp .acct { display:flex; align-items:center; gap:10px; padding:7px 10px; margin-top:6px; border-radius:10px; border:1.5px solid transparent; transition:border-color .25s, background .25s; }
.lw .mp .acct.now { border-color:var(--accent); background:var(--accent-bg); }
.lw .mp .acct > b { font:600 14px system-ui, sans-serif; width:86px; }
.lw .mp .ver { padding:6px 12px; border-radius:8px; background:var(--cell); border:1.5px solid transparent; font:600 14px ui-monospace, Menlo, monospace; }
.lw .mp .ver.old { opacity:.75; border-style:dashed; border-color:var(--line); }
.lw .mp .ver.dead { background:var(--hot-bg); color:var(--hot); text-decoration:line-through; }
.lw .mp .ver.pick { border-color:var(--ok); background:var(--ok-bg); color:var(--ok); opacity:1; }
.lw .mp .ver small { font:11px system-ui, sans-serif; font-weight:400; margin-left:6px; }
.lw .mp.moving .ver.new { animation:mp-in .5s both; }
@keyframes mp-in { from { opacity:0; transform:scale(.7); } }
@container (max-width: 760px) { .lw .mp .top { grid-template-columns:1fr; } }
`;
const scene = () => `${DESK}<div class="top">
  <div class="card who report"><h4>The report</h4><p>SELECT sum(balance)<br>FROM accounts;</p><div class="big"></div><small>total so far</small><p></p><span class="state"></span></div>
  <div class="card table"><h4>Table accounts<span class="lock"></span></h4><div class="accts"></div></div>
  <div class="card who transfer"><h4>The transfer</h4><p>A: balance − ${MOVE}<br>D: balance + ${MOVE}</p><span class="state"></span></div></div>`;

const tag = { old: "old", dead: "dead", live: "" };
function draw(root, s, moving) {
  root.classList.toggle("moving", Boolean(moving));
  const is = (pair, i, n) => pair?.[0] === i && pair[1] === n;
  root.querySelector(".accts").innerHTML = s.rows.map((versions, i) => `<div class="acct${s.cursor === i ? " now" : ""}"><b>account ${NAMES[i]}</b>${versions.map((c, n) =>
    `<span class="ver ${c.s}${is(s.fresh, i, n) ? " new" : ""}${is(s.pick, i, n) ? " pick" : ""}">$${c.v}${versions.length > 1 && tag[c.s] ? `<small>${tag[c.s]}</small>` : ""}</span>`).join("")}</div>`).join("");
  const state = (who, text) => { const el = root.querySelector(`.${who} .state`); el.textContent = text; el.className = `state ${text.split(" ")[0]}`; };
  state("report", s.report); state("transfer", s.transfer);
  const big = root.querySelector(".report .big");
  big.textContent = s.read.length ? `$${s.read.reduce((sum, v) => sum + v, 0)}` : "–"; big.className = `big ${s.verdict ?? ""}`;
  root.querySelector(".lock").textContent = s.lock;
  root.querySelector(".say").innerHTML = s.say;
  root.querySelector(".counts").innerHTML = `<span>actions the transfer waited<b>${s.waited}</b></span>`;
}

export default { render: build({ stepper, key: "mp", label: "Why rows have versions", css: css("mp") + CSS, steps, scene, after: (root, at) => drive(root, at, PHASES, draw) }) };
