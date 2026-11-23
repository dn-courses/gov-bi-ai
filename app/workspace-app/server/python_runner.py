"""A long-lived Python session for the workspace app's Python cells.

Reads one JSON object per line on stdin ({"code": ...}), runs the code in a namespace that
persists between cells, and answers with one JSON line ({"out": ..., "error": ...}).

A cell may `await` at its top level, as in a notebook: such a cell runs on one event loop that
lives as long as the session, so a client opened in one cell still works in the next.
"""

import ast
import asyncio
import contextlib
import inspect
import io
import json
import sys
import traceback

NAMESPACE: dict[str, object] = {"__name__": "__main__"}
LOOP = asyncio.new_event_loop()
asyncio.set_event_loop(LOOP)


def execute(code: str) -> None:
    """Run the cell's code; drive it on the session's loop when it awaits at the top level."""
    compiled = compile(code, "<cell>", "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    result = eval(compiled, NAMESPACE)
    if inspect.iscoroutine(result):
        LOOP.run_until_complete(result)


def run_cell(code: str) -> dict[str, str | None]:
    """Run one cell; return what it printed and its traceback, if it raised."""
    out = io.StringIO()
    error = None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            execute(code)
        except BaseException as raised:
            # Drop the runner's own frames: the room should see only the cell's lines.
            frame = raised.__traceback__
            while frame and frame.tb_frame.f_code.co_filename != "<cell>":
                frame = frame.tb_next
            shown = raised.with_traceback(frame)
            error = "".join(traceback.format_exception(shown))
    return {"out": out.getvalue(), "error": error}


def main() -> None:
    reply = sys.stdout
    for line in sys.stdin:
        answer = run_cell(json.loads(line)["code"])
        reply.write(json.dumps(answer) + "\n")
        reply.flush()


if __name__ == "__main__":
    main()
