// agg-data — the measured facts the task-2 widgets (agg-price, agg-gate) draw. Not a widget.
// Measured 2026-11-23 in the agents lab against BigQuery project enjoytech-bq-lab, dataset gbfs:
// dry runs priced with use_query_cache=False; the real runs read under 1 GB each.
export const CAPTURED = {
  // A free-SQL Gemini call (gemini-3.5-flash-lite, recorded 2026-11-23, run 3 of 3): system prompt
  // naming the flat table and its columns, the question below, SQL only. Dry run: 46.1 GB. Run 1
  // wrote invalid SQL ("ORDER:"), run 2 invented system_id = 'citi_bike_ny'; both read 46.1 GB too
  // where they parsed.
  free: {
    model: "gemini-3.5-flash-lite",
    question: "How often are New York's stations empty in the evening?",
    gb: 46.1,
    sql: [
      "WITH ny_stations AS (",
      "  SELECT station_id, captured_at, num_bikes_available",
      "  FROM `enjoytech-bq-lab.gbfs.station_status`",
      "  WHERE system_id LIKE '%ny%'",
      "    AND EXTRACT(HOUR FROM captured_at AT TIME ZONE 'America/New_York')",
      "        BETWEEN 18 AND 22)",
      "SELECT COUNTIF(num_bikes_available = 0) AS empty_count, COUNT(*) AS total_count,",
      "       SAFE_DIVIDE(COUNTIF(num_bikes_available = 0), COUNT(*)) AS empty_proportion",
      "FROM ny_stations;",
    ],
  },
  // The compiler's output for bikes_available by system, one day (semantic.compile_query).
  request: [
    '{ "metrics":    ["bikes_available"],',
    '  "dimensions": ["system"],',
    '  "first_day":  "2026-09-01",',
    '  "last_day":   "2026-09-01" }',
  ],
  sql: [
    "SELECT system_id AS system,",
    "       ROUND(AVG(num_bikes_available), 2) AS bikes_available",
    "FROM `enjoytech-bq-lab.gbfs.station_status_partitioned`",
    "WHERE captured_at >= TIMESTAMP(@first_day)",
    "  AND captured_at < TIMESTAMP_ADD(TIMESTAMP(@last_day), INTERVAL 1 DAY)",
    "GROUP BY 1",
    "ORDER BY 2 DESC",
    "LIMIT 50",
  ],
  // Dry runs of that request (bikes_available by system, the same columns as empty_share by system)
  // over one day, the first week and all of September.
  price: { day: "366.5", month: "11,024" },
  prices: [["one day", 366.5], ["one week", 2567.3], ["September", 11024.2]],
  // A real run of that request (the tool result of the recorded agent run below, 366.5 MB).
  rows: {
    mb: "366.5",
    cols: ["system", "bikes_available"],
    data: [["lyft_nyc", "14.47"], ["Paris", "12.48"], ["Bixi_MTL", "8.97"], ["lyft_bay", "8.31"], ["bluebikes", "8.3"],
      ["cabi", "7.2"], ["…6 more", ""]],
  },
  // Recorded agent run (gemini-3.5-flash-lite, 2026-11-23): "Compare the average bikes available per
  // system over the first week of September 2026." Two refusals, then one day ran (366.5 MB). The
  // answer said it had narrowed the question to one day.
  refused: { what: "a week of every system", mb: "2,567" },
  attempts: [
    ["Sep 1 – Sep 7", "2,567", false],
    ["Sep 1 – Sep 3", "1,100", false],
    ["Sep 1 only", "366.5", true],
  ],
};
