// hash-join-estimates — two things the planner's numbers do to a hash join: a hash table planned for
// far too few rows, and a key that most rows share. Numbers only: measured in the lab on tables the
// page's cells build.
import { css, measured } from "../lib/joinplay.js";
import { scene as build } from "../lib/scene.js";
import { stepper } from "../lib/stepper.js";

const steps = () => [
  { stop: "Too few rows", title: "A hash table planned for 38 rows that receives 3,000,000",
    note: `A freshly loaded table has no statistics, so two filters on it are guessed at: 38 rows expected. The hash table is laid out for that. In the plan the mark is <code>(originally …)</code>: the table had to be rebuilt while the query ran.` },
  { stop: "One key", title: "A key that most rows share",
    note: `Two tables of 2,000,000 rows. In the second, 1,800,000 rows carry the same key: in a hash table they would all sit in one bucket, and a bucket is a list. The statistics show the planner that key, so it turns the join round and stores the other side, although it is seven times larger.` },
  { stop: "So", title: "A hash join is planned from row counts, like every other choice", decisive: true,
    note: `Which side is stored, how many buckets, how many batches: all of it comes from the estimates. Wrong statistics do not break the hash join, they make it work harder than it needed to.` },
];
const scene = () => `
  ${measured("Measured: 3,000,000 freshly loaded rows joined with the order lines", `data-on="0"`, [
    ["What the plan expected in the hash table", "no statistics on the loaded table: two filters, guessed", "38 rows", ""],
    ["What arrived", "the hash table was planned as 1,024 buckets in one batch", "3,000,000 rows", "slow"],
    ["What the hash join did about it", "Buckets: 262144 (originally 1024) · Batches: 32 (originally 1)", "rebuilt while running", "slow"],
    ["The whole join", "after ANALYZE the plan expects 3,000,000 rows and lays the table out once: 2.9 s", "3.2 s", "slow"],
  ])}
  ${measured("Measured: 15,000,000 order lines joined with a table of 2,000,000 rows", `data-on="1"`, [
    ["Keys all different", "the smaller table is stored: 2,000,000 rows, 16 batches", "4.1 s", ""],
    ["1,800,000 rows share one key", "the planner stores the other side instead: 15,000,000 rows, 128 batches", "4.0 s", ""],
    ["Why it turns the join round", "one bucket holding 1,800,000 rows would be searched like a list by every probe that lands in it", "skew", ""],
  ])}
  ${measured("What to read in the plan", `data-on="2"`, [
    ["rows= on the Hash node against actual rows=", "the estimate the table was laid out for, and what it received", "the gap", ""],
    ["(originally …) after Buckets or Batches", "the hash table was rebuilt during the query", "a wrong estimate", "slow"],
    ["The larger table under the Hash node", "the planner had a reason not to store the smaller one", "look at its keys", ""],
  ])}`;

export default { render: build({ stepper, key: "he", label: "A hash join and its estimates", css: css("he") + `.lw .he .measured td { font-size:15px; } .lw .he .measured td + td { font-size:19px; }`, steps, scene }) };
