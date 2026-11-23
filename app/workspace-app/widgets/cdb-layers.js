// cdb-layers — warehouse access control as layers one query passes through: IAM on the dataset,
// row access policies, policy tags on columns, masking. One invented payroll table (the rows are
// made up for the picture) and one principal; each step takes something away.
import { extra, on, pill, t, widget, zone } from "./cdb-lib.js";

// region, name, department, salary, national_id — invented rows
const ROWS = [
  ["EAST", "Dana Levi", "Finance", "21,400", "012345674"], ["WEST", "Noa Katz", "Finance", "23,100", "038457214"],
  ["EAST", "Omar Haddad", "Legal", "18,900", "054982715"], ["WEST", "Avi Peretz", "Legal", "20,300", "067120451"],
  ["EAST", "Yael Stern", "Audit", "19,700", "021873369"], ["WEST", "Lior Golan", "Audit", "17,800", "049665102"],
];
const COLS = [["region", 34], ["name", 108], ["department", 222], ["salary", 328], ["national_id", 408]];
const LAYERS = ["IAM: the dataset", "rows", "columns", "masking"];

const steps = () => [
  { stop: "The stack", title: "A query passes through every layer",
    note: `Once the data is in the warehouse, the question is who sees which rows and which columns. Each control is a filter the warehouse applies itself, and any one of them can take data away. The asker here is a member of <code>hr-east</code> who is not an <code>hr-lead</code>.` },
  { stop: "IAM", title: "IAM: may you touch this dataset at all?",
    note: `A role, granted to a principal, on an object. Grant to a <b>group</b>, on the <b>dataset</b> or table the report needs. The same grant on the project hands over every dataset in it, including the ones created later.` },
  { stop: "Rows", title: "Row-level security: which rows",
    note: `A row access policy behaves like a <code>WHERE</code> the engine adds to every query the grantees run. Several policies are a union. And the first policy on a table is also a wall: anyone it does not name now sees <b>no rows</b>.` },
  { stop: "Columns", title: "Column-level security: which columns",
    note: `BigQuery attaches a <b>policy tag</b> to the column and grants the right to read the tag. Without it the column cannot be read, and <code>SELECT *</code> is rejected outright. Naming your columns was cost hygiene; here it is how a query runs at all.` },
  { stop: "Masking", title: "Masking: a column that comes back obscured",
    note: `A middle setting between reading a column and being blocked from it. The transform is applied as the query runs, on the same stored bytes, so there is no redacted copy to build and keep in sync.` },
  { stop: "What survives", title: "What this principal gets", decisive: true,
    note: `Three rows, two plain columns and one masked. The layers are AND-ed: a value is visible only when every layer that governs it says yes. That is least privilege, expressed precisely.` },
];

const CSS = (k) => extra(k) + `
.lw .${k} text.c { font:13px ui-monospace, SFMono-Regular, Menlo, monospace; font-weight:400; text-anchor:start; transition:opacity .6s, fill .6s; }
.lw .${k} text.hd { font:600 12px system-ui, sans-serif; fill:var(--mute); text-anchor:start; letter-spacing:.04em; transition:opacity .6s; }
.lw .${k} .frame { fill:none; stroke:var(--accent); stroke-width:2; opacity:0; transition:opacity .6s; }
.lw .${k}[data-at="1"] .frame { opacity:1; }
.lw .${k}:not([data-at="0"]):not([data-at="1"]) .west { opacity:.13; }
.lw .${k}[data-at="3"] .sal, .lw .${k}[data-at="4"] .sal { fill:var(--hot); }
.lw .${k}[data-at="5"] .sal { opacity:.13; }
.lw .${k}[data-at="2"] .east.reg { fill:var(--accent); font-weight:600; }
.lw .${k}[data-at="4"] .idm, .lw .${k}[data-at="5"] .idm { fill:var(--accent); }
.lw .${k} .lay { transition:fill .5s, stroke .5s; }
${[1, 2, 3, 4].map((s) => `.lw .${k}[data-at="${s}"] .lay.l${s} { fill:var(--accent-bg); stroke:var(--accent); }`).join("\n")}
.lw .${k}[data-at="5"] .lay { fill:var(--ok-bg); stroke:var(--ok); }
`;

const ry = (i) => 78 + i * 26;
const cell = (i, c, text, cls) => `<text class="c ${cls}" x="${COLS[c][1]}" y="${ry(i)}">${text}</text>`;
const table = ROWS.map((r, i) => {
  const side = r[0] === "EAST" ? "east" : "west";
  return cell(i, 0, r[0], `${side} reg`) + cell(i, 1, r[1], side) + cell(i, 2, r[2], side)
    + `<g class="st" data-on="0 1 2">${cell(i, 3, r[3], `${side} sal`)}</g><g class="st" data-on="3 4 5">${cell(i, 3, "blocked", `${side} sal`)}</g>`
    + `<g class="st" data-on="0 1 2 3">${cell(i, 4, r[4], side)}</g><g class="st" data-on="4 5">${cell(i, 4, "XXXXX" + r[4].slice(5), `${side} idm`)}</g>`;
}).join("");

const code = (lines) => lines.map(([s, cls], i) => t(34, 292 + i * 24, s, `mono l ${cls ?? ""}`)).join("");

const scene = () => `<svg viewBox="0 0 760 420">
  ${zone(14, 10, 500, 236, "hr.payroll — AN INVENTED TABLE")}
  ${COLS.map(([name, x]) => `<text class="hd" x="${x}" y="50">${name}</text>`).join("")}
  ${table}<rect class="frame" x="24" y="36" width="480" height="200" rx="8"/>
  ${zone(526, 10, 220, 236, "THE LAYERS, IN ORDER")}
  ${LAYERS.map((s, i) => `<rect class="pill lay l${i + 1}" x="542" y="${42 + i * 48}" width="188" height="36" rx="18"/>${t(636, 61 + i * 48, s)}`).join("")}
  ${zone(14, 258, 732, 152)}

  ${on("0", t(30, 277, "THE QUERY", "cap") + code([["SELECT * FROM hr.payroll;"], ["-- run by a member of group:hr-east, who is not in group:hr-leads", "dim"]])
    + t(34, 372, "Hold the table in mind. Every step from here removes something from it.", "l"))}
  ${on("1", t(30, 277, "A ROLE, TO A PRINCIPAL, ON AN OBJECT", "cap") + code([["roles/bigquery.dataViewer", "acc"], ["  to  group:hr-east@agency.example", ""], ["  on  dataset hr", ""]])
    + t(380, 292, "a group: joiners and leavers", "lbl l") + t(380, 312, "are a personnel task, not a re-grant", "lbl l")
    + t(380, 346, "a service account per job: a pipeline", "lbl l") + t(380, 366, "that leaks cannot read everything", "lbl l"))}
  ${on("2", t(30, 277, "A ROW ACCESS POLICY", "cap") + code([["CREATE ROW ACCESS POLICY east_only ON hr.payroll", ""], ["GRANT TO (\"group:hr-east@agency.example\")", ""], ["FILTER USING (region = 'EAST');", "acc"]])
    + t(34, 376, "Add a policy with FILTER USING (TRUE) for the groups that must keep seeing everything.", "lbl l")
    + t(34, 396, "Its filter does not prune partitions: a policy on a date column does not make scans cheaper.", "lbl l"))}
  ${on("3", t(30, 277, "A POLICY TAG ON THE COLUMN", "cap") + code([["salary  ←  policy tag  pay / restricted", ""], ["Fine-Grained Reader on the tag:  group:hr-leads", ""], ["SELECT * FROM hr.payroll   →  rejected; the error names the column", "hot"]])
    + t(34, 376, "Tags live in a taxonomy, so one tag governs the same kind of column across many tables.", "lbl l")
    + t(34, 396, "A data policy can also be put on a column directly, with no taxonomy: simpler for a small team.", "lbl l"))}
  ${on("4", t(30, 277, "A DATA POLICY: A MASKING RULE", "cap") + code([["national_id  ←  rule: last four characters", ""], ["Masked Reader:        group:hr-east     →  XXXXX5674", "acc"], ["Fine-Grained Reader:  group:hr-leads    →  012345674", ""]])
    + t(34, 376, "Other rules: nullify, a default value, an email mask, first four, a year for a date, a hash.", "lbl l")
    + t(34, 396, "The hash rule is the tempting one for identifiers. The next picture is about why to be careful.", "lbl l"))}
  ${on("5", t(30, 277, "THE QUERY THAT RUNS", "cap") + code([["SELECT name, department, national_id FROM hr.payroll;", "acc"], ["-- 3 rows · salary never requested · national_id masked", "dim"]])
    + t(34, 356, "Not in the Standard edition: row policies, column security and masking need Enterprise,", "lbl l")
    + t(34, 376, "Enterprise Plus or on-demand. A fact for procurement, before the design depends on it.", "lbl l")
    + t(34, 396, "Snowflake: row access and masking policies. Redshift: row-level security and column grants.", "lbl l"))}
</svg>`;

export default widget({ key: "ly", label: "Access control, layer by layer", css: CSS("ly"), steps, scene, captured: {} });
