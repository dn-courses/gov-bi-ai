// One long-lived Python process per runner: cells share state, as in a notebook, and run one at a
// time. `python_runner.py` is the Python cell; `duckdb_runner.py` holds a DuckDB session the same way.
import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

export type CellOutput = { out: string; error: string | null; columns?: string[]; rows?: unknown[][] };

const runner = (file: string) => fileURLToPath(new URL(`./${file}`, import.meta.url));

// `ended` is told whenever the process goes, by restart or on its own: its state went with it.
export function pythonSession(cwd: string, file = "python_runner.py", ended: () => void = () => {}) {
  // A process and the cells waiting on it. The list is the process's own: when a restarted process
  // finally exits, it must not answer the cells already sent to its successor.
  type Live = { proc: ChildProcessWithoutNullStreams; waiting: ((answer: CellOutput) => void)[] };
  let child: Live | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  const start = (): Live => {
    const live: Live = { proc: spawn("python3", ["-u", runner(file)], { cwd }), waiting: [] };
    createInterface({ input: live.proc.stdout }).on("line", (line) => live.waiting.shift()?.(JSON.parse(line)));
    live.proc.on("exit", () => {
      for (const done of live.waiting) done({ out: "", error: "The session ended. Run the cell again to start a new one." });
      live.waiting = [];
      if (child === live) {
        child = null;
        ended();
      }
    });
    return live;
  };

  const run = (code: string, rows = false): Promise<CellOutput> => {
    const answer = queue.then(
      () =>
        new Promise<CellOutput>((resolve) => {
          child ??= start();
          child.waiting.push(resolve);
          child.proc.stdin.write(JSON.stringify({ code, rows }) + "\n");
        }),
    );
    queue = answer;
    return answer;
  };

  // Forget every variable: the next cell starts a fresh process.
  const restart = () => {
    child?.proc.kill();
    child = null;
    ended();
  };

  return { run, restart };
}
