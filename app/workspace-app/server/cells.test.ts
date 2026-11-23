import { describe, expect, it } from "vitest";
import { before, broken, cellsOf, metaOf } from "./cells";

const fence = (head: string, body: string) => `\`\`\`${head}\n${body}\n\`\`\`\n`;
const pages = (sources: Record<string, string>) => new Map(Object.entries(sources).map(([page, source]) => [page, cellsOf(page, source)]));
const keys = (all: ReturnType<typeof pages>, key: string) => {
  const cell = [...all.values()].flat().find((c) => c.key === key)!;
  return before(all, cell).map((c) => c.key);
};

describe("cellsOf", () => {
  it("numbers the runnable fences and reads the words on the fence line", () => {
    const source = `# T\n\n${fence("python id=setup", "x = 1")}\ntext\n\n${fence("text", "not a cell")}\n${fence("sql needs=setup expect=error manual", "SELECT 1;")}`;
    const [first, second] = cellsOf("m/p", source);
    expect(first).toMatchObject({ key: "m/p#1", id: "setup", lang: "python", code: "x = 1", needs: [] });
    expect(second).toMatchObject({ key: "m/p#2", lang: "sql", needs: ["setup"], expect: "error", manual: true });
  });

  it("does not take a fence shown inside a longer fence for a cell", () => {
    const source = `\`\`\`\`mdx\n${fence("sql", "SELECT 1;")}\`\`\`\`\n\n${fence("sql", "SELECT 2;")}`;
    expect(cellsOf("m/p", source).map((c) => c.code)).toEqual(["SELECT 2;"]);
  });
});

describe("before", () => {
  const all = pages({
    "m/01-a": fence("python id=setup", "a = 1") + fence("sql", "SELECT 1;") + fence("python", "b = a"),
    "m/02-b": fence("python needs=01-a#setup", "c = a") + fence("python", "d = c") + fence("python standalone", "e = 0"),
    "n/01-c": fence("sql needs=m/01-a#2", "SELECT 2;"),
  });

  it("gives a Python cell the Python cells above it, and no other cell anything", () => {
    expect(keys(all, "m/01-a#3")).toEqual(["m/01-a#1"]);
    expect(keys(all, "m/01-a#2")).toEqual([]);
  });

  it("follows a need onto another page, and through it", () => {
    expect(keys(all, "m/02-b#1")).toEqual(["m/01-a#1"]);
    expect(keys(all, "m/02-b#2")).toEqual(["m/01-a#1", "m/02-b#1"]);
    expect(keys(all, "n/01-c#1")).toEqual(["m/01-a#2"]);
  });

  it("leaves a standalone cell alone", () => {
    expect(keys(all, "m/02-b#3")).toEqual([]);
  });

  it("names a need that points at nothing", () => {
    const bad = pages({ "m/01-a": fence("python needs=nowhere", "a = 1") });
    expect(broken(bad)).toEqual(['m/01-a#1 needs "nowhere", and m/01-a has no such cell.']);
  });
});

describe("metaOf", () => {
  it("reads where a page's SQL runs, nested settings included", () => {
    const source = 'export const meta = { title: "T {x}", minutes: 5, database: "shop", settings: { search_path: "mart" } };\n\n# T\n';
    expect(metaOf(source)).toMatchObject({ database: "shop", settings: { search_path: "mart" } });
    expect(metaOf("# no meta")).toEqual({});
  });
});
