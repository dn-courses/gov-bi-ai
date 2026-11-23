// age-walls — "Defences in Depth": the places a tool call passes that never read the prompt, and
// what each one stopped when the planted note's agent, and the SQL it could be talked into, met it.
//
// CAPTURED 2026-11-23 (writer age) in the agents lab, as analyst_ro on `shop`, by the page's
// session_sql / guarded_sql (scripts m3_guards.py, m4.py): every error text, verdict and timing below
// is what those calls printed. The 5 rows are the note's query, returned through every wall.
import { esc, staged } from "./ag4-lib.js";
import { AUDIT } from "./ag6-inject.js";

const D = {
  session: [
    ["SELECT pg_sleep(4)", "canceling statement due to statement timeout", "3.0 s"],
    ["DELETE FROM fact_sales WHERE order_id = -1", "cannot execute DELETE in a read-only transaction", "0.0 s"],
  ],
  opened: [
    ["SET statement_timeout = 0;\nSELECT pg_sleep(4)", "ran to the end: one row", "4.0 s", "hot"],
    ["SET TRANSACTION READ WRITE;\nDELETE FROM fact_sales WHERE order_id = -1", "permission denied for table fact_sales", "0.0 s", "ok"],
  ],
  check: [
    ["SET statement_timeout = 0; SELECT pg_sleep(4)", "refused", "one statement at a time"],
    ["SET TRANSACTION READ WRITE; DELETE …", "refused", "one statement at a time"],
    ["WITH gone AS (DELETE FROM fact_sales RETURNING *)\n  SELECT count(*) FROM gone", "refused", "DELETE is not allowed"],
    ["SELECT name FROM dim_product WHERE name = 'DROP SHIPPING'", "passes", "a word inside quotes is data"],
  ],
  email: "permission denied for table dim_customer",
};

const WALLS = [["the loop", "max_turns"], ["the tool, in", "statement check"], ["the session", "read-only · 3 s"], ["the role", "grants · hidden columns"], ["a person", "approves actions"]];
// Per step, each wall's state: "seen", "now" (this step's), "good" (stopped the call), "bad" (let it through).
const WALK = [
  ["seen", "seen", "seen", "seen", "seen"], ["", "", "good"], ["", "", "bad", "good"], ["", "good", "seen", "seen"],
  ["seen", "seen", "seen", "bad"], ["now", "", "", "", "now"], ["seen", "seen", "seen", "seen", "seen"],
];
// Per step, the calls on their way: [label, the wall it stops at (5: it gets through), tone].
const CALLS = [
  [["a tool call", -1, ""]],
  [["pg_sleep(4)", 2, "ok"], ["DELETE …", 2, "ok"]],
  [["SET …; pg_sleep(4)", 5, "hot"], ["SET …; DELETE …", 3, "ok"]],
  [["SET …; pg_sleep(4)", 1, "ok"], ["SET …; DELETE …", 1, "ok"]],
  [["SELECT email", 3, "ok"], ["the note's SELECT", 5, "hot"]],
  [["turn 7", 0, "ok"], ["send_report(…)", 4, ""]],
  [],
];
const VERDICT = { good: "stopped it", bad: "let it through" };

const steps = [
  { stop: "Walls", title: "Five places a call passes that never read the prompt",
    note: `The loop that issues it, the tool's own code, the database session, the database role, and for an action a person. None of them can be talked round by a row.` },
  { stop: "Session", title: "The session: read only, and three seconds at most",
    note: `The tool opens its connection with two settings. PostgreSQL then cancels the long query and refuses the write, whatever the SQL says it wants.` },
  { stop: "Opened", title: "A setting is a default the SQL can change",
    note: `Two statements in one call: the first switches the timeout off, and the sleep runs its full four seconds. The write gets further too, and is stopped one wall down, by the role, which has no right to delete.` },
  { stop: "The check", title: "The check in the tool keeps the settings shut", decisive: true,
    note: `One statement, starting with <code>SELECT</code> or <code>WITH</code>, with no writing or setting keyword outside quotes. The two calls that opened the session are refused before they reach it.` },
  { stop: "Passes all", title: "The note's own query passes every wall",
    note: `<code>email</code> is refused: the role was never granted that column. The country and sign-up date of five customers are not: the query is one <code>SELECT</code>, fast, and on columns the role may read.` },
  { stop: "Turns, person", title: "Two walls around the loop",
    note: `A turn cap bounds what one confused or steered question can cost. A tool that sends, writes or pays stops and shows a person the exact call before it runs.` },
  { stop: "Together", title: "Each wall is cheap, and none is complete",
    note: `Choose them by what the tool can do: one that only reads, through a narrow role, needs fewer than one that can send an email.` },
];

const CSS = `
.lw .agew td.q { width:46%; }
.lw .agew .trip { display:grid; gap:10px; }
.lw .agew .lanes { position:relative; display:grid; gap:8px; padding:4px 0; }
.lw .agew .lane { position:relative; height:32px; transition:opacity .4s; }
.lw .agew .lane.idle { opacity:0; }
.lw .agew .trail { position:absolute; left:0; top:15px; height:2px; width:var(--x); background:var(--accent); border-radius:2px; transition:width .9s ease-out, background .4s; }
.lw .agew .call { position:absolute; top:0; left:var(--x); transform:translateX(-100%); height:30px; padding:0 12px; display:flex; align-items:center;
      border-radius:999px; white-space:nowrap; font:600 13px ui-monospace, Menlo, monospace; background:var(--accent-bg); color:var(--accent);
      border:1.5px solid var(--accent); box-shadow:0 2px 6px rgba(0,0,0,.22); transition:left .9s ease-out, background .4s, color .4s, border-color .4s; }
.lw .agew .lane.ok .call { background:var(--ok-bg); color:var(--ok); border-color:var(--ok); } .lw .agew .lane.ok .trail { background:var(--ok); }
.lw .agew .lane.hot .call { background:var(--hot-bg); color:var(--hot); border-color:var(--hot); } .lw .agew .lane.hot .trail { background:var(--hot); }
.lw .agew .post { position:absolute; top:0; bottom:-10px; width:4px; margin-left:-2px; border-radius:2px; background:var(--line); transition:background .45s; }
.lw .agew .walls { display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); gap:8px; }
.lw .agew .wall, .lw .agew .end { padding:10px 6px; border-radius:10px; text-align:center; font-size:14px; font-weight:600; min-width:0; }
.lw .agew .end { color:var(--mute); border:1.5px dashed var(--line); }
.lw .agew .wall { background:var(--cell); border:1.5px solid transparent; border-top:4px solid var(--line); color:var(--mute); transition:background .45s, border-color .45s, color .45s; }
.lw .agew small { display:block; font-weight:500; font-size:12.5px; margin-top:2px; }
.lw .agew .wall em { display:block; font-style:normal; font-size:12.5px; margin-top:6px; min-height:1.2em; }
.lw .agew .wall.seen { color:var(--ink); border-top-color:var(--mute); }
.lw .agew .wall.now { background:var(--accent-bg); border-color:var(--accent); color:var(--accent); }
.lw .agew .wall.good { background:var(--ok-bg); border-color:var(--ok); color:var(--ok); }
.lw .agew .wall.bad { background:var(--hot-bg); border-color:var(--hot); color:var(--hot); }
.lw .agew .post.now { background:var(--accent); } .lw .agew .post.good { background:var(--ok); } .lw .agew .post.bad { background:var(--hot); }
.lw .agew .post.seen { background:var(--mute); }
.lw .agew .turns { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.lw .agew .turns i { font-style:normal; display:grid; place-items:center; width:42px; height:42px; border-radius:10px; background:var(--accent-bg); color:var(--accent); font:600 15px ui-monospace, Menlo, monospace; }
.lw .agew .turns i.halt { background:var(--hot-bg); color:var(--hot); width:auto; padding:0 14px; }
.lw .agew .btns { display:flex; gap:10px; margin-top:12px; }
.lw .agew .all td:first-child { font-weight:600; white-space:nowrap; }
`;

// Where on the lane a call stops: just in front of wall w's post (w = -1: leaving the model; 5: through).
const POST = (w) => ((w + 1.5) / 7) * 100;
const stopAt = (w) => (w < 0 ? 100 / 7 : w > 4 ? 100 : POST(w) - 0.8);

const trip = () => `<div class="zone"><p class="cap">A tool call, and the walls it passes</p><div class="trip">
  <div class="lanes">${WALLS.map((_, w) => `<span class="post" data-post="${w}" style="left:${POST(w)}%"></span>`).join("")}
    ${[0, 1].map((n) => `<div class="lane idle" data-lane="${n}"><span class="trail"></span><span class="call"></span></div>`).join("")}</div>
  <div class="walls"><div class="end">the model<small>asks for a call</small></div>
    ${WALLS.map(([name, sub], w) => `<div class="wall" data-wall="${w}">${name}<small>${sub}</small><em></em></div>`).join("")}
    <div class="end">PostgreSQL<small>or the action</small></div></div>
</div></div>`;

const errRow = ([sql, said, secs, tone]) => `<tr><td class="q">${esc(sql)}</td><td class="q ${tone ?? "ok"}">${esc(said)}</td><td class="mono">${secs}</td></tr>`;
const thead = (a, b) => `<thead><tr><th>${a}</th><th>${b}</th><th>took</th></tr></thead>`;

const tables = () => `
  <div class="zone" data-on="1"><p class="cap">options = "-c default_transaction_read_only=on -c statement_timeout=3000"</p>
    <table>${thead("the tool sends", "PostgreSQL said")}<tbody>${D.session.map(errRow).join("")}</tbody></table></div>
  <div class="zone" data-on="2"><table>${thead("the tool sends, no check", "what happened")}<tbody>${D.opened.map(errRow).join("")}</tbody></table></div>
  <div class="zone" data-on="3"><table><thead><tr><th>the model sends</th><th>the check</th><th>why</th></tr></thead>
    <tbody>${D.check.map(([q, v, why]) => `<tr><td class="q">${esc(q)}</td><td><span class="chip ${v === "refused" ? "ok" : "acc"}">${v}</span></td><td class="dim">${why}</td></tr>`).join("")}</tbody></table></div>
  <div class="cols" data-on="4">
    <div class="zone"><p class="cap">SELECT email FROM dim_customer</p><p class="q ok mono" style="margin:0">${D.email}</p></div>
    <div class="zone"><p class="cap">the note's query, behind every wall</p>
      <table><thead><tr><th>customer_key</th><th>country</th><th>signed_up</th></tr></thead>
        <tbody>${AUDIT.map((r) => `<tr>${r.map((v) => `<td class="mono hot">${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
  </div>`;

const around = () => `<div class="cols" data-on="5">
    <div class="zone"><p class="cap">One question, max_turns = 6</p>
      <div class="turns">${[1, 2, 3, 4, 5, 6].map((n) => `<i>${n}</i>`).join("")}<i class="halt">stop</i></div>
      <p class="dim" style="margin:12px 0 0;font-size:15px">worst case ≈ 6 requests × a full context each</p></div>
    <div class="zone"><p class="cap">An action tool waits for a person</p><pre>send_report(to="all-staff@shop.example",\n            rows=…)</pre>
      <div class="btns"><span class="chip ok">Approve</span><span class="chip hot">Deny</span></div>
      <p class="dim" style="margin:10px 0 0;font-size:14px">The person sees the call and its arguments, not the model's account of them.</p></div>
  </div>
  <div class="zone" data-on="6">
    <table class="all"><thead><tr><th>wall</th><th>stops</th><th>does not stop</th></tr></thead><tbody>
      <tr><td>A defensive prompt</td><td>most plain notes: a lower rate</td><td>a note written to beat it</td></tr>
      <tr><td>Statement check</td><td>anything but one SELECT, with a clear error</td><td>a SELECT that reads what it should not</td></tr>
      <tr><td>Session settings</td><td>writes and long queries, if the check keeps them set</td><td>SQL that changes them</td></tr>
      <tr><td>Role: grants, hidden columns</td><td>whatever was never granted</td><td>reading what was</td></tr>
      <tr><td>Turn cap</td><td>unbounded cost</td><td>a wrong answer inside the budget</td></tr>
      <tr><td>Approval</td><td>actions nobody meant</td><td>a person who clicks yes to everything</td></tr>
    </tbody></table>
  </div>`;

const scene = () => `${trip()}${tables()}${around()}`;

function after(root, at) {
  root.querySelectorAll("[data-wall]").forEach((node) => {
    const state = WALK[at][Number(node.dataset.wall)] ?? "";
    node.className = `wall ${state}`;
    node.querySelector("em").textContent = VERDICT[state] ?? "";
  });
  root.querySelectorAll("[data-post]").forEach((node) => { node.className = `post ${WALK[at][Number(node.dataset.post)] ?? ""}`; });
  root.querySelectorAll("[data-lane]").forEach((lane) => {
    const call = CALLS[at][Number(lane.dataset.lane)];
    lane.className = `lane ${call ? call[2] : "idle"}`;
    if (!call) return;
    lane.querySelector(".call").textContent = call[0];
    lane.style.setProperty("--x", `${stopAt(call[1])}%`);
  });
}

export default staged({ key: "agew", label: "Walls around a tool call", css: CSS, steps, scene, after });
