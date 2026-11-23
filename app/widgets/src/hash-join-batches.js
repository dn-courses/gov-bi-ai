// hash-join-batches — the hash join when the hash table does not fit in memory. A second small
// computation splits both inputs into two batches: the first is joined at once, the rows of the
// second wait in temporary files and are joined afterwards. Measured on shop at the end.
import { CSS, ENTRY, FILE, FILED, SLOT, empty, files, hash, put, table } from "../lib/hashplay.js";
import { CUSTOMERS, L, LAST, ORDERS, R, css, drive, joined, last, measured, stage } from "../lib/joinplay.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const batch = (id) => (id % 2 ? 1 : 2); // the toy: odd customer numbers are batch 1, even ones batch 2
const ROOM = CUSTOMERS.filter(([id]) => batch(id) === 1).length;

function run() {
  let slots = empty(), fileC = [], fileO = [], readC = 0, readO = 0, out = [], doneL = new Set(), markR = {}, written = 0, back = 0;
  const pic = (t = {}, f = {}) => table(slots, t) + files({ customers: fileC, orders: fileO, readC, readO, ...f });
  const base = () => ({ out, doneL, markR, counts: [["rows written to files", written], ["read back", back], ["joined rows", out.length]] });
  const probe = (l, states, from) => {
    const [order, wanted] = ORDERS[l], b = hash(wanted), line = `customer ${wanted} → bucket ${b}`;
    slots[b].forEach((r, n) => {
      const [id, name] = CUSTOMERS[r], hit = id === wanted;
      if (hit) out = [...out, joined(l, r)];
      states.push({ ...base(), L: l, toneL: hit ? "hit" : "", fresh: hit, fly: hit ? [[from, LAST], [ENTRY(b, n), LAST]] : [], mid: pic({ on: b, line, entry: n, tone: hit ? "hit" : "miss" }),
        say: hit ? `Customer ${id} is in the bucket: order ${order} leaves with ${name}.` : `Customer ${id} shares the bucket but is not the one.` });
    });
    doneL = new Set([...doneL, l]);
  };

  const start = { ...base(), mid: pic(), say: `Memory has room for ${ROOM} customers, and there are ${CUSTOMERS.length}. So the customers are split into two batches, by a second computation on the customer number.` };
  const one = [start];
  CUSTOMERS.forEach(([id, name], r) => {
    const b = hash(id), now = batch(id) === 1;
    one.push({ ...base(), R: r, mid: pic({ on: now ? b : -1, line: `customer ${id} → batch ${batch(id)}` }), say: `Customer ${id} belongs to batch ${batch(id)}.` });
    if (now) { slots = put(slots, b, r); markR = { ...markR, [r]: "in memory" }; }
    else { fileC = [...fileC, r]; markR = { ...markR, [r]: "in a file" }; written += 1; }
    one.push({ ...base(), R: r, fly: [[R(r), now ? ENTRY(b, slots[b].length - 1) : FILED("c", fileC.length - 1)]],
      mid: pic({ on: now ? b : -1, line: `customer ${id} → batch ${batch(id)}`, fresh: now }, { on: now ? "" : "c", fresh: !now }),
      say: now ? `Batch 1 is the one in memory: ${name}'s row goes into bucket ${b}.` : `Batch 2 has to wait: ${name}'s row is written to a temporary file.` });
  });
  one.push({ ...base(), mid: pic(), say: `The hash table holds batch 1 only. The customers of batch 2 are on disk.` });

  const two = [last(one)];
  ORDERS.forEach(([order, wanted], l) => {
    const now = batch(wanted) === 1;
    two.push({ ...base(), L: l, mid: pic({ on: now ? hash(wanted) : -1, line: `customer ${wanted} → batch ${batch(wanted)}` }, { on: now ? "" : "o" }),
      say: `Order ${order} wants customer ${wanted}, which is in batch ${batch(wanted)}.` });
    if (now) return probe(l, two, L(l));
    fileO = [...fileO, l]; written += 1;
    two.push({ ...base(), L: l, toneL: "miss", fly: [[L(l), FILED("o", fileO.length - 1)]], mid: pic({ line: `customer ${wanted} → batch 2` }, { on: "o", fresh: true }),
      say: `Its customer is not in memory. Order ${order} is written to a temporary file too, to be joined later.` });
  });
  two.push({ ...base(), mid: pic(), say: `Every order has been read. Those of batch 1 are joined; those of batch 2 are waiting on disk.` });

  slots = empty();
  const three = [last(two), { ...base(), mid: pic(), say: `Batch 1 is finished, so the hash table is emptied to make room.` }];
  fileC.forEach((r, n) => {
    const [id, name] = CUSTOMERS[r], b = hash(id);
    slots = put(slots, b, r); readC = n + 1; back += 1; markR = { ...markR, [r]: "in memory" };
    three.push({ ...base(), R: r, fly: [[FILED("c", n), ENTRY(b, slots[b].length - 1)]], mid: pic({ on: b, line: `customer ${id} → bucket ${b}`, fresh: true }, { on: "c" }),
      say: `${name}'s row is read back from the file into bucket ${b}.` });
  });
  fileO.forEach((l, n) => {
    const [order, wanted] = ORDERS[l];
    readO = n + 1; back += 1;
    three.push({ ...base(), L: l, fly: [[FILED("o", n), SLOT(hash(wanted))]], mid: pic({ on: hash(wanted), line: `customer ${wanted} → bucket ${hash(wanted)}` }, { on: "o" }),
      say: `Order ${order} is read back from its file and looks in bucket ${hash(wanted)}.` });
    probe(l, three, FILED("o", n));
  });
  three.push({ ...base(), mid: pic(), say: `Same ${out.length} joined rows. ${written} rows were written to disk and read back to get there.` });
  return [one, two, three];
}

const [ONE, TWO, THREE] = run();
const PHASES = [{ states: [ONE[0]] }, { states: ONE, tick: 950 }, { states: TWO, tick: 950 }, { states: THREE, tick: 1000 }, { plain: true, states: [last(THREE)] }];

const steps = () => [
  { stop: "Too big", title: "The hash table does not fit in memory", produces: "Hash Join · Batches: 2",
    note: `The same join. This time memory holds only three customers. The join still works; it does it in pieces, called batches.` },
  { stop: "Build", title: "Build: batch 1 into memory, batch 2 into a file",
    note: `Press Play, or Step for one action at a time. Every customer is still read once, but some of them only pass through on their way to disk.` },
  { stop: "Probe", title: "Probe: orders of batch 1 now, orders of batch 2 into a file",
    note: `An order whose customer is on disk cannot be joined yet. It is set aside in a second temporary file.` },
  { stop: "Batch 2", title: "Then the same again for batch 2, from the files",
    note: `The table is emptied, the waiting customers are loaded, the waiting orders are probed. With more batches this repeats once per batch.` },
  { stop: "What it costs", title: "Every row outside the first batch is written and read again", decisive: true,
    note: `The limit is <code>work_mem</code> (a hash table may use twice that). In the plan, read <code>Batches:</code> on the Hash node and <code>temp read / written</code> in the buffers line.` },
];
const scene = () => stage({ left: "probe side: read second", right: "build side: read first", mid: `Hash table · room for ${ROOM} customers`,
  below: measured("Measured on the shop database: 5,000,000 orders with 100,000 customers", `data-from="4"`, [
    ["work_mem at its default, 4 MB", "the whole table in memory, 4,931 kB; nothing written", "1 batch", "pick"],
    ["work_mem = 1 MB", "14,905 pages written to temporary files and read back", "4 batches", "slow"],
    ["work_mem = 64 kB", "18,635 pages written to temporary files and read back", "16 batches", "slow"],
    ["Time, in this lab", "all three ran in about 2.4 s: the temporary files stay in the machine's file cache here. On a busy disk they do not.", "no clear change", ""],
  ]) });

export default { render: build({ stepper, key: "hb", label: "Hash join, in batches", css: css("hb") + CSS("hb"), steps, scene, after: (root, at) => drive(root, at, PHASES) }) };
