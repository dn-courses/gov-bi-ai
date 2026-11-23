"""BigQuery for the workspace app's `bigquery` cells.

Reads one JSON object per line on stdin and answers with one JSON line:

    {"code": ...}  ->  {"out": <the result, then what the job did>, "error": ...}

A cell whose first line is `-- dry run` is priced and not run. Every query is refused above
`BIGQUERY_MAX_GB_PER_QUERY` (default 100), and the result cache is off, so a cell always reports the
work of a real run. The client is made on first use from the key file named by
`GOOGLE_APPLICATION_CREDENTIALS`; a lab without one answers with how to connect it.
"""

import json
import os
import sys
from pathlib import Path
from typing import Any

SHOWN_ROWS = 40
DRY_RUN_MARK = "-- dry run"
NOT_CONNECTED = (
    "BigQuery is not connected in this lab. Put the key file you were given at "
    "secrets/bigquery-key.json in the course folder, then start the app again."
)


class NotConnected(Exception):
    """This lab has no BigQuery key."""


def new_client() -> Any:
    key = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    if not key or not Path(key).is_file():
        raise NotConnected(NOT_CONNECTED)
    from google.cloud import bigquery  # imported late: the app starts without credentials

    return bigquery.Client.from_service_account_json(key)


def job_config(dry_run: bool) -> Any:
    from google.cloud import bigquery

    config = bigquery.QueryJobConfig(dry_run=dry_run, use_query_cache=False)
    if not dry_run:
        max_gb = float(os.environ.get("BIGQUERY_MAX_GB_PER_QUERY", "100"))
        config.maximum_bytes_billed = int(max_gb * 1e9)
    return config


def size(byte_count: int | None) -> str:
    amount = float(byte_count or 0)
    for unit in ("bytes", "kB", "MB", "GB"):
        if amount < 1000:
            return f"{amount:,.0f} {unit}" if unit == "bytes" else f"{amount:,.1f} {unit}"
        amount /= 1000
    return f"{amount:,.2f} TB"


def is_number(text: str) -> bool:
    return text.replace(",", "").replace(".", "").isdigit()


def table(header: list[str], rows: list[list[str]]) -> str:
    """Fixed-width text; a column of numbers is right-aligned."""
    columns = range(len(header))
    widths = [max(len(line[i]) for line in [header, *rows]) for i in columns]
    numeric = [bool(rows) and all(is_number(row[i]) for row in rows) for i in columns]

    def line(cells: list[str]) -> str:
        placed = [
            cell.rjust(width) if right else cell.ljust(width)
            for cell, width, right in zip(cells, widths, numeric, strict=True)
        ]
        return " | ".join(placed).rstrip()

    rule = "-+-".join("-" * width for width in widths)
    return "\n".join([line(header), rule, *(line(row) for row in rows)])


def result_text(job: Any) -> str:
    result = job.result(max_results=SHOWN_ROWS)
    header = [field.name for field in result.schema]
    rows = [["" if value is None else str(value) for value in row.values()] for row in result]
    if not header:
        return "Done."
    shown = table(header, rows)
    more = (result.total_rows or 0) - len(rows)
    return shown + (f"\n… and {more:,} more rows" if more > 0 else f"\n({len(rows)} rows)")


def stages_text(job: Any) -> str:
    """One line per stage; the last two columns are one worker's compute time, average and slowest."""
    header = ["stage", "parallel inputs", "rows read", "rows written", "shuffled out", "slot time"]
    header += ["worker avg", "worker max"]
    rows = [
        [
            stage.name,
            f"{stage.parallel_inputs or 0:,}",
            f"{stage.records_read or 0:,}",
            f"{stage.records_written or 0:,}",
            size(stage.shuffle_output_bytes),
            f"{(stage.slot_ms or 0) / 1000:,.1f} s",
            f"{(stage.compute_ms_avg or 0) / 1000:,.2f} s",
            f"{(stage.compute_ms_max or 0) / 1000:,.2f} s",
        ]
        for stage in job.query_plan
    ]
    return table(header, rows)


def job_text(job: Any) -> str:
    elapsed = (job.ended - job.started).total_seconds()
    slot_seconds = (job.slot_millis or 0) / 1000
    summary = (
        f"Elapsed {elapsed:.1f} s. Read {size(job.total_bytes_processed)}. "
        f"Slot time {slot_seconds:,.0f} s ({slot_seconds / 60:,.1f} minutes of work)."
    )
    return f"{summary}\n\n{stages_text(job)}"


def run(client: Any, code: str) -> str:
    dry_run = code.lstrip().lower().startswith(DRY_RUN_MARK)
    job = client.query(code, job_config=job_config(dry_run))
    if dry_run:
        return f"Not run. This query would read {size(job.total_bytes_processed)}."
    shown = result_text(job)
    return f"{shown}\n\n{job_text(job)}"


def main() -> None:
    client: Any = None
    for line in sys.stdin:
        try:
            client = client or new_client()
            reply = {"out": run(client, json.loads(line)["code"]), "error": None}
        except Exception as raised:  # a cell shows any failure of its query; the session lives on
            reply = {"out": "", "error": str(raised)}
        sys.stdout.write(json.dumps(reply) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
