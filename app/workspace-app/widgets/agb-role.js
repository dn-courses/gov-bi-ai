// agb-role — the agent gets a login of its own: agent_ro, granted SELECT on the public schema and
// nothing else, so a write is refused by the database, not by the loop. Two steps: who connects as
// whom, then what PostgreSQL answered to four statements.
import { cols, esc, rows, widget, zone } from "./agb-lib.js";

// MEASURED 2026-11-23 on the lab's Pagila (PostgreSQL 16) by the page's `as_agent` cell, connected
// as agent_ro; the grant count by the page's SQL cell (information_schema.role_table_grants).
const CAPTURED = {
  tried: [
    ["SELECT count(*) FROM film", "(1000,)", "ok"],
    ["INSERT INTO film (title, language_id) VALUES ('X', 1)", "InsufficientPrivilege: permission denied for table film", "hot"],
    ["DELETE FROM payment", "InsufficientPrivilege: permission denied for table payment", "hot"],
    ["DROP TABLE film", "InsufficientPrivilege: must be owner of table film", "hot"],
  ],
};

const css = `
.lw .agb .who { display:grid; grid-template-columns:1fr auto 1.1fr auto 1fr; gap:10px; align-items:center; }
.lw .agb .who .party { text-align:center; padding:16px 10px; border-radius:14px; border:1.5px solid var(--line); background:var(--cell); }
.lw .agb .who .party b { display:block; font:700 17px ui-monospace, Menlo, monospace; } .lw .agb .who .party span { font-size:14px; color:var(--mute); }
.lw .agb .who .party.on { border-color:var(--accent); background:var(--accent-bg); } .lw .agb .who .party.on b { color:var(--accent); }
.lw .agb .who .hop { display:grid; justify-items:center; font-size:13px; color:var(--mute); } .lw .agb .who .hop i { font-style:normal; font-size:24px; }
.lw .agb .grants { display:flex; flex-wrap:wrap; gap:8px; }
.lw .agb .grant { padding:6px 14px; border-radius:999px; font:600 14px ui-monospace, Menlo, monospace; }
.lw .agb .grant.yes { box-shadow:inset 0 0 0 1.5px var(--ok); } .lw .agb .grant.yes { background:var(--ok-bg); color:var(--ok); } .lw .agb .grant.no { background:var(--cell); color:var(--mute); text-decoration:line-through; }
.lw .agb td.tick { width:28px; font-weight:700; } .lw .agb td.tick.ok { color:var(--ok); } .lw .agb td.tick.hot { color:var(--hot); }
.lw .agb tr:has(td.tick.hot) td:nth-child(2) { color:var(--mute); }
@container (max-width: 760px) { .lw .agb .who { grid-template-columns:1fr; } .lw .agb .who .hop { display:none; } }
`;

const steps = [
  { stop: "The login", title: "The agent connects as a role of its own",
    note: `<code>run_sql</code> runs SQL a model wrote. It connects as <code>agent_ro</code>, which may read every table of the <code>public</code> schema and do nothing else.` },
  { stop: "Tried", title: "A write is refused by the database", decisive: true,
    note: `Four statements, sent as <code>agent_ro</code>. The read works; every change is refused by PostgreSQL itself, whatever the model asked for.` },
];

const who = () => `<div class="who">
  <div class="party"><b>the model</b><span>writes a query</span></div><div class="hop"><span>SQL text</span><i>→</i></div>
  <div class="party on"><b>run_sql</b><span>logs in as <b style="display:inline;font-size:14px">agent_ro</b></span></div><div class="hop"><span>one statement</span><i>→</i></div>
  <div class="party"><b>PostgreSQL</b><span>checks the role's grants</span></div></div>`;

const grants = () => zone("what agent_ro may do on the tables of public", `<div class="grants">
  <span class="grant yes">SELECT</span>${["INSERT", "UPDATE", "DELETE", "TRUNCATE", "DROP", "ALTER"].map((g) => `<span class="grant no">${g}</span>`).join("")}</div>`);

const tried = () => zone("as agent_ro, measured in the lab", rows(["", "statement", "PostgreSQL answers"],
  CAPTURED.tried.map(([sql, out, tone]) => [[tone === "ok" ? "✓" : "✕", `tick ${tone}`], [esc(sql), "m"], [esc(out), `m ${tone}`]])), "on");

const view = (step, at) => (at === 0 ? `${who()}${cols([grants()])}` : tried());

export default widget({ label: "A read-only role", css, steps, view });
