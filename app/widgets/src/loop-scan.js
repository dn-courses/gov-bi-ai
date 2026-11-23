// loop-scan — the hand-written steps over a table's file, one action at a time (steps 2 to 4 are the loop): open the file, visit
// a row, cut it into columns, test the condition, keep the columns asked for. Then the plan the
// database prints for the same question, line against line. Captured numbers only.
import { DESK, css, drive, last, measured } from "../lib/joinplay.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";
import { PRODUCTS, tally } from "../lib/toyproducts.js";

const CATEGORY = 7, UNDER = 600;
const LINES = ["open the table's file", "visit the next row", "cut the row into its columns", `test: category = ${CATEGORY} and price < ${UNDER}`, "keep only the columns asked for"];
const name = (id) => `Product ${id}`, kept = (rows) => rows.map((i) => PRODUCTS[i]);

function loop() {
  let answer = [];
  const counts = (read) => [["rows visited", read], ["rows kept", answer.length]];
  const states = [{ line: 0, read: 0, answer, counts: counts(0), say: `The file is opened. Nothing in it says where category ${CATEGORY} is, so the loop starts at the first row.` }];
  PRODUCTS.forEach(([id, category, cents], i) => {
    const ok = category === CATEGORY && cents < UNDER;
    states.push({ line: 2, read: i, row: i, cut: true, answer, counts: counts(i + 1), say: `Row ${id} is read and cut at the commas: category ${category}, price ${cents}.` });
    if (ok) answer = [...answer, i];
    states.push({ line: ok ? 4 : 3, read: i + 1, row: i, cut: true, tone: ok ? "ok" : "bad", answer, counts: counts(i + 1), fly: ok ? [[`.rows .row[data-i="${i}"]`, `.kept .c:last-child`]] : [],
      say: ok ? `Category ${CATEGORY} and under ${UNDER}: the test passes, and the name and price are kept.`
        : category !== CATEGORY ? `Category ${category} is not ${CATEGORY}: the row is thrown away.` : `Category ${CATEGORY}, but ${cents} is not under ${UNDER}: the row is thrown away.` });
  });
  states.push({ line: -1, read: PRODUCTS.length, answer, counts: counts(PRODUCTS.length), say: `Every row was visited to keep ${answer.length}. The loop could not stop early: any later row might have matched.` });
  return states;
}
const LOOP = loop();
const PHASES = [{ states: LOOP, tick: 700 }, { plain: true, states: [last(LOOP)] }];

const steps = () => [
  { stop: "The loop", title: "By hand: every step has to be written",
    note: `Press Play, or Step for one action at a time. Ten toy rows of <code>products.csv</code>: which products in category ${CATEGORY} cost less than ${UNDER}?` },
  { stop: "The plan", title: "The database wrote the same loop", decisive: true,
    note: `SQL says what is wanted and not how. The plan is the how, and here it is the loop: a <b>Seq Scan</b> visits every row, its <b>Filter</b> is the test.` },
];
const CSS = `
.lw .ls .top { grid-template-columns:1fr 1.2fr; }
.lw .ls ol { margin:0; padding:0; list-style:none; display:grid; gap:6px; counter-reset:n; }
.lw .ls li { counter-increment:n; padding:7px 10px; border-radius:9px; border:1.5px solid transparent; background:var(--cell); font-size:14px; transition:background .25s, border-color .25s, color .25s; }
.lw .ls li::before { content:counter(n) ". "; font:600 13px ui-monospace, Menlo, monospace; color:var(--mute); }
.lw .ls li.in { margin-left:18px; position:relative; }
.lw .ls li.in::after { content:""; position:absolute; left:-12px; top:-4px; bottom:-4px; width:3px; border-radius:2px; background:var(--accent); }
.lw .ls p.loop { margin:10px 0 0 6px; font-size:13px; color:var(--accent); }
.lw .ls li.now { border-color:var(--accent); background:var(--accent-bg); color:var(--accent); }
.lw .ls .row { justify-content:flex-start; gap:0; } .lw .ls .row span + span::before { content:","; color:var(--mute); }
.lw .ls .row.cut { gap:10px; } .lw .ls .row.cut span + span::before { content:""; }
.lw .ls .row.cut span { padding:0 6px; border-radius:5px; background:var(--bg); }
.lw .ls .row.now.ok { border-color:var(--ok); background:var(--ok-bg); color:var(--ok); } .lw .ls .row.now.bad { border-color:var(--hot); background:var(--hot-bg); color:var(--hot); }
.lw .ls .kept { display:flex; flex-wrap:wrap; gap:8px; min-height:34px; align-items:center; }
.lw .ls .kept .c { padding:6px 12px; border-radius:9px; background:var(--ok-bg); color:var(--ok); border:1.5px solid var(--ok); font:13px ui-monospace, Menlo, monospace; }
.lw .ls .kept i { font-style:normal; font-size:13px; color:var(--mute); }
`;
const scene = () => `${DESK}
  <div class="top">
    <div class="card"><h4>The steps</h4><ol>${LINES.map((text, i) => `<li class="${i >= 1 && i <= 3 ? "in" : ""}">${text}</li>`).join("")}</ol><p class="loop">the loop: steps 2 to 4, repeated for every row</p></div>
    <div class="card"><h4>products.csv · product_id, category_id, price_cents, name</h4><div class="rows">${PRODUCTS.map(([id, category, cents], i) =>
      `<div class="row" data-i="${i}"><span>${id}</span><span>${category}</span><span>${cents}</span><span>${name(id)}</span></div>`).join("")}</div></div>
  </div>
  <div class="card"><h4>The answer · name, price_cents</h4><div class="kept"></div></div>
  ${measured("The plan for the same question on the real products table, 10,000 rows", `data-from="1"`, [
    ["Seq Scan on products", "lines 1 to 3 of the loop: open the file, visit every row, cut it into columns", "10,000 rows visited", ""],
    ["Filter: category_id = 7 AND price_cents < 600", "line 4: the test, run on every row", "9,995 thrown away", ""],
    ["name, price_cents", "line 5: only the columns asked for go up", "5 rows kept", ""],
  ])}`;

function draw(root, s) {
  root.querySelectorAll("li").forEach((li, i) => li.classList.toggle("now", i === s.line || (s.line === 2 && i === 1) || (s.line === 4 && i === 3)));
  root.querySelectorAll(".rows .row").forEach((row, i) => { row.className = "row" + (i < s.read && i !== s.row ? " done" : "") + (i === s.row ? ` now cut ${s.tone ?? ""}` : ""); });
  root.querySelector(".kept").innerHTML = s.answer.length ? kept(s.answer).map(([id, , cents]) => `<span class="c">${name(id)} · ${cents}</span>`).join("") : "<i>nothing yet</i>";
  root.querySelector(".say").textContent = s.say;
  tally(root, s.counts);
}

export default { render: build({ stepper, key: "ls", label: "The loop, and the plan", css: css("ls") + CSS, steps, scene, after: (root, at) => drive(root, at, PHASES, draw) }) };
