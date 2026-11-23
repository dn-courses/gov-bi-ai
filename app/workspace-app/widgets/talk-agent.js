// talk-agent — lesson 2: the model given a connection. One recorded session of an agent with
// `psql` and an owner's connection, asked to make the query faster, then all ten sessions.
import { Q_STATE } from "./ask.js";
import { talk } from "./talk.js";

const RARE = "<b>445</b> of 5,000,000 rows have state 2";
const session = { db: "rare", fact: RARE, run: "agent_rare_1", agent: true, query: Q_STATE };

export default talk({ label: "The model, given a connection", steps: [
  { stop: "Connect it", title: "The model that guessed, given a connection",
    extra: `<table><thead><tr><th>An agent</th><th></th></tr></thead><tbody>
      <tr><td class="t">what it is</td><td class="t">the same model, in a loop: it runs a command, reads the output, decides the next one</td></tr>
      <tr><td class="t">what it was given</td><td class="t"><code>psql</code>, connected as the owner of the database, and the slow query in a file</td></tr>
      <tr><td class="t">what it was asked</td><td class="t">"The query is too slow. Make it faster."</td></tr></tbody></table>`,
    note: `No definitions pasted, no plan pasted. It can look for itself.` },
  { stop: "It looks", title: "First it looks at the data", talks: [{ ...session, upto: 4, focus: /^\s*2 \|/ }],
    note: `Two commands in. It reads the table's definition, counts the rows of every state, and runs the query with <code>EXPLAIN ANALYZE</code>. It now knows what the chat window could not: 445 rows.` },
  { stop: "It fixes", title: "Then it fixes, and measures again", talks: [{ ...session, upto: 7, focus: /Index Only Scan|Execution Time/ }],
    note: `It builds an index, runs <code>VACUUM ANALYZE</code>, and measures the query again, in one command.` },
  { stop: "Its report", title: "A better answer than the chat window gave", decisive: true,
    talks: [{ ...session, focus: /Index Only Scan|Execution Time/, tally: "16 seconds · 2 cents", verdict: "ok", measured: "an index of <b>40 kB</b>, where the answer without a connection built <b>237 MB</b>" }],
    note: `It saw that the 445 rows are all the query wants, so its index holds only those rows. The guess is gone, and the fix is better than the usual one.` },
  { stop: "Ten sessions", title: "Five slow queries, two sessions each", decisive: true,
    extra: `<table><thead><tr><th>Ten sessions, "make it faster"</th><th></th></tr></thead><tbody>
      <tr><td class="t">found the real cause</td><td class="ok">10 of 10</td></tr>
      <tr><td class="t">where an index would be wasted (95% of the rows match)</td><td class="ok">tried one, measured, dropped it, said so</td></tr>
      <tr><td class="t">the stale statistics</td><td class="ok">found and refreshed, 2 of 2</td></tr>
      <tr><td class="t">time</td><td>12 seconds to 5½ minutes</td></tr>
      <tr><td class="t">price</td><td>2 to 9 cents</td></tr></tbody></table>`,
    note: `Every problem of this session, solved in minutes for cents. So why not do exactly this on production?` },
] });
