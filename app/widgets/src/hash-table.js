// hash-table — one action at a time: a hash function turns a value into a number, the number picks
// a slot in an array of small arrays, values collide, and a search repeats the computation. Then
// 100,000 customers, and the hash table the database builds inside a query (the Hash node).
import { CSS as BUCKETS, ENTRY } from "../lib/hashplay.js";
import { DESK, css, drive, last, measured, scaled } from "../lib/joinplay.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const SIZE = 4;
// customer → tiny_hash("User<customer>@Example.com"), as the lesson's Python cell prints it.
const HASH = { 1: 2823424835, 2: 2530021828, 3: 2236618821, 4: 1943215814, 5: 1649812807, 6: 1356409800, 9: 476200779 };
const email = (c) => `User${c}@Example.com`, num = (n) => n.toLocaleString("en-US"), slotOf = (c) => HASH[c] % SIZE;
const empty = () => Array.from({ length: SIZE }, () => []);
// A line of the left card: a value, and what has been computed from it so far.
const line = (c, { hash = true, fold = true, tone = "" } = {}) => ({ text: email(c), hash: hash ? num(HASH[c]) : "", fold: fold ? `% ${SIZE} = ${slotOf(c)}` : "", tone });

// Insert customers into `slots`, four actions each: the value, its hash, the hash folded to a slot, the entry stored.
function inserting(customers, slots, done, opening) {
  const counts = () => [["entries stored", slots.flat().length], ["slots shared", slots.filter((s) => s.length > 1).length]];
  const rows = (now) => [...done.map((c) => line(c, { tone: "done" })), ...(now ? [now] : [])];
  const states = [{ rows: rows(), slots, counts: counts(), say: opening }];
  customers.forEach((c) => {
    const s = slotOf(c), shared = slots[s].length > 0;
    states.push({ rows: rows(line(c, { hash: false, fold: false, tone: "now" })), slots, counts: counts(), say: `A value arrives: ${email(c)}.` });
    states.push({ rows: rows(line(c, { fold: false, tone: "now" })), slots, counts: counts(),
      say: done.length === 1 ? `Hashed. One character differs from the value before, and the number is a different one altogether.` : `Hashed: the hash function turns the text into a number. The same text always gives the same number.` });
    states.push({ rows: rows(line(c, { tone: "now" })), slots, counts: counts(), say: `Modulo: the array has ${SIZE} slots, so the number is folded to 0–${SIZE - 1}. The remainder of dividing by ${SIZE} is ${s}.` });
    slots = slots.map((list, i) => (i === s ? [...list, c] : list));
    done = [...done, c];
    states.push({ rows: rows(), slots, on: s, fly: [[`.rows .row:nth-child(${done.length})`, ENTRY(s, slots[s].length - 1)]], counts: counts(),
      say: shared ? `Insertion: slot ${s} already holds an entry. The new one is appended to it: each slot is a small array.` : `Insertion: the entry goes into slot ${s}. Nobody decided where it goes: its value did.` });
  });
  return states;
}
function searching(slots) {
  let looks = 0;
  const states = [{ rows: [], slots, counts: [["looks", 0]], say: `Six entries are stored. Searching repeats the computation.` }];
  [[5, true], [9, false]].forEach(([c, stored]) => {
    const s = slotOf(c), find = (tone) => [{ ...line(c, { tone }), text: `find ${email(c)}` }];
    looks = 0;
    states.push({ rows: find("now"), slots, on: s, counts: [["looks", 0]], say: `Hash, fold: if ${email(c)} is stored, it can only be in slot ${s}.` });
    slots[s].forEach((entry, n) => {
      looks += 1;
      states.push({ rows: find("now"), slots, on: s, entry: n, tone: entry === c ? "hit" : "miss", counts: [["looks", looks]],
        say: entry === c ? `Found: customer ${c}, in ${looks} looks. The other slots were never opened.` : `User${entry} shares the slot but is not the one.` });
    });
    if (!stored) states.push({ rows: find("now miss"), slots, on: s, counts: [["looks", looks]], say: `Slot ${s} has no more entries, so ${email(c)} is not in the table: certain after ${looks} looks.` });
  });
  states.push({ ...last(states), say: `It works for “equal to” only. Asked for the emails that start with User7, the table is no help: similar values sit in unrelated slots.` });
  return states;
}
const FILL = inserting([1, 2, 3, 4], empty(), [], `An array of ${SIZE} slots, all empty. Each slot will hold a small array of entries.`);
const CLASH = inserting([5, 6], last(FILL).slots, [1, 2, 3, 4], `Every slot holds one entry, and two more customers arrive.`);
const SEARCH = searching(last(CLASH).slots);
const PHASES = [{ states: FILL, tick: 1100 }, { states: CLASH, tick: 1200 }, { states: SEARCH, tick: 1300 },
  { plain: true, states: [last(SEARCH)] }, { plain: true, states: [last(SEARCH)] }];

const steps = () => [
  { stop: "Hash and insert", title: "A value becomes a number, and the number picks a slot",
    note: `Press Play, or Step for one action at a time. Each value takes the same road: hashed to a number by <code>tiny_hash</code>, folded with a modulo to the size of the array, stored in that slot.` },
  { stop: "Collision", title: "Two values, one slot",
    note: `Press Play. More values than slots, so some share. That is why each slot holds a small array and not a single entry.` },
  { stop: "Search", title: "Searching repeats the computation",
    note: `Press Play. Hash, fold, go to that slot, and compare only what is in it.` },
  { stop: "At scale", title: "The same few looks, however many entries",
    note: `The table grows with its entries, so a slot stays short. The number of looks does not grow with the number of customers.` },
  { stop: "In the database", title: "The database builds one in the middle of a query", decisive: true,
    note: `To match orders with customers it puts the customers in a hash table, then looks each order's customer up in it. In a plan that is a <b>Hash</b> node.` },
];

const CSS = `
.lw .ht .top { grid-template-columns:1.35fr 1fr; }
.lw .ht .row { justify-content:flex-start; } .lw .ht .row span:nth-child(2) { margin-left:auto; }
.lw .ht .row span:nth-child(3) { width:74px; }
.lw .ht .rows i { font-style:normal; font-size:13px; color:var(--mute); }
.lw .ht .bucket { min-height:44px; }
`;
const scene = () => `${DESK}
  <div class="top">
    <div class="card"><h4>Value → hash → slot</h4><div class="rows"></div></div>
    <div class="card"><h4>An array of ${SIZE} small arrays</h4><div class="buckets"></div></div>
  </div>
  ${scaled("Finding one customer by email", `data-on="3"`, ["without the table: row after row", "with the hash table"], [
    ["6 customers", "the animation", ["up to 6 looks"], ["2 looks"]],
    ["100,000 customers", "measured: the Python cells · a table of 131,072 slots, the fullest holding 5 entries", ["77,777 looks", "7.3 ms", "slow"], ["2 looks", "0.02 ms · <b>about 400×</b> faster", "pick"]],
  ])}
  ${measured("In the database: a Hash node", `data-from="4"`, [
    ["Entries", "every customer goes in once, before the first order is matched", "100,000", ""],
    ["Slots", "a power of two, a little more than the entries", "131,072", ""],
    ["Memory", "the table lives in the query's memory and is thrown away when the query ends", "6,880 kB", ""],
  ])}`;

function draw(root, s) {
  root.querySelector(".rows").innerHTML = s.rows.length ? s.rows.map((r) => `<div class="row ${r.tone}"><span>${r.text}</span><span>${r.hash}</span><span>${r.fold}</span></div>`).join("") : "<i>nothing yet</i>";
  root.querySelector(".buckets").innerHTML = s.slots.map((list, b) => `<div class="bucket ${b === s.on ? "on" : ""}" data-b="${b}"><b>${b}</b>${
    list.map((c, n) => `<span class="${b === s.on && n === s.entry ? s.tone : ""}">User${c} → ${c}</span>`).join("")}</div>`).join("");
  root.querySelector(".say").textContent = s.say;
  root.querySelector(".counts").innerHTML = s.counts.map(([label, n]) => `<span>${label}<b>${n}</b></span>`).join("");
}

export default { render: build({ stepper, key: "ht", label: "How a hash table works", css: css("ht") + BUCKETS("ht") + CSS, steps, scene, after: (root, at) => drive(root, at, PHASES, draw) }) };
