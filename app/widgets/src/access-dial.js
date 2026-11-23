// access-dial — three questions, and the way into the table that wins each: an Index Scan, a bitmap
// scan, a Seq Scan. Every question is measured through all three paths, so the winner is the
// clock's word. Captured data only for now: measured in the lab, not yet read live.
import { contest } from "../lib/contest.js";
import { stepper } from "../lib/stepper.js";

// For each path: [ms, what it had to do, pages visited].
const CASES = [
  { label: "the first rows, in order", ask: "ORDER BY customer_id LIMIT 10", rows: "10 rows wanted, out of 100,000 that match", win: "index",
    index: [0.02, "walks the index from its start and stops after ten rows", "13 pages"],
    bitmap: [239, "collects all 100,000 matches and sorts them before the first row comes out", "66,321 pages"],
    seq: [208, "reads the whole table, then sorts", "66,657 pages"] },
  { label: "50,000 scattered rows", ask: "WHERE customer_id BETWEEN 1 AND 1000", rows: "1% of the rows, spread over the whole file", win: "bitmap",
    index: [256, "one trip to the table per row, back and forth across the file", "50,046 pages"],
    bitmap: [102, "each page that holds a match is read once, in file order", "48,119 pages"],
    seq: [308, "reads every page and tests 5,000,000 rows to keep 1 in 100", "66,657 pages"] },
  { label: "nearly every row", ask: "WHERE customer_id BETWEEN 1 AND 100000", rows: "all 5,000,000 rows", win: "seq",
    index: [30087, "a trip to the table for every row: 75 times the table's pages", "5,004,350 pages"],
    bitmap: [958, "reads every page anyway, after building a bitmap of all of them", "71,007 pages"],
    seq: [775, "every page once, front to back, and nothing else", "66,657 pages"] },
];

const steps = () => [
  { stop: "First rows", title: "The first rows, in order: the Index Scan", produces: "Index Scan",
    note: `Ten rows are wanted, in the order the index already has. The Index Scan reads 13 pages and stops. The other two must find every match before they can say which ten come first.` },
  { stop: "Scattered", title: "Many scattered rows: the bitmap scan", produces: "Bitmap Heap Scan",
    note: `50,000 rows on pages all over the file. The Index Scan goes back and forth, one trip per row. The Seq Scan tests every row in the table. The bitmap scan reads only the pages that hold a match, each once.` },
  { stop: "Nearly all", title: "Most of the table: the Seq Scan", produces: "Seq Scan",
    note: `When nearly every page holds a match, any index is only extra work. Reading the file from front to back is the least there is to do.` },
  { stop: "So", title: "Three paths, each the best somewhere", decisive: true,
    note: `Few rows, or rows wanted in the index's order: Index Scan. Many rows scattered over the file: bitmap scan. Most of the table: Seq Scan. Press a question to compare again.` },
];

export default contest({ stepper, key: "ad", label: "Three ways into a table", contenders: [["index", "Index Scan"], ["bitmap", "Bitmap scan"], ["seq", "Seq Scan"]], cases: CASES, steps,
  heading: "The same question through each path: time, and pages visited", foot: "a full bar is the slowest of the three · the table has 66,657 pages" });
