"""BigQuery as one participant sees it, for "Hands-on: Choose the Store".

`rewrite` is applied to every `bigquery` cell (bigquery_runner.py), and changes only two patterns: a
CREATE [OR REPLACE] TABLE or DROP TABLE whose table is named bare (`w4`, or `{sandbox}.w4`) gets the
participant's own dataset (`enjoytech-bq-lab.sandbox_p07.w4`), and the shared tables named bare
(`lab_station_status`, `station_status_partitioned`) get their full names. A name that already has a
dataset is left alone. The dataset comes from the key's `client_email`: student-p07 owns sandbox_p07.
`measure_runner.py` (the page's Measure buttons) runs its queries through `run_job` and its Reset
buttons through `reset`, and the page's clean-up cell calls `clean_up`.
"""

import functools
import json
import os
import re
from pathlib import Path
from typing import Any

from bq_guard import check_price, dollars, max_bytes, quote

PROJECT = "enjoytech-bq-lab"
SHARED = re.compile(r"(?<![\w.-])`?(lab_station_status|station_status_partitioned)`?(?![\w.])")
# The table a CREATE TABLE or DROP TABLE names, when it names no dataset: `w4`, or `{sandbox}.w4`.
TARGET = re.compile(
    r"\b((?:CREATE(?:\s+OR\s+REPLACE)?|DROP)\s+TABLE(?:\s+IF(?:\s+NOT)?\s+EXISTS)?\s+)"
    r"`?(?:\{sandbox\}\.)?(?!IF\b)(\w+)`?(?![\w.`-])",
    re.IGNORECASE,
)
OWN_TABLE = re.compile(r"w[1-8]")
MB = 2**20  # the unit PostgreSQL prints and BigQuery's 10 MB minimum is counted in
NOT_CONNECTED = (
    "BigQuery is not connected in this lab. Put the key file you were given at "
    "secrets/bigquery-key.json in the course folder, then start the app again."
)
OVER_THE_CAP = "Refused, free of charge: this would bill more than the limit a query may cost."
OUT_OF_QUOTA = "Nothing ran: this key has used up its BigQuery quota for today."


def sandbox_of(client_email: str) -> str:
    """student-p07@… owns sandbox_p07; student-agents-test@… owns sandbox_agents_test."""
    return "sandbox_" + client_email.split("@")[0].removeprefix("student-").replace("-", "_")


def qualify(sql: str) -> str:
    """Name the shared tables in full. A participant's own table stays bare: the default dataset."""
    return SHARED.sub(lambda found: f"`{PROJECT}.gbfs.{found.group(1)}`", sql)


@functools.cache
def key_info() -> dict[str, Any]:
    """The lab's key file, read on first use."""
    key = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    if not key or not Path(key).is_file():
        raise RuntimeError(NOT_CONNECTED)
    return json.loads(Path(key).read_text())


def own_dataset() -> str:
    return sandbox_of(key_info()["client_email"])


def rewrite(sql: str) -> str:
    """A `bigquery` cell as BigQuery gets it: bare shared tables and a bare table to create or drop
    named in full. Anything else, and any name that already has a dataset, is returned as written."""
    sql = qualify(sql)
    if not TARGET.search(sql):
        return sql
    return TARGET.sub(lambda found: f"{found.group(1)}`{PROJECT}.{own_dataset()}.{found.group(2)}`", sql)


@functools.cache
def lab() -> tuple[Any, str]:
    """The BigQuery client and the participant's dataset, made on first use from the lab's key."""
    from google.cloud import bigquery  # imported late: the app starts without credentials

    return bigquery.Client.from_service_account_info(key_info()), own_dataset()


def readable(message: str) -> str:
    """BigQuery's refusal, with what it means in front when it is one of the two limits."""
    message = message.split("; reason:")[0].strip()  # the library repeats it, with the job's id
    low = message.lower()
    if "bytes billed" in low:
        return f"{OVER_THE_CAP}\n(BigQuery: {message})"
    if "quota" in low:
        return f"{OUT_OF_QUOTA}\n(BigQuery: {message})"
    return message


def job_config(dry_run: bool) -> Any:
    """Cache off, the price limit, and bare table names in the participant's own dataset."""
    from google.cloud import bigquery

    own = f"{PROJECT}.{own_dataset()}"
    config = bigquery.QueryJobConfig(dry_run=dry_run, use_query_cache=False, default_dataset=own)
    if not dry_run:
        config.maximum_bytes_billed = max_bytes()
    return config


def run_job(sql: str) -> Any:
    """Run one statement for real, once it is known to cost no more than the limit."""
    from google.api_core.exceptions import GoogleAPICallError

    client, _ = lab()
    sql = qualify(sql)
    check_price(quote(client, sql, job_config))
    try:
        job = client.query(sql, job_config=job_config(False))
        job.result()
    except GoogleAPICallError as refused:  # the reason in a line, without the library's traceback
        raise RuntimeError(readable(refused.message or str(refused))) from None
    return job


def size_text(byte_count: float) -> str:
    """MB below 1 GB, GB from there up (binary units)."""
    mb = byte_count / MB
    if mb >= 1024:
        return f"{mb / 1024:,.2f} GB"
    return f"{mb:,.0f} MB" if mb >= 100 else f"{mb:,.2f} MB"


def time_text(seconds: float) -> str:
    if seconds >= 1:
        return f"{seconds:,.2f} s"
    ms = seconds * 1000
    return f"{ms:,.1f} ms" if ms >= 1 else f"{ms:.3f} ms"


def made_text(job: Any) -> str:
    """What a CREATE TABLE or DROP TABLE in the own dataset did, and what it took."""
    target = job.ddl_target_table
    what = (job.statement_type or "statement").replace("_", " ")
    billed = job.total_bytes_billed or 0
    took = time_text((job.ended - job.started).total_seconds())
    return (
        f"{what}: {target.dataset_id}.{target.table_id}\n"
        f"Elapsed {took}. Billed {size_text(billed)}. Cost ${dollars(billed):.4f}."
    )


LAB_INDEX = "station_status_station_time"  # page 02's index: a hint the hands-on removes


def tag_of(workload: str) -> str:
    """What the workload's cell puts in front of each index it builds (store-cells.ts)."""
    return f"hx_{workload.lower()}__"


def like(prefix: str) -> str:
    """A LIKE pattern for the index names that start with `prefix` (`_` matched as itself)."""
    return prefix.replace("_", "!_") + "%"


def drop_indexes(prefix: str = "hx_") -> list[str]:
    """Drop station_status's indexes whose names start with `prefix`: the exercise cells' (hx_…)."""
    import psycopg

    find = "SELECT indexname FROM pg_indexes WHERE tablename = 'station_status' AND indexname "
    find += "LIKE %s ESCAPE '!'"
    with psycopg.connect(autocommit=True) as conn:
        names = [name for (name,) in conn.execute(find, [like(prefix)]).fetchall()]
        for name in names:
            conn.execute(f'DROP INDEX "{name}"')
    return names


def reset(workload: str, on_pg: bool) -> str:
    """One workload back to its start: every index its cell built (hx_w4__…) and its table w4.
    Says what went."""
    name = workload.lower()
    said = []
    if on_pg:
        gone = [index.removeprefix(tag_of(name)) for index in drop_indexes(tag_of(name))]
        said.append(f"indexes dropped: {', '.join(gone)}" if gone else "no index to drop")
    try:
        client, sandbox = lab()
    except RuntimeError:  # BigQuery not connected: there is no table to drop
        return "; ".join(said)
    client.delete_table(f"{PROJECT}.{sandbox}.{name}", not_found_ok=True)
    return "; ".join([*said, f"your table {sandbox}.{name} dropped if you had one"])


def clean_up() -> None:
    """Remove what the hands-on built: the exercise cells' indexes, and the tables w1 … w8 of the own
    dataset."""
    print(f"dropped {len(drop_indexes())} index(es)")
    client, sandbox = lab()
    tables = [t for t in client.list_tables(f"{PROJECT}.{sandbox}") if OWN_TABLE.fullmatch(t.table_id)]
    for table in tables:
        client.delete_table(table.reference)
    print(f"dropped {len(tables)} table(s) of {sandbox}")
