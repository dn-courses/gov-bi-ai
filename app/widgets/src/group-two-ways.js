// group-two-ways — counting rows per category two ways, one action at a time: HashAggregate keeps a
// counter per category and takes the rows in any order; GroupAggregate takes them sorted and keeps
// one counter. Costs on the last step are the planner's own for the real products table.
import { DESK, css, drive, last, measured, scaled } from "../lib/joinplay.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";
import { NODES, PRODUCTS, chips, node, tally } from "../lib/toyproducts.js";

const C = (node, key) => `.${node} .c[data-c="${key}"]`, ARRIVAL = PRODUCTS.map((_, i) => i);
const add = (groups, category) => (groups.some(([c]) => c === category) ? groups.map(([c, n]) => (c === category ? [c, n + 1] : [c, n])) : [...groups, [category, 1]]);

function hashed() {
  let groups = [];
  const counts = (read) => [["rows read", read], ["counters kept at once", groups.length]];
  const states = [{ order: ARRIVAL, read: 0, work: groups, out: [], counts: counts(0), say: `The rows arrive in the order they lie in the file. HashAggregate keeps one counter per category, in a hash table.` }];
  PRODUCTS.forEach(([id, category], i) => {
    const fresh = !groups.some(([c]) => c === category);
    groups = add(groups, category);
    states.push({ order: ARRIVAL, read: i + 1, row: i, work: groups, lit: category, out: [], on: ["rows", "work"], counts: counts(i + 1), fly: [[C("rows", id), C("work", category)]],
      say: fresh ? `Product ${id} is in category ${category}: a new counter, starting at 1.` : `Product ${id} is in category ${category}: its counter is found by the hash and goes up by one.` });
  });
  states.push({ order: ARRIVAL, read: PRODUCTS.length, work: groups, out: groups, done: true, on: ["out"], counts: counts(PRODUCTS.length), fly: groups.map(([c]) => [C("work", c), C("out", c)]),
    say: `The input has ended, so the counters are final and are handed up. The rows were never put in order, and ${groups.length} counters were held in memory at once.` });
  return states;
}
function sorted() {
  const order = [...ARRIVAL].sort((a, b) => PRODUCTS[a][1] - PRODUCTS[b][1] || a - b);
  let run = [], out = [];
  const counts = (read) => [["rows read", read], ["counters kept at once", 1]];
  const states = [
    { order: ARRIVAL, read: 0, work: [], out: [], counts: counts(0), say: `The other way needs no hash table, but it needs the rows in order of category.` },
    { order, read: 0, work: [], out: [], on: ["rows"], counts: counts(0), say: `So the rows are sorted first. Now equal categories stand next to each other.` },
  ];
  order.forEach((at, i) => {
    const [id, category] = PRODUCTS[at], closes = run.length && run[0][0] !== category;
    if (closes) out = [...out, run[0]];
    run = closes || !run.length ? [[category, 1]] : [[category, run[0][1] + 1]];
    states.push({ order, read: i + 1, row: at, work: run, lit: category, out, on: closes ? ["rows", "work", "out"] : ["rows", "work"], counts: counts(i + 1),
      fly: closes ? [[C("work", last(out)[0]), C("out", last(out)[0])]] : [[C("rows", id), C("work", category)]],
      say: closes ? `Category ${category} begins, so category ${last(out)[0]} can never come again: its count is handed up at once, and the one counter starts over.`
        : run[0][1] === 1 ? `Product ${id}, category ${category}: the counter starts at 1.` : `Product ${id}, category ${category} again: the counter goes up by one.` });
  });
  out = [...out, run[0]];
  states.push({ order, read: order.length, work: [], out, done: true, on: ["out"], counts: counts(order.length), say: `The input has ended and the last count is handed up. One counter was enough, and the result came out in order. The price was the sort.` });
  return states;
}
// The rows arrive already in order of category, and only the first WANTED groups are asked for.
const WANTED = 2;
function inOrder() {
  const order = [...ARRIVAL].sort((a, b) => PRODUCTS[a][1] - PRODUCTS[b][1] || a - b);
  let run = [], out = [], read = 0;
  const counts = () => [["rows read", read], ["rows sorted", 0], ["groups out", out.length]];
  const states = [{ order, read: 0, work: [], out: [], on: ["rows"], counts: counts(),
    say: `Now the rows arrive already in order of category, as they do when something keeps them sorted. Only the first ${WANTED} categories are wanted.` }];
  for (const at of order) {
    const [id, category] = PRODUCTS[at], closes = run.length && run[0][0] !== category;
    read += 1;
    if (closes) out = [...out, run[0]];
    run = closes || !run.length ? [[category, 1]] : [[category, run[0][1] + 1]];
    const enough = out.length === WANTED;
    states.push({ order, read, row: at, work: enough ? [] : run, lit: category, out, on: closes ? ["rows", "work", "out"] : ["rows", "work"], counts: counts(),
      fly: closes ? [[C("work", last(out)[0]), C("out", last(out)[0])]] : [[C("rows", id), C("work", category)]],
      say: enough ? `Category ${category} begins, so category ${last(out)[0]} is complete and is handed up. That is the ${WANTED} groups asked for: the reading stops here.`
        : closes ? `Category ${category} begins, so category ${last(out)[0]} is complete and is handed up at once. Nothing had to wait for the end of the input.`
        : run[0][1] === 1 ? `Product ${id}, category ${category}: the counter starts at 1. Nothing was sorted to get here.` : `Product ${id}, category ${category} again: the counter goes up by one.` });
    if (enough) break;
  }
  states.push({ ...last(states), row: -1, on: ["out"], fly: [], say: `${read} rows read, none sorted, and ${PRODUCTS.length - read} never read at all. A hash table could not do this: it has nothing to hand up until it has seen the last row.` });
  return states;
}
const HASH = hashed(), SORT = sorted(), ORDERED = inOrder();
const PHASES = [{ states: HASH, tick: 900 }, { states: SORT, tick: 900 }, { states: ORDERED, tick: 1000 }, { plain: true, states: [last(ORDERED)] }];

const steps = () => [
  { stop: "By hash", title: "HashAggregate: one counter per group, rows in any order", produces: "HashAggregate",
    note: `Press Play, or Step for one action at a time. <code>SELECT category_id, count(*) … GROUP BY category_id</code> on ten toy rows.` },
  { stop: "By sorting", title: "GroupAggregate: sort first, then count each run", produces: "Sort → GroupAggregate",
    note: `Press Play. Once the rows are sorted, a group is finished the moment the next value differs.` },
  { stop: "Already sorted", title: "When the rows arrive in order, counting runs is free", produces: "GroupAggregate",
    note: `Press Play. The sort was the whole price of the second way. Take it away, and what is left is one counter, and groups that come out as soon as they end.` },
  { stop: "The trade-off", title: "The planner prices both and keeps the cheaper", decisive: true,
    note: `Hash needs no order but must see every row before its first answer. Counting runs needs the order, and gets everything else for free once it has it.` },
];
const scene = () => `${DESK}
  ${node("out", "Result", "one row per category")}
  ${node("work", "Counters", "what the aggregate holds in memory")}
  ${node("rows", "Rows from the scan", "the category of each product")}
  ${scaled("Measured on the shop database: the two ways on two questions", `data-from="3"`, ["by hash", "by counting runs"], [
    ["Products per category", "10,000 rows, 20 groups · the rows are in no useful order, so counting runs must sort first", ["cost 250.20", "the planner's choice", "pick"], ["cost 939.59", "664.39 of it is the sort", "slow"]],
    ["Orders per customer", "5,000,000 rows, 100,000 groups · the rows arrive already in order of customer", ["1.07 s", "cost 142,657 · the table of counters outgrew its memory", "slow"], ["about 600 ms", "cost 118,474 · the planner's choice", "pick"]],
    ["The same, first 10 customers only", "ORDER BY customer_id LIMIT 10", ["920 ms", "every row read before the first group", "slow"], ["0.1 ms", "501 rows read, then it stops · the planner's choice", "pick"]],
  ])}
  ${measured("Which way the planner tends to take", `data-from="3"`, [
    ["The rows are in no useful order, and the groups are few", "one pass, a small table of counters, nothing to sort", "hash", ""],
    ["The rows already arrive in the order of the group", "nothing to sort, one counter, and groups leave as they end", "counting runs", ""],
    ["Only the first groups are wanted, and the order is there", "counting runs can stop early; a hash table cannot", "counting runs", ""],
    ["Very many groups and no order to use", "the table of counters is written to disk in parts; in this lab the planner still chose it over sorting", "hash", ""],
  ])}`;

function draw(root, s, moving) {
  root.querySelectorAll(".node").forEach((el) => { const name = ["out", "work", "rows"].find((n) => el.classList.contains(n)); el.classList.toggle("on", (s.on ?? []).includes(name)); });
  const seen = new Set(s.order.slice(0, s.read));
  chips(root, "rows", s.order.map((at) => [PRODUCTS[at][0], `category ${PRODUCTS[at][1]}`, at === s.row ? "ok" : seen.has(at) ? "past" : ""]), "", moving);
  chips(root, "work", s.work.map(([c, n]) => [c, `category ${c}: ${n}`, s.done ? "past" : c === s.lit ? "ok" : ""]), "no counter yet");
  chips(root, "out", s.out.map(([c, n]) => [c, `category ${c}: ${n}`, "ok"]), "nothing yet");
  root.querySelector(".say").textContent = s.say;
  tally(root, s.counts);
}

export default { render: build({ stepper, key: "gt", label: "Grouping, two ways", css: css("gt") + NODES("gt"), steps, scene, after: (root, at) => drive(root, at, PHASES, draw) }) };
