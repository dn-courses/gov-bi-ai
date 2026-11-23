// nested-loop-index — a nested loop with an index on the inner side: each order walks down the
// index to its one customer. One action at a time; measured on shop at the end.
import { CUSTOMERS, L, LAST, ORDERS, R, css, drive, joined, last, measured, scaled, stage } from "../lib/joinplay.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

// The index on customers(customer_id): a small tree whose lit path leads to one customer.
const LEAF_X = [22, 64, 106, 152, 196], INNER = [[64, 0, 2], [174, 3, 4]];
function tree(found) {
  const inner = INNER.findIndex(([, a, b]) => found >= a && found <= b);
  return `<svg viewBox="0 0 220 112">
    ${INNER.map(([x], i) => `<path class="edge ${i === inner ? "on" : ""}" d="M110 22 L${x} 46"/>`).join("")}
    ${INNER.map(([x, a, b]) => LEAF_X.slice(a, b + 1).map((lx, j) => `<path class="edge ${a + j === found ? "on" : ""}" d="M${x} 62 L${lx} 84"/>`).join("")).join("")}
    <rect class="box ${found >= 0 ? "hit" : ""}" x="88" y="6" width="44" height="18" rx="9"/>
    ${INNER.map(([x], i) => `<rect class="box ${i === inner ? "hit" : ""}" x="${x - 22}" y="46" width="44" height="18" rx="9"/>`).join("")}
    ${LEAF_X.map((x, i) => `<rect class="box ${i === found ? "hit" : ""}" x="${x - 17}" y="84" width="34" height="22" rx="5"/><text class="mono ${i === found ? "acc" : "dim"}" x="${x}" y="96">${CUSTOMERS[i][0]}</text>`).join("")}</svg>`;
}
function lookups(from, rows) {
  let { out, doneL } = from;
  const base = () => ({ out, doneL, counts: [["index lookups", doneL.size], ["customers read", out.length], ["joined rows", out.length]] });
  const states = [];
  for (const l of rows) {
    const [order, wanted] = ORDERS[l], r = CUSTOMERS.findIndex(([id]) => id === wanted);
    states.push({ ...base(), L: l, mid: tree(-1) + `<p>customer ${wanted} ?</p>`, say: `Take order ${order}. It belongs to customer ${wanted}.` });
    states.push({ ...base(), L: l, mid: tree(r) + `<p>down the index to customer ${wanted}</p>`, say: `The index is walked from its root down to customer ${wanted}. No customer row has been read yet.` });
    out = [...out, joined(l, r)];
    doneL = new Set([...doneL, l]);
    states.push({ ...base(), L: l, R: r, tone: "hit", fresh: true, fly: [[L(l), LAST], [R(r), LAST]], mid: tree(r) + `<p>one short walk, one customer</p>`,
      say: `The index entry points at ${CUSTOMERS[r][1]}'s row, the only customer read. Order ${order} leaves with its customer.` });
  }
  return states;
}

const BLANK = { out: [], doneL: new Set(), counts: [["index lookups", 0], ["customers read", 0], ["joined rows", 0]], mid: tree(-1) + `<p>index on customers (customer_id)</p>`,
  say: `The same loop over the orders. The inner side now has an index on the customer number.` };
const FIRST = lookups(BLANK, [0]), REST = lookups(last(FIRST), ORDERS.map((_, i) => i).slice(1));
const PHASES = [{ states: [BLANK] }, { states: [BLANK, ...FIRST], tick: 1300 }, { states: [last(FIRST), ...REST], tick: 900 }, { plain: true, states: [last(REST)] }, { plain: true, states: [last(REST)] }];

const steps = () => [
  { stop: "Two inputs", title: "The same loop, with an index on the inner side", produces: "Nested Loop",
    note: `Nothing changes on the outer side. What changes is how one order finds its customer.` },
  { stop: "One order", title: "The first order looks its customer up",
    note: `Press Play, or Step for one action at a time. The search is a walk down the index, not a read of the table.` },
  { stop: "Every order", title: "Every order makes one lookup",
    note: `Six orders, six lookups, six customers read. Customer 4 has no order and is never touched.` },
  { stop: "At scale", title: "What the index is worth on real tables",
    note: `On five customers the index saves 13 comparisons, which looks like nothing. A lookup costs the same few steps however large the table is, while a read from the top grows with it.` },
  { stop: "What it costs", title: "Outer rows × one index lookup", decisive: true,
    note: `With few outer rows nothing beats it. The lookups still add up: each one is a few page visits, so millions of outer rows mean millions of walks. In the plan, read <code>loops=</code> on the inner node.` },
];
const scene = () => stage({ left: "outer side: the loop runs over it", right: "inner side: index on customer_id", mid: "Index on customers",
  below: scaled("The same loop, without the index and with it", `data-on="3"`, ["no index", "with the index"], [
    ["6 orders × 5 customers", "the animation", ["19 comparisons"], ["6 lookups", "<b>3×</b> less work"]],
    ["300 orders × 100,000 customers", "measured", ["1.6 s", "14,942,850 comparisons", "slow"], ["0.4 ms", "300 lookups · <b>4,000×</b> faster", "pick"]],
    ["5,000,000 orders × 100,000 customers", "no index: not run, worked out from the row above", ["about 7 hours", "about 250 billion comparisons", "slow"], ["33 s", "5,000,000 lookups · <b>about 800×</b> faster", "pick"]],
  ]) + measured("Measured on the shop database", `data-from="4"`, [
    ["300 orders with their customers", "300 lookups: nothing is faster for a few outer rows", "0.4 ms", "pick"],
    ["5,000,000 orders with their customers", "5,000,000 lookups; a hash join does it in 2.4 s", "33 s", "slow"],
  ]) });

export default { render: build({ stepper, key: "ni", label: "Nested loop, index on the inner side", css: css("ni") + `.lw .ni .mid svg { max-width:260px; margin:0 auto; }`, steps, scene, after: (root, at) => drive(root, at, PHASES) }) };
