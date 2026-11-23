// SQL for the page: cells run on one connection per database that lives as long as the server, so
// a SET in one cell holds in the next; widgets get a private connection per batch.
import pg from "pg";
import { type Result, formatResult } from "./psql-format";

const raw = { getTypeParser: () => (value: string) => value };
const INT8 = 20;
pg.types.setTypeParser(INT8, Number); // widgets read counts and sizes as numbers

type Settings = Record<string, string>;
// A database's one session for cells, and the page settings it currently runs under.
type Session = { client: pg.Client; applied: string };
const sessions = new Map<string, Promise<Session>>();

// Put the session under exactly this page's settings: whatever an earlier page or cell SET is undone.
async function apply(client: pg.Client, settings: Settings): Promise<void> {
  await client.query("RESET ALL");
  for (const [name, value] of Object.entries(settings)) await client.query(`SET ${pg.escapeIdentifier(name)} = ${pg.escapeLiteral(value)}`);
}

async function open(database: string): Promise<Session> {
  const client = new pg.Client({ database, types: raw as unknown as pg.CustomTypesConfig });
  await client.connect();
  client.on("error", () => sessions.delete(database));
  client.on("end", () => sessions.delete(database));
  return { client, applied: "" };
}

// The session for a database, switched to the asking page's settings when they differ from the
// ones it last ran under (another page was open before). A SET typed in a cell holds until then.
async function session(database: string, settings: Settings): Promise<pg.Client> {
  if (!sessions.has(database)) {
    const pending = open(database);
    pending.catch(() => sessions.delete(database));
    sessions.set(database, pending);
  }
  const current = await sessions.get(database)!;
  const wanted = JSON.stringify(Object.entries(settings).sort());
  if (current.applied !== wanted) {
    await apply(current.client, settings);
    current.applied = wanted;
  }
  return current.client;
}

const describe = (e: unknown) => {
  const err = e as { message?: string; hint?: string; detail?: string };
  return [`ERROR:  ${err.message ?? e}`, err.detail && `DETAIL:  ${err.detail}`, err.hint && `HINT:  ${err.hint}`].filter(Boolean).join("\n");
};

// Run a cell: every statement in it, in order; the output is what psql would print.
export async function runCell(sql: string, database: string, settings: Settings): Promise<{ out: string; error: string | null }> {
  try {
    const client = await session(database, settings);
    const answer = await client.query({ text: sql, rowMode: "array" });
    const results = (Array.isArray(answer) ? answer : [answer]) as unknown as Result[];
    return { out: results.map(formatResult).join("\n\n"), error: null };
  } catch (e) {
    return { out: "", error: describe(e) };
  }
}

// Forget the page's connection: settings and temporary objects go with it.
export async function resetCells(): Promise<void> {
  const open = [...sessions.values()];
  sessions.clear();
  await Promise.all(open.map((pending) => pending.then(({ client }) => client.end()).catch(() => {})));
}

export type BatchOptions = { autocommit?: boolean; rollback?: boolean; dbname?: string | null };

// Run a widget's statements on a connection of their own; one entry per statement: its rows as
// arrays, or null when it returns none. `rollback` leaves no trace of what the batch did.
export async function runBatch(statements: string[], { autocommit = false, rollback = false, dbname = null }: BatchOptions) {
  const client = new pg.Client(dbname ? { database: dbname } : {});
  await client.connect();
  try {
    if (!autocommit) await client.query("BEGIN");
    const results: (unknown[][] | null)[] = [];
    for (const text of statements) {
      const answer = await client.query({ text, rowMode: "array" });
      results.push(answer.fields.length ? answer.rows : null);
    }
    if (!autocommit) await client.query(rollback ? "ROLLBACK" : "COMMIT");
    return results;
  } finally {
    await client.end();
  }
}
