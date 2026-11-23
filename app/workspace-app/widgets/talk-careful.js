// talk-careful — lesson 7: the tool as it ships. Statistics under every plan, a description that
// says what a run costs, and a time limit.
import { Q_BIG, Q_JOIN } from "./ask.js";
import { talk } from "./talk.js";

const has = { context: 2, tools: 3 };
const stats = /shipments: .*|Seq Scan on shipments s .*?rows=\d+/;
const BIG = "events: <b>30,000,000</b> rows, 2.4 GB, no index";

export default talk({ label: "The careful tool", steps: [
  { stop: "Three changes", title: "The same tool, built by someone who knows what a run costs", has, fresh: "tools",
    extra: `<table><thead><tr><th>Added</th><th>What it does</th><th>What it costs the database</th></tr></thead><tbody>
      <tr><td class="t"><b>Statistics under every plan</b></td><td class="t">per table: rows when its statistics were taken, rows now, rows changed since</td><td class="t ok">nothing is scanned: the catalog already counts them</td></tr>
      <tr><td class="t"><b>A description that warns</b></td><td class="t">says a run happens on the live database, and to read the plan first</td><td class="t ok">nothing</td></tr>
      <tr><td class="t"><b>A time limit</b></td><td class="t">a run is cancelled after 20 seconds; the plan comes back with the cancellation</td><td class="t">at most 20 seconds of load</td></tr></tbody></table>`,
    note: `None of the three is about models. They are what a careful person does before running anything on production.` },
  { stop: "One call", title: "A plan, and under it what the estimates stand on", has, query: Q_JOIN,
    talks: [{ db: "stale", fact: "shipments: analyzed at 1,000 rows, then loaded to 2,000,000", run: "stale_careful_1", upto: 2, focus: stats }],
    note: `The model asks for a plan and does not ask for a run. The last line says what the plan could not: the statistics describe a table of 1,000 rows, and it has two million.` },
  { stop: "No run", title: "The same answer, and nothing was run", has, query: Q_JOIN, decisive: true, pick: true,
    talks: [{ db: "stale", tab: "stale: statistics from before the load", run: "stale_careful_1", focus: stats, tally: "9 sessions of 9: one plan call, then <code>ANALYZE shipments</code>", verdict: "ok", measured: "<b>9 s → 1.5 s</b> · no run on production · the session took 6 s, not 16" },
            { db: "fresh", tab: "fresh: statistics from after the load", fact: "the twin with fresh statistics", run: "fresh_careful_1", focus: /shipments: .*/, blocks: 2, tally: "3 sessions of 3: change nothing", verdict: "ok", measured: "the plan was already the right one" }],
    note: `With measuring, the answer cost a 9-second run of the slow query. Here it cost reading three counters. On the healthy twin all sessions now agree.` },
  { stop: "Description", title: "The description is part of the tool", has, query: Q_JOIN, decisive: true, pick: true,
    talks: [{ db: "stale", tab: `described as "Explain a query."`, fact: `the tool described as: <b>"Explain a query."</b>`, run: "stale_bare_1", silent: "the model calls nothing", tally: "9 sessions of 9: no call, an index", verdict: "bad", measured: "<b>9 s → 4.4 s</b> with 50 MB · the cause not found" },
            { db: "stale", tab: "described in two sentences", fact: "the same tool, described in two sentences", run: "stale_measure_2", focus: /Seq Scan on shipments s .*|loops=799600/, blocks: 1, tally: "9 sessions of 9: called, then <code>ANALYZE shipments</code>", verdict: "ok", measured: "<b>9 s → 1.5 s</b> · nothing built" }],
    note: `Same code, same database, same question. Three words of description, and the model never calls the tool. It says so in every answer: "I haven't looked at the query plan."` },
  { stop: "The big table", title: "Told what a run costs, it reads the plan", has, query: Q_BIG,
    talks: [{ db: "big", fact: BIG, run: "big_careful_2", focus: /events: .*|Sort Key: session_id/, blocks: 2, tally: "9 sessions of 9: the plan only · a rewrite in 8, an index in 1", verdict: "ok", measured: "<b>27 s → 12 s</b>, nothing built · nothing run on production" }],
    note: `Without the warning, 8 sessions of 9 started with a 25-second run. With it, none did, and the answers moved to the fix that builds nothing.` },
  { stop: "The limit", title: "A bound for the run it asks for anyway", has, query: Q_BIG,
    talks: [{ db: "big", fact: "the warning removed, the limit kept", run: "big_guarded_1", focus: /CANCELLED: .*/, blocks: 2, tally: "9 sessions of 9: cancelled after 20 s, answered from the plan", verdict: "mixed", measured: "20 s of load, however long the statement would have run" }],
    note: `The limit is set in the database session, so it holds whatever the model or its client does. A client that is killed does not stop its statement: measured here, the statement ran to its end.` },
  { stop: "The tool", title: "What care bought", has, decisive: true,
    extra: `<table><thead><tr><th></th><th>measuring allowed</th><th>the careful tool</th></tr></thead><tbody>
      <tr><td class="t">stale join: found the stale statistics</td><td class="ok">9 of 9</td><td class="ok">9 of 9</td></tr>
      <tr><td class="t">stale join: slow query run on production to find it</td><td class="hot">9 of 9</td><td class="ok">0 of 9</td></tr>
      <tr><td class="t">healthy join: changed nothing</td><td>4 of 6</td><td class="ok">3 of 3</td></tr>
      <tr><td class="t">big table: started with a full run</td><td class="hot">8 of 9</td><td class="ok">0 of 9</td></tr></tbody></table>`,
    note: `The whole tool is on this page: a hundred lines of Python and one database function. It is yours to take.` },
] });
