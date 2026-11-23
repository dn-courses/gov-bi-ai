// task-missing-index — tuning task 1: a selective lookup that reads the whole table.
// Fixed, measured numbers (the fix creates an index, which a widget must not do on its own).
import { stepper } from "../lib/stepper.js";
import { task } from "../lib/task.js";

export default { render: task({ stepper, label: "Task 1: the missing index",
  title: "One hour of orders takes a fifth of a second",
  query: `SELECT count(*), sum(amount)
FROM orders
WHERE created_at >= '2025-06-01 10:00+00'
  AND created_at <  '2025-06-01 11:00+00';`,
  facts: ["Seq Scan on orders", "<b>Rows Removed by Filter: 4,999,700</b>", "66,657 pages read for 300 rows"],
  strip: { at: 0.745, before: "the table, front to back: every piece is read, and the 300 rows asked for are in the one marked",
    after: "with the index, only the marked piece is read: 9 pages instead of 66,657" },
  before: { ms: 200, pages: 66657 },
  tempting: { name: "more workers", how: "max_parallel_workers_per_gather = 4", ms: 170, pages: 66657,
    verdict: "Hardly faster on three CPUs, and five processes now read the same 66,657 pages to throw the same rows away." },
  fix: { name: "an index on created_at", how: "CREATE INDEX … (created_at)", ms: 0.07, pages: 9,
    verdict: "9 pages. The index is 107 MB and every insert now maintains it: worth it for a query that runs often." },
  notes: [
    `300 orders out of 5,000,000, and it is slow every time it runs.`,
    `The plan reads every page and throws almost every row away. A filter that discards 99.99% of what was read is the mark of a <b>missing index</b>.`,
    `More hands make it a little quicker, and the plan looks busy. But nothing about the work changed: the whole table is still read, now by several processes at once.`,
    `The work itself is gone: the index leads straight to the hour asked for.`,
    `The symptom was time. The plan showed where it went. The hypothesis was "it reads rows it does not need". One change, measured again.`,
  ] }) };
