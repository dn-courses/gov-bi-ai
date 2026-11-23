// talk-query — lesson 1: the model is given the query and nothing else. One answer for both databases.
import { Q_STATE } from "./ask.js";
import { talk } from "./talk.js";

const has = { context: 1 };
const RARE = "<b>445</b> of 5,000,000 rows have state 2";
const MOST = "<b>4,750,003</b> of 5,000,000 rows have state 2";
const tally = "3 sessions of 3: this index";

export default talk({ label: "Asked with the query alone", steps: [
  { stop: "Ask", title: "A slow query, pasted into a chat", has, query: Q_STATE, talks: [{ db: "rare" }, { db: "most" }],
    note: `"This query is too slow. What should I change?" The same text runs on two databases. The model sees neither.` },
  { stop: "Answer", title: "One answer for both", has, query: Q_STATE,
    talks: [{ db: "rare", run: "rare_query_1", tally }, { db: "most", run: "most_query_1", tally }],
    note: `An index on the filtered column, carrying the columns the query returns: six sessions, six times this index. Each answer ends with the same condition: if <code>state = 2</code> matches a large share of the rows, the index will not help. The model knows what it cannot see.` },
  { stop: "The data", title: "What the text cannot say", has, query: Q_STATE,
    talks: [{ db: "rare", fact: RARE, run: "rare_query_1", tally }, { db: "most", fact: MOST, run: "most_query_1", tally }],
    note: `<code>state = 2</code> is 445 rows in one database and 95% of the table in the other. Nothing in the SQL tells them apart.` },
  { stop: "Measured", title: "Right once, wasted once", has, query: Q_STATE, decisive: true,
    talks: [{ db: "rare", fact: RARE, run: "rare_query_1", tally, verdict: "ok", measured: "<b>111 ms → 0.09 ms</b> · the index is the fix" },
            { db: "most", fact: MOST, run: "most_query_1", tally, verdict: "bad", measured: "<b>504 ms → 521 ms</b> · 237 MB built, never used by the plan" }],
    note: `The answer was not wrong about SQL. It was a guess about data, and it was right where the usual guess is right.` },
  { stop: "What to add", title: "Three things the chat window did not have", has,
    extra: `<table><thead><tr><th></th><th>What it is</th><th>Here</th></tr></thead><tbody>
      <tr><td class="t"><b>Context</b></td><td class="t">text handed to the model with the question</td><td class="t">the query, the table definitions, what else runs</td></tr>
      <tr><td class="t"><b>Tools</b></td><td class="t">calls the model makes itself, to get evidence</td><td class="t">a plan, a measured plan</td></tr>
      <tr><td class="t"><b>A person</b></td><td class="t">someone who knows the system and decides</td><td class="t">this room</td></tr></tbody></table>`,
    note: `The rest of the session adds them one at a time, and after each one asks the same question: did the answer change, and was it right?` },
] });
