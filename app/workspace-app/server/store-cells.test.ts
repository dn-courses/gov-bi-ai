import { describe, expect, it } from "vitest";
import { dropsBefore, exerciseOf, indexesOf, tagIndexes, untag } from "./store-cells";

describe("the exercise cells of Choose the Store", () => {
  it("are the w1-pg … w8-pg cells, and no other", () => {
    expect(exerciseOf("w4-pg")).toBe("w4");
    for (const other of ["w4-bq", "w9-pg", "setup", undefined]) expect(exerciseOf(other)).toBeNull();
  });

  it("tag every index the cell creates or drops with the workload", () => {
    const { sql, creates } = tagIndexes(
      "DROP INDEX IF EXISTS by_station;\nCREATE INDEX by_station ON station_status (station_id, captured_at);",
      "w4",
    );
    expect(sql).toBe(
      'DROP INDEX IF EXISTS "hx_w4__by_station";\nCREATE INDEX "hx_w4__by_station" ON station_status (station_id, captured_at);',
    );
    expect(creates).toEqual(["hx_w4__by_station"]);
  });

  it("name an unnamed index after its columns, and keep INCLUDE, UNIQUE and IF NOT EXISTS", () => {
    const { sql, creates } = tagIndexes(
      "create unique index if not exists on station_status (station_id, captured_at DESC) include (bikes_available)",
      "w1",
    );
    expect(sql).toBe(
      'create unique index if not exists "hx_w1__station_id_captured_at_desc" on station_status (station_id, captured_at DESC) include (bikes_available)',
    );
    expect(creates).toEqual(["hx_w1__station_id_captured_at_desc"]);
  });

  it("tag each name of a DROP INDEX list, and a quoted name as written", () => {
    expect(tagIndexes('DROP INDEX a, "B"', "w2").sql).toBe('DROP INDEX "hx_w2__a", "hx_w2__B"');
  });

  it("drop first only the workload's indexes the cell does not create", () => {
    expect(dropsBefore(["hx_w4__a", "hx_w4__b"], ["hx_w4__b"])).toBe('DROP INDEX IF EXISTS "hx_w4__a"');
    expect(dropsBefore(["hx_w4__b"], ["hx_w4__b"])).toBeNull();
    expect(indexesOf("w4")).toContain("LIKE 'hx!_w4!_!_%' ESCAPE '!'");
  });

  it("show the participant their own names", () => {
    expect(untag('ERROR:  relation "hx_w4__by_station" already exists')).toBe('ERROR:  relation "by_station" already exists');
    expect(untag(null)).toBeNull();
  });
});
