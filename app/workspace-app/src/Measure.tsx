// A page's Measure button: runs one workload's fixed query on one store and shows three numbers —
// data read, latency, cost. `<Measure workload="W4" store="pg" />` is one button; with no `store`
// it is both stores side by side. The server does the measuring (POST /api/measure).
import { useState } from "react";
import { Play } from "./icons";

type Store = "pg" | "bq";
type Tile = [label: string, value: string, under: string];
type Measured = { tiles?: Tile[]; on?: string; arithmetic?: boolean; error?: string; ms?: number };

const NAME: Record<Store, string> = { pg: "PostgreSQL", bq: "BigQuery" };

async function ask(workload: string, store: Store): Promise<Measured> {
  try {
    const res = await fetch("/api/measure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workload, store }),
    });
    return (await res.json()) as Measured;
  } catch (e) {
    return { error: `The lab did not answer: ${(e as Error).message}` };
  }
}

function One({ workload, store }: { workload: string; store: Store }) {
  const [answer, setAnswer] = useState<Measured | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setAnswer(await ask(workload, store));
    setBusy(false);
  };
  return (
    <div className="measure" data-store={store} data-busy={busy || undefined}>
      <button type="button" className="primary" onClick={run} disabled={busy}>
        <Play />
        {busy ? "Measuring…" : `Measure on ${NAME[store]}`}
      </button>
      {answer?.error && <pre className="measure-err">{answer.error}</pre>}
      {answer?.tiles && (
        <div className="measure-out" key={answer.ms}>
          {answer.arithmetic && <span className="measure-mark">arithmetic, not a run</span>}
          <div className="measure-tiles">
            {answer.tiles.map(([label, value, under]) => (
              <div key={label}>
                <small>{label}</small>
                <b>{value}</b>
                <span>{under}</span>
              </div>
            ))}
          </div>
          <p>{answer.on}</p>
        </div>
      )}
    </div>
  );
}

export function Measure({ workload, store }: { workload: string; store?: Store }) {
  const stores: Store[] = store ? [store] : ["pg", "bq"];
  return (
    <div className="measures">
      {stores.map((each) => (
        <One key={each} workload={workload} store={each} />
      ))}
    </div>
  );
}
