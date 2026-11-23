// plan-pull — a four-node plan run one action at a time: Limit asks Sort, Sort asks HashAggregate,
// HashAggregate asks the Seq Scan; rows travel up. The scan passes rows on at once, the aggregate and
// the sort hold everything until their input ends, and the limit stops asking. Captured numbers only.
import { DESK, css, drive, last, scaled } from "../lib/joinplay.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";
import { NODES, PRODUCTS, chips, node, price, tally } from "../lib/toyproducts.js";

const UNDER = 600, TAKE = 3;
const passes = ([, , cents]) => cents < UNDER;
const C = (node, key) => `.${node} .c[data-c="${key}"]`;

function run() {
  let groups = [], read = 0; // groups: [category, count] in order of first arrival
  const up = () => PRODUCTS.slice(0, read).filter(passes).length;
  const base = () => ({ read, groups, held: [], out: [], counts: [["rows read from the file", read], ["rows the scan handed up", up()], ["rows out", 0]] });
  const states = [{ ...base(), ask: true, say: `Limit needs a row, so it asks the node below it. Sort asks HashAggregate, and HashAggregate asks the Seq Scan. Nothing has been read yet.` }];
  PRODUCTS.forEach((row, i) => {
    const [id, category, cents] = row, ok = passes(row);
    read = i + 1;
    if (ok) groups = groups.some(([c]) => c === category) ? groups.map(([c, n]) => (c === category ? [c, n + 1] : [c, n])) : [...groups, [category, 1]];
    states.push({ ...base(), on: ok ? ["scan", "agg"] : ["scan"], row: i, tone: ok ? "ok" : "bad", fresh: ok ? category : null, fly: ok ? [[C("scan", id), C("agg", category)]] : [],
      say: ok ? `Product ${id} costs ${price(cents)}, under 6.00. The scan hands it up at once, and HashAggregate adds one to category ${category}.`
        : `Product ${id} costs ${price(cents)}, not under 6.00. The scan throws it away, and nothing goes up.` });
  });
  const counts = (out) => [["rows read from the file", read], ["rows the scan handed up", up()], ["rows out", out]];
  const sorted = [...groups].sort((a, b) => b[1] - a[1] || a[0] - b[0]), rest = { read, groups, emitted: true };
  states.push({ ...rest, held: groups, out: [], on: ["agg", "sort"], counts: counts(0), fly: groups.map(([c]) => [C("agg", c), C("sort", c)]),
    say: `The file has ended. Only now are the counters final, so only now does HashAggregate hand its rows up: one per category.` });
  states.push({ ...rest, held: sorted, out: [], on: ["sort"], counts: counts(0), say: `Sort has every row. Only now can it put them in order, the largest count first. Until this moment Limit has received nothing.` });
  for (let n = 1; n <= TAKE; n++) {
    const [category, count] = sorted[n - 1];
    states.push({ ...rest, held: sorted, out: sorted.slice(0, n), on: ["sort", "limit"], counts: counts(n), fly: [[C("sort", category), C("limit", category)]],
      say: `Limit asks for a row and gets category ${category}, with ${count} ${count === 1 ? "product" : "products"}.` });
  }
  const left = sorted.slice(TAKE).map(([c]) => c);
  states.push({ ...last(states), on: ["limit"], left, fly: [], say: `Limit has its ${TAKE} rows and stops asking. Category ${left.join(", ")} is sorted and ready, and is never asked for.` });
  return states;
}
const RUN = run();
const PHASES = [{ states: RUN, tick: 1100 }, { plain: true, states: [last(RUN)] }];

const steps = () => [
  { stop: "Row by row", title: "Each node asks the one below it for rows",
    note: `Press Play, or Step for one action at a time. The plan is drawn as <code>EXPLAIN</code> prints it, top node first. Requests travel down, rows travel up.` },
  { stop: "What to notice", title: "Some nodes pass rows on at once, others must wait for all of them", decisive: true,
    note: `The scan hands each row up as it reads it. HashAggregate and Sort hand nothing up until their input has ended. Limit stops asking once it has enough.` },
];
const scene = () => `${DESK}
  ${node("limit", "Limit", `takes ${TAKE} rows, then stops asking`)}
  ${node("sort", "Sort", "largest count first · hands nothing up until it has every row")}
  ${node("agg", "HashAggregate", "one counter per category · hands nothing up until its input ends")}
  ${node("scan", "Seq Scan · Filter: price under 6.00", "reads the file row by row · category, price")}
  ${scaled("The same plan on the real products table: rows into each node, rows out", `data-from="1"`, ["rows in", "rows out"], [
    ["Seq Scan, with its Filter", "reads every row of the file", ["10,000"], ["105", "9,895 thrown away"]],
    ["HashAggregate", "one counter per category", ["105"], ["20"]],
    ["Sort", "orders the 20 categories", ["20"], ["3", "asked for three only"]],
    ["Limit", "", ["3"], ["3"]],
  ])}`;

function draw(root, s, moving) {
  const taken = new Set(s.out.map(([c]) => c)), left = new Set(s.left ?? []);
  root.querySelectorAll(".node").forEach((el) => { const name = ["limit", "sort", "agg", "scan"].find((n) => el.classList.contains(n));
    el.classList.toggle("ask", Boolean(s.ask)); el.classList.toggle("on", (s.on ?? []).includes(name)); });
  chips(root, "scan", PRODUCTS.map((row, i) => [row[0], `${row[1]} · ${price(row[2])}`, i === s.row ? s.tone : i >= s.read ? "" : passes(row) ? "past" : "cut"]));
  chips(root, "agg", s.groups.map(([c, n]) => [c, `category ${c}: ${n}`, s.emitted ? "past" : c === s.fresh ? "ok" : ""]), "no counters yet");
  chips(root, "sort", s.held.map(([c, n]) => [c, `category ${c}: ${n}`, left.has(c) ? "bad" : taken.has(c) ? "past" : ""]), "nothing yet", moving);
  chips(root, "limit", s.out.map(([c, n]) => [c, `category ${c}: ${n}`, "ok"]), "nothing yet");
  root.querySelector(".say").textContent = s.say;
  tally(root, s.counts);
}

export default { render: build({ stepper, key: "pp", label: "A plan, row by row", css: css("pp") + NODES("pp"), steps, scene, after: (root, at) => drive(root, at, PHASES, draw) }) };
