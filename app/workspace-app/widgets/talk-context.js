// talk-context — lesson 4: the table definitions are handed over with the query. No tool yet.
import { Q_EMAIL, Q_STATE } from "./ask.js";
import { talk } from "./talk.js";

const has = { context: 2 };
const RARE = "<b>445</b> of 5,000,000 rows have state 2";
const MOST = "<b>4,750,003</b> of 5,000,000 rows have state 2";
const tally = "3 sessions of 3: this index";

export default talk({ label: "Asked with the table definitions", steps: [
  { stop: "Definitions", title: "Context: text handed over with the question", has, fresh: "context",
    extra: `<table><thead><tr><th>The table definitions</th><th></th></tr></thead><tbody>
      <tr><td class="t">what they are</td><td class="t">columns, types and indexes, as <code>psql \\d</code> prints them</td></tr>
      <tr><td class="t">who may read them</td><td class="t ok">any database user, with no right on any table</td></tr>
      <tr><td class="t">rows inside</td><td class="t ok">none</td></tr></tbody></table>`,
    note: `Nothing in them is confidential in most systems, and nothing has to be run to get them. They are pasted under the query.` },
  { stop: "The twins", title: "Same definition, same answer", has, query: Q_STATE, decisive: true,
    talks: [{ db: "rare", fact: RARE, run: "rare_none_1", blocks: 2, tally, verdict: "ok", measured: "<b>111 ms → 0.09 ms</b>" },
            { db: "most", fact: MOST, run: "most_none_1", blocks: 2, tally, verdict: "bad", measured: "<b>504 ms → 521 ms</b> · 237 MB, never used" }],
    note: `The two databases have the same columns and the same indexes. What differs is in the rows, and a definition holds no row. The answer did not move.` },
  { stop: "A lookup", title: "Where the answer is written in the definition", has, query: Q_EMAIL,
    talks: [{ db: "norm", fact: "<code>email_norm</code>: a stored column holding <code>lower(email)</code>, already indexed", run: "norm_none_2",
      tally: "9 sessions: use the indexed column in 8 · a new index in 1", verdict: "ok", measured: "<b>28 ms → 0.02 ms</b> · nothing built" }],
    note: `Asked with the query alone, the only possible fix is a new index. With the definition, the model finds the column that already serves the query, and changes the query.` },
  { stop: "What it gave", title: "Context answers what is written in it", has, decisive: true,
    extra: `<table><thead><tr><th>The fix depends on…</th><th>in the definitions?</th><th>the answer</th></tr></thead><tbody>
      <tr><td class="t">a column that is already indexed</td><td class="t ok">yes</td><td class="t ok">right, 8 sessions of 9</td></tr>
      <tr><td class="t">how many rows the filter keeps</td><td class="t hot">no: it is in the data</td><td class="t hot">one answer for both databases</td></tr></tbody></table>`,
    note: `Definitions are cheap and safe to hand over, and they are used. What decides most tuning questions is the data, and for that the model has to be able to ask the database.` },
] });
