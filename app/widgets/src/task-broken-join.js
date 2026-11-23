// task-broken-join — tuning task 3: a join over a table that was just loaded and has no statistics.
// Fixed, measured numbers (the task loads a table, which a widget must not do on its own).
import { stepper } from "../lib/stepper.js";
import { task } from "../lib/task.js";

export default { render: task({ stepper, label: "Task 3: the load that broke the join",
  title: "A report over a freshly loaded segment takes over ten seconds",
  query: `SELECT count(*), sum(o.amount)
FROM segment s
JOIN orders o USING (customer_id)
WHERE s.tier = 'gold' AND s.channel = 'email';`,
  facts: ["Seq Scan on segment: <b>rows=1</b> expected, 25,000 came out", "Nested Loop: the inner side ran <b>loops=25000</b>", "1,325,192 pages read from a table of 66,657"],
  before: { ms: 13000, pages: 1325192 },
  tempting: { name: "switch nested loops off", how: "SET enable_nestloop = off", ms: 1500, pages: 66840,
    verdict: "Fast here. But the plan still expects 1 row, and the whole session lost its nested loops: a 300-order lookup went from under 1 ms to 15 ms." },
  fix: { name: "ANALYZE the loaded table", how: "ANALYZE segment", ms: 1140, pages: 66840,
    verdict: "7 ms of ANALYZE. The plan now expects 25,000 customers and chooses the hash join by itself — for this query and the next." },
  notes: [
    `25,000 customers were loaded into a new table a moment ago, and the first report on them crawls.`,
    `A nested loop over <b>far more rows than estimated</b>: expected once, run 25,000 times. The table has no statistics, so two filters on it were guessed down to a single row.`,
    `Forbidding the nested loop does give a hash join. It also hides the cause, and it punishes every query for which a nested loop is right.`,
    `The cause was a missing fact, not a bad algorithm. With statistics the same planner makes the right choice.`,
    `The symptom was time. The plan showed a loop count far above the estimate. The hypothesis was "it does not know the table". One change, measured again.`,
  ] }) };
