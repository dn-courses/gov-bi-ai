"""What every real BigQuery run of the app goes through first: a price limit, and a cache.

The limit: every run is priced by a dry run first (free and exact). At or under
`BIGQUERY_MAX_DOLLARS_PER_QUERY` (default $0.05, at $6.25 a TiB about 8.8 GB) it runs for real; over
it, it does not run, and the answer is the dry run's bytes and price. A `-- dry run` cell is never
refused. A CREATE TABLE … AS SELECT is a copy made once, not a query run again and again, and has
its own, higher limit: `BIGQUERY_MAX_DOLLARS_PER_CREATE` (default $0.10). An instructor's cell above
the limit needs the variable raised on the instructor's machine.

The cache: the same thing asked again while nothing it depends on has changed is answered from memory
(of this process) with the first run's numbers. `cached` is given what the answer depends on as a
function: the tables a statement reads and creates with their last-modified times here, the indexes
of a table in measure_runner.py. A change of that state always misses.
"""

import os
from collections.abc import Callable, Hashable
from typing import Any

PRICE_PER_TIB = 6.25  # on demand, US
MAX_DOLLARS = float(os.environ.get("BIGQUERY_MAX_DOLLARS_PER_QUERY", "0.05"))
MAX_CREATE_DOLLARS = float(os.environ.get("BIGQUERY_MAX_DOLLARS_PER_CREATE", "0.10"))
FROM_CACHE = "(from cache: nothing changed since the last run)"
CACHEABLE = ("SELECT", "CREATE_TABLE_AS_SELECT")  # a DROP or an UPDATE always runs

Cache = dict[Hashable, tuple[Any, Any]]  # what was asked -> (the state it was answered in, the answer)


def dollars(byte_count: float) -> float:
    return byte_count / 2**40 * PRICE_PER_TIB


def max_bytes(limit: float = max(MAX_DOLLARS, MAX_CREATE_DOLLARS)) -> int:
    """The limit as BigQuery takes it (`maximum_bytes_billed`): a second guard behind the dry run."""
    return int(limit / PRICE_PER_TIB * 2**40)


def quote(client: Any, sql: str, config: Callable[[bool], Any]) -> Any | None:
    """The statement as a dry run, for its price and the tables it names. None when BigQuery cannot
    price it: the real run then says why."""
    try:
        return client.query(sql, job_config=config(True))
    except Exception:
        return None


class TooExpensive(RuntimeError):
    """A statement the dry run priced above its limit: it was not run. `would` is the bytes it reads."""

    def __init__(self, would: int, limit: float, copy: bool = False) -> None:
        self.would = would
        what, fix = (
            ("This copy", "Copy fewer days or fewer columns")
            if copy
            else ("It", "Read fewer columns or rows")
        )
        of = "for a copy" if copy else "a query"
        super().__init__(
            f"Too expensive to run — not run.\n{what} would read {would / 1e9:,.1f} GB, which costs "
            f"${dollars(would):.2f}; the limit is ${limit:.2f} {of}.\n{fix}."
        )


def check_price(quoted: Any | None, limits: tuple[float, float] = (MAX_DOLLARS, MAX_CREATE_DOLLARS)) -> None:
    """Stop, before anything runs, a statement that would cost more than its limit: (a query's, a copy's)."""
    would = (quoted.total_bytes_processed or 0) if quoted else 0
    copy = bool(quoted) and (quoted.statement_type or "").startswith("CREATE")
    limit = limits[1] if copy else limits[0]
    if dollars(would) > limit:
        raise TooExpensive(would, limit, copy)


def modified(client: Any, table: Any) -> str | None:
    """When the table last changed; None when there is no such table."""
    try:
        return client.get_table(table).modified.isoformat()
    except Exception:
        return None


def tables_state(client: Any, quoted: Any | None) -> tuple[Any, ...] | None:
    """What a statement's answer depends on: each table it reads, and the one it creates, with its
    last change. None for a statement that is never answered from the cache."""
    if quoted is None or quoted.statement_type not in CACHEABLE:
        return None
    tables = list(quoted.referenced_tables or [])
    if quoted.statement_type != "SELECT":
        if quoted.ddl_target_table is None:
            return None
        tables.append(quoted.ddl_target_table)
    return tuple((f"{t.project}.{t.dataset_id}.{t.table_id}", modified(client, t)) for t in tables)


def cached(
    cache: Cache, asked: Hashable, state_of: Callable[[], Any], run: Callable[[], Any]
) -> tuple[Any, bool]:
    """The answer, and whether it came from the cache. A state of None is never cached. The state is
    read again after a run: what the run itself changed (a table it created) is part of its answer."""
    state = state_of()
    hit = cache.get(asked)
    if state is not None and hit and hit[0] == state:
        return hit[1], True
    answer = run()
    if state is not None:
        cache[asked] = (state_of(), answer)
    return answer, False
