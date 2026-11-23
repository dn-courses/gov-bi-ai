// agd-walk-count — the walkthrough's first question, "How many films do we have?": the SQL the agent
// wrote, then the same count written by hand. Run shown: walk_count of agd-recorded.json
// (gemini-3.5-flash-lite, 2026-11-23); the hand count is the page's SQL cell, run on the lab's Pagila.
import { walk } from "./agd-walk-lib.js";

export default walk({
  name: "walk_count", label: "A count", answer: "1,000 films",
  right: (r) => /1,?000/.test(r.answer ?? ""), mark: /count\(\*\)/i,
  titles: ["It looks, then counts in SQL", "The same number as by hand"],
  notes: ["It listed the tables, read the columns of <code>film</code>, and sent one <code>count(*)</code>. The counting happened in the database; the model read one number back.",
    "The agent's query and the hand-written one are the same statement. When the SQL is this plain, reading the SQL is checking the answer."],
  hand: { sql: "SELECT count(*) AS films FROM film;", cols: ["films"], rows: [["1000"]] },
  verdict: "the agent's number equals the hand-written one",
});
