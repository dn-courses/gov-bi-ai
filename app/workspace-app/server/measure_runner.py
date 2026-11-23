"""The Measure buttons of "Hands-on: Choose the Store": one workload's query, on one store.

Reads one JSON object per line on stdin and answers with one JSON line, as the cell runners do:

    {"code": "{\"workload\": \"W4\", \"store\": \"pg\"}"}  ->  {"out": <the result as JSON>, "error": ...}

The result is three tiles (data read, latency, cost a month), each a label, a value and a line under it, and
`on`: what was measured. The queries are fixed here, and the page shows the same text.

PostgreSQL: the query under EXPLAIN (ANALYZE, BUFFERS), three times in a transaction that is rolled
back; data read is page visits × 8 kB. Before it, every index of station_status that is not the
participant's (ho_…) is dropped: the exercise starts from a table with no index. W6 to W8 run on the
real capture, which is not on PostgreSQL: their figures are the answer key's arithmetic.
BigQuery: the query on the participant's table for that workload (`w4`) when there is one, else on
the shared table; one real run, cache off, refused above 5 GB.
"""

import json
import statistics
import sys
from typing import Any, NamedTuple

from store_lab import PROJECT, SHARED, dollars, drop_indexes, lab, run_job, size_text, time_text

PAGE_BYTES = 8192
# Cloud SQL for PostgreSQL, Enterprise, Iowa, one zone, on demand: $0.0413 a vCPU-hour, $0.007 a
# GiB-hour of memory, SSD $0.17 a GiB-month (cloud.google.com/sql/pricing, read 2026-11-23).
MACHINE_A_MONTH = (4 * 0.0413 + 16 * 0.007) * 730  # 4 vCPU, 16 GiB
SERVER_A_MONTH = MACHINE_A_MONTH + 20 * 0.17  # with 20 GiB of disk: the lab table
CAPTURE_SERVER_A_MONTH = MACHINE_A_MONTH + 500 * 0.17  # with 500 GiB: the real capture
RENT = "the server's rent, however many runs"
WEEK = "captured_at >= '2026-10-12' AND captured_at < '2026-10-19'"
CAPTURE = "station_status_partitioned"


class Workload(NamedTuple):
    runs: int  # a month
    bq: str
    pg: str | None = None  # None: the real capture, which is not on PostgreSQL


WORKLOADS = {
    "W1": Workload(
        100_000,
        "SELECT captured_at, bikes_available, docks_available FROM lab_station_status\n"
        "WHERE station_id = 6 ORDER BY captured_at DESC LIMIT 1",
        "SELECT captured_at, bikes_available, docks_available FROM station_status\n"
        "WHERE station_id = 6 ORDER BY captured_at DESC LIMIT 1",
    ),
    "W2": Workload(
        100,
        "UPDATE lab_station_status SET bikes_available = 7\n"
        "WHERE station_id = 6 AND captured_at = '2026-08-15 12:00:00+00'",
        "UPDATE station_status SET bikes_available = 7\n"
        "WHERE station_id = 6 AND captured_at = '2026-08-15 12:00:00+00'",
    ),
    "W3": Workload(
        4_400,
        "SELECT TIMESTAMP_TRUNC(captured_at, HOUR) AS hour, AVG(bikes_available) AS bikes\n"
        "FROM lab_station_status\n"
        "WHERE system_id = 'NYC' AND captured_at >= '2026-08-15' AND captured_at < '2026-08-16'\n"
        "GROUP BY hour ORDER BY hour",
        "SELECT date_trunc('hour', captured_at) AS hour, avg(bikes_available) AS bikes\n"
        "FROM station_status\n"
        "WHERE system_id = 'NYC' AND captured_at >= '2026-08-15' AND captured_at < '2026-08-16'\n"
        "GROUP BY 1 ORDER BY 1",
    ),
    "W4": Workload(
        500,
        "SELECT TIMESTAMP_TRUNC(captured_at, HOUR) AS hour, AVG(bikes_available) AS bikes\n"
        "FROM lab_station_status\n"
        "WHERE station_id = 6 GROUP BY hour ORDER BY hour",
        "SELECT date_trunc('hour', captured_at) AS hour, avg(bikes_available) AS bikes\n"
        "FROM station_status\n"
        "WHERE station_id = 6 GROUP BY 1 ORDER BY 1",
    ),
    "W5": Workload(
        4_400,
        "SELECT TIMESTAMP_TRUNC(captured_at, MONTH) AS month, system_id, AVG(bikes_available) AS bikes\n"
        "FROM lab_station_status GROUP BY month, system_id ORDER BY month, system_id",
        "SELECT date_trunc('month', captured_at) AS month, system_id, avg(bikes_available) AS bikes\n"
        "FROM station_status GROUP BY 1, 2 ORDER BY 1, 2",
    ),
    "W6": Workload(
        4_400,
        "SELECT system_id, AVG(num_bikes_available) AS bikes, COUNT(*) AS readings\n"
        f"FROM {CAPTURE}\nWHERE {WEEK}\nGROUP BY system_id ORDER BY system_id",
    ),
    "W7": Workload(
        500,
        "SELECT system_id, EXTRACT(HOUR FROM captured_at) AS hour, AVG(num_bikes_available) AS bikes\n"
        f"FROM {CAPTURE}\nWHERE {WEEK} AND num_bikes_available IS NOT NULL\n"
        "GROUP BY system_id, hour\n"
        "QUALIFY ROW_NUMBER() OVER (PARTITION BY system_id ORDER BY bikes) = 1 ORDER BY system_id",
    ),
    "W8": Workload(
        500,
        "SELECT DATE(captured_at) AS day, system_id, COUNT(DISTINCT station_id) AS stations\n"
        f"FROM {CAPTURE}\nWHERE {WEEK}\nGROUP BY day, system_id ORDER BY day, system_id",
    ),
}


def explain(cursor: Any, sql: str) -> tuple[int, float]:
    """One run: its page visits (found in memory or read from disk) and its execution time."""
    cursor.execute("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + sql)
    top = cursor.fetchone()[0][0]
    return top["Plan"]["Shared Hit Blocks"] + top["Plan"]["Shared Read Blocks"], top["Execution Time"] / 1000


def arithmetic(name: str) -> dict[str, Any]:
    """W6 to W8 on PostgreSQL: the answer key's arithmetic, since the capture is not in the lab."""
    sort = " and a sort" if name == "W8" else ""
    tiles = [
        ["data read", "about 23 GiB", "one week = 3.87 lab tables of 6,075 MB"],
        ["latency", f"about 98 s{sort}", "23,511 MiB ÷ 240 MiB/s, the disk's speed"],
        ["cost a month", f"${CAPTURE_SERVER_A_MONTH:,.2f}", f"{RENT}; 500 GiB of disk"],
    ]
    on = "Arithmetic, not a run: the real capture (about 413 GiB as a row table) does not fit the lab."
    return {"tiles": tiles, "on": on, "arithmetic": True}


def measure_pg(name: str, work: Workload) -> dict[str, Any]:
    if work.pg is None:
        return arithmetic(name)
    import psycopg

    drop_indexes(keep_mine=True)
    with psycopg.connect() as conn, conn.cursor() as cursor:
        found = "SELECT indexname FROM pg_indexes WHERE tablename = 'station_status' ORDER BY 1"
        indexes = [index for (index,) in cursor.execute(found).fetchall()]
        took = [explain(cursor, work.pg) for _ in range(3)]
        conn.rollback()
    pages = took[-1][0]
    tiles = [
        ["data read", size_text(pages * PAGE_BYTES), f"{pages:,} page visits × 8 kB"],
        ["latency", time_text(statistics.median(seconds for _, seconds in took)), "median of 3 runs"],
        ["cost a month", f"${SERVER_A_MONTH:,.2f}", RENT],
    ]
    have = f"with your indexes: {', '.join(indexes)}" if indexes else "with no index"
    return {"tiles": tiles, "on": f"Measured on station_status, {have}. Nothing was changed."}


def table_for(name: str) -> tuple[str | None, str]:
    """The participant's table for this workload when it exists (else None), and how to say it."""
    from google.api_core.exceptions import NotFound

    client, sandbox = lab()
    own = f"{sandbox}.{name.lower()}"
    try:
        client.get_table(f"{PROJECT}.{own}")
    except NotFound:
        return None, f"the shared table: you have no table {name.lower()} yet"
    return own, f"your table {own}"


def measure_bq(name: str, work: Workload) -> dict[str, Any]:
    own, said = table_for(name)
    if own is None and work.bq.startswith("UPDATE"):
        raise RuntimeError(f"The shared table is read-only. Create your table {name.lower()} first.")
    sql = SHARED.sub(f"`{PROJECT}.{own}`", work.bq) if own else work.bq
    try:
        job = run_job(sql)
    except RuntimeError as refused:
        raise RuntimeError(f"On {said}:\n{refused}" if own else str(refused)) from None
    billed = job.total_bytes_billed or 0
    a_run = dollars(billed)
    tiles = [
        ["data read", size_text(billed), "bytes billed; at least 10 MB a table"],
        ["latency", time_text((job.ended - job.started).total_seconds()), "one run; it varies"],
        ["cost a month", f"${a_run * work.runs:,.2f}", f"${a_run:.6f} a run × {work.runs:,} runs"],
    ]
    return {"tiles": tiles, "on": f"Measured on {said}."}


def measure(workload: str, store: str) -> dict[str, Any]:
    work = WORKLOADS[workload]
    return measure_pg(workload, work) if store == "pg" else measure_bq(workload, work)


def main() -> None:
    for line in sys.stdin:
        try:
            reply = {"out": json.dumps(measure(**json.loads(json.loads(line)["code"]))), "error": None}
        except Exception as raised:  # the button shows any failure; the session lives on
            reply = {"out": "", "error": str(raised) or type(raised).__name__}
        sys.stdout.write(json.dumps(reply) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
