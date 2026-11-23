// What a page's cells share: where SQL runs and the list "Run all" walks.
import { createContext, useContext } from "react";
import type { LessonMeta } from "./lessons";

export type Runner = () => Promise<void>;
export type PageCell = { run: Runner; el: () => Element; lang: string };
// `slug` is the page's "<module>/<page>": with a cell's number, how the server knows the cell.
export type PageSession = { slug: string; meta: LessonMeta; cells: Set<PageCell> };

export const PageContext = createContext<PageSession | null>(null);
export const usePage = () => {
  const page = useContext(PageContext);
  if (!page) throw new Error("A cell must be inside a lesson page.");
  return page;
};

// `first` names the earlier cells the server ran before this one, because it needs them.
export type CellAnswer = { out: string; error: string | null; ms: number; first?: string[] };

export async function runCell(lang: string, code: string, page: PageSession, n: number): Promise<CellAnswer> {
  try {
    const res = await fetch("/api/cell", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang, code, page: page.slug, n, database: page.meta.database, settings: page.meta.settings }),
    });
    return await res.json();
  } catch (e) {
    return { out: "", error: `The lab did not answer: ${(e as Error).message}`, ms: 0 };
  }
}
