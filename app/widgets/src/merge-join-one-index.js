// merge-join-one-index — a merge join when one input has an index on the join column: that side
// arrives in order, the other is sorted.
import { mergeWidget } from "../lib/mergeplay.js";
import { stepper } from "../lib/stepper.js";

export default mergeWidget({ stepper, key: "m1", label: "Merge join, one input sorted", how: { left: "sort", right: "index" }, mine: 1, produces: "Merge Join over a Sort and an Index Scan",
  intro: `Customers have an index on the customer number, their primary key. Orders have none.`,
  order: `Orders are sorted. Customers are not: their index, drawn under the table, already holds them in order.`,
  scale: `One sort is saved, and less is written to disk. The first row still has to wait for the sort that remains, so the join is not much faster than with no index at all.`,
  costTitle: "One sort, then one walk",
  cost: `An index on one side removes one of the two sorts. The join still cannot start before the other sort ends. Half the indexes is far less than half the benefit.`,
  facts: [
    ["Sorting 15,000,000 order items", "Sort Method: external merge, 264 MB written to disk", "about 3 s", "slow"],
    ["5,000,000 orders, through their primary key", "arrive in order; no sort", "no wait", "pick"],
    ["The first 100 joined rows", "only after the sort of the order items", "after 3.7 s", "slow"],
  ] });
