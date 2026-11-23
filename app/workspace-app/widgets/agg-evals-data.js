// agg-evals-data — recorded runs the evals widget draws. Not a widget.
// All runs: the warehouse agent of the task-2 page, gemini-3.5-flash-lite, agents lab, 2026-11-23.
export const MODEL = "gemini-3.5-flash-lite";

// "At what hour of the day were New York's stations emptiest on 2026-09-15?" asked twice: with the
// model's hour in local time (as shipped), and with one line of model.yml changed to
// EXTRACT(HOUR FROM captured_at) (UTC). Both runs sent the same call; answers quoted as recorded.
export const HOUR = {
  question: "At what hour of the day were New York's stations emptiest on 2026-09-15?",
  call: 'query_metrics(metrics=["empty_share"], dimensions=["hour"], first_day="2026-09-15", last_day="2026-09-15", filters=[system: lyft_nyc])',
  before: { line: "sql: EXTRACT(HOUR FROM captured_at AT TIME ZONE CASE system_id … END)", top: ["11", "0.1112"],
    answer: "On 2026-09-15, New York's stations were emptiest at 11:00 (11 AM), with an empty share of 0.1112." },
  after: { line: "sql: EXTRACT(HOUR FROM captured_at)", top: ["15", "0.1112"],
    answer: "On September 15, 2026, New York's bike-share stations were emptiest at 15:00 (3 PM), with an empty share of approximately 0.1112." },
  // Plain SQL on the table, New York time (105.6 MB): the three emptiest hours.
  truth: [["11", "0.1112"], ["10", "0.1085"], ["9", "0.108"]],
};

// TrajectoryEvaluator, IN_ORDER, threshold 1.0, scored offline against the expected call (no model).
export const SCORED = [
  ["the hour question, local model (answer 11)", 1, "same call as expected"],
  ["the hour question, UTC model (answer 15)", 1, "same call as expected"],
  ["stations in lyft_nyc, dimensions=[\"system\"]", 0, "expected dimensions=[]; same number"],
  ["stations in lyft_nyc, filter keys in another order", 1, "dicts compare equal"],
  ["stations in lyft_nyc, one more argument set to None", 0, "the agent did send filters=null once"],
];

// `adk eval` on three cases (IN_ORDER, threshold 1.0), one run each.
export const EVAL = {
  passed: 2, failed: 1,
  cases: [
    ["empty_by_system", "lyft_chi, 0.4423", 1, 3, 2108, "11.6"],
    ["nyc_stations", "2,520 stations", 0, 3, 2009, "12.0"],
    ["nyc_emptiest_hour", "11:00, 0.1112", 1, 3, 2380, "12.3"],
  ], // id, answer, trajectory score, model calls, tokens, seconds
};
