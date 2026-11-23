// trees — graph → tree → binary search tree → balance → rotations → B-tree → a split → the real
// index on orders. Every picture is walked one action at a time; the rotations are played by hand.
import { DESK, css as playCss, drive } from "../lib/joinplay.js";
import { controls, css as rotCss, rotate } from "../lib/rotateplay.js";
import { fmt, scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

// The index's shape: branches at the root, inner pages and their branches, leaf pages and their entries.
const D = { root: 48, inner: 48, innerFan: 286, leaves: 13662, leafFan: 367 };
const ROTATE = 4; // the step where the rotation controls are shown

// Every drawn part carries a key; a state names the keys to light, mark found, dim or hide.
const n = (x, y, t, k) => `<g class="n" data-k="${k}"><circle cx="${x}" cy="${y}" r="19"/><text class="mono" x="${x}" y="${y + 1}">${t}</text></g>`;
const e = (a, b, k) => `<path class="edge" data-k="${k}" d="M${a[0]} ${a[1]} L${b[0]} ${b[1]}"/>`;
const group = (at, inner) => `<g class="st" data-on="${at}">${inner}</g>`;

// 0 graph
const G = [[150, 90], [300, 60], [470, 100], [610, 70], [230, 190], [400, 220], [560, 200]];
const GE = [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 2], [5, 6], [6, 3], [1, 4], [2, 6]];
const graph = () => group(0, GE.map(([a, b], j) => e(G[a], G[b], `ge${j}`)).join("") + G.map(([x, y], i) => n(x, y, "", `g${i}`)).join(""));
function wander() {
  const walk = [["g0"], ["ge0", "g1"], ["ge1", "g2"], ["ge5", "g5"], ["ge4", "g4"], ["ge3"]];
  const states = [{ say: `Nodes joined by edges, with no rules: any node may connect to any other.` }];
  const says = [`Start at any node.`, `Follow an edge to a neighbour. Two other edges led elsewhere.`, `And on to the next node.`, `Any edge will do: nothing says which way is forward.`,
    `One more step.`, `Back where the walk began: a circle. Between two nodes there can be many paths.`];
  walk.forEach((_, i) => states.push({ lit: walk.slice(0, i + 1).flat(), say: says[i] }));
  return states;
}
// 1 tree / 2 binary search tree share positions; an edge is keyed by the node under it
const T = [[380, 60], [220, 140], [540, 140], [140, 220], [300, 220], [460, 220], [620, 220]];
const TE = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]];
const V = [40, 20, 60, 10, 30, 50, 70];
const hung = (at, p, text, extra) => group(at, TE.map(([a, b]) => e(T[a], T[b], `${p}e${b}`)).join("") + T.map(([x, y], i) => n(x, y, text(i), `${p}${i}`)).join("") + extra);
const tree = () => hung(1, "t", () => "", `<text class="lbl acc l" x="410" y="56">root</text>`);
const bst = () => hung(2, "b", (i) => V[i], `<text class="lbl r" x="350" y="92">smaller</text><text class="lbl l" x="410" y="92">larger</text>`);
const under = (p, top) => [`${p}${top}`, `${p}e${top}`, ...TE.filter(([a]) => a === top).flatMap(([, b]) => under(p, b))];
const PATHS = [
  { say: `One node on top, the root. Every other node hangs under exactly one parent.`, lit: ["t0"] },
  { say: `From the root to this node there is one path, and only one.`, lit: ["t0", "te1", "t1", "te4", "t4"] },
  { say: `And one path to this one. No circles anywhere: that is what makes a graph a tree.`, lit: ["t0", "te2", "t2", "te6", "t6"] },
];
function search() {
  const looks = (k) => [["looks", k]], left = under("b", 1), right = under("b", 2);
  return [
    { counts: looks(0), say: `Every node is a question: smaller values hang to its left, larger to its right. Find 50.` },
    { counts: looks(1), lit: ["b0"], dim: left, say: `50 is larger than 40: go right. Everything on the left is out, without being looked at.` },
    { counts: looks(2), lit: ["b0", "be2", "b2"], dim: [...left, ...under("b", 6)], say: `50 is smaller than 60: go left.` },
    { counts: looks(3), lit: ["b0", "be2", "b2", "be5"], good: ["b5"], dim: [...left, ...under("b", 6)], say: `Found in 3 looks. Each look threw away half of what was left.` },
    { counts: looks(0), say: `Now 35, which is not in the tree.` },
    { counts: looks(1), lit: ["b0"], dim: right, say: `35 is smaller than 40: go left.` },
    { counts: looks(2), lit: ["b0", "be1", "b1"], dim: [...right, ...under("b", 3)], say: `35 is larger than 20: go right.` },
    { counts: looks(3), lit: ["b0", "be1", "b1", "be4", "b4"], dim: [...right, ...under("b", 3)], say: `35 is larger than 30, and nothing hangs to the right of 30. So 35 is not in the tree: certain after 3 looks.` },
  ];
}
// 3 balance: the same seven values arriving mixed (left) and in order (right)
const S = [[190, 70], [120, 130], [260, 130], [85, 190], [155, 190], [225, 190], [295, 190]];
const C = Array.from({ length: 7 }, (_, i) => [420 + i * 42, 46 + i * 31]);
const balance = () => group(3, TE.map(([a, b]) => e(S[a], S[b], `se${b}`)).join("") + S.map(([x, y], i) => n(x, y, V[i], `s${i}`)).join("") +
  C.slice(1).map((p, i) => e(C[i], p, `ce${i + 1}`)).join("") + C.map(([x, y], i) => n(x, y, (i + 1) * 10, `c${i}`)).join("") +
  `<text class="lbl" x="190" y="246">arriving 40 20 60 10 30 50 70</text><text class="lbl l" x="420" y="246">arriving 10 20 30 40 50 60 70</text>`);
function arrivals() {
  const waiting = (j) => V.flatMap((_, i) => (i >= j ? [`s${i}`, `se${i}`, `c${i}`, `ce${i}`] : []));
  const counts = (j) => [["levels, mixed order", j ? Math.floor(Math.log2(j)) + 1 : 0], ["levels, in order", j]];
  const states = [{ gone: waiting(0), counts: counts(0), say: `The same seven values will arrive twice: on the left in a mixed order, on the right in order.` }];
  V.forEach((v, i) => states.push({ gone: waiting(i + 1), lit: [`s${i}`, `c${i}`], counts: counts(i + 1),
    say: i === 0 ? `Left gets ${v}, right gets 10. The first value is the root.` : `Left gets ${v}. Right gets ${(i + 1) * 10}, larger than everything before it, so it hangs at the very end.` }));
  states.push({ counts: counts(7), say: `Seven values: 3 levels on the left, 7 on the right. The right one is a chain, and a search walks it node by node. 10,000 values in order are 10,000 levels deep where 14 would do.` });
  return states;
}
// 5 B-tree, 6 a split: root values on top, leaves as [x, values] below; `p` prefixes the keys
const KW = 48;
const key = (x, y, t, k, warm) => `<g data-k="${k}"><rect class="box ${warm ? "warm" : ""}" x="${x}" y="${y}" width="46" height="32" rx="5"/><text class="mono" x="${x + 23}" y="${y + 17}">${t}</text></g>`;
function btree(p, root, leaves, warm = -1) {
  const rx = 380 - (root.length * KW) / 2, end = ([x, vs]) => x + vs.length * KW - 2;
  return leaves.map(([x, vs], i) => e([rx + i * KW - 1, 92], [x + (vs.length * KW) / 2 - 1, 176], `${p}e${i}`)).join("") +
    leaves.slice(1).map(([x], i) => e([end(leaves[i]) + 2, 194], [x - 2, 194], `${p}n${i}`)).join("") +
    root.map((v, i) => key(rx + i * KW, 58, v, `${p}r${v}`)).join("") +
    leaves.map(([x, vs], i) => vs.map((v, j) => key(x + j * KW, 178, v, `${p}l${v}`, i === warm)).join("")).join("");
}
const LEAVES = [[90, [10, 20, 30]], [310, [40, 50, 60]], [530, [70, 80, 90]]];
const wide = () => group(5, btree("w", [40, 70], LEAVES) +
  `<text class="lbl r" x="238" y="128">below 40</text><text class="lbl l" x="388" y="134">40 up to 70</text><text class="lbl l" x="522" y="128">70 and up</text>`);
const RANGE = [
  { say: `Each node holds a sorted run of values, and the gaps between them lead to a child. Find 50.`, n: 0 },
  { say: `The root: 50 lies from 40 up to 70, so the middle branch. One node answered what took a binary tree two.`, lit: ["wr40", "wr70"], n: 1 },
  { say: `The node below holds three values in order: look along it.`, lit: ["wr40", "wr70", "we1", "wl40", "wl50", "wl60"], n: 2 },
  { say: `Found: 2 nodes read for 9 values.`, lit: ["wr40", "wr70", "we1"], good: ["wl50"], n: 2 },
  { say: `Now a range: everything from 50 to 80. Its start is found the same way.`, good: ["wl50", "wl60"], n: 2 },
  { say: `The bottom nodes are chained, so the next one is reached by a step sideways.`, good: ["wl50", "wl60"], lit: ["wn1"], n: 3 },
  { say: `50, 60, 70, 80: read in order, without going back up the tree.`, good: ["wl50", "wl60", "wl70", "wl80"], lit: ["wn1"], n: 3 },
].map(({ n: read, ...s }) => ({ ...s, counts: [["nodes read", read]] }));
const split = () => group(6, `<g data-k="va">${btree("a", [40, 70], LEAVES)}${key(120, 58, 55, "a55")}</g>
  <g data-k="vb">${btree("b", [40, 70], [[90, [10, 20, 30]], [286, [40, 50, 55, 60]], [530, [70, 80, 90]]], 1)}</g>
  <g data-k="vc">${btree("c", [40, 55, 70], [[40, [10, 20, 30]], [236, [40, 50]], [384, [55, 60]], [532, [70, 80, 90]]])}</g>`);
const SPLIT = [
  { gone: ["vb", "vc"], lit: ["a55"], say: `A node here holds three values at most, and every node below is full. 55 arrives.` },
  { gone: ["vb", "vc"], lit: ["a55", "ar40", "ar70", "ae1"], say: `55 lies from 40 up to 70, so it belongs in the middle node.` },
  { gone: ["va", "vc"], lit: ["bl55"], say: `Four values in a node made for three: too many.` },
  { gone: ["va", "vb"], lit: ["cl55", "cl60", "ce2"], good: ["cr55"], say: `The node splits into two halves, and the first value of the new half goes up to the parent as a signpost.` },
  { gone: ["va", "vb"], say: `Every path from the root is still the same length: balanced, without one rotation. When the root itself fills up it splits too, and the tree grows by one level, at the top.` },
];
// 7 the real index: the tree on the left, its numbers in a column on the right
const IX = [90, 170, 250, 330, 410], LX = [70, 130, 190, 250, 310, 370, 430];
const level = (y, pages, each) => `<text class="mono l" x="490" y="${y - 9}">${pages}</text><text class="lbl l" x="490" y="${y + 10}">${each}</text>`;
const entry = (x, t, k = "") => `<g data-k="${k}"><rect class="box" x="${x}" y="236" width="124" height="28" rx="5"/><text class="mono" x="${x + 62}" y="251">${t}</text></g>`;
const real = () => group(7, `<text class="mono r dim" x="718" y="29">orders_pkey</text>
  ${IX.map((x, i) => e([250, 74], [x, 118], i === 3 ? "x1" : "")).join("")}${[4, 5, 6].map((i) => e([330, 146], [LX[i], 190], i === 5 ? "x2" : "")).join("")}
  <rect class="pill" data-k="xr" x="210" y="46" width="80" height="28" rx="14"/><text x="250" y="61">root</text>
  ${IX.map((x, i) => `<rect class="pill" data-k="${i === 3 ? "xi" : ""}" x="${x - 32}" y="118" width="64" height="28" rx="14"/>`).join("")}
  ${LX.map((x, i) => `<rect class="pill" data-k="${i === 5 ? "xl" : ""}" x="${x - 22}" y="190" width="44" height="26" rx="6"/>`).join("")}
  ${level(61, "1 page", `${fmt(D.root)} branches`)}${level(133, `${fmt(D.inner)} pages`, `~${fmt(D.innerFan)} branches each`)}${level(204, `${fmt(D.leaves)} pages`, `~${fmt(D.leafFan)} entries each`)}
  ${e([370, 216], [370, 234], "x3")}${entry(184, "4,199,999")}${entry(308, "4,200,000", "xe")}${entry(432, "4,200,001")}
  ${e([556, 250], [596, 250], "x4")}<g data-k="xt"><rect class="box" x="598" y="236" width="124" height="28" rx="5"/><text class="mono" x="660" y="251">page 55,991</text><text class="lbl" x="660" y="224">the table</text></g>`);
const DESCENT = [
  { say: `orders_pkey holds 5,000,000 entries. Find order 4,200,000.`, n: 0 },
  { say: `Page 1, the root: ${D.root} branches. One of them covers 4,200,000.`, lit: ["xr"], n: 1 },
  { say: `Page 2, an inner page: about ${D.innerFan} branches, each to a leaf page.`, lit: ["xr", "x1", "xi"], n: 2 },
  { say: `Page 3, a leaf: about ${D.leafFan} entries in order.`, lit: ["xr", "x1", "xi", "x2", "xl"], n: 3 },
  { say: `The entry for 4,200,000 holds the address of the row: (55991,24).`, lit: ["xr", "x1", "xi", "x2", "xl", "x3"], good: ["xe"], n: 3 },
  { say: `Page 4 is the table's own page. Four pages read to find one row among 5,000,000.`, lit: ["xr", "x1", "xi", "x2", "xl", "x3", "x4"], good: ["xe", "xt"], n: 4 },
].map(({ n: read, ...s }) => ({ ...s, counts: [["pages read", read]] }));

const PHASES = [{ states: wander(), tick: 1000 }, { states: PATHS, tick: 1500 }, { states: search(), tick: 1500 }, { states: arrivals(), tick: 1000 },
  { states: [{ say: `Values that arrived in order: a chain. Each press of Rotate lifts one node above its parent, and everything stays smaller-left and larger-right.` }] },
  { states: RANGE, tick: 1600 }, { states: SPLIT, tick: 1900 }, { states: DESCENT, tick: 1500 }];

const steps = () => [
  { stop: "Graph", title: "A graph: things and the connections between them",
    note: `Press Play, or Step for one action at a time.` },
  { stop: "Tree", title: "A tree: a graph with one way in",
    note: `Press Play. Exactly one path leads from the root to each node.` },
  { stop: "Search tree", title: "A binary search tree: every node is a question",
    note: `Press Play. Two children at most: smaller values to the left, larger to the right.` },
  { stop: "Balance", title: "The shape depends on the order of arrival",
    note: `Press Play. A <b>balanced</b> tree rearranges itself to stay shallow.` },
  { stop: "Rotate", title: "Staying balanced: rotations",
    note: `Press <b>Rotate</b>. A balanced tree does this by itself as values arrive. Try 3, 6 and 12 values.` },
  { stop: "B-tree", title: "A B-tree: many values per node",
    note: `Press Play. More branches per node means fewer levels, and the bottom nodes are chained for reading a range.` },
  { stop: "Split", title: "A B-tree stays balanced by splitting",
    note: `Press Play. A full node splits in two and hands one value up. Nothing below it moves.` },
  { stop: "In the database", title: "The index on orders is a B-tree", decisive: true,
    note: `Press Play. Each node is one page. With hundreds of branches per page, 5,000,000 orders are only <b>3 pages</b> deep.` },
];
const CSS = `
.lw .tr .pic { position:relative; }
.lw .tr [data-k] { transition:opacity .45s, stroke .3s, fill .3s; }
.lw .tr .n circle { fill:var(--cell); stroke:var(--line); stroke-width:1.5; filter:drop-shadow(0 2px 4px rgba(0,0,0,.2)); transition:fill .3s, stroke .3s; }
.lw .tr .n.hit circle, .lw .tr .n.lit circle, .lw .tr .lit > .box, .lw .tr .pill.lit { fill:var(--accent-bg); stroke:var(--accent); stroke-width:1.5; }
.lw .tr .n.hit text, .lw .tr .lit > text { fill:var(--accent); }
.lw .tr .n.good circle, .lw .tr .good > .box { fill:var(--ok-bg); stroke:var(--ok); stroke-width:1.5; }
.lw .tr .good > text { fill:var(--ok); }
.lw .tr .edge.lit { stroke:var(--accent); stroke-width:2.5; }
.lw .tr .dim { opacity:.25; } .lw .tr .gone { opacity:0; }`;
const scene = () => `${DESK}<div class="pic"><svg viewBox="0 0 760 296"><rect class="zone" x="26" y="10" width="708" height="276" rx="12"/>
  ${graph()}${tree()}${bst()}${balance()}<g class="st rot" data-on="${ROTATE}"></g>${wide()}${split()}${real()}</svg>${controls()}</div>`;

const SETS = ["lit", "good", "dim", "gone"];
function draw(root, s) {
  const named = SETS.map((name) => new Set(s[name] ?? []));
  root.querySelectorAll("[data-k]").forEach((el) => SETS.forEach((name, i) => el.classList.toggle(name, named[i].has(el.dataset.k))));
  root.querySelector(".say").textContent = s.say;
  root.querySelector(".counts").innerHTML = (s.counts ?? []).map(([label, k]) => `<span>${label}<b>${k}</b></span>`).join("");
}
function after(root, at) {
  rotate(root, at === ROTATE);
  drive(root, at, PHASES, draw);
}

export default { render: build({ stepper, key: "tr", label: "From a graph to a B-tree", css: playCss("tr") + rotCss("tr") + CSS, steps, scene, after }) };
