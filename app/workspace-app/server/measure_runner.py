"""The Measure buttons of "Hands-on: Choose the Store": one workload's query, on one store.

Reads one JSON object per line on stdin and answers with one JSON line, as the cell runners do:

    {"code": "{\"workload\": \"W4\", \"store\": \"pg\"}"}  ->  {"out": <the result as JSON>, "error": ...}

The result is three tiles (data read, latency, cost a month), each a label, a value and a line under
it; `on`: what was measured; and `best`: the participant's best measurement so far of that workload
on that store, with what they had built for it and how many they made (attempts.py). With
`"look": true` nothing is measured and only `best` is answered. The queries are fixed here, and the
page shows the same text.

PostgreSQL: the query under EXPLAIN (ANALYZE, BUFFERS), three times in a transaction that is rolled
back; data read is page visits × 8 kB. Only the workload's own indexes count: those its cell built,
which carry its tag (`hx_w4__…`, store-cells.ts). Every other index of station_status is dropped
inside that transaction, so it is back afterwards and one exercise's index never helps or slows
another; the drops are not in the latency, which is the query's own execution time. The lab's index
from an earlier page (a hint) is dropped for good. W6 to W8 run on the real capture, which is not on
PostgreSQL: a BigQuery button only.
BigQuery: the query on the participant's table for that workload (`w4`) when there is one, else on
the shared table; one real run, cache off. Above the price limit (bq_guard.py) it is not run: the
tiles are the dry run's bytes and price, and the latency says "too expensive to run".
A measurement asked again while nothing changed (the same indexes; the same table, not modified) is
answered from the cache with the first run's numbers, and says so. `"reset": true` puts one
workload back to its start: its indexes and its table dropped, its cached answers and its best
so far forgotten.
"""

import functools
import json
import re
import statistics
import sys
from pathlib import Path
from typing import Any, NamedTuple

import attempts
import store_lab
from bq_guard import FROM_CACHE, MAX_DOLLARS, Cache, TooExpensive, cached, dollars
from store_lab import PROJECT, SHARED, lab, like, run_job, size_text, time_text

PAGE_BYTES = 8192
# Cloud SQL for PostgreSQL, Enterprise, Iowa, one zone, on demand: $0.0413 a vCPU-hour, $0.007 a
# GiB-hour of memory, SSD $0.17 a GiB-month (cloud.google.com/sql/pricing, read 2026-11-23).
MACHINE_A_MONTH = (4 * 0.0413 + 16 * 0.007) * 730  # 4 vCPU, 16 GiB
SERVER_A_MONTH = MACHINE_A_MONTH + 20 * 0.17  # with 20 GiB of disk: the lab table
RENT = "the server's rent, however many runs"
WEEK = "captured_at >= '2026-10-12' AND captured_at < '2026-10-19'"
CAPTURE = "station_status_partitioned"
ON_TABLE = "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'station_status' AND indexname "
INDEXES = ON_TABLE + "LIKE %s ESCAPE '!' ORDER BY 1"  # the workload's own
OTHERS = ON_TABLE + "NOT LIKE %s ESCAPE '!'"
NOT_RUN = 1e9  # added to the score of a measurement that was priced and not run: any real run beats it
CACHE: Cache = {}  # (workload, store) -> (the state it was measured in, the answer)


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


def own_indexes(workload: str) -> str:
    """The LIKE pattern of one workload's indexes: those its cell built, hx_w4__…"""
    return like(store_lab.tag_of(workload))


def shown(definition: str) -> str:
    """An index as the participant wrote it: without the tag, the schema and the default method."""
    plain = re.sub(r"hx_w[1-8]__", "", definition).replace(" ON public.", " ON ")
    return plain.replace(" USING btree ", " ")


def pg_state(workload: str) -> tuple[Any, ...]:
    """What a PostgreSQL measurement depends on: the workload's own indexes."""
    import psycopg

    with psycopg.connect(autocommit=True) as conn:
        conn.execute(f"DROP INDEX IF EXISTS {store_lab.LAB_INDEX}")
        return tuple(conn.execute(INDEXES, [own_indexes(workload)]).fetchall())


def measure_pg(workload: str, work: Workload) -> dict[str, Any]:
    import psycopg

    mine = own_indexes(workload)
    with psycopg.connect() as conn, conn.cursor() as cursor:
        for name, _ in cursor.execute(OTHERS, [mine]).fetchall():
            cursor.execute(f'DROP INDEX "{name}"')  # another workload's: back at the rollback below
        indexes = cursor.execute(INDEXES, [mine]).fetchall()
        took = [explain(cursor, work.pg or "") for _ in range(3)]
        conn.rollback()
    pages, seconds = took[-1][0], statistics.median(seconds for _, seconds in took)
    tiles = [
        ["data read", size_text(pages * PAGE_BYTES), f"{pages:,} page visits × 8 kB"],
        ["latency", time_text(seconds), "median of 3 runs"],
        ["cost a month", f"${SERVER_A_MONTH:,.2f}", RENT],
    ]
    names = ", ".join(shown(name) for name, _ in indexes)
    have = f"with the indexes of this exercise's cell: {names}" if indexes else "with no index"
    on = f"Measured on station_status, {have}. Nothing was changed."
    what = [shown(definition) for _, definition in indexes] or ["no index"]
    return {"tiles": tiles, "on": on, "what": what, "score": [seconds, pages]}


def own_table(name: str) -> tuple[str, Any | None]:
    """The participant's table for this workload: its name, and the table (None: there is none)."""
    client, sandbox = lab()
    own = f"{sandbox}.{name.lower()}"
    try:
        return own, client.get_table(f"{PROJECT}.{own}")
    except Exception:  # not found
        return own, None


def bq_state(name: str) -> tuple[str, ...]:
    """What a BigQuery measurement depends on: the participant's table as it is now, or the shared one."""
    own, table = own_table(name)
    return (own, table.modified.isoformat()) if table else ("shared table",)


def layout(table: Any) -> str:
    """How the participant's table is laid out, as the CREATE TABLE that would make it."""
    lines = [f"CREATE TABLE {table.table_id} ({', '.join(field.name for field in table.schema)})"]
    by_time, by_range = table.time_partitioning, table.range_partitioning
    if by_time:
        field = by_time.field or "_PARTITIONTIME"
        day = by_time.type_ == "DAY"
        lines.append(
            f"PARTITION BY {f'DATE({field})' if day else f'TIMESTAMP_TRUNC({field}, {by_time.type_})'}"
        )
    if by_range:
        lines.append(f"PARTITION BY RANGE_BUCKET({by_range.field}, …)")
    if table.clustering_fields:
        lines.append(f"CLUSTER BY {', '.join(table.clustering_fields)}")
    return "\n".join(lines)


def bq_tiles(byte_count: int, latency: str, under: tuple[str, str], work: Workload) -> list[list[str]]:
    a_run = dollars(byte_count)
    return [
        ["data read", size_text(byte_count), under[0]],
        ["latency", latency, under[1]],
        ["cost a month", f"${a_run * work.runs:,.2f}", f"${a_run:.6f} a run × {work.runs:,} runs"],
    ]


def not_run(costly: TooExpensive, work: Workload, said: str, what: list[str]) -> dict[str, Any]:
    """Above the price limit: the dry run's bytes and price, recorded as an attempt that was not run."""
    tiles = bq_tiles(costly.would, "too expensive to run", ("what the dry run priced", "not run"), work)
    on = f"Not run: one run costs more than the limit of ${MAX_DOLLARS:.2f} a query. Priced on {said}."
    return {
        "tiles": tiles,
        "on": on,
        "what": [*what, "(not run: too expensive)"],
        "score": [NOT_RUN + costly.would, 0],
    }


def measure_bq(name: str, work: Workload) -> dict[str, Any]:
    own, table = own_table(name)
    said = f"your table {own}" if table else f"the shared table: you have no table {name.lower()} yet"
    what = [layout(table) if table else "the shared table, unchanged"]
    if not table and work.bq.startswith("UPDATE"):
        raise RuntimeError(f"The shared table is read-only. Create your table {name.lower()} first.")
    try:
        job = run_job(SHARED.sub(f"`{PROJECT}.{own}`", work.bq) if table else work.bq)
    except TooExpensive as costly:
        return not_run(costly, work, said, what)
    except RuntimeError as refused:
        raise RuntimeError(f"On {said}:\n{refused}" if table else str(refused)) from None
    billed, seconds = job.total_bytes_billed or 0, (job.ended - job.started).total_seconds()
    under = ("bytes billed; at least 10 MB a table", "one run; it varies")
    tiles = bq_tiles(billed, time_text(seconds), under, work)
    return {"tiles": tiles, "on": f"Measured on {said}.", "what": what, "score": [dollars(billed), seconds]}


def reset_workload(workload: str, cache: Cache, file: Path) -> dict[str, Any]:
    """The Reset button: the workload as it was before anything was built for it."""
    gone = store_lab.reset(workload, on_pg=WORKLOADS[workload].pg is not None)
    for store in ("pg", "bq"):
        cache.pop(f"{workload}/{store}", None)
    attempts.forget(file, f"{workload}/")
    return {"reset": f"{workload} is back to its start: {gone}. Its cached answers and its best are cleared."}


def measure(
    workload: str,
    store: str = "",
    look: bool = False,
    reset: bool = False,
    cache: Cache = CACHE,
    file: Path = attempts.FILE,
) -> Any:
    work, key = WORKLOADS[workload], f"{workload}/{store}"
    if reset:
        return reset_workload(workload, cache, file)
    if look:
        return {"best": attempts.look(file, key)}
    if store == "pg" and work.pg is None:
        raise RuntimeError(f"{workload} runs on the real capture, which is not on PostgreSQL.")
    if store == "pg":
        answer, hit = cached(
            cache, key, functools.partial(pg_state, workload), lambda: measure_pg(workload, work)
        )
    else:
        answer, hit = cached(
            cache, key, functools.partial(bq_state, workload), lambda: measure_bq(workload, work)
        )
    if hit:
        return {**answer, "cached": FROM_CACHE, "best": attempts.look(file, key)}
    return {**answer, "best": attempts.record(file, key, answer)}


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
