// talk-measure — lesson 6: the same tool with `analyze=True`. Recorded sessions, one at a time.
import { Q_BIG, Q_JOIN, bars } from "./ask.js";
import { talk } from "./talk.js";

const has = { context: 2, tools: 2 };
const gap = /Seq Scan on shipments s .*|loops=799600/; // expected 1 row, got 266,533 per process; 799,600 lookups
const run = /Execution Time: .*|Sort Method: external merge  Disk: 364600kB|Seq Scan on events/;
const BIG = "events: <b>30,000,000</b> rows, 2.4 GB, no index";

// Measured in the lab: four clients of an application, alone and beside the model's measured plan.
export const LATENCY = bars("An application query, average response time (four clients)", [
  { label: "alone", value: 621, text: "621 ms" },
  { label: "beside one measured plan", value: 1104, text: "1,104 ms", tone: "hot" },
  { label: "beside three", value: 2059, text: "2,059 ms", tone: "hot" },
]) + bars("A lookup by primary key, average response time", [
  { label: "alone", value: 0.118, text: "0.12 ms" },
  { label: "beside one measured plan", value: 0.206, text: "0.21 ms", tone: "hot" },
  { label: "beside three", value: 0.564, text: "0.56 ms", tone: "hot" },
]);

export default talk({ label: "A tool that measures", steps: [
  { stop: "The tool", title: "One argument more: run it, and report what happened", has, fresh: "tools",
    extra: `<table><thead><tr><th>explain(query, analyze=True)</th><th></th></tr></thead><tbody>
      <tr><td class="t">returns</td><td class="t">the plan, with actual rows, time and pages on every step</td></tr>
      <tr><td class="t">runs the query</td><td class="t hot">yes, on the database it is pointed at</td></tr>
      <tr><td class="t">returns rows</td><td class="t ok">never</td></tr>
      <tr><td class="t">may write</td><td class="t ok">no: its owner may only read</td></tr></tbody></table>`,
    note: `The model now chooses, call by call, between an estimate that is free and a measurement that costs a run.` },
  { stop: "Measured", title: "Estimated against actual, in one call", has, query: Q_JOIN,
    talks: [{ db: "stale", fact: "shipments: analyzed at 1,000 rows, then loaded to 2,000,000", run: "stale_measure_2", upto: 2, focus: gap }],
    note: `On the join that fooled it, the model goes straight to a measured run. The scan of <code>shipments</code> expected 1 row and returned 799,600 (266,533 in each of three processes).` },
  { stop: "The answer", title: "No index this time", has, query: Q_JOIN, decisive: true,
    talks: [{ db: "stale", run: "stale_measure_2", focus: gap, tally: "9 sessions of 9: <code>analyze=True</code>, then <code>ANALYZE shipments</code>", verdict: "ok", measured: "<b>9 s → 1.5 s</b> · nothing built" }],
    note: `The index it proposed from the plan is gone. It names the cause the room met in Part 2, and the fix is one statement that builds nothing.` },
  { stop: "The twin", title: "Where nothing is broken, the sessions disagree", has, query: Q_JOIN, pick: true,
    talks: [{ db: "fresh", tab: "4 sessions of 6: change nothing", fact: "the twin with fresh statistics", run: "fresh_measure_1", focus: /Batches: 8|Execution Time: .*/, blocks: 2, tally: "4 sessions of 6", verdict: "ok", measured: "the plan was already the right one" },
            { db: "fresh", tab: "2 sessions of 6: raise work_mem", fact: "the twin with fresh statistics", run: "fresh_measure_4", focus: /Batches: 8|Execution Time: .*/, blocks: 2, tally: "2 sessions of 6", verdict: "bad", measured: "<b>1.0 s → 1.4 s</b> · slower, and set for the whole server" }],
    note: `Same database, same tool, same question. One session finds a detail in the measured plan and builds a fix on it. It reads well, and it measures slower.` },
  { stop: "A big table", title: "A plain question on a big table", has, query: Q_BIG,
    talks: [{ db: "big", fact: BIG, run: "big_measure_1", upto: 2, focus: run }],
    note: `"How many sessions?" Nothing clever in the query. The model's first call is a measured run, with no plan asked first: 8 sessions of 9. The run reads all thirty million rows and sorts them on disk.` },
  { stop: "Its answer", title: "The answer is useful", has, query: Q_BIG,
    talks: [{ db: "big", fact: BIG, run: "big_measure_1", focus: run, blocks: 2, tally: "9 sessions: an index in 6 · a rewrite of the query in 3", verdict: "ok", measured: "the index: <b>27 s → 5 s</b>, 375 MB · the rewrite: <b>27 s → 12 s</b>, nothing built" }],
    note: `Both answers work. Each one was bought with 25 to 31 seconds of the production database reading and sorting the whole table.` },
  { stop: "The price", title: "What that run did to everything else", has, decisive: true, extra: LATENCY,
    note: `While the model measured, the application beside it answered in almost twice the time. The model did not see that: its tool returned a plan, and the plan was fine.` },
] });
