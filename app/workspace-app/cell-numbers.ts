// Numbers a page's runnable fences in page order, as server/cells.ts does, and hands each number to
// its cell (`data-cell` on the <code> element): the server knows a cell by its page and number.
import { LANGS } from "./server/cells";

type Node = { type: string; lang?: string | null; children?: Node[]; data?: { hProperties?: Record<string, unknown> } };

export function cellNumbers() {
  return (tree: Node) => {
    let n = 0;
    const walk = (node: Node) => {
      if (node.type === "code" && LANGS.includes(node.lang ?? "")) node.data = { ...node.data, hProperties: { "data-cell": ++n } };
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}
