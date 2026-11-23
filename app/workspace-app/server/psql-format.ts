// Print a query result the way psql does, so a plan keeps its indentation and a table reads as
// the room knows it from a terminal.

export type Field = { name: string; dataTypeID: number };
export type Result = { command: string; rowCount: number | null; fields: Field[]; rows: (string | null)[][] };

// int8, int2, int4, oid, float4, float8, numeric: psql right-aligns these.
const NUMERIC = new Set([20, 21, 23, 26, 700, 701, 1700]);
const COUNTED = new Set(["UPDATE", "DELETE", "COPY", "MERGE", "MOVE", "FETCH"]);

const centre = (text: string, width: number) => {
  const left = Math.floor((width - text.length) / 2);
  return " ".repeat(left) + text + " ".repeat(width - text.length - left);
};

function commandTag({ command, rowCount }: Result): string {
  if (command === "INSERT") return `INSERT 0 ${rowCount ?? 0}`;
  return COUNTED.has(command) && rowCount !== null ? `${command} ${rowCount}` : command;
}

function table({ fields, rows }: Result): string {
  const cells = rows.map((row) => row.map((value) => value ?? ""));
  const widths = fields.map((f, i) => Math.max(f.name.length, ...cells.map((row) => row[i].length)));
  const align = (value: string, i: number) =>
    NUMERIC.has(fields[i].dataTypeID) ? value.padStart(widths[i]) : value.padEnd(widths[i]);
  const line = (parts: string[]) => (" " + parts.join(" | ")).trimEnd();
  return [
    line(fields.map((f, i) => centre(f.name, widths[i]))),
    widths.map((w) => "-".repeat(w + 2)).join("+"),
    ...cells.map((row) => line(row.map(align)).replace(/^ $/, "")),
    `(${rows.length} ${rows.length === 1 ? "row" : "rows"})`,
  ].join("\n");
}

export function formatResult(result: Result): string {
  return result.fields.length === 0 ? commandTag(result) : table(result);
}
