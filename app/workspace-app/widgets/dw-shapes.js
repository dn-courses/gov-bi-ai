// dw-shapes — one order as normalized rows and as wide rows, and the price of each shape.
// CAPTURED on the postgres lab's `shop`, schema public, 2026-11-22:
//   orders       SELECT order_id, customer_id, status, created_at FROM orders WHERE order_id = 4473
//   customers    SELECT customer_id, country, signed_up FROM customers WHERE customer_id = 21688
//   order_items  SELECT * FROM order_items WHERE order_id = 4473
//   products     SELECT product_id, category_id, price_cents FROM products WHERE product_id IN (8681, 8698, 8715)
//   wide rows    the page's cell: the four tables joined for order 4473 (line_no left out of the drawing)
//   repeats      SELECT count(*) FROM order_items i JOIN orders o ON o.order_id = i.order_id
//                WHERE o.customer_id = 21688                                    -> 150 (50 orders × 3)
import { CSS, DW_CSS, chip, gridWidth, grid, line, on, svg, t, widget, widths } from "./dw-lib.js";

const CAPTURED = {
  id: 4473, customer: 21688, repeats: 150, orders: 50,
  orders_: [["4473", "21688", "delivered", "2024-01-01 14:54"]],
  customers: [["21688", "SE", "2021-11-19"]],
  items: [["4473", "1", "8681", "5", "8197"], ["4473", "2", "8698", "1", "8826"], ["4473", "3", "8715", "2", "9455"]],
  products: [["8681", "2", "8197"], ["8698", "19", "8826"], ["8715", "16", "9455"]],
  wide: [["4473", "2024-01-01", "21688", "SE", "8681", "2", "5", "8197"],
    ["4473", "2024-01-01", "21688", "SE", "8698", "19", "1", "8826"],
    ["4473", "2024-01-01", "21688", "SE", "8715", "16", "2", "9455"]],
};

const steps = (D) => [
  { stop: "Normalized", title: `Order ${D.id} in the transactional tables`,
    note: `Four tables, and each fact is stored once: the order's status on its one row in <code>orders</code>, the customer's country on one row in <code>customers</code>, each line once in <code>order_items</code>, each product's price once in <code>products</code>.` },
  { stop: "Once", title: "A change touches one row",
    note: `Customer ${D.customer} moves: one value in one row changes, and every order of that customer reads the new country through the key. There is no second copy that could disagree.` },
  { stop: "Wide", title: "The same order as the analyst wants it: one wide row per line",
    note: `Everything about a line on one row: when it was ordered, by whom, from where, which product and category, how many, at what price. Group by any of those columns, no join in sight.` },
  { stop: "Joins", title: "The price of normalized: joins in every question",
    note: `The wide rows do not exist in the transactional schema. Every report rebuilds them: three joins for these columns, and the report writer has to know which key leads where.` },
  { stop: "Repeats", title: "The price of wide: the same value on many rows", decisive: true,
    note: `Customer ${D.customer} has ${D.orders} orders of 3 lines, so the wide shape writes <code>SE</code> on <b>${D.repeats} rows</b>. A move must now update ${D.repeats} rows instead of one, and a load that misses one leaves the customer in two countries.` },
];

const PAD = 14;
const T = {
  orders: [["order_id", "customer_id", "status", "created_at"], "orders_"],
  customers: [["customer_id", "country", "signed_up"], "customers"],
  items: [["order_id", "line_no", "product_id", "quantity", "unit_cents"], "items"],
  products: [["product_id", "category_id", "price_cents"], "products"],
};
const WIDE = ["order_id", "ordered_on", "customer_id", "country", "product_id", "category_id", "quantity", "unit_cents"];
const W = (D, k) => gridWidth(T[k][0], D[T[k][1]], widths(T[k][0], D[T[k][1]], PAD));
const tbl = (D, k, x, y, data = D[T[k][1]]) => grid(x, y, T[k][0], data, { cap: k === "items" ? "order_items" : k, pad: PAD });

// The four tables: orders and customers on top, the lines and the products under them.
function normalized(D, { country = false } = {}) {
  const xo = 24, xc = 24 + W(D, "orders") + 20, xi = 24, xp = 24 + W(D, "items") + 20;
  const cust = country ? [[D.customers[0][0], [D.customers[0][1], "chg"], D.customers[0][2]]] : D.customers;
  return `${tbl(D, "orders", xo, 40)}${tbl(D, "customers", xc, 40, cust)}${tbl(D, "items", xi, 150)}${tbl(D, "products", xp, 150)}`;
}

const scene = (D) => {
  const xc = 24 + W(D, "orders") + 20, xp = 24 + W(D, "items") + 20;
  const ww = widths(WIDE, D.wide, PAD), wx = (760 - gridWidth(WIDE, D.wide, ww)) / 2;
  const rep = D.wide.map((r) => r.map((v, i) => (i === 3 ? [v, "rep"] : v)));
  return svg(760, 400, `
  ${on("0 3", normalized(D))}
  ${on("1", normalized(D, { country: true }))}
  ${on("0", `${t(380, 320, "one fact, one row", "h acc")}${t(380, 348, "orders · customers · order_items · products", "mono")}`)}
  ${on("1", `${t(380, 316, `UPDATE customers SET country = … WHERE customer_id = ${D.customer};`, "mono")}${t(380, 348, "1 row changes", "num acc")}`)}
  ${on("2", `${grid(wx, 80, WIDE, D.wide, { cap: `order ${D.id} — as wide rows`, pad: PAD })}
    ${t(380, 260, "one row per line, every word on it", "h acc")}${t(380, 290, "GROUP BY country — no join", "mono")}`)}
  ${on("3", `${line(24 + 60, 106, 24 + 60, 150, "on")}${line(xc - 20, 73, xc, 73, "on")}${line(xp - 20, 213, xp, 213, "on")}
    ${["orders JOIN customers", "orders JOIN order_items", "order_items JOIN products"].map((j, i) => chip(30 + i * 240, 300, 220, 36, j, "warm", "mono")).join("")}
    ${t(380, 366, "3 joins to rebuild one wide row, in every report", "h hot")}`)}
  ${on("4", `${grid(wx, 40, WIDE, rep, { cap: `order ${D.id} — 3 of the customer's ${D.repeats} wide rows`, pad: PAD })}
    ${t(220, 210, `${D.repeats}`, "huge hot")}${t(220, 244, "rows say SE: a move updates them all", "lbl")}
    ${t(540, 210, "1", "huge acc")}${t(540, 244, "row in customers, normalized", "lbl")}
    ${t(380, 320, "the wide shape is fast to read and costly to change", "h")}`)}
`);
};

const css = CSS("dwh") + DW_CSS("dwh");

export default widget({ key: "dwh", label: "Normalized and denormalized", css, steps, scene, captured: CAPTURED });
