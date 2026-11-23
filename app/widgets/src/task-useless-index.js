// task-useless-index — tuning task 5: a query that matches most of the table is right to scan it.
// Fixed, measured numbers (the tempting fix builds an index, which a widget must not do on its own).
import { stepper } from "../lib/stepper.js";
import { task } from "../lib/task.js";

export default { render: task({ stepper, label: "Task 5: the index that buys nothing",
  title: "Totals for delivered orders take most of a second",
  query: `SELECT count(*), sum(amount)
FROM orders
WHERE status = 'delivered';`,
  facts: ["Seq Scan on orders, filtered on status", "Rows Removed by Filter: <b>249,997 of 5,000,000</b>", "95% of the table is the answer"],
  before: { ms: 930, pages: 66657 },
  tempting: { name: "an index on status, forced", how: "CREATE INDEX … (status) · enable_seqscan = off", ms: 1015, pages: 70719,
    verdict: "Left alone, the planner ignores the new 34 MB index: about 900 ms, same plan. Forced through it, the query reads more pages and takes longer." },
  fix: { name: "nothing", stop: "Leave it", title: "The fix: leave the plan alone", how: "the Seq Scan was right", ms: 930, pages: 66657,
    verdict: "Scanning is the cheapest way to read 95% of a table. To go faster, ask for fewer rows, keep the total precomputed, or share the work." },
  notes: [
    `A filter in the WHERE clause, a Seq Scan in the plan. It looks like task 1.`,
    `It is not. In task 1 the filter threw away 99.99% of the rows. Here it throws away <b>5%</b>: nearly everything that was read was needed.`,
    `An index is a way to skip rows. With almost nothing to skip, it only adds a detour through the index before reading the same table.`,
    `Not every slow query has a tuning fix. Knowing when to stop is part of the job — and only the measurement shows it.`,
    `Symptom, plan, hypothesis, one change, measure again. Here the measurement said no, and the change is taken back.`,
  ] }) };
