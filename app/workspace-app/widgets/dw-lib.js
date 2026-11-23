// dw-lib — shared by the data-warehousing widgets: the common pieces, and the facts every one of
// them quotes about the lab's `shop` database (schema `mart`: fact_sales, dim_date, dim_customer,
// dim_product; schema `public`: the transactional orders, order_items, customers, products).
// Not a widget itself.
//
// SHOP was measured on the postgres lab on 2026-11-22. The data is generated from row numbers, so it
// is the same on every boot. The queries (search_path = mart):
//   lines, orders     SELECT count(*), count(DISTINCT order_id) FROM fact_sales
//   customers, …      SELECT count(*) FROM dim_customer / dim_product / dim_date
//   revenue           SELECT sum(quantity * unit_cents) FILTER (WHERE status <> 'pending') / 100.0 FROM fact_sales
//   allLines          the same sum with the pending orders left in
export * from "./ramp-lib.js";

export const SHOP = {
  lines: 1666665, orders: 555555, customers: 100000, products: 10000, dates: 731,
  categories: 20, regions: 4, months: 23,
  revenue: "259,563,950.13", allLines: "262,181,709.46",
};

export const fmt = (n) => Number(n).toLocaleString("en-US");

// Tables and schemas are drawn by the shared component; `grid` is its table under the name the
// warehousing widgets use.
export { CW, schema, table as grid, tableHeight as gridHeight, tableWidth as gridWidth, widths } from "@widget-lib/table.js";
import { TABLE_CSS } from "@widget-lib/table.js";

export const DW_CSS = (k) => TABLE_CSS(k) + `
.lw .${k} text.cap { font-size:12px; }
.lw .${k} text.tname { font-weight:700; }
.lw .${k} text.col.key { fill:var(--mute); }
.lw .${k} text.col.measure { fill:var(--hot); font-weight:700; }
.lw .${k} text.col.attr { fill:var(--accent); font-weight:700; }
.lw .${k} text.small { font-size:12px; }
`;
