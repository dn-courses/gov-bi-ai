"""Every measurement a participant made in "Hands-on: Choose the Store", and the best of each.

One JSON file in the app's work folder (a volume: it outlives a page reload and an app restart, and
each participant runs their own lab): per workload and store, how many measurements were made and
the best one — its three tiles and what the participant had built for it. Best is the lowest
`score`, a pair the measurement brings: on BigQuery (cost of a run, latency), on PostgreSQL
(latency, data read). A measurement answered from the cache is not recorded.
"""

import json
from pathlib import Path
from typing import Any

FILE = Path("choose-the-store-attempts.json")  # the runner's working directory is the work folder


def load(file: Path) -> dict[str, Any]:
    return json.loads(file.read_text()) if file.is_file() else {}


def view(entry: dict[str, Any] | None) -> dict[str, Any] | None:
    """What the button shows under its result: the best attempt, and how many were made."""
    if not entry:
        return None
    best = entry["best"]
    return {"tiles": best["tiles"], "what": best["what"], "attempts": entry["attempts"]}


def look(file: Path, key: str) -> dict[str, Any] | None:
    return view(load(file).get(key))


def record(file: Path, key: str, attempt: dict[str, Any]) -> dict[str, Any] | None:
    """Count one more attempt, keep it when it beats the best so far (a tie keeps the earlier one)."""
    everything = load(file)
    entry = everything.get(key) or {"attempts": 0, "best": attempt}
    entry["attempts"] += 1
    if list(attempt["score"]) < list(entry["best"]["score"]):
        entry["best"] = attempt
    everything[key] = entry
    file.write_text(json.dumps(everything, indent=1))
    return view(entry)


def forget(file: Path, prefix: str) -> None:
    """The Reset button: every entry whose key starts with `prefix` (`W3/`) is gone."""
    everything = {key: entry for key, entry in load(file).items() if not key.startswith(prefix)}
    file.write_text(json.dumps(everything, indent=1))
