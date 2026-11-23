// talk-plan — lesson 5: the tool as `explain(query)`. The model calls it itself; recorded sessions.
import { Q_JOIN, Q_STATE } from "./ask.js";
import { talk } from "./talk.js";

const has = { context: 2, tools: 1 };
const rows = /rows=(167|4740833)\b/; // the top node's estimate: what the two plans differ in
const ship = /Seq Scan on shipments s .*?rows=\d+/; // the scan of shipments and its estimate

export default talk({ label: "A tool that plans", steps: [
  { stop: "The tool", title: "One function the model may call", has, fresh: "tools",
    extra: `<table><thead><tr><th>explain(query)</th><th></th></tr></thead><tbody>
      <tr><td class="t">returns</td><td class="t">the plan PostgreSQL chooses, with its estimates</td></tr>
      <tr><td class="t">runs the query</td><td class="t ok">no</td></tr>
      <tr><td class="t">returns rows</td><td class="t ok">never</td></tr>
      <tr><td class="t">connects as</td><td class="t ok">a user with no right on any table</td></tr></tbody></table>`,
    note: `The model is given the query and the definitions as before, and this tool. Nobody tells it to use the tool.` },
  { stop: "It calls", title: "The first thing it does is ask for the plan", has, query: Q_STATE,
    talks: [{ db: "rare", run: "rare_plan_1", upto: 2, focus: rows }, { db: "most", run: "most_plan_1", upto: 2, focus: rows }],
    note: `Same call, two databases. The estimated rows are the first thing in the session that differs between them.` },
  { stop: "The split", title: "Now the answers differ, and both are right", has, query: Q_STATE, decisive: true,
    talks: [{ db: "rare", run: "rare_plan_1", focus: rows, blocks: 2, tally: "3 sessions of 3: this index", verdict: "ok", measured: "<b>111 ms → 0.09 ms</b>" },
            { db: "most", run: "most_plan_1", focus: rows, blocks: 2, tally: "3 sessions of 3: change nothing", verdict: "ok", measured: "nothing built · <b>237 MB</b> not wasted" }],
    note: `It reasons the way the access-path dial does: 167 rows, an index; 4.7 million rows, a scan. One tool call replaced the guess.` },
  { stop: "A join", title: "Another pair: one join, two loads", has, query: Q_JOIN, pick: true,
    talks: [{ db: "stale", tab: "stale: statistics from before the load", fact: "shipments: analyzed at 1,000 rows, then loaded to 2,000,000", run: "stale_plan_1", upto: 2, focus: ship },
            { db: "fresh", tab: "fresh: statistics from after the load", fact: "the same shipments, analyzed after the load", run: "fresh_plan_1", upto: 2, focus: ship }],
    note: `Part 2's stale statistics. In <code>stale</code> the plan expects one row from <code>shipments</code>. The model sees the plan and not the note above it.` },
  { stop: "Fooled", title: "A plan built on a wrong estimate looks fine", has, query: Q_JOIN, decisive: true, pick: true,
    talks: [{ db: "stale", tab: "stale: statistics from before the load", run: "stale_plan_1", focus: ship, tally: "3 sessions of 3: an index on <code>shipments</code>", verdict: "mixed", measured: "<b>9 s → 4.4 s</b> with 50 MB, and the plan still expects 1 row · refreshing the statistics: <b>1.5 s</b>, nothing built" },
            { db: "fresh", tab: "fresh: statistics from after the load", run: "fresh_plan_1", focus: ship, blocks: 2, tally: "3 sessions: this index in 2 · an index on <code>orders</code> in 1", verdict: "bad", measured: "<b>1.0 s → 1.0 s</b> with 50 MB · the plan was already the right one" }],
    note: `A plan does not say its estimates are wrong. The model trusts <code>rows=1</code> and treats a symptom, and it writes the doubt down: "This assumes the estimate is right." With this tool it cannot find out.` },
] });
