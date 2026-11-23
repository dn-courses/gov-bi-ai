// A page's Measure button: runs one workload's fixed query on one store and shows three numbers —
// data read, latency, cost a month — and, under them, the participant's best measurement so far
// with what they had built for it. `<Measure workload="W4" store="pg" />` is one button; with no
// `store` it is both stores side by side. The server measures and remembers (POST /api/measure).
import { useEffect, useState } from "react";
import { Play } from "./icons";

type Store = "pg" | "bq";
type Tile = [label: string, value: string, under: string];
type Best = { tiles: Tile[]; what: string[]; attempts: number };
type Measured = { tiles?: Tile[]; on?: string; cached?: string; best?: Best | null; error?: string; ms?: number };

const NAME: Record<Store, string> = { pg: "PostgreSQL", bq: "BigQuery" };

async function ask(workload: string, store: Store, look = false): Promise<Measured> {
  try {
    const res = await fetch("/api/measure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workload, store, look }),
    });
    return (await res.json()) as Measured;
  } catch (e) {
    return { error: `The lab did not answer: ${(e as Error).message}` };
  }
}

const Tiles = ({ tiles }: { tiles: Tile[] }) => (
  <div className="measure-tiles">
    {tiles.map(([label, value, under]) => (
      <div key={label}>
        <small>{label}</small>
        <b>{value}</b>
        <span>{under}</span>
      </div>
    ))}
  </div>
);

const BestSoFar = ({ best }: { best: Best }) => (
  <div className="measure-best">
    <h6>
      Your best so far
      <small>
        {best.attempts} {best.attempts === 1 ? "attempt" : "attempts"}
      </small>
    </h6>
    <p>{best.tiles.map(([label, value]) => `${label} ${value}`).join(" · ")}</p>
    <pre>{best.what.join("\n")}</pre>
  </div>
);

function One({ workload, store }: { workload: string; store: Store }) {
  const [answer, setAnswer] = useState<Measured | null>(null);
  const [best, setBest] = useState<Best | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void ask(workload, store, true).then((found) => setBest(found.best ?? null));
  }, [workload, store]);
  const run = async () => {
    setBusy(true);
    const measured = await ask(workload, store);
    setAnswer(measured);
    if (measured.best) setBest(measured.best);
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
          <Tiles tiles={answer.tiles} />
          <p>{answer.on}</p>
          {answer.cached && <p className="measure-cached">{answer.cached}</p>}
        </div>
      )}
      {best && <BestSoFar best={best} />}
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
