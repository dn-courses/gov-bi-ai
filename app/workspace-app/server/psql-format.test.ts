import { expect, test } from "vitest";
import { formatResult } from "./psql-format";

const INT4 = 23;
const TEXT = 25;

test("a table prints as psql prints it: centred headers, numbers right-aligned, a row count", () => {
  const text = formatResult({
    command: "SELECT",
    rowCount: 2,
    fields: [{ name: "category_id", dataTypeID: INT4 }, { name: "name", dataTypeID: TEXT }],
    rows: [["2", "Product 000001"], ["18", "P"]],
  });
  expect(text).toBe(
    [
      " category_id |      name",
      "-------------+----------------",
      "           2 | Product 000001",
      "          18 | P",
      "(2 rows)",
    ].join("\n"),
  );
});

test("a plan keeps its indentation and one row says 'row'", () => {
  const text = formatResult({
    command: "EXPLAIN",
    rowCount: null,
    fields: [{ name: "QUERY PLAN", dataTypeID: TEXT }],
    rows: [["Limit  (cost=1..2)"], ["  ->  Sort"]],
  });
  expect(text.split("\n").slice(2)).toEqual([" Limit  (cost=1..2)", "   ->  Sort", "(2 rows)"]);
  expect(formatResult({ command: "SHOW", rowCount: 1, fields: [{ name: "x", dataTypeID: TEXT }], rows: [["1"]] })).toContain("(1 row)");
});

test("a statement without rows prints its command tag", () => {
  expect(formatResult({ command: "SET", rowCount: null, fields: [], rows: [] })).toBe("SET");
  expect(formatResult({ command: "UPDATE", rowCount: 5, fields: [], rows: [] })).toBe("UPDATE 5");
  expect(formatResult({ command: "INSERT", rowCount: 3, fields: [], rows: [] })).toBe("INSERT 0 3");
});

test("NULL prints as empty", () => {
  const text = formatResult({ command: "SELECT", rowCount: 1, fields: [{ name: "a", dataTypeID: TEXT }], rows: [[null]] });
  expect(text.split("\n")[2]).toBe("");
});
