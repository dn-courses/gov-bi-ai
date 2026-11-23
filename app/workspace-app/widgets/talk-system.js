// talk-system — lesson 8: what else runs on the table. The model is shown the whole workload and
// still proposes the index. Answers recorded with the evidence pasted in; numbers measured in the lab.
import { Q_CUSTOMER } from "./ask.js";
import { talk } from "./talk.js";

const QUIET = "this query: <b>515</b> runs · rows inserted: <b>34,500</b>";
const BUSY = "this query: <b>a handful</b> of runs · rows inserted: <b>4,279,000</b> · 5 indexes, none ever used";
const all = { context: 3, tools: 3 };

export default talk({ label: "Asked with what else runs", steps: [
  { stop: "Two lives", title: "One query, two tables with different lives", has: all, fresh: "context", query: Q_CUSTOMER,
    talks: [{ db: "quiet", fact: QUIET }, { db: "busy", fact: BUSY }],
    note: `The last piece of context: the table's activity and the use of every index, pasted in beside the measured plan. In one database this query is the workload. In the other it ran a few times, between four million inserts.` },
  { stop: "The answer", title: "An index, both times", has: all, query: Q_CUSTOMER,
    talks: [{ db: "quiet", fact: QUIET, run: "quiet_workload_1", tally: "3 sessions of 3: this index" }, { db: "busy", fact: BUSY, run: "busy_workload_1", tally: "3 sessions of 3: this index" }],
    note: `It read the evidence: for the busy table it says the table is insert-only. Then it weighs the trade itself: "the write cost is small compared with the 226 ms scan it replaces."` },
  { stop: "Measured", title: "What the index charges", has: all, query: Q_CUSTOMER, decisive: true,
    talks: [{ db: "quiet", fact: QUIET, run: "quiet_workload_1", blocks: 1, tally: "3 sessions of 3", verdict: "ok", measured: "the query <b>173 ms → 0.4 ms</b> · the workload <b>7 → 5,700</b> queries a second · inserts unchanged" },
            { db: "busy", fact: BUSY, run: "busy_workload_1", blocks: 1, tally: "3 sessions of 3", verdict: "bad", measured: "one query <b>213 ms → 0.9 ms</b> · every insert pays: <b>1,555 → 1,232</b> batches a second, 85 MB more" }],
    note: `Every write maintains every index. The same statement is the fix in one database, and in the other a fifth of the insert throughput, paid for a query that almost never runs.` },
  { stop: "Busy hour", title: "Right when quiet, useless when busy", has: all,
    extra: `<table><thead><tr><th>A report over 15,000,000 rows</th><th>alone</th><th>six at once</th></tr></thead><tbody>
      <tr><td class="t">no parallel workers</td><td>1,561 ms</td><td>4,704 ms</td></tr>
      <tr><td class="t">4 workers per query</td><td class="ok">806 ms</td><td class="hot">5,198 ms</td></tr>
      <tr><td class="t">its plan, taken at the busy hour</td><td></td><td class="hot">Workers Planned: 4 · Workers Launched: 0</td></tr></tbody></table>`,
    note: `Workers come from one shared pool, and the machine has three processors. Tested alone, more workers halve the time. With six reports running, there are none left to launch.` },
  { stop: "A person", title: "What someone who knows the system does with the same evidence", has: { ...all, person: 1 }, fresh: "person",
    extra: `<table><thead><tr><th></th><th>The model</th><th>A person who knows the system</th></tr></thead><tbody>
      <tr><td class="t">a query that almost never runs, on a table taking four million inserts</td><td class="t hot">an index: "the write cost is small"</td><td class="t ok">no index: a slow query now and then is cheaper than a fifth of every insert</td></tr>
      <tr><td class="t">the same query, run all day on a quiet table</td><td class="t ok">an index</td><td class="t ok">the same index</td></tr>
      <tr><td class="t">a report that is slow at the busy hour</td><td class="t">more workers: 806 ms alone</td><td class="t ok">knows six run at once, and that workers come from one pool</td></tr></tbody></table>`,
    note: `The evidence was the same for both. The person adds what no context holds completely: what this system is for, and which cost it can afford.` },
  { stop: "The trade", title: "The evidence can be handed over. The trade cannot.", has: { ...all, person: 1 }, fresh: "person", decisive: true,
    extra: `<table><thead><tr><th></th><th>What it did in this session</th></tr></thead><tbody>
      <tr><td class="t"><b>Context</b></td><td class="t">cheap and safe to hand over; it fixed the lookup, 8 sessions of 9, and could not tell the twins apart</td></tr>
      <tr><td class="t"><b>Tools</b></td><td class="t ok">a plan stopped the wasted index, 3 sessions of 3 · a measured plan found the stale statistics, 9 of 9</td></tr>
      <tr><td class="t"><b>Tools, built with care</b></td><td class="t ok">the same answer with nothing run on production, 9 of 9 · no row left the database</td></tr>
      <tr><td class="t"><b>A person</b></td><td class="t hot">built the tool and wrote its description · one query against every insert · quiet hour against busy hour</td></tr></tbody></table>`,
    note: `Shown the whole workload, the model still built the index. Deciding what the system is for is a judgement, and it needs someone who knows this system and how a database works.` },
] });
