// hash-join-memory — the hash join when the hash table fits in memory: every customer goes into a
// bucket, then every order looks in one bucket. One action at a time; measured on shop at the end.
import { CSS, ENTRY, SLOT, empty, hash, put, table } from "../lib/hashplay.js";
import { CUSTOMERS, L, LAST, ORDERS, R, css, drive, joined, last, measured, scaled, stage } from "../lib/joinplay.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

function buildPhase() {
  let slots = empty(), markR = {};
  const base = () => ({ out: [], markR, slots, counts: [["customers stored", Object.keys(markR).length], ["joined rows", 0]] });
  const states = [{ ...base(), mid: table(slots), say: `Customers is the smaller input, so the hash table is built from it. The table starts empty.` }];
  CUSTOMERS.forEach(([id, name], r) => {
    const b = hash(id), shared = slots[b].length > 0, line = `hash(${id}) → bucket ${b}`;
    states.push({ ...base(), R: r, mid: table(slots, { on: b, line }), say: `Customer ${id}: a small computation on the number gives bucket ${b}.` });
    slots = put(slots, b, r);
    markR = { ...markR, [r]: "stored" };
    states.push({ ...base(), R: r, fly: [[R(r), ENTRY(b, slots[b].length - 1)]], mid: table(slots, { on: b, line, fresh: true }),
      say: shared ? `Bucket ${b} already holds a customer. ${name}'s row joins it: a bucket is a short list.` : `${name}'s row is stored in bucket ${b}.` });
  });
  states.push({ ...base(), mid: table(slots), say: `Every customer has been read once. The hash table is complete, and not one joined row has come out yet.` });
  return states;
}

function probePhase({ slots, markR }) {
  let out = [], doneL = new Set(), looks = 0;
  const base = () => ({ out, doneL, markR, counts: [["orders read", doneL.size], ["comparisons", looks], ["joined rows", out.length]] });
  const states = [{ ...base(), mid: table(slots), say: `Now the larger input. Each order is read once and looks in one bucket only.` }];
  ORDERS.forEach(([order, wanted], l) => {
    const b = hash(wanted), line = `hash(${wanted}) → bucket ${b}`;
    states.push({ ...base(), L: l, fly: [[L(l), SLOT(b)]], mid: table(slots, { on: b, line }), say: `Order ${order} wants customer ${wanted}. The same computation gives bucket ${b}.` });
    slots[b].forEach((r, n) => {
      const [id, name] = CUSTOMERS[r], hit = id === wanted;
      looks += 1;
      if (hit) out = [...out, joined(l, r)];
      states.push({ ...base(), L: l, toneL: hit ? "hit" : "", fresh: hit, fly: hit ? [[L(l), LAST], [ENTRY(b, n), LAST]] : [], mid: table(slots, { on: b, line, entry: n, tone: hit ? "hit" : "miss" }),
        say: hit ? `Customer ${id} is in the bucket: order ${order} leaves with ${name}.` : `Customer ${id} shares the bucket but is not the one.` });
    });
    doneL = new Set([...doneL, l]);
  });
  states.push({ ...base(), mid: table(slots), say: `Each input was read once: ${CUSTOMERS.length} customers, ${ORDERS.length} orders, ${looks} comparisons.` });
  return states;
}

const BUILD = buildPhase(), PROBE = probePhase(last(BUILD));
const PHASES = [{ states: [BUILD[0]] }, { states: BUILD, tick: 950 }, { states: PROBE, tick: 950 }, { plain: true, states: [last(PROBE)] }, { plain: true, states: [last(PROBE)] }];

const steps = () => [
  { stop: "Two inputs", title: "Hash join: build a hash table from one input, probe it with the other", produces: "Hash Join",
    note: `The same six orders and five customers. Nothing is sorted and no index is used. The smaller input is chosen for the hash table.` },
  { stop: "Build", title: "Build: every customer goes into a bucket",
    note: `Press Play, or Step for one action at a time. The bucket is computed from the join column. Here the computation is a toy: the remainder of dividing by 4.` },
  { stop: "Probe", title: "Probe: every order looks in one bucket",
    note: `The order's customer number goes through the same computation, so it lands in the bucket where its customer must be. Only the rows of that bucket are compared.` },
  { stop: "At scale", title: "Rows plus rows, not rows times rows",
    note: `The hash join shines when many rows of both tables take part and no index can be used, or there are too many rows to look up one at a time. Its work grows by addition: each input is read once, however large the other one is.` },
  { stop: "What it costs", title: "One read of each input, after the build is paid", decisive: true,
    note: `It is the join for many rows on both sides. Its fixed price is the build: the whole smaller input is read even when only a few rows are needed. It works for “equal to” only.` },
];
const scene = () => stage({ left: "probe side: read second", right: "build side: read first", mid: "Hash table, in memory",
  below: scaled("The same join, as the orders grow", `data-on="3"`, ["nested loop, no index", "nested loop, with index", "hash join"], [
    ["6 orders × 5 customers", "the animation", ["19 comparisons"], ["6 lookups"], ["5 stored, 6 probes"]],
    ["300 orders × 100,000 customers", "measured", ["1.6 s", "", "slow"], ["0.4 ms", "the fastest here", "pick"], ["15 ms", "<b>about 100×</b> faster than with no index"]],
    ["5,000,000 orders × 100,000 customers", "no index: not run, worked out from the row above", ["about 7 hours", "", "slow"], ["33 s", "", "slow"], ["2.4 s", "<b>about 11,000×</b> faster than with no index · <b>14×</b> faster than with it", "pick"]],
  ]) + measured("Measured on the shop database: the build", `data-from="4"`, [
    ["The hash table of 100,000 customers", "131,072 buckets, in one piece: Batches: 1", "4,931 kB", ""],
    ["Time to build it", "paid in full before the first joined row, whether 300 orders follow or 5,000,000", "about 30 ms", ""],
  ]) });

export default { render: build({ stepper, key: "hm", label: "Hash join, in memory", css: css("hm") + CSS("hm"), steps, scene, after: (root, at) => drive(root, at, PHASES) }) };
