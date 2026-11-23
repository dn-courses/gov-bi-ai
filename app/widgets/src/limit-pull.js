// limit-pull — why a Limit is cheap on a scan and not on a sort, one action at a time: over a Seq
// Scan it stops the scan after the rows it wants; over a Sort every row must be read first.
// Costs on the last step are the planner's own for the real products table.
import { DESK, css, drive, last, scaled } from "../lib/joinplay.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";
import { NODES, PRODUCTS, chips, node, price, tally } from "../lib/toyproducts.js";

const TAKE = 3, C = (node, key) => `.${node} .c[data-c="${key}"]`;
const counts = (read, out) => [["rows read from the file", read], ["rows out", out]];

function onScan() {
  const states = [{ read: 0, held: [], out: [], ask: true, counts: counts(0, 0), say: `Limit wants ${TAKE} rows, any ${TAKE}. It asks the Seq Scan for one.` }];
  for (let n = 1; n <= TAKE; n++) states.push({ read: n, row: n - 1, held: [], out: PRODUCTS.slice(0, n), on: ["scan", "limit"], counts: counts(n, n), fly: [[C("scan", n), C("limit", n)]],
    say: `The scan reads product ${n} and hands it up. Limit passes it on${n < TAKE ? " and asks for another" : ""}.` });
  states.push({ ...last(states), row: -1, on: ["limit"], fly: [], say: `Limit has its ${TAKE} rows and stops asking. The scan stops with it: ${PRODUCTS.length - TAKE} rows of the file were never read.` });
  return states;
}
function onSort() {
  const sorted = [...PRODUCTS].sort((a, b) => a[2] - b[2]), all = PRODUCTS.length;
  const states = [{ sort: true, read: 0, held: [], out: [], ask: true, counts: counts(0, 0), say: `Now the ${TAKE} cheapest are wanted. Limit asks the Sort, and the Sort asks the Seq Scan.` }];
  PRODUCTS.forEach(([id], i) => states.push({ sort: true, read: i + 1, row: i, held: PRODUCTS.slice(0, i + 1), out: [], on: ["scan", "sort"], counts: counts(i + 1, 0), fly: [[C("scan", id), C("sort", id)]],
    say: i === 0 ? `Product ${id} goes up to the Sort, which keeps it. The cheapest row could still be further on, so nothing can be handed to Limit yet.` : `Product ${id} goes up to the Sort and is kept too. Limit is still waiting.` }));
  states.push({ sort: true, read: all, held: sorted, out: [], on: ["sort"], counts: counts(all, 0), say: `The file has ended. Only now can the Sort put the rows in order of price.` });
  for (let n = 1; n <= TAKE; n++) states.push({ sort: true, read: all, held: sorted, out: sorted.slice(0, n), on: ["sort", "limit"], counts: counts(all, n), fly: [[C("sort", sorted[n - 1][0]), C("limit", sorted[n - 1][0])]],
    say: `Limit asks for a row and gets product ${sorted[n - 1][0]}, at ${price(sorted[n - 1][2])}.` });
  states.push({ ...last(states), on: ["limit"], fly: [], say: `The same ${TAKE} rows out, but all ${all} rows of the file were read and sorted before the first one could leave.` });
  return states;
}
const SCAN = onScan(), SORT = onSort();
const PHASES = [{ states: SCAN, tick: 1200 }, { states: SORT, tick: 800 }, { plain: true, states: [last(SORT)] }];

const steps = () => [
  { stop: "On a scan", title: "A Limit over a scan stops the scan", produces: "Limit → Seq Scan",
    note: `Press Play, or Step for one action at a time. <code>SELECT * FROM products LIMIT ${TAKE}</code> on ten toy rows.` },
  { stop: "On a sort", title: "A Limit over a sort has to wait for the sort", produces: "Limit → Sort → Seq Scan",
    note: `Press Play. <code>… ORDER BY price_cents LIMIT ${TAKE}</code>. A Sort hands nothing up until it has read its whole input.` },
  { stop: "The price", title: "The discount is for stopping early", decisive: true,
    note: `A Limit is cheap only when the nodes under it can hand rows up as they go. The cost before the first row can leave is the <b>startup</b> cost, the first of the two numbers.` },
];
const CSS = `.lw .lp:not(.sorting) .sort { display:none; }`;
const label = ([id, , cents]) => `product ${id} · ${price(cents)}`;
const scene = () => `${DESK}
  ${node("limit", "Limit", `takes ${TAKE} rows, then stops asking`)}
  ${node("sort", "Sort", "cheapest first · hands nothing up until it has every row")}
  ${node("scan", "Seq Scan", "reads the file row by row · product, price")}
  ${scaled("The planner's cost on the real products table: 10,000 rows, 10 wanted", `data-from="2"`, ["LIMIT 10", "ORDER BY price_cents LIMIT 10"], [
    ["10 toy rows, 3 wanted", "the animation", ["3 rows read"], ["10 rows read"]],
    ["Cost of the whole plan", "the scan alone costs 200.00", ["0.20", "a thousandth of the scan: 10 rows of 10,000", "pick"], ["416.12", "<b>about 2,000×</b> the cost", "slow"]],
    ["Cost before the first row", "the startup cost", ["0.00"], ["416.10", "all but 0.02 of the total", "slow"]],
  ])}`;

function draw(root, s, moving) {
  const taken = new Set(s.out.map(([id]) => id));
  root.classList.toggle("sorting", Boolean(s.sort));
  root.querySelectorAll(".node").forEach((el) => { const name = ["limit", "sort", "scan"].find((n) => el.classList.contains(n));
    el.classList.toggle("ask", Boolean(s.ask)); el.classList.toggle("on", (s.on ?? []).includes(name)); });
  chips(root, "scan", PRODUCTS.map((row, i) => [row[0], label(row), i === s.row ? "ok" : i < s.read ? "past" : ""]));
  chips(root, "sort", s.held.map((row) => [row[0], label(row), taken.has(row[0]) ? "past" : ""]), "nothing yet", moving);
  chips(root, "limit", s.out.map((row) => [row[0], label(row), "ok"]), "nothing yet");
  root.querySelector(".say").textContent = s.say;
  tally(root, s.counts);
}

export default { render: build({ stepper, key: "lp", label: "Limit on a scan, Limit on a sort", css: css("lp") + NODES("lp") + CSS, steps, scene, after: (root, at) => drive(root, at, PHASES, draw) }) };
