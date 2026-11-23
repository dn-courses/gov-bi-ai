// Every runnable cell of every page, and what each one needs to have run before it.
//
// A cell is a fenced block in a known language. Words after the language on the fence line say what
// the reader cannot see:
//
//   ```python id=client needs=setup              needs a named cell of this page
//   ```python needs=03-what-were-building#setup  needs a cell of another page of the module
//   ```sql needs=agents/15-sql-tools#3           another module's page; `#3` is that page's third cell
//   ```python standalone                         needs nothing, whatever the default says
//   ```python expect=error                       is meant to fail (a check treats success as the fault)
//   ```python manual                             is left for the reader to finish
//
// With nothing said, a Python cell needs every Python cell above it on its page (they share one
// namespace, as in a notebook) and any other cell needs nothing.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const LANGS = ["sql", "duckdb", "bigquery", "python", "bash"];

export type CellSpec = {
  key: string; // "<module>/<page>#<n>", n counting the page's cells from 1
  page: string;
  n: number;
  id: string | null;
  lang: string;
  code: string;
  needs: string[]; // as written, unresolved
  standalone: boolean;
  expect: string | null;
  manual: boolean;
};

const FENCE = /^(`{3,})([a-z]+)([^\n]*)\n([\s\S]*?)^\1[ \t]*$/gm;

function spec(page: string, n: number, lang: string, words: string, code: string): CellSpec {
  const pairs = words.trim().split(/\s+/).filter(Boolean).map((word) => word.split("=", 2));
  const said = new Map(pairs.map(([name, value]): [string, string] => [name, value ?? ""]));
  return {
    key: `${page}#${n}`,
    page,
    n,
    id: said.get("id") ?? null,
    lang,
    code: code.replace(/\n$/, ""),
    needs: (said.get("needs") ?? "").split(",").filter(Boolean),
    standalone: said.has("standalone"),
    expect: said.get("expect") ?? null,
    manual: said.has("manual"),
  };
}

// The cells of one page's source, in page order.
export function cellsOf(page: string, source: string): CellSpec[] {
  const cells: CellSpec[] = [];
  for (const [, , lang, words, code] of source.matchAll(FENCE))
    if (LANGS.includes(lang)) cells.push(spec(page, cells.length + 1, lang, words, code));
  return cells;
}

export type PageMeta = { database?: string; settings?: Record<string, string> };

// A page's `export const meta = { … }`: where its SQL cells run and under which settings. The
// pages are the course's own files, so the object is read as the JavaScript it is.
export function metaOf(source: string): PageMeta {
  const start = source.search(/export const meta\s*=\s*\{/);
  if (start < 0) return {};
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let at = open; at < source.length; at++) {
    if (source[at] === "{") depth++;
    if (source[at] === "}" && --depth === 0) return new Function(`return (${source.slice(open, at + 1)})`)() as PageMeta;
  }
  return {};
}

// Every page under content/: "<module>/<page>" → its meta.
export function readMetas(content: string): Map<string, PageMeta> {
  const metas = new Map<string, PageMeta>();
  if (!existsSync(content)) return metas;
  for (const module of readdirSync(content, { withFileTypes: true }).filter((entry) => entry.isDirectory()))
    for (const file of readdirSync(join(content, module.name)).filter((name) => name.endsWith(".mdx")))
      metas.set(`${module.name}/${file.slice(0, -4)}`, metaOf(readFileSync(join(content, module.name, file), "utf8")));
  return metas;
}

// Every page under content/: "<module>/<page>" → its cells.
export function readCells(content: string): Map<string, CellSpec[]> {
  const pages = new Map<string, CellSpec[]>();
  if (!existsSync(content)) return pages;
  for (const module of readdirSync(content, { withFileTypes: true }).filter((entry) => entry.isDirectory()))
    for (const file of readdirSync(join(content, module.name)).filter((name) => name.endsWith(".mdx")).sort()) {
      const page = `${module.name}/${file.slice(0, -4)}`;
      pages.set(page, cellsOf(page, readFileSync(join(content, module.name, file), "utf8")));
    }
  return pages;
}

// The cell a `needs` word names, seen from `from`: "name", "page#name" or "module/page#name", where
// the name is a cell's id or its number on the page.
function named(pages: Map<string, CellSpec[]>, from: CellSpec, word: string): CellSpec {
  const [where, name] = word.includes("#") ? (word.split("#", 2) as [string, string]) : ["", word];
  const page = !where ? from.page : where.includes("/") ? where : `${from.page.split("/")[0]}/${where}`;
  const found = (pages.get(page) ?? []).find((cell) => cell.id === name || String(cell.n) === name);
  if (!found) throw new Error(`${from.key} needs "${word}", and ${page} has no such cell.`);
  return found;
}

// What a cell needs directly: what its fence names, and by default the Python cells above it.
function direct(pages: Map<string, CellSpec[]>, cell: CellSpec): CellSpec[] {
  if (cell.standalone) return [];
  const above = cell.lang === "python" ? (pages.get(cell.page) ?? []).filter((c) => c.lang === "python" && c.n < cell.n) : [];
  return [...cell.needs.map((word) => named(pages, cell, word)), ...above];
}

// Everything that must have run before `cell`, each once, in an order that satisfies them all.
export function before(pages: Map<string, CellSpec[]>, cell: CellSpec): CellSpec[] {
  const order: CellSpec[] = [];
  const seen = new Set<string>([cell.key]);
  const visit = (at: CellSpec) => {
    for (const need of direct(pages, at).sort((a, b) => (a.page === b.page ? a.n - b.n : 0))) {
      if (seen.has(need.key)) continue;
      seen.add(need.key);
      visit(need);
      order.push(need);
    }
  };
  visit(cell);
  return order;
}

// Every `needs` that names no cell, as sentences: a page is checked when it is built, not when run.
export function broken(pages: Map<string, CellSpec[]>): string[] {
  const faults: string[] = [];
  for (const cell of [...pages.values()].flat())
    try {
      before(pages, cell);
    } catch (e) {
      faults.push((e as Error).message);
    }
  return faults;
}
