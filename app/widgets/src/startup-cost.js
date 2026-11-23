// startup-cost — the other half of a cost: `startup..total`. Each step is a small plan drawn as
// EXPLAIN prints it, top node first, every node with what it pays before its first row and after.
// The point: a node that must take in its whole input (Aggregate, Sort) turns the total of the node
// beneath into its own startup; a node that hands rows up as they arrive (Limit) only inherits the
// startup beneath it. Captured data only: every cost is the planner's own.
import { cards } from "../lib/cards.js";
import { ALL, P, SCAN, T, cpu, folding, line, look, money, n, sum } from "../lib/receipt.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const TAKE = 10;
// A node: its name, what it pays before its first row (`early`) and while handing rows up (`late`),
// the node beneath it, and the sentence that says what it does with that node's cost.
const scan = { name: "Seq Scan", early: [], late: SCAN, startup: 0, total: sum(SCAN) };
// It must take in everything beneath before its first row: the child's total becomes startup.
function waits(name, child, early, late) {
  const all = [{ kind: "start", what: `the whole ${child.name} beneath`, sum: `its total: ${money(child.total)}`, cost: child.total }, ...early];
  return { name, child, early: all, late, startup: sum(all), total: sum(all) + sum(late),
    link: `The ${name} cannot hand up its first row before the ${child.name} has delivered its last. So the ${child.name}'s <b>total</b>, ${money(child.total)}, is paid inside the ${name}'s <b>startup</b>.` };
}
// It hands each row up as it arrives: it inherits the child's startup and pays a share of the rest.
function passes(child) {
  const rest = child.total - child.startup, share = (rest * TAKE) / T.rows;
  return { name: "Limit", child, startup: child.startup, total: child.startup + share,
    early: [{ kind: "start", what: `the startup of the ${child.name} beneath, in full`, sum: `${money(child.startup)} × 1`, cost: child.startup }],
    late: [{ kind: "mix", what: `the rest of the ${child.name}: ${TAKE} of ${n(T.rows)} rows`, sum: `${money(rest)} × ${TAKE} / ${n(T.rows)}`, cost: share, shown: share < 0.1 ? String(share) : money(share) }],
    link: `The Limit hands each row up the moment it gets one, so it adds no waiting of its own. Its startup is the ${child.name}'s <b>startup</b>, ${money(child.startup)}, and it pays for ${TAKE} rows of the rest.` };
}
const compare = (what, runs) => cpu(what, T.rows * Math.log2(runs) * 2, P.op, `${n(T.rows)} × log₂(${n(runs)}) × 2 × ${P.op}`);
const handUp = cpu("hand up every row", T.rows, P.op);
const COUNT = waits("Aggregate", scan, [cpu("add one to the counter, per row", T.rows, P.op)], [cpu("hand up the one result row", 1, P.row)]);
const SORT = waits("Sort", scan, [compare("compare rows until all are in order", T.rows)], [handUp]);
const TOP = waits("Sort", scan, [compare(`compare rows, keeping only the ${TAKE} cheapest`, 2 * TAKE)], [handUp]);

// A hash join waits for one of its two inputs only: the side the hash table is built from.
const big = (what, pages, rows) => ({ name: what, early: [], startup: 0, total: pages + rows * P.row,
  late: [{ kind: "seq", what: "read every page", sum: `${n(pages)} × 1.00`, cost: pages }, { kind: "row", what: "per-row work: find it, check it, pass it up", sum: `${n(rows)} × ${P.row}`, cost: rows * P.row }] });
const CUSTOMERS = big("Seq Scan on customers", 824, 100000), ORDERS = big("Seq Scan on orders", 66657, 5000000);
const HASH = { ...waits("Hash", CUSTOMERS, [], []), name: "Hash",
  link: `The hash table must hold every customer before the first order can be looked up in it. So this side is waited for: its <b>total</b>, 1,824.00, is inside the join's <b>startup</b>.` };
const JOIN = { name: "Hash Join", startup: 3074, total: 132856.55,
  early: [{ kind: "start", what: "the whole Hash beneath: every customer", sum: "its total: 1,824.00", cost: 1824 },
    { kind: "row", what: "put each customer into the hash table", sum: "100,000 × (0.01 + 0.0025)", cost: 1250 }],
  late: [{ kind: "mix", what: "the scan of orders, as its rows arrive", sum: "its total: 116,657.00", cost: 116657 },
    { kind: "op", what: "look each order up and hand up the match", sum: "the planner's estimate for 5,000,000 lookups", cost: 13125.55 }] };
// The join's two inputs, side by side: the one it waits for and the one it does not.
const SIDES = [
  { kind: "start", label: "Input 1 · waited for", nodes: [HASH, CUSTOMERS],
    say: `The hash table must hold every customer before the first order can be looked up in it. Its <b>total</b>, 1,824.00, is inside the join's <b>startup</b>.`,
    between: `The Hash cannot be complete before the scan of customers has delivered its last row.` },
  { kind: "mix", label: "Input 2 · not waited for", nodes: [ORDERS],
    say: `Each order is looked up and handed on as it arrives. The cost of reading the orders is spread over <b>the rest</b>.` },
];

// Each step: the query, its plan from the top node down, and the cost the planner prints for the top.
const PLANS = [
  { sql: "SELECT * FROM products", top: scan, prints: "0.00..200.00" },
  { sql: "SELECT count(*) FROM products", top: COUNT, prints: "225.00..225.01" },
  { sql: "SELECT * FROM products ORDER BY price_cents", top: SORT, prints: "864.39..889.39" },
  { sql: `SELECT * FROM products LIMIT ${TAKE}`, top: passes(scan), prints: "0.00..0.20" },
  { sql: `SELECT * FROM products ORDER BY price_cents LIMIT ${TAKE}`, top: passes(TOP), prints: "416.10..416.12" },
  { sql: "SELECT o.order_id, c.email FROM orders o JOIN customers c ON c.customer_id = o.customer_id", top: JOIN, sides: SIDES, prints: "3074.00..132856.55" },
];
const RULE = PLANS.length;

const steps = () => [
  { stop: "Two numbers", title: "A cost is two numbers: up to the first row, and up to the last",
    note: `The planner prints <code>cost=startup..total</code>. <b>Startup</b> is everything a node must pay before it can hand up its first row. A scan hands rows up as it reads them, so its startup is 0. Click a line to see its formula.` },
  { stop: "Count", title: "A node that must see every row first: its input's total becomes its startup", produces: "Aggregate",
    note: `<code>count(*)</code> has one row to hand up, and cannot know it until the scan beneath has delivered every row. The scan's own startup is still 0. It is the Aggregate that has to wait.` },
  { stop: "Sort", title: "A Sort waits too, and adds its comparing", produces: "Sort",
    note: `The first row of a sorted result cannot leave until the last row has arrived and the last comparison is done. The reading and the comparing are all startup.` },
  { stop: "Limit", title: "A Limit adds no waiting: it inherits the startup beneath it", produces: "Limit",
    note: `The Limit passes each row on as it arrives. The scan beneath starts at 0, so the Limit starts at 0, and it stops the scan after ${TAKE} rows of ${n(T.rows)}.` },
  { stop: "Limit on a sort", title: "The same Limit over a Sort inherits the Sort's startup", produces: "Limit",
    note: `Nothing changed in the Limit. The Sort beneath it cannot release its first row before it has seen them all, so that waiting is inherited whole. Only handing rows up is discounted.` },
  { stop: "A join", title: "A node with two inputs may wait for one and not the other", produces: "Hash Join",
    note: `A hash join builds a table from one input and looks the other up in it. It waits for the first and not for the second. Ask this join for 10 rows only, and the planner drops it for a plan whose startup is 0.30.` },
  { stop: "The rule", title: "Can its first row still be changed by a row that has not arrived?", decisive: true,
    note: `That one question sorts every kind of work, whatever the node is called. The same job can land on either side: grouping waits when its rows arrive mixed, and starts at once when they arrive in order.` },
];

const CSS = `
.lw .sc .panel:not(.on) { display:none; }
.lw .sc .panel.on { display:grid; gap:10px; pointer-events:auto; }
.lw .sc .sql { padding:8px 12px; border-radius:8px; background:var(--cell); font:14px ui-monospace, Menlo, monospace; display:flex; justify-content:space-between; gap:12px; }
.lw .sc .nd h5 { margin:0 0 10px; font:600 15px ui-monospace, Menlo, monospace; display:flex; justify-content:space-between; gap:12px; }
.lw .sc .nd h5 b { color:var(--accent); }
.lw .sc .ln.sub { margin-top:4px; } .lw .sc .ln:not(.sub) { padding-left:20px; }
.lw .sc .tl { display:flex; height:14px; margin:12px 0 4px; border-radius:6px; overflow:hidden; background:var(--cell); }
.lw .sc .tl b { display:block; min-width:3px; }
.lw .sc .tlk { display:flex; justify-content:space-between; gap:12px; min-width:230px; font:12px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .sc .link { margin:0; padding:0 16px 0 34px; position:relative; font-size:14px; }
.lw .sc .link::before { content:"↑"; position:absolute; left:14px; top:-2px; font-size:18px; color:var(--start); }
.lw .sc .sides { display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:start; }
.lw .sc .side { display:grid; gap:10px; padding:12px; border-radius:14px; border:1.5px dashed var(--line); }
.lw .sc .side h6 { margin:0; font-size:13px; letter-spacing:.06em; text-transform:uppercase; } .lw .sc .side > p:not(.link) { margin:0; font-size:14px; }
.lw .sc .side .tlk { min-width:0; flex-wrap:wrap; } .lw .sc .side .nd h5 { margin-bottom:0; flex-wrap:wrap; } .lw .sc .side .link { padding-right:0; }
.lw .sc .rule { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.lw .sc .rule p { margin:0 0 10px; font-size:14px; }
.lw .sc .rule h5 { margin:0 0 8px; font-size:15px; }
.lw .sc .rule .lines { gap:0; }
.lw .sc .rule .ln { padding:9px 0; border-top:1px solid var(--line); }
.lw .sc .rule .ln small { display:block; margin-top:2px; font-size:13px; font-weight:400; color:var(--mute); }
.lw .sc .rule .ln .sum { padding:8px 0 0; font:13px system-ui, sans-serif; }
.lw .sc .rule .ln.open .sum { display:grid; gap:8px; }
.lw .sc .rule .sum span { display:block; padding:6px 10px; border-radius:8px; background:var(--cell); font:12px ui-monospace, Menlo, monospace; color:var(--ink); }
.lw .sc .rule .sum code { display:block; margin-bottom:3px; background:none; padding:0; color:var(--mute); }
.lw .sc .hint { margin:0; font-size:13px; color:var(--mute); }
`;
const small = (x) => (x > 0 && x < 0.1 ? String(Number(x.toFixed(3))) : money(x));
// The two numbers as a stretch of work on a track `of` wide: startup, then the rest.
const timeline = (node, of, [first, lastRow]) => `<div class="tl" style="width:${Math.max(2, (node.total / of) * 100)}%"><b class="start" style="flex:${node.startup}"></b><b class="mix" style="flex:${Math.max(node.total - node.startup, node.total / 300)}"></b></div>
  <div class="tlk" style="width:${(node.total / of) * 100}%"><span>first row at ${first}</span><span>last row at ${lastRow}</span></div>`;
// One half of a node's cost. The top node of a plan lists its lines; the nodes beneath fold theirs into the subtotal.
function part(kind, what, lines, cost, open, none = "") {
  if (open) return line({ kind, what, cost, shown: small(cost), sum: lines.length ? "" : none }, 0, "sub") + lines.map((l) => line(l)).join("");
  return line({ kind, what, cost, shown: small(cost), sum: lines.length ? lines.map((l) => `${l.what}: ${l.sum} = ${l.shown ?? money(l.cost)}`).join("<br>") : none }, 0, "sub");
}
function card(node, of, prints, mini = false) {
  const cost = prints ?? `${money(node.startup).replaceAll(",", "")}..${money(node.total).replaceAll(",", "")}`;
  return `<div class="card nd"><h5><span>${node.name}</span><b>cost=${cost}</b></h5>
    ${mini ? "" : `<div class="lines">${part("start", "startup: before its first row", node.early, node.startup, Boolean(prints), "nothing: the first row can leave at once")}${part("mix", "the rest: while it hands rows up", node.late, node.total - node.startup, Boolean(prints))}</div>`}
    ${timeline(node, of, cost.split(".."))}</div>`;
}
// A plan from its top node down, every bar on one scale; between two nodes, what the upper does with the lower's cost.
function plan({ sql, top, prints, sides }, at) {
  const chain = []; for (let node = top; node; node = node.child) chain.push({ node, link: chain.length ? chain[chain.length - 1].node.link : "" });
  const of = Math.max(...chain.map(({ node }) => node.total));
  // A node with two inputs: each input is a column of its own under the node.
  const columns = sides ? `<div class="sides">${sides.map(({ kind, label, nodes, say, between }) => `<div class="side"><h6><i class="k ${kind}"></i>${label}</h6><p>${say}</p>
    ${nodes.map((node, i) => (i ? `<p class="link">${between}</p>` : "") + card(node, of, undefined, true)).join("")}</div>`).join("")}</div>` : "";
  return `<div class="panel st" data-on="${at}"><div class="sql"><span>${sql}</span>${ALL}</div>
    ${chain.map(({ node, link }, i) => (link ? `<p class="link">${link}</p>` : "") + card(node, of, i ? undefined : prints)).join("")}${columns}
    <div class="legend"><span><i class="k start"></i>startup: before the first row</span><span><i class="k mix"></i>the rest: while rows are handed up</span></div></div>`;
}
// The general rule: kinds of work, why each qualifies, and examples that unfold on a click.
// An example: [query or plan, the node and the cost the planner prints for it in this lab].
const AT_ONCE = [
  { what: "It reads rows from where they are stored, one after another", why: "what it hands up now does not depend on what it will read next. A table or an index: the same holds for both",
    examples: [["SELECT * FROM products", "Seq Scan · cost=0.00..200.00"], ["SELECT * FROM customers ORDER BY customer_id", "Index Scan on the primary key · cost=0.29..3431.29"]] },
  { what: "It works on one row at a time", why: "test it, compute something from it, pass it on or drop it: no other row is needed",
    examples: [["… WHERE price_cents < 600", "Seq Scan with a Filter · cost=0.00..225.00"], ["SELECT name, price_cents * 2 …", "a computed column · cost=0.00..225.00"], ["… LIMIT 10", "Limit · cost=0.00..0.20"]] },
  { what: "Its rows already arrive in the order it needs", why: "a run of equal values is complete the moment the next value begins, so it can be handed up then",
    examples: [["GROUP BY category_id, over a Sort", "GroupAggregate · cost=864.39..939.59: the 864.39 is the Sort beneath, inherited"], ["GROUP BY customer_id, rows read in order from an index", "GroupAggregate · cost=0.43..118473.54"]] },
  { what: "It looks each row up in something that is already there", why: "the lookup of one row does not wait for the rows after it",
    examples: [["orders JOIN customers, the orders side of the Hash Join", "each order is looked up as it arrives"], ["the same join with LIMIT 10", "Nested Loop · cost=0.30..793858.84"]] },
];
const MUST_WAIT = [
  { what: "It must put the rows in order", why: "the row that belongs first may be the last to arrive",
    examples: [["… ORDER BY price_cents", "Sort · cost=864.39..889.39"], ["… ORDER BY price_cents LIMIT 10", "Sort keeping 10 rows · cost=416.10..441.10"]] },
  { what: "It must boil all the rows down to one answer", why: "a count or a sum over everything is not known until the last row is in",
    examples: [["SELECT count(*) FROM products", "Aggregate · cost=225.00..225.01"], ["SELECT sum(price_cents) FROM products", "Aggregate · cost=225.00..225.01"]] },
  { what: "It must gather rows into groups that arrive mixed", why: "any group may still get one more row. With the same rows in order this work starts at once: see the other list",
    examples: [["GROUP BY category_id, rows in no order", "HashAggregate · cost=250.00..250.20"], ["SELECT DISTINCT category_id …", "HashAggregate · cost=225.00..225.20"]] },
  { what: "It must build something complete before it can be used", why: "a lookup in a half-built table would miss rows",
    examples: [["orders JOIN customers, the customers side", "Hash · cost=1824.00..1824.00, all of it inside the Hash Join's 3074.00"]] },
];
const listed = (rows) => `<div class="lines">${rows.map(({ what, why, examples }) => `<div class="ln fold rl"><span class="what"><b>${what}</b><em>▸</em><small>${why}</small></span><span class="c"></span>
  <span class="sum">${examples.map(([query, cost]) => `<span><code>${query}</code>${cost}</span>`).join("")}</span></div>`).join("")}</div>`;
const rule = () => `<div class="panel st" data-on="${RULE}"><div class="rule">
  <div class="card"><h5><i class="k mix"></i>No: it starts at once</h5><p>Its startup is the <b>startup</b> of the node beneath, no more.</p>${listed(AT_ONCE)}</div>
  <div class="card"><h5><i class="k start"></i>Yes: it must wait for the last row</h5><p>The <b>total</b> of the node beneath turns into its own <b>startup</b>.</p>${listed(MUST_WAIT)}</div></div>
  <p class="hint">Click a line for examples from this database.</p></div>`;
const scene = () => PLANS.map(plan).join("") + rule();

const fold = folding();
const after = (root) => { fold.bind(root); fold.apply(); };

export default { render: build({ stepper, key: "sc", label: "Startup and total", css: cards("sc") + look("sc") + CSS, steps, scene, after }) };
