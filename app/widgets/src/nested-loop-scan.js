// nested-loop-scan — a nested loop with no index on the inner side: each order reads the customers
// from the top until its customer turns up. One comparison at a time; measured on shop at the end.
import { CUSTOMERS, L, LAST, ORDERS, R, css, drive, joined, last, measured, scaled, stage } from "../lib/joinplay.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

// The inner side read from the top for each of `rows`, stopping at the match: customer_id is unique.
function scan(from, rows) {
  const states = [];
  let { out, doneL, looks } = from;
  const base = () => ({ out, doneL, looks, counts: [["comparisons", looks], ["joined rows", out.length]] });
  for (const l of rows) {
    const [order, wanted] = ORDERS[l];
    states.push({ ...base(), L: l, mid: `<div class="big">customer ${wanted} ?</div><p>start at the first customer</p>`, say: `Take order ${order}. It belongs to customer ${wanted}.` });
    for (let r = 0; r < CUSTOMERS.length; r++) {
      const [id, name] = CUSTOMERS[r], hit = id === wanted;
      looks += 1;
      if (hit) out = [...out, joined(l, r)];
      states.push({ ...base(), L: l, R: r, tone: hit ? "hit" : "miss", fresh: hit, fly: hit ? [[L(l), LAST], [R(r), LAST]] : [],
        mid: `<div class="big ${hit ? "hit" : "miss"}">customer ${wanted} ${hit ? "=" : "≠"} customer ${id}</div><p>${hit ? "a joined row comes out" : "next customer"}</p>`,
        say: hit ? `Customer ${id} is the one: order ${order} leaves with ${name}.${out.length === 1 ? " The search stops here, because a customer number appears once." : " The search stops."}` : `Customer ${id}: not the one.` });
      if (hit) break;
    }
    doneL = new Set([...doneL, l]);
  }
  states.push({ ...base(), mid: `<div class="big">${looks} comparisons</div><p>for ${doneL.size} of ${ORDERS.length} orders</p>`,
    say: doneL.size === ORDERS.length ? `Every order has searched the customers from the top: ${looks} comparisons for ${ORDERS.length} joined rows.` : `Order ${ORDERS[last(rows)][0]} is done. The next order starts again from the first customer.` });
  return states;
}

const BLANK = { out: [], doneL: new Set(), looks: 0, counts: [["comparisons", 0], ["joined rows", 0]], mid: `<p>nothing compared yet</p>`,
  say: `The loop runs over the outer side, one order at a time. For each order the inner side is searched.` };
const FIRST = scan(BLANK, [0]), REST = scan(last(FIRST), ORDERS.map((_, i) => i).slice(1));
const PHASES = [{ states: [BLANK] }, { states: [BLANK, ...FIRST], tick: 1100 }, { states: [last(FIRST), ...REST], tick: 550 }, { plain: true, states: [last(REST)] }, { plain: true, states: [last(REST)] }];

const steps = () => [
  { stop: "Two inputs", title: "Nested loop: for each row of one input, search the other", produces: "Nested Loop",
    note: `Six orders and five customers. Every order has to find its customer, and nothing says where that customer is.` },
  { stop: "One order", title: "The first order searches the customers",
    note: `Press Play, or Step for one action at a time. The inner input is read from the top until the customer turns up.` },
  { stop: "Every order", title: "Every order repeats the search",
    note: `The inner input is read again for each outer row. The work is rows × rows.` },
  { stop: "At scale", title: "The same loop on real tables",
    note: `Six orders and five customers hide the problem: 19 comparisons is nothing. The count is a multiplication, so it grows with both tables at once.` },
  { stop: "What it costs", title: "Outer rows × a read of the inner table", decisive: true,
    note: `On real tables each search reads half the inner table on average, and all of it when a match could appear more than once. Only a handful of outer rows can afford this.` },
];
const scene = () => stage({ left: "outer side: the loop runs over it", right: "inner side: no index, read from the top", mid: "The inner search",
  below: scaled("The same loop, as the tables grow", `data-on="3"`, ["customer rows compared", "time"], [
    ["6 orders × 5 customers", "the animation", ["19"], ["an instant"]],
    ["300 orders × 100,000 customers", "measured · 50× the orders, 20,000× the customers", ["14,942,850", "<b>786,000×</b> the animation", "slow"], ["1.6 s", "", "slow"]],
    ["5,000,000 orders × 100,000 customers", "not run: worked out from the row above · 16,667× the orders", ["about 250 billion", "<b>16,667×</b> the row above", "slow"], ["about 7 hours", "<b>16,667×</b> the row above", "slow"]],
  ]) + measured("Measured on the shop database: 300 orders with their customers", `data-from="4"`, [
    ["Customers read from the top", "300 times: loops=300 in the plan", "300 reads", ""],
    ["Customer rows compared and thrown away", "about half of the 100,000 customers per order", "14,942,850", "slow"],
    ["The whole join", "300 joined rows", "1.6 s", "slow"],
  ]) });

export default { render: build({ stepper, key: "ns", label: "Nested loop, no index", css: css("ns"), steps, scene, after: (root, at) => drive(root, at, PHASES) }) };
