// agd-walk-actors — "Which actors appear in the most films?": a join through the link table
// film_actor. Run shown: walk_actors of agd-recorded.json (gemini-3.5-flash-lite, 2026-11-23); the
// hand rows are the page's SQL cell, measured on the lab's Pagila the same day.
import { walk } from "./agd-walk-lib.js";

export default walk({
  name: "walk_actors", label: "A join through a link table", answer: "GINA DEGENERES · 42",
  right: (r) => /gina degeneres/i.test(r.answer ?? "") && /42/.test(r.answer ?? ""), mark: /JOIN film_actor[^\n]*/i,
  titles: ["It counts the rows of the link table", "Checked: the same three at the top"],
  notes: ["An actor and a film meet in <code>film_actor</code>, one row per appearance. The agent counted those rows per actor and never joined <code>film</code>: the count needs nothing from it.",
    "The question says “actors”, so the agent fetched five and named the top three. Its numbers match the hand-written query row for row."],
  hand: { sql: "SELECT a.first_name, a.last_name, count(*) AS films\nFROM actor a\nJOIN film_actor fa USING (actor_id)\nGROUP BY a.actor_id, a.first_name, a.last_name\nORDER BY films DESC\nLIMIT 5;",
    cols: ["first_name", "last_name", "films"], rows: [["GINA", "DEGENERES", "42"], ["WALTER", "TORN", "41"], ["MARY", "KEITEL", "40"], ["MATTHEW", "CARREY", "39"], ["SANDRA", "KILMER", "37"]] },
  verdict: "GINA DEGENERES 42, WALTER TORN 41, MARY KEITEL 40",
});
