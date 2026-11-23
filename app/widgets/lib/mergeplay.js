// mergeplay — the merge join as one widget per situation. A merge join walks two inputs that are in
// the order of the join column; what differs is how each input gets that order: a sort (every row
// read and held first), or an index that already holds the rows in order and is simply walked.
// The data has what makes a merge interesting: customers with no order, one customer with three
// orders, and one order whose customer is not in the list.
import { L, LAST, R, css, drive, indexList, last, measured, scaled, stage } from "./joinplay.js";
import { scene as build } from "./scene.js";

const ORDERS = [[101, 7], [102, 2], [103, 9], [104, 7], [105, 4], [106, 2], [107, 8], [108, 7]]; // order, its customer
const CUSTOMERS = [[1, "Ana"], [2, "Ben"], [4, "Chen"], [5, "Dana"], [7, "Eli"], [9, "Fay"]]; // by number: the order an index holds
const STORED_L = ORDERS.map((_, i) => i), STORED_R = [4, 1, 5, 0, 3, 2]; // the rows as the tables store them
const SORTED_L = [...STORED_L].sort((a, b) => ORDERS[a][1] - ORDERS[b][1] || a - b), SORTED_R = CUSTOMERS.map((_, i) => i);
const SIDES = { left: { name: "Orders", rows: ORDERS.length, index: "the index on customer_id" }, right: { name: "Customers", rows: CUSTOMERS.length, index: "their primary key" } };
const INDEX = { left: indexList("Index on customer_id · already in order", SORTED_L.map((i) => [i, `customer ${ORDERS[i][1]} → order ${ORDERS[i][0]}`])),
  right: indexList("Index on customer_id · already in order", SORTED_R.map((i) => [i, `customer ${CUSTOMERS[i][0]} → ${CUSTOMERS[i][1]}`])) };
// Where each side's rows stand once the order is there: a sorted side is rearranged, an indexed side is left as stored.
const placed = (how) => ({ orderL: how.left === "sort" ? SORTED_L : STORED_L, orderR: how.right === "sort" ? SORTED_R : STORED_R });

// How each side gets its order: `how` is { left: "sort" | "index", right: "sort" | "index" }.
function ordering(how) {
  let state = { out: [], orderL: STORED_L, orderR: STORED_R, sorted: 0, mid: `<p>both tables as they are stored</p>`,
    say: `A merge join needs both inputs in the order of the customer number. As stored, neither table is.` };
  const counts = (s) => ({ ...s, counts: [["rows sorted", s.sorted], ["comparisons", 0], ["joined rows", 0]] });
  const states = [counts(state)];
  for (const side of ["left", "right"]) {
    const { name, rows, index } = SIDES[side], sort = how[side] === "sort";
    state = { ...state, ...(sort ? (side === "left" ? { orderL: SORTED_L } : { orderR: SORTED_R }) : {}), sorted: state.sorted + (sort ? rows : 0),
      mid: `<div class="big ${sort ? "miss" : "hit"}">${sort ? "sort" : "no sort"}</div><p>${name.toLowerCase()}: ${sort ? "sorted by customer number" : "the index is already in order"}</p>`,
      say: sort ? `${name} are sorted by customer number. All ${rows} rows are read and held before the first one can move on.`
        : `${name} need no sort: ${index}, drawn under the table, already holds them in order. The join will walk the index. Nothing moves.` };
    states.push(counts(state));
  }
  return states;
}

function merge(how, { sorted }) {
  let out = [], looks = 0, l = 0, r = 0;
  const base = () => ({ out, sorted, ...placed(how), doneL: new Set(SORTED_L.slice(0, l)), markR: Object.fromEntries(CUSTOMERS.slice(0, r).map((_, i) => [i, "passed"])),
    counts: [["rows sorted", sorted], ["comparisons", looks], ["joined rows", out.length]] });
  const states = [{ ...base(), L: SORTED_L[0], R: 0, mid: `<p>one finger at the top of each input</p>`, say: `One finger on the first order, one on the first customer, both in the order of the customer number.` }];
  while (l < SORTED_L.length && r < CUSTOMERS.length) {
    const row = SORTED_L[l], [order, wanted] = ORDERS[row], [id, name] = CUSTOMERS[r], hit = wanted === id, orphan = wanted < id;
    looks += 1;
    if (hit) out = [...out, `order ${order} · ${name}`];
    const again = hit && l > 0 && ORDERS[SORTED_L[l - 1]][1] === wanted;
    states.push({ ...base(), L: row, R: r, toneL: hit ? "hit" : orphan ? "miss" : "", toneR: hit ? "hit" : orphan ? "" : "miss", fresh: hit, fly: hit ? [[L(row), LAST], [R(r), LAST]] : [],
      mid: `<div class="big ${hit ? "hit" : "miss"}">customer ${wanted} ${hit ? "=" : orphan ? "&lt;" : "&gt;"} customer ${id}</div><p>${hit ? "joined; the order finger moves" : orphan ? "no such customer; the order finger moves" : "the customer finger moves"}</p>`,
      say: hit ? `Equal: order ${order} leaves with ${name}. The order finger moves on.${again ? ` The customer finger has not moved: ${name} has another order.` : " The customer finger stays: the next order may be the same customer's."}`
        : orphan ? `The order wants customer ${wanted}, and the customer finger is already on ${id}. There is no customer ${wanted}: order ${order} joins nothing, and the order finger moves on.`
        : `Customer ${id} is below ${wanted}. No later order can be customer ${id}'s, so the customer finger moves on${ORDERS.some(([, c]) => c === id) ? "" : `: customer ${id} has no order at all`}.` });
    if (hit || orphan) l += 1; else r += 1;
  }
  states.push({ ...base(), mid: `<div class="big">${looks} comparisons</div><p>no finger ever moved back</p>`, say: `The orders have run out, so the join is finished. Each input was walked once, top to bottom: ${out.length} joined rows from ${ORDERS.length} orders.` });
  return states;
}

// The three situations on real tables: [no index, one index, two indexes] per row. `mine` is the column a widget is about.
const REAL = "Measured on the shop database: 5,000,000 orders joined with their 15,000,000 order items";
const AT_SCALE = [
  ["8 orders × 6 customers", "the animation: rows sorted before the walk", ["14"], ["8"], ["0"]],
  ["Written to disk by the sorts", "the sorts do not fit in memory", ["381 MB"], ["264 MB"], ["nothing"]],
  ["The first 100 joined rows", "how long until they come out", ["6.2 s"], ["3.7 s", "<b>1.7×</b> sooner"], ["0.06 ms", "<b>100,000×</b> sooner"]],
  ["The whole join, counted", "a hash join takes about 7 s", ["9.3 s"], ["9.6 s", "no gain"], ["5.3 s", "<b>1.8×</b> faster"]],
];
const atScale = (mine) => scaled("The same join on real tables, in the three situations", `data-on="3"`, ["no index", "one index", "two indexes"],
  AT_SCALE.map(([what, detail, ...cells]) => [what, detail, ...cells.map(([value, note = ""], i) => [value, note, i === mine ? (mine === 2 ? "pick" : "slow") : ""])]));

const LABEL = { sort: "no index on customer_id: has to be sorted", index: "has an index on customer_id" };
// One merge join widget: `how` as above; `mine` is its column in the table above; `intro`, `order`,
// `scale` and `cost` are the notes of those steps; `facts` the measured rows of its own situation.
export function mergeWidget({ stepper, key, label, how, mine, produces, intro, order, scale, cost, costTitle, facts }) {
  const ORDER = ordering(how), MERGE = merge(how, last(ORDER));
  const phases = [{ states: [ORDER[0]] }, { states: ORDER, tick: 1900 }, { states: [last(ORDER), ...MERGE], tick: 1200 }, { plain: true, states: [last(MERGE)] }, { plain: true, states: [last(MERGE)] }];
  const steps = () => [
    { stop: "Two inputs", title: "Merge join: two inputs in order, walked together", produces,
      note: `Eight orders and six customers. One customer has three orders, some have none, and one order's customer is not in the list. ${intro}` },
    { stop: "Order", title: "First, each input in the order of the join column", note: `Press Play. ${order}` },
    { stop: "Merge", title: "Then two fingers, each moving only forward",
      note: `Press Play, or Step for one action at a time. The two rows under the fingers are compared; the finger on the lower one moves.` },
    { stop: "At scale", title: "The same join on real tables", note: scale },
    { stop: "What it costs", title: costTitle, decisive: true, note: cost },
  ];
  const scene = () => stage({ orders: ORDERS, customers: CUSTOMERS, left: LABEL[how.left], right: LABEL[how.right], mid: "The comparison",
    indexL: how.left === "index" ? INDEX.left : "", indexR: how.right === "index" ? INDEX.right : "", below: atScale(mine) + measured(REAL, `data-from="4"`, facts) });
  return { render: build({ stepper, key, label, css: css(key), steps, scene, after: (root, at) => drive(root, at, phases) }) };
}
