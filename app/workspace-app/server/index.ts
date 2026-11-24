// The workspace app's server: serves the built pages and runs their cells against the lab.
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { fileURLToPath } from "node:url";
import { type CellSpec, before, broken, readCells, readMetas } from "./cells";
import { pythonSession } from "./python";
import { resetCells, runBatch, runCell } from "./sql";
import { dropsBefore, exerciseOf, indexesOf, tagIndexes, untag } from "./store-cells";

const WORK = process.env.WORKSPACE_DIR ?? "/tmp/workspace";
mkdirSync(WORK, { recursive: true });

// Which cells have run in the sessions that are open now. A cell that needs another has it run
// first, once; a session that ends takes the memory of its cells with it.
const CONTENT = fileURLToPath(new URL("../content", import.meta.url));
const CELLS = readCells(CONTENT);
const METAS = readMetas(CONTENT);
for (const fault of broken(CELLS)) console.log(`[cells] ${fault}`);
const ran = new Set<string>();
const forget = (lang: string) => () => {
  for (const cell of [...CELLS.values()].flat()) if (cell.lang === lang) ran.delete(cell.key);
};
const python = pythonSession(WORK, "python_runner.py", forget("python"));
const duck = pythonSession(WORK, "duckdb_runner.py", forget("duckdb"));
const bigquery = pythonSession(WORK, "bigquery_runner.py");
const measure = pythonSession(WORK, "measure_runner.py");

const shell = (code: string) =>
  new Promise<{ out: string; error: string | null }>((resolve) =>
    execFile("bash", ["-c", code], { cwd: WORK, maxBuffer: 8 << 20 }, (err, stdout, stderr) =>
      resolve({ out: stdout + stderr, error: err && !stderr ? String(err.message) : null }),
    ),
  );

const timed = async <T extends object>(work: Promise<T>) => {
  const started = performance.now();
  const answer = await work;
  return { ...answer, ms: Math.round(performance.now() - started) };
};

const app = new Hono();

type Where = { database: string; settings: Record<string, string> };
type Answer = { out: string; error: string | null };

// An exercise cell of "Choose the Store" (w4-pg): its indexes carry the workload's tag, and the
// workload's indexes it no longer names are dropped first (store-cells.ts).
async function runExercise(workload: string, code: string, { database, settings }: Where): Promise<Answer> {
  const { sql, creates } = tagIndexes(code, workload);
  const [found] = await runBatch([indexesOf(workload)], { autocommit: true, dbname: database });
  const drops = dropsBefore((found ?? []).map(([name]) => String(name)), creates);
  const answer = await runCell(drops ? `${drops};\n${sql}` : sql, database, settings);
  return { out: untag(answer.out) ?? "", error: untag(answer.error) };
}

const runLang = (lang: string, code: string, where: Where, cellId?: string | null): Promise<Answer> | null => {
  const { database, settings } = where;
  const workload = lang === "sql" ? exerciseOf(cellId ?? undefined) : null;
  if (workload) return runExercise(workload, code, where);
  if (lang === "sql") return runCell(code, database, settings);
  if (lang === "python") return python.run(code);
  if (lang === "duckdb") return duck.run(code);
  if (lang === "bigquery") return bigquery.run(code);
  if (lang === "bash") return shell(code);
  return null;
};

const label = (need: CellSpec, from: CellSpec) =>
  `${need.id ?? `cell ${need.n}`}${need.page === from.page ? "" : ` (${need.page.split("/")[1]})`}`;

// Run what `cell` needs and has not run yet, as written in the page (under the asking page's
// database and settings). Answers with the names of what ran, or the failure that stopped it.
async function catchUp(cell: CellSpec, where: Where): Promise<{ first: string[]; error: string | null }> {
  const first: string[] = [];
  for (const need of before(CELLS, cell).filter((c) => !ran.has(c.key))) {
    const answer = await runLang(need.lang, need.code, where, need.id);
    if (answer?.error && need.expect !== "error")
      return { first, error: `This cell needs ${label(need, cell)} to run first, and that failed:\n${answer.error}` };
    ran.add(need.key);
    first.push(label(need, cell));
  }
  return { first, error: null };
}

// `page` and `n` say which cell of which page this is, so what it needs can run first. A dry
// BigQuery run (`bigquery: "dry"`, what a check of every page asks for) prices without running.
app.post("/api/cell", async (c) => {
  const body = await c.req.json();
  const { lang, code, page, n, bigquery: mode } = body;
  // A caller that does not say where the page's SQL runs (a check of every cell) gets the page's own.
  const meta = METAS.get(page) ?? {};
  const database = body.database ?? meta.database ?? process.env.PGDATABASE ?? "postgres";
  const settings = body.settings ?? meta.settings ?? {};
  const cell = CELLS.get(page)?.[n - 1];
  const caught = cell ? await catchUp(cell, { database, settings }) : { first: [], error: null };
  if (caught.error) return c.json({ out: "", error: caught.error, ms: 0, first: caught.first });
  const dry = lang === "bigquery" && mode === "dry" && !/^\s*-- dry run/.test(code);
  const work = runLang(lang, dry ? `-- dry run\n${code}` : code, { database, settings }, cell?.id);
  if (!work) return c.json({ out: "", error: `No runner for ${lang} cells.`, ms: 0 }, 400);
  const answer = await timed(work);
  if (cell && (!answer.error || cell.expect === "error")) ran.add(cell.key);
  return c.json({ ...answer, first: caught.first });
});

// A page's Measure button: one workload's fixed query on one store (measure_runner.py). Answers
// with the three tiles, what was measured and the participant's best so far (`look`: only that,
// without measuring; `reset`: the workload back to its start), or with `error` in words the button can show.
app.post("/api/measure", async (c) => {
  const { workload, store = "", look = false, reset = false } = await c.req.json();
  const { out, error, ms } = await timed(measure.run(JSON.stringify({ workload, store, look, reset })));
  return c.json(error ? { error, ms } : { ...JSON.parse(out), ms });
});

// Every cell of every page, for a check that runs them all.
app.get("/api/cells", (c) => c.json([...CELLS.values()].flat()));

// Which lab runs beside the app (`just present <lab>`); empty when the app was started on its own.
// `labs` is the lab each page's cells need, from the course's config; empty on the source tree.
const COURSE = fileURLToPath(new URL("../content/course.json", import.meta.url));
const LABS: Record<string, string> = existsSync(COURSE) ? (JSON.parse(readFileSync(COURSE, "utf8")).labs ?? {}) : {};
app.get("/api/status", (c) => c.json({ lab: process.env.LAB ?? "", labs: LABS }));

app.post("/api/reset", async (c) => {
  python.restart();
  duck.restart();
  bigquery.restart();
  await resetCells();
  ran.clear();
  return c.json({ ok: true });
});

app.post("/api/query", async (c) => {
  const { statements, options = {} } = await c.req.json();
  // A widget names the engine; DuckDB answers each statement with { columns, rows }.
  if (options.engine === "duckdb") {
    const results = [];
    for (const statement of statements) {
      const answer = await duck.run(statement, true);
      if (answer.error) return c.json({ error: answer.error }, 500);
      results.push({ columns: answer.columns, rows: answer.rows });
    }
    return c.json({ results });
  }
  try {
    return c.json({ results: await runBatch(statements, options) });
  } catch (e) {
    return c.json({ error: String((e as Error).message) }, 500);
  }
});

app.use("/*", serveStatic({ root: "./build" }));
app.get("/*", serveStatic({ path: "./build/index.html" }));

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port }, () => console.log(`workspace app on http://localhost:${port}`));
