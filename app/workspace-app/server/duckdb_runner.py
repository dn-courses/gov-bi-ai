"""A long-lived DuckDB session for the workspace app's `duckdb` cells and widgets.

DuckDB is a library, not a server: the engine runs inside this process, and its database is whatever
files the statements name. Reads one JSON object per line on stdin and answers with one JSON line:

    {"code": ...}                -> {"out": <the last result, printed as DuckDB prints it>, "error": ...}
    {"code": ..., "rows": true}  -> {"columns": [...], "rows": [[...], ...], "error": ...}   (widgets)
"""

import contextlib
import io
import json
import sys
from typing import Any

import duckdb

SHOWN_ROWS = 40
SHOWN_WIDTH = 160
EXPLAIN_COLUMNS = ["explain_key", "explain_value"]


def printed(connection: duckdb.DuckDBPyConnection, code: str) -> dict[str, Any]:
    """Run a cell; the output is the last statement's result as a table."""
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        result = connection.sql(code)
        if result is not None and result.columns == EXPLAIN_COLUMNS:
            # A plan is a drawing in one cell of a one-row table; print the drawing itself.
            print("\n".join(str(plan) for _, plan in result.fetchall()))
        elif result is not None:
            result.show(max_rows=SHOWN_ROWS, max_width=SHOWN_WIDTH)
    return {"out": out.getvalue().rstrip("\n"), "error": None}


def fetched(connection: duckdb.DuckDBPyConnection, code: str) -> dict[str, Any]:
    """Run a widget's query; the answer is its rows, as JSON values."""
    result = connection.sql(code)
    if result is None:
        return {"columns": [], "rows": [], "error": None}
    rows = json.loads(json.dumps(result.fetchall(), default=str))
    return {"columns": result.columns, "rows": rows, "error": None}


def answer(connection: duckdb.DuckDBPyConnection, request: dict[str, Any]) -> dict[str, Any]:
    run = fetched if request.get("rows") else printed
    try:
        return run(connection, request["code"])
    except duckdb.Error as raised:
        return {"out": "", "columns": [], "rows": [], "error": str(raised)}


def main() -> None:
    connection = duckdb.connect()
    for line in sys.stdin:
        sys.stdout.write(json.dumps(answer(connection, json.loads(line))) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
