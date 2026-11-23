// merge-join-two-indexes — a merge join when both inputs have an index on the join column: no sort
// at all, and the first joined row comes out at once.
import { mergeWidget } from "../lib/mergeplay.js";
import { stepper } from "../lib/stepper.js";

export default mergeWidget({ stepper, key: "m2", label: "Merge join, no sort", how: { left: "index", right: "index" }, mine: 2, produces: "Merge Join over two index scans",
  intro: `Both tables have an index on the customer number.`,
  order: `Nothing is sorted and nothing moves. Each table's index, drawn under it, already holds the rows in order.`,
  scale: `With both indexes nothing is sorted and nothing is written. The first rows come out a hundred thousand times sooner, and the whole join beats the hash join.`,
  costTitle: "No sort: only the walk",
  cost: `This is the merge join at its best: no memory for a hash table, no sort, and rows from the first comparison on. It needs an index on the join column on both sides.`,
  facts: [
    ["Sorting", "both inputs arrive in order", "none", "pick"],
    ["The first 100 joined rows", "from the first comparisons; 3.7 s with one index, 6.2 s with none", "after 0.06 ms", "pick"],
    ["The whole join, counted", "both inputs read from their indexes alone; a hash join takes about 7 s, and the planner still chooses it", "5.3 s", "pick"],
    ["Building the missing index", "on order_items (order_id): 15,000,000 entries, once", "3.4 s", ""],
  ] });
