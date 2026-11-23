import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { digest } from "./pages";

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "pages-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const PAGE = { "content/m/01-a.mdx": "# A", "src/App.tsx": "export {}" };

test("the same sources give the same id, wherever they are", () => {
  expect(digest(tree(PAGE), ["content", "src"])).toBe(digest(tree(PAGE), ["content", "src"]));
});

test("a changed page, a new page and a renamed page each change the id", () => {
  const id = digest(tree(PAGE), ["content", "src"]);
  expect(digest(tree({ ...PAGE, "content/m/01-a.mdx": "# B" }), ["content", "src"])).not.toBe(id);
  expect(digest(tree({ ...PAGE, "content/m/02-b.mdx": "# A" }), ["content", "src"])).not.toBe(id);
  expect(digest(tree({ "content/m/01-z.mdx": "# A", "src/App.tsx": "export {}" }), ["content", "src"])).not.toBe(id);
});

test("a file the host drops beside the pages is not a change", () => {
  const id = digest(tree(PAGE), ["content", "src"]);
  expect(digest(tree({ ...PAGE, "content/.DS_Store": "x" }), ["content", "src"])).toBe(id);
});

test("a source that is not there counts as empty", () => {
  expect(digest(tree(PAGE), ["content", "src", "public"])).toBe(digest(tree(PAGE), ["content", "src"]));
});
