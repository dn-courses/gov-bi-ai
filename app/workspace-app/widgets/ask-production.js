// ask-production — lesson 3: what the agent of lesson 2 does to a production database. The first
// and fourth steps come from the same ten recorded sessions (an application ran beside each one,
// its latency sampled every 2 seconds); the rest is measured in the lab.
import { ask, bars } from "./ask.js";
import recorded from "./recorded.json";
import { LATENCY } from "./talk-measure.js";

const Y = `<td class="ok">yes</td>`, N = `<td class="hot">refused</td>`, D = `<td></td>`;
const rows = (cols) => [
  ["columns, types, index definitions", Y, Y],
  ["a plan (EXPLAIN)", Y, N],
  ["a measured plan (EXPLAIN ANALYZE)", Y, N],
  ["the rows themselves", `<td class="hot">yes, all of them</td>`, N],
  ["build an index, refresh statistics, change a row", N, N],
].map(([what, ...cells]) => `<tr><td class="t">${what}</td>${cells.map((c, i) => (i < cols ? c : D)).join("")}</tr>`).join("");
const access = (cols) => `<table><thead><tr><th>Connected as…</th><th>a read-only user</th><th>${cols > 1 ? "a user that reads nothing" : ""}</th></tr></thead><tbody>${rows(cols)}</tbody></table>`;

// The application's latency through one recorded session, as a line; the agent starts at the mark.
function timeline(name) {
  const app = recorded[name]?.app;
  if (!app) return "";
  const ms = app.tps_latency_ms.map((r) => r[1]), top = Math.max(...ms), W = 900, H = 160;
  const x = (i) => (i / (ms.length - 1)) * W, y = (v) => H - (v / top) * (H - 10);
  const start = x(app.reports_before_agent);
  return `<svg viewBox="0 0 ${W} ${H + 24}" style="width:100%;height:auto;display:block" role="img" aria-label="application latency during the session">
    <line x1="${start}" y1="0" x2="${start}" y2="${H}" stroke="var(--hot)" stroke-dasharray="4 4"/>
    <text x="${start + 6}" y="12" font-size="12" fill="var(--hot)">the agent starts</text>
    <polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${ms.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}"/>
    <text x="0" y="${H + 18}" font-size="12" fill="var(--mute)">0 s</text>
    <text x="${W}" y="${H + 18}" font-size="12" fill="var(--mute)" text-anchor="end">${ms.length * app.every_seconds} s · peak ${Math.round(top).toLocaleString()} ms</text></svg>`;
}

export default ask({ label: "What a connection costs production", steps: [
  { stop: "It changes", title: "It did what it was asked, on the database it was given", decisive: true,
    extra: `<table><thead><tr><th>The same ten sessions</th><th></th></tr></thead><tbody>
      <tr><td class="t">ran the slow query, or a measured plan of it</td><td class="hot">10 of 10</td></tr>
      <tr><td class="t">ran VACUUM or ANALYZE on a table</td><td class="hot">6 of 10</td></tr>
      <tr><td class="t">built an index (two of them dropped it again)</td><td class="hot">4 of 10</td></tr>
      <tr><td class="t">changed only the query's text</td><td>4 of 10</td></tr></tbody></table>`,
    note: `Nothing here is a malfunction. A connection that may write was used to write. An index build or a VACUUM in the middle of the day, on a production table, is an incident.` },
  { stop: "Read-only", title: "So the usual answer: a read-only user", extra: access(1),
    note: `It cannot break anything, and it still gets plans. It also reads every row: the agent's second command counted the rows of every order state. One fear answered, the other not.` },
  { stop: "Reads nothing", title: "A user with no right on the tables is refused even a plan", extra: access(2), decisive: true,
    note: `PostgreSQL checks the right to read a table before it plans a query on it. Confidential data and a useful model look like a choice.` },
  { stop: "It slows", title: "Its measuring slows the application", decisive: true,
    extra: bars("An application query beside one agent session on the big table (four clients)", [
      { label: "before the agent starts", value: 599, text: "599 ms" },
      { label: "average while it works", value: 833, text: "833 ms", tone: "hot" },
      { label: "worst two seconds", value: 1603, text: "1,603 ms", tone: "hot" },
    ]) + timeline("agent_big_1") + LATENCY,
    note: `To find out why a query is slow, the agent runs it. On a table of thirty million rows that is five minutes of full scans and sorts on the machine the application lives on. Even reads by primary key slow down.` },
  { stop: "It blocks", title: "Its long read blocks cleanup, on every table", decisive: true,
    extra: bars("A table of 10,000 rows, after 20 seconds of updates by the application", [
      { label: "alone", value: 656, text: "656 kB" },
      { label: "beside one long read", value: 4896, text: "4,896 kB", tone: "hot" },
    ]) + bars("Dead row versions left in it", [
      { label: "alone", value: 1952, text: "1,952" },
      { label: "beside one long read", value: 84955, text: "84,955", tone: "hot" },
    ]) + bars("Updates per second", [
      { label: "alone", value: 9604, text: "9,604" },
      { label: "beside one long read", value: 4251, text: "4,251", tone: "hot" },
    ]),
    note: `The long read never touches this table. While it runs it holds a snapshot, and no row version that died after that snapshot can be removed, anywhere in the database. The table grew seven times; when the read ended the dead rows were cleaned, and the table kept its size.` },
  { stop: "The verdict", title: "A connection to production does not pass", decisive: true,
    extra: `<table><thead><tr><th>A connection…</th><th>The problem</th></tr></thead><tbody>
      <tr><td class="t">as an owner</td><td class="t hot">changes the database</td></tr>
      <tr><td class="t">as a read-only user</td><td class="t hot">reads every row</td></tr>
      <tr><td class="t">as a user that reads nothing</td><td class="t hot">cannot get a plan</td></tr>
      <tr><td class="t">as any of them, measuring</td><td class="t hot">slows the application · holds back cleanup</td></tr></tbody></table>`,
    note: `The agent with a connection is the best tuner in this session, and no real environment will let it in. What the model is handed has to be built. The rest of the session builds it, one piece at a time.` },
] });
