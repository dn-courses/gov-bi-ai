// The PostgreSQL cells of "Hands-on: Choose the Store" (ids w1-pg … w8-pg): the cell decides which
// indexes its workload has. Each index the cell creates or drops gets the workload's tag in its name
// (`by_station` in the W4 cell is `hx_w4__by_station` in the database), so the Measure button can tell
// whose it is (measure_runner.py sets every other index aside while it measures). Before the cell
// runs, the workload's indexes the cell does not name are dropped: trying a second idea replaces the
// first, and an exercise never holds more than what its cell says. The participant sees their own
// names: the tag is taken out of everything the cell prints.

const EXERCISE = /^(w[1-8])-pg$/;
const NAME = String.raw`(?:"[^"]+"|[A-Za-z_][\w$]*)`;
const CREATE = new RegExp(
  String.raw`\b(CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?)(?:(?!ON\b)(${NAME})\s+)?(ON\s+(?:ONLY\s+)?[\w."]+\s*(?:USING\s+\w+\s*)?\(([^)]*)\))`,
  "gi",
);
const DROP = new RegExp(String.raw`\b(DROP\s+INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+EXISTS\s+)?)(${NAME}(?:\s*,\s*${NAME})*)`, "gi");
const MAX_NAME = 63; // PostgreSQL's limit; a longer name is cut, and two cut alike would collide

/** The workload a cell belongs to (`w4`), or null for every other cell. */
export const exerciseOf = (cellId: string | undefined) => (cellId && EXERCISE.exec(cellId)?.[1]) || null;

export const tagOf = (workload: string) => `hx_${workload}__`;

const bare = (name: string) => (name.startsWith('"') ? name.slice(1, -1) : name.toLowerCase());

/** The cell as PostgreSQL gets it, and the names (tagged) of the indexes it creates. An index left
 *  unnamed is named after its columns, as PostgreSQL would. */
export function tagIndexes(sql: string, workload: string): { sql: string; creates: string[] } {
  const tag = tagOf(workload);
  const tagged = (name: string) => `"${(tag + bare(name)).slice(0, MAX_NAME)}"`;
  const creates: string[] = [];
  const out = sql
    .replace(CREATE, (_all, head: string, name: string | undefined, on: string, columns: string) => {
      const named = tagged(name ?? columns.replace(/\W+/g, "_").replace(/^_|_$/g, ""));
      creates.push(named.slice(1, -1));
      return `${head}${named} ${on}`;
    })
    .replace(DROP, (_all, head: string, names: string) => head + names.split(/\s*,\s*/).map(tagged).join(", "));
  return { sql: out, creates };
}

/** What the participant reads: their own names, without the tag. */
export const untag = (text: string | null) => text && text.replace(/hx_w[1-8]__/g, "");

/** The statement that finds the workload's indexes, before the cell runs. */
export const indexesOf = (workload: string) =>
  `SELECT indexname FROM pg_indexes WHERE indexname LIKE '${tagOf(workload).replaceAll("_", "!_")}%' ESCAPE '!'`;

/** DROP INDEX for each of the workload's indexes the cell does not create (null: none to drop). */
export function dropsBefore(existing: string[], creates: string[]): string | null {
  const gone = existing.filter((name) => !creates.includes(name));
  return gone.length ? `DROP INDEX IF EXISTS ${gone.map((name) => `"${name}"`).join(", ")}` : null;
}
