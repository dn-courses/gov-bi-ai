// task-ignored-index — tuning task 2: an index exists, but the query does not ask what was indexed.
// Fixed, measured numbers (the fix creates an index, which a widget must not do on its own).
import { stepper } from "../lib/stepper.js";
import { task } from "../lib/task.js";

export default { render: task({ stepper, label: "Task 2: the ignored index",
  title: "There is an index on email, and the lookup is still slow",
  query: `SELECT customer_id, email
FROM customers
WHERE lower(email) = 'user77777@example.com';`,
  facts: ["Seq Scan on customers", "Filter: (<b>lower(email)</b> = …)", "<b>Rows Removed by Filter: 99,999</b>", "customers_email_idx is not used"],
  strip: { at: 0.777, before: "the customers table, front to back: every piece is read to find one customer, in the one marked",
    after: "with an index on what the query asks, only the marked piece is read: 4 pages instead of 824" },
  before: { ms: 27, pages: 824 },
  tempting: { name: "rebuild the index", how: "REINDEX, ANALYZE", ms: 27, pages: 824,
    verdict: "No change. The index was never broken." },
  fix: { name: "index what the query asks", how: "CREATE INDEX … (lower(email))", ms: 0.02, pages: 4,
    verdict: "4 pages. The index now holds the lowercased value, which is what the query looks up." },
  notes: [
    `One customer out of 100,000, by email. Someone already indexed <code>email</code>, and the query is slow anyway.`,
    `The index holds <code>email</code> as it is stored: <code>User77777@Example.com</code>. The query asks for <code>lower(email)</code>, a different value that the index does not contain.`,
    `"The index must be broken or stale." Rebuilding it and refreshing statistics changes nothing, because the index was fine.`,
    `An index serves the expression it was built on. Index <code>lower(email)</code>, or store the email lowercased and drop the function.`,
    `The plan named the cause in one line: the <code>Filter</code> shows the expression the query really uses. Read it before reaching for a fix.`,
  ] }) };
