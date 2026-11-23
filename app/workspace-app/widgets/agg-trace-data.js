// agg-trace-data — one recorded trace the trace widget draws. Not a widget.
// Phoenix (arizephoenix/phoenix:version-22.0.1) in the agents lab, project warehouse_agent, trace
// a594d6947340c47d1c589ef1961f8e1a, 2026-11-23: the warehouse agent (gemini-3.5-flash-lite) asked
// "At what hour of the day were New York's stations emptiest on 2026-09-15?". Read back with
// GET /v1/projects/warehouse_agent/spans. Columns: name, span_kind, parent, start (ms from the
// trace's start), duration ms, prompt tokens, completion tokens. The three BigQuery spans come
// from google-cloud-bigquery's own tracing: the dry run, the run, the fetch of the rows.
export const QUESTION = "At what hour of the day were New York's stations emptiest on 2026-09-15?";
export const SPANS = [
  ["invocation [warehouse_agent]", "CHAIN", "", 0, 5936, null, null],
  ["agent_run [warehouse_agent]", "AGENT", "invocation", 4, 5929, null, null],
  ["call_llm", "LLM", "agent_run", 45, 1618, 408, 10],
  ["execute_tool list_metrics", "TOOL", "agent_run", 1631, 0, null, null],
  ["call_llm", "LLM", "agent_run", 1670, 3308, 652, 77],
  ["execute_tool query_metrics", "TOOL", "agent_run", 2352, 2624, null, null],
  ["BigQuery.job.begin · dry run", "UNKNOWN", "query_metrics", 2399, 812, null, null],
  ["BigQuery.job.begin · run", "UNKNOWN", "query_metrics", 3257, 853, null, null],
  ["BigQuery.getQueryResults", "UNKNOWN", "query_metrics", 4114, 397, null, null],
  ["call_llm", "LLM", "agent_run", 4980, 948, 1163, 74],
];
