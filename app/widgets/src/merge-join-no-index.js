// merge-join-no-index — a merge join when neither input has a usable index: both are sorted first.
import { mergeWidget } from "../lib/mergeplay.js";
import { stepper } from "../lib/stepper.js";

export default mergeWidget({ stepper, key: "m0", label: "Merge join, both inputs sorted", how: { left: "sort", right: "sort" }, mine: 0, produces: "Merge Join over two Sort nodes",
  intro: `Neither table has an index on the customer number.`,
  order: `Both inputs are sorted. A sort reads its whole input before it hands over the first row.`,
  scale: `Sorting eleven rows costs nothing. Sorting twenty million means reading them all, writing them to disk in sorted runs and reading them back, before the first comparison is made.`,
  costTitle: "Two sorts, then one walk",
  cost: `The walk is cheap. The sorts are the price, and a sort that does not fit in <code>work_mem</code> goes to disk. Nothing comes out of the join until both sorts are finished, even when only the first rows are wanted.`,
  facts: [
    ["Sorting 15,000,000 order items", "Sort Method: external merge, 264 MB written to disk", "about 4 s", "slow"],
    ["Sorting 5,000,000 orders", "Sort Method: external merge, 117 MB written to disk", "about 1.5 s", "slow"],
    ["The first 100 joined rows", "only after both sorts have finished", "after 6.2 s", "slow"],
  ] });
