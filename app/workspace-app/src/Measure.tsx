// A page's Measure button: runs one workload's fixed query on one store and shows three numbers —
// data read, latency, cost a month — and, under them, the participant's best measurement so far
// with what they had built for it. `<Measure workload="W4" store="pg" />` is one button; with no
// `store` it is both stores side by side, with a Reset button under them: the workload's indexes and
// table dropped, its cache and its best forgotten. The server measures and remembers (POST /api/measure).
import { useEffect, useState } from "react";
import { Play } from "./icons";

type Store = "pg" | "bq";
type Tile = [label: string, value: string, under: string];
type Best = { tiles: Tile[]; what: string[]; attempts: number };
type Measured = {
  tiles?: Tile[];
  on?: string;
  cached?: string;
  best?: Best | null;
  reset?: string;
  error?: string;
  ms?: number;
};

const NAME: Record<Store, string> = { pg: "PostgreSQL", bq: "BigQuery" };

async function ask(workload: string, store: Store | "", how: { look?: boolean; reset?: boolean } = {}): Promise<Measured> {
  try {
    const res = await fetch("/api/measure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workload, store, ...how }),
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
    void ask(workload, store, { look: true }).then((found) => setBest(found.best ?? null));
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

function Reset({ workload, onDone }: { workload: string; onDone: (said: Measured) => void }) {
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    if (!window.confirm(`Reset ${workload}? Its indexes, its table and its best so far are removed.`)) return;
    setBusy(true);
    onDone(await ask(workload, "", { reset: true }));
    setBusy(false);
  };
  return (
    <button type="button" className="measure-reset" onClick={reset} disabled={busy}>
      {busy ? "Resetting…" : `Reset ${workload}`}
    </button>
  );
}

export function Measure({ workload, store }: { workload: string; store?: Store }) {
  const stores: Store[] = store ? [store] : ["pg", "bq"];
  const [round, setRound] = useState(0); // a new round after a reset: the buttons start empty
  const [said, setSaid] = useState<Measured | null>(null);
  const done = (answer: Measured) => {
    setSaid(answer);
    if (!answer.error) setRound((n) => n + 1);
  };
  return (
    <>
      <div className="measures">
        {stores.map((each) => (
          <One key={`${each}-${round}`} workload={workload} store={each} />
        ))}
      </div>
      <div className="measure-reset-row">
        <Reset workload={workload} onDone={done} />
        {said && <span className={said.error ? "measure-err" : undefined}>{said.error ?? said.reset}</span>}
      </div>
    </>
  );
}
