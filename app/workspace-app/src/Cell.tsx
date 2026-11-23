import { python } from "@codemirror/lang-python";
import { PostgreSQL, sql } from "@codemirror/lang-sql";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { EDITOR_THEME } from "./editor-theme";
import { Check, Cross, Lock, Play, Unlock } from "./icons";
import { type CellAnswer, runCell, usePage } from "./session";

const LANGUAGE = {
  sql: () => sql({ dialect: PostgreSQL }),
  duckdb: () => sql({ dialect: PostgreSQL }),
  bigquery: () => sql({ dialect: PostgreSQL }),
  python: () => python(),
  bash: () => StreamLanguage.define(shell),
};
type Lang = keyof typeof LANGUAGE;
const LABEL: Record<Lang, string> = { sql: "SQL", duckdb: "DuckDB", bigquery: "BigQuery", python: "Python", bash: "Shell" };
const SETUP = { lineNumbers: true, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false };

// A runnable cell. Shift+Enter or the button runs it; the output stays until the next run. Its code
// is locked against stray typing until the lock is pressed. `n` is its number on the page: the
// server runs first whatever earlier cells this one needs and have not run, and says which.
export function Cell({ lang, source, n }: { lang: Lang; source: string; n: number }) {
  const page = usePage();
  const code = useRef(source);
  const box = useRef<HTMLDivElement>(null);
  const [answer, setAnswer] = useState<CellAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(true);

  const run = useRef(async () => {});
  run.current = async () => {
    setBusy(true);
    const result = await runCell(lang, code.current, page, n);
    setAnswer(result);
    // Widgets on the page may follow what a cell printed (a plan's timings, say).
    window.dispatchEvent(new CustomEvent("lab:cell", { detail: { lang, code: code.current, out: result.out, error: result.error } }));
    setBusy(false);
  };

  useEffect(() => {
    const entry = { run: () => run.current(), el: () => box.current ?? document.body, lang };
    page.cells.add(entry);
    return () => void page.cells.delete(entry);
  }, [page.cells, lang]);

  const extensions = useMemo(
    () => [LANGUAGE[lang](), Prec.highest(keymap.of([{ key: "Shift-Enter", run: () => (void run.current(), true) }]))],
    [lang],
  );

  const failed = Boolean(answer?.error);
  return (
    <div className="cell" ref={box} data-lang={lang} data-busy={busy || undefined} data-failed={failed || undefined} data-locked={locked || undefined}>
      <div className="cell-head">
        <span className="cell-lang">
          <i />
          {LABEL[lang]}
        </span>
        <span className="grow" />
        {answer && !busy && (
          <span className="cell-status">
            {failed ? <Cross /> : <Check />}
            {answer.ms.toLocaleString("en-US")} ms
          </span>
        )}
        <button
          type="button"
          className="icon lock"
          onClick={() => setLocked(!locked)}
          aria-pressed={!locked}
          title={locked ? "Locked. Press to edit this cell" : "Editable. Press to lock this cell"}
        >
          {locked ? <Lock /> : <Unlock />}
        </button>
        <button type="button" className="run" onClick={() => run.current()} disabled={busy} title="Run this cell (Shift+Enter)">
          <Play />
          {busy ? "Running" : "Run"}
        </button>
      </div>
      <div className="cell-in">
        <CodeMirror value={source} extensions={extensions} theme={EDITOR_THEME} basicSetup={SETUP} readOnly={locked} onChange={(text) => (code.current = text)} />
      </div>
      {answer?.first?.length ? (
        <div className="cell-first" title="This cell builds on earlier cells that had not run yet, so they ran first.">
          Ran first: {answer.first.join(", ")}
        </div>
      ) : null}
      {answer && (answer.out || answer.error) && (
        <pre className="cell-out" key={answer.ms + answer.out.length}>
          {answer.out}
          {answer.error && <span className="cell-err">{answer.error}</span>}
        </pre>
      )}
    </div>
  );
}

// MDX hands a fenced block over as <pre><code class="language-x">; a known language becomes a cell.
export function Fence({ children }: { children?: ReactElement<{ className?: string; children?: string; "data-cell"?: number }> }) {
  const lang = children?.props.className?.replace("language-", "") ?? "";
  const source = String(children?.props.children ?? "").replace(/\n$/, "");
  return lang in LANGUAGE ? <Cell lang={lang as Lang} source={source} n={Number(children?.props["data-cell"] ?? 0)} /> : <pre className="plain">{source}</pre>;
}
