"""BigQuery for the workspace app's `bigquery` cells.

Reads one JSON object per line on stdin and answers with one JSON line:

    {"code": ...}  ->  {"out": <the result, then what the job did>, "error": ...}

A cell whose first line is `-- dry run` is priced and not run, and is never refused. A real run is
priced by a dry run first and not run when it would cost more than `BIGQUERY_MAX_DOLLARS_PER_QUERY`
(default $0.05): the cell then shows the bytes and the price. BigQuery's result cache is off, so a
cell reports the work of a real run; but a SELECT or a CREATE TABLE … AS SELECT asked again while
its tables have not changed is answered from the app's own cache, with the first run's numbers
(bq_guard.py). A table created or dropped under a bare name is the participant's own, and the
shared lab tables may be named bare (`store_lab.rewrite`); such a statement answers with what it
took. Every other cell is sent as written. The client is made on first use from the key file named
by `GOOGLE_APPLICATION_CREDENTIALS`; a lab without one answers with how to connect it.
"""

import functools
import json
import os
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

from bq_guard import FROM_CACHE, Cache, cached, check_price, max_bytes, quote, tables_state
from store_lab import made_text, rewrite

SHOWN_ROWS = 40
DRY_RUN_MARK = "-- dry run"
NOT_CONNECTED = (
    "BigQuery is not connected in this lab. Put the key file you were given at "
    "secrets/bigquery-key.json in the course folder, then start the app again."
)


CACHE: Cache = {}  # the rewritten statement -> (its tables' state, the cell's output)


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
        config.maximum_bytes_billed = max_bytes()
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


def real_run(client: Any, sql: str, config: Callable[[bool], Any], own: bool) -> str:
    """`own`: completed with the participant's names; it says what it made and what that took."""
    job = client.query(sql, job_config=config(False))
    if own:
        job.result()
        if job.ddl_target_table:
            return made_text(job)
    return f"{result_text(job)}\n\n{job_text(job)}"


def run(client: Any, code: str, config: Callable[[bool], Any] = job_config, cache: Cache = CACHE) -> str:
    sql = rewrite(code)
    if code.lstrip().lower().startswith(DRY_RUN_MARK):
        job = client.query(sql, job_config=config(True))
        return f"Not run. This query would read {size(job.total_bytes_processed)}."
    quoted = quote(client, sql, config)
    check_price(quoted)
    state_of = functools.partial(tables_state, client, quoted)
    out, hit = cached(cache, sql, state_of, lambda: real_run(client, sql, config, own=sql != code))
    return f"{out}\n\n{FROM_CACHE}" if hit else out


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
