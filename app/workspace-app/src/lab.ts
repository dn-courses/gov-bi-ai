// The lab, as widgets see it. Stands in for widgets/lib/kernel.js (aliased in vite.config.ts): the
// same `live(load)` contract, answered by this app's server instead of a Jupyter kernel.
type BatchOptions = { autocommit?: boolean; rollback?: boolean; dbname?: string | null; engine?: "duckdb" };

async function sql(statements: string[], options: BatchOptions = {}): Promise<unknown[]> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ statements, options }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? res.statusText);
  return body.results;
}

const lab = { sql };

// Load live data, or null when the lab cannot be reached or the load fails. Never throws.
export async function live<T>(load: (kernel: typeof lab) => Promise<T>): Promise<T | null> {
  try {
    return await load(lab);
  } catch (e) {
    console.info(`lab widget: keeping captured data — ${(e as Error).message}`);
    return null;
  }
}
