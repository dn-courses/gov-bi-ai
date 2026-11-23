// task-cpu-aggregate — tuning task 4: a large aggregate that is slow with nothing to wait for.
// Fixed, measured numbers (the tempting fix builds an index, which a widget must not do on its own).
import { stepper } from "../lib/stepper.js";
import { task } from "../lib/task.js";

export default { render: task({ stepper, label: "Task 4: the CPU-bound aggregate",
  title: "Units sold per product takes three seconds",
  query: `SELECT product_id, sum(quantity)
FROM order_items
GROUP BY product_id;`,
  facts: ["Seq Scan: 15,000,000 rows, none thrown away", "<b>I/O Timings: 28 ms</b> of 2,570", "nothing to skip: every row is part of the answer"],
  before: { ms: 2940, pages: 95542 },
  tempting: { name: "an index on product_id", how: "CREATE INDEX … (product_id)", ms: 2900, pages: 95542,
    verdict: "5.5 s to build, 105 MB, and the plan does not touch it. An index helps to skip rows; this query needs them all." },
  fix: { name: "share the work", how: "max_parallel_workers_per_gather = 2", ms: 970, pages: 95542,
    verdict: "The same pages and the same rows, handled by three processes. It is paid for with all three of the server's CPUs for a second." },
  notes: [
    `A report over every order line, and it is slow every time it runs.`,
    `No filter throws rows away and almost no time is spent reading. The time goes on handling 15,000,000 rows: the query is <b>CPU-bound</b>.`,
    `The reflex from the last tasks. But there is nothing for an index to skip, so the planner rightly ignores it — and every insert now pays for it.`,
    `When all the rows are needed and the work is on the CPU, the remaining lever is more hands.`,
    `The symptom was time. The plan showed no waiting and no wasted rows. The hypothesis was "it is CPU work". One change, measured again.`,
  ] }) };
