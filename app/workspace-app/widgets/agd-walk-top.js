// agd-walk-top — "Which customer has spent the most?": a join and a sum, written by the agent, then
// by hand. Run shown: walk_top of agd-recorded.json (gemini-3.5-flash-lite, 2026-11-23: all four runs
// sent this statement); the hand rows are the page's SQL cell, measured on the lab's Pagila the same day.
import { walk } from "./agd-walk-lib.js";

export default walk({
  name: "walk_top", label: "A join", answer: "KARL SEAL · 221.55",
  right: (r) => /karl seal/i.test(r.answer ?? "") && /221\.55/.test(r.answer ?? ""), mark: /GROUP BY c\.customer_id[^\n]*/,
  titles: ["It joins payments to customers, and groups by the key", "Checked: the same customer, the same sum"],
  notes: ["It described <code>customer</code> and <code>payment</code> in one turn, then wrote the join. It grouped by <code>customer_id</code>, not by the name alone: two customers who share a name stay two.",
    "The hand-written query returns three rows, to show the gap to the next customer. The agent asked for one, which is what the question asked."],
  hand: { sql: "SELECT c.first_name, c.last_name, sum(p.amount) AS total\nFROM customer c\nJOIN payment p USING (customer_id)\nGROUP BY c.customer_id, c.first_name, c.last_name\nORDER BY total DESC\nLIMIT 3;",
    cols: ["first_name", "last_name", "total"], rows: [["KARL", "SEAL", "221.55"], ["ELEANOR", "HUNT", "216.54"], ["CLARA", "SHAW", "195.58"]] },
  verdict: "KARL SEAL, 221.55, in every run",
});
