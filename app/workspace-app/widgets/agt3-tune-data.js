// agt3-tune-data — recorded runs the tuning widget draws. Not a widget.
// All runs: the page's own scorer (build, run, score) on the reference warehouse agent,
// gemini-3.5-flash-lite, agents lab, 2026-11-24. Round 1 of each; the other rounds gave the same totals
// (patched: 3 rounds, held-out 3 of 4 each time; the rule: 2 rounds, 8 of 8 and 4 of 4).
export const MODEL = "gemini-3.5-flash-lite";

export const TUNING = [
  "Chicago, busiest hour, 2026-11-12",
  "Boston, empty share, morning rush, 2026-11-10",
  "New York, stations reporting, yesterday",
  "Chicago, stations reporting, no day given",
  "Busier on 2026-11-11: Boston or Washington",
  "Washington, average bikes, 2026-11-13",
  "Revenue in October",
  "Quieter on 2026-11-11: Boston or Washington",
];
export const HELD_OUT = [
  "Mexico City, quietest hour, 2026-11-11",
  "Montreal, empty share, evening rush, 2026-11-04",
  "Philadelphia, stations reporting, the day before yesterday",
  "Paris, stations reporting, no day given",
];

// Per question: passed, the value the check read, the expected value, the tools called, MB read.
export const RUNS = {
  weak: {
    instruction: "You answer questions about bike-share stations.",
    tuning: [[false, "11", "10", ["list_metrics", "query_metrics", "list_metrics", "query_metrics", "query_metrics"], 510], [false, "0.0949", "0.0885", ["list_metrics", "query_metrics"], 34], [true, "2519", "2519", ["list_metrics", "query_metrics"], 144], [false, "a query ran", "no query ran", ["list_metrics", "query_metrics", "query_metrics"], 90], [true, "bluebikes", "bluebikes", ["list_metrics", "query_metrics", "query_metrics"], 184], [true, "6.82", "6.82", ["list_metrics", "query_metrics"], 49], [true, "no query ran", "no query ran", ["list_metrics", "list_metrics"], 0], [true, "cabi", "cabi", ["list_metrics", "query_metrics", "list_metrics", "query_metrics"], 184]],
    held: [[false, "4", "21", ["list_metrics", "query_metrics"], 44], [false, "0.0663", "0.0702", ["list_metrics", "query_metrics"], 53], [true, "325", "325", ["list_metrics", "query_metrics"], 64], [false, "a query ran", "no query ran", ["list_metrics", "query_metrics", "query_metrics"], 238]],
  },
  fitted: {
    instruction: "You answer questions about bike-share stations.\nBusiest means the highest empty_share. The morning rush is the local hours 6, 7, 8 and 9: filter the hour dimension with those values.\nIf a question names no day, do not call query_metrics at all: reply only by asking which days. Yesterday is the last day the data covers.",
    tuning: [[true, "10", "10", ["list_metrics", "query_metrics"], 105], [true, "0.0885", "0.0885", ["list_metrics", "query_metrics"], 34], [true, "2519", "2519", ["list_metrics", "query_metrics"], 144], [true, "no query ran", "no query ran", ["list_metrics"], 0], [true, "bluebikes", "bluebikes", ["list_metrics", "query_metrics"], 62], [true, "6.82", "6.82", ["list_metrics", "query_metrics", "query_metrics"], 168], [true, "no query ran", "no query ran", ["list_metrics"], 0], [true, "cabi", "cabi", ["list_metrics", "query_metrics"], 62]],
    held: [[true, "21", "21", ["list_metrics", "query_metrics"], 44], [false, "0.0564", "0.0702", ["list_metrics", "query_metrics"], 53], [true, "325", "325", ["list_metrics", "query_metrics"], 30], [true, "no query ran", "no query ran", ["list_metrics"], 0]],
  },
  general: {
    words: 130, // the instruction itself is not shipped: writing it is the task
    tuning: [[true, "10", "10", ["list_metrics", "query_metrics"], 105], [true, "0.0885", "0.0885", ["list_metrics", "query_metrics"], 34], [true, "2519", "2519", ["list_metrics", "query_metrics"], 144], [true, "no query ran", "no query ran", ["list_metrics"], 0], [true, "bluebikes", "bluebikes", ["list_metrics", "query_metrics"], 62], [true, "6.82", "6.82", ["list_metrics", "query_metrics"], 49], [true, "no query ran", "no query ran", ["list_metrics"], 0], [true, "cabi", "cabi", ["list_metrics", "query_metrics"], 62]],
    held: [[true, "21", "21", ["list_metrics", "query_metrics"], 44], [true, "0.0702", "0.0702", ["list_metrics", "query_metrics"], 53], [true, "325", "325", ["list_metrics", "query_metrics"], 30], [true, "no query ran", "no query ran", ["list_metrics"], 0]],
  },
};

// "How many stations reported in Chicago?" under two wordings of the same rule, one run each
// (the same scorer, 2026-11-24): the text, whether a query ran, the tools called.
export const ASK = [
  ["If a question gives no days, ask for them.", true, ["list_metrics", "query_metrics", "query_metrics"]],
  ["A question must name its days. If it names no day and no range of days, do not call query_metrics at all: reply only by asking which days. Never choose days yourself.", false, ["list_metrics"]],
];
