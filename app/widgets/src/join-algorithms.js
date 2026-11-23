// join-algorithms — four joins, each forced through all three algorithms and timed, so that every
// algorithm is seen winning somewhere and losing somewhere. No algorithm is the good one.
// Captured data only for now: measured in the lab, not yet read live.
import { contest } from "../lib/contest.js";
import { stepper } from "../lib/stepper.js";

// For each algorithm: [ms, what it had to do].
const CASES = [
  { label: "a few rows, an index on the other side", ask: "orders ⋈ order_items · WHERE customer_id = 4242", rows: "50 orders out of 5,000,000, and an index to their lines", win: "nested",
    nested: [0.17, "50 index lookups into the order lines, and nothing else"],
    hash: [1660, "stores the 50 orders, then reads all 15,000,000 order lines to probe"],
    merge: [4600, "walks the index of all 15,000,000 order lines to meet 50 orders"] },
  { label: "a join that is not on “equal to”", ask: "orders ⋈ price bands · ON amount >= lo AND amount < hi", rows: "300,000 orders, each placed in one of three bands", win: "nested",
    nested: [290, "for each order, tries the three bands: the only algorithm that can test any condition"],
    hash: [null, "a hash table finds equal values only", "needs “equal to”"],
    merge: [null, "walking two sorted inputs in step finds equal values only", "needs “equal to”"] },
  { label: "every row of two tables, nothing in order", ask: "orders ⋈ customers · sum of amounts per country", rows: "5,000,000 orders, 100,000 customers; every row takes part", win: "hash",
    nested: [33000, "5,000,000 index lookups, one per order; with no index, about 7 hours"],
    hash: [2400, "stores 100,000 customers in memory, then reads the orders once"],
    merge: [36000, "needs the orders in customer order first: fetches all 5,000,000 through the index"] },
  { label: "two large tables, both already in order", ask: "order_items ⋈ order_items · USING (order_id, line_no)", rows: "15,000,000 rows on each side, each read through an index on the join columns", win: "merge",
    nested: [22500, "15,000,000 index lookups, one per row"],
    hash: [11700, "stores 15,000,000 rows: far too many for memory, so 128 batches on disk"],
    merge: [7800, "one walk down each index: nothing stored, nothing sorted"] },
];

const steps = () => [
  { stop: "Few rows", title: "A few rows and an index on the other side: the nested loop", produces: "Nested Loop",
    note: `The classic case. Fifty orders need their lines; fifty lookups are over before a hash join has read its first input, or a merge join has walked far down the index.` },
  { stop: "Not equal", title: "A condition that is not “equal to”: only the nested loop", produces: "Nested Loop",
    note: `Hashing and merging both rest on equal values meeting. For a range, an inequality or any other condition, the nested loop is the only algorithm there is, however many rows are involved.` },
  { stop: "Everything", title: "Every row of both tables, in no order: the hash join", produces: "Hash Join",
    note: `The classic case. When all the rows take part, lookups one at a time are the slow way, and sorting is wasted work. The smaller table fits in memory, and each table is read once.` },
  { stop: "Both in order", title: "Two large inputs, both already in order: the merge join", produces: "Merge Join",
    note: `The classic case. Too many rows for a hash table in memory, too many for a lookup each, and both sides arrive sorted from an index. The planner chooses the merge join here by itself.` },
  { stop: "So", title: "No algorithm is the good one", decisive: true,
    note: `The planner picks by the number of rows it expects from each side, and by the indexes there are. So a wrong estimate picks the wrong algorithm. Press a question to compare again.` },
];

export default contest({ stepper, key: "ja", label: "Which join wins", contenders: [["nested", "Nested Loop"], ["hash", "Hash Join"], ["merge", "Merge Join"]], cases: CASES, steps,
  heading: "The same join through each algorithm: what it had to do, and the time", foot: "a full bar is the slowest of the three · measured on the shop database" });
