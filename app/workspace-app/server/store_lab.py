"""BigQuery as one participant sees it, for "Hands-on: Choose the Store".

`bq(sql)` is in every Python cell's namespace (python_runner.py puts it there): it runs one statement
in the participant's own dataset and prints what it took. A table named without a dataset is the
participant's own (`w4` is `enjoytech-bq-lab.sandbox_p07.w4`); the shared tables may be named bare
(`lab_station_status`, `station_status_partitioned`). The dataset comes from the key's `client_email`:
student-p07 owns sandbox_p07. Every statement is refused, free of charge, above 5 GB billed.
`measure_runner.py` (the page's Measure buttons) runs its queries through the same `run_job`.
"""

import functools
import json
import os
import re
from pathlib import Path
from typing import Any

PROJECT = "enjoytech-bq-lab"
SHARED = re.compile(r"(?<![\w.-])`?(lab_station_status|station_status_partitioned)`?(?![\w.])")
OWN_TABLE = re.compile(r"w[1-8]")
MAX_BYTES_BILLED = 5 * 10**9
PRICE_PER_TIB = 6.25  # on demand, US
MB = 2**20  # the unit PostgreSQL prints and BigQuery's 10 MB minimum is counted in
NOT_CONNECTED = (
    "BigQuery is not connected in this lab. Put the key file you were given at "
    "secrets/bigquery-key.json in the course folder, then start the app again."
)
OVER_THE_CAP = "Refused, free of charge: this would bill more than the 5 GB limit. Read fewer columns or rows"
OUT_OF_QUOTA = "Nothing ran: this key has used up its BigQuery quota for today."


def sandbox_of(client_email: str) -> str:
    """student-p07@… owns sandbox_p07; student-agents-test@… owns sandbox_agents_test."""
    return "sandbox_" + client_email.split("@")[0].removeprefix("student-").replace("-", "_")


def qualify(sql: str) -> str:
    """Name the shared tables in full. A participant's own table stays bare: the default dataset."""
    return SHARED.sub(lambda found: f"`{PROJECT}.gbfs.{found.group(1)}`", sql)


@functools.cache
def lab() -> tuple[Any, str]:
    """The BigQuery client and the participant's dataset, made on first use from the lab's key."""
    key = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    if not key or not Path(key).is_file():
        raise RuntimeError(NOT_CONNECTED)
    from google.cloud import bigquery  # imported late: the app starts without credentials

    info = json.loads(Path(key).read_text())
    return bigquery.Client.from_service_account_info(info), sandbox_of(info["client_email"])


def readable(message: str) -> str:
    """BigQuery's refusal, with what it means in front when it is one of the two limits."""
    message = message.split("; reason:")[0].strip()  # the library repeats it, with the job's id
    low = message.lower()
    if "bytes billed" in low:
        return f"{OVER_THE_CAP}\n(BigQuery: {message})"
    if "quota" in low:
        return f"{OUT_OF_QUOTA}\n(BigQuery: {message})"
    return message


def run_job(sql: str) -> Any:
    """Run one statement for real: cache off, the 5 GB cap, bare table names in the own dataset."""
    from google.api_core.exceptions import GoogleAPICallError
    from google.cloud import bigquery

    client, sandbox = lab()
    config = bigquery.QueryJobConfig(
        use_query_cache=False, maximum_bytes_billed=MAX_BYTES_BILLED, default_dataset=f"{PROJECT}.{sandbox}"
    )
    try:
        job = client.query(qualify(sql), job_config=config)
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


def dollars(bytes_billed: int) -> float:
    return bytes_billed / 2**40 * PRICE_PER_TIB


def bq(sql: str) -> None:
    """Run one statement on BigQuery, in your own dataset, and print what it took."""
    job = run_job(sql)
    billed = job.total_bytes_billed or 0
    target = job.ddl_target_table
    what = (job.statement_type or "statement").replace("_", " ")
    print(f"{what}: {target.dataset_id}.{target.table_id}" if target else f"{what}: done")
    print(f"  time    {time_text((job.ended - job.started).total_seconds())}")
    print(f"  billed  {size_text(billed)}")
    print(f"  cost    ${dollars(billed):.4f}")


def drop_indexes(keep_mine: bool) -> list[str]:
    """Drop station_status's indexes: all but the participant's (ho_…), or only those."""
    import psycopg

    mine = "NOT LIKE" if keep_mine else "LIKE"
    find = "SELECT indexname FROM pg_indexes WHERE tablename = 'station_status' AND indexname "
    find += f"{mine} 'ho!_%' ESCAPE '!'"
    with psycopg.connect(autocommit=True) as conn:
        names = [name for (name,) in conn.execute(find).fetchall()]
        for name in names:
            conn.execute(f'DROP INDEX "{name}"')
    return names


def clean_up() -> None:
    """Remove what the hands-on built: the ho_… indexes, and the tables w1 … w8 of the own dataset."""
    print(f"dropped {len(drop_indexes(keep_mine=False))} index(es)")
    client, sandbox = lab()
    tables = [t for t in client.list_tables(f"{PROJECT}.{sandbox}") if OWN_TABLE.fullmatch(t.table_id)]
    for table in tables:
        client.delete_table(table.reference)
    print(f"dropped {len(tables)} table(s) of {sandbox}")
