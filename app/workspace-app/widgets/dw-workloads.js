// dw-workloads — the two workloads a database is asked to carry, drawn from the lab's `shop`.
// CAPTURED on the postgres lab, 2026-11-22, with max_parallel_workers_per_gather = 0:
//   the order     SELECT order_id, customer_id, status, created_at FROM public.orders WHERE order_id = 4473
//                 Index Scan using orders_pkey, actual rows=1
//   the question  SELECT country, count(*) FROM public.orders WHERE created_at >= '2025-01-01' GROUP BY country
//                 Seq Scan on orders: 2,364,801 rows kept + 2,635,199 removed by the filter = 5,000,000 read;
//                 HashAggregate: 20 rows returned
//   the copy      SELECT * FROM mart.fact_sales WHERE order_id = 4473 -> its three lines (date_key 20240101,
//                 customer_key 21688, delivered); fact_sales holds 1,666,665 lines of 555,555 orders
//   table sizes   reltuples of public.orders (5,000,000) and public.order_items (15,000,000)
import { CSS, DW_CSS, SHOP, arrow, chip, fmt, grid, node, on, svg, t, widget, zone } from "./dw-lib.js";

const CAPTURED = {
  ...SHOP, orderRows: 5000000, itemRows: 15000000, read: 5000000, out: 20, id: 4473,
  order: [["order_id", "4473"], ["customer_id", "21688"], ["status", "delivered"], ["created_at", "2024-01-01 14:54:36"]],
  copy: [["4473", "1", "20240101", "21688", "delivered"], ["4473", "2", "20240101", "21688", "delivered"], ["4473", "3", "20240101", "21688", "delivered"]],
};

const steps = (D) => [
  { stop: "One order", title: "The application asks for one order, by its key",
    note: `A customer places order ${D.id} and the application writes it at once. When a clerk opens it, the database goes straight to it by its key: <b>1 row</b> read, of ${fmt(D.orderRows)}.` },
  { stop: "One question", title: "An analyst asks one question, over all of it",
    note: `"How many orders did each country place in 2025?" Nothing is written. One statement reads all <b>${fmt(D.read)}</b> rows of <code>orders</code> to return ${D.out}, about orders placed long before.` },
  { stop: "Access", title: "Two access patterns",
    note: `Many tiny reads and writes, each by key, each wanted back at once; against few huge reads that touch every row and write nothing. A design that serves one of them well serves the other badly.` },
  { stop: "State", title: "The transactional row holds the state right now", decisive: true,
    note: `The row says <code>delivered</code>. Whatever it said before is gone: an update replaces the value, and for the application that is right. A report asks about then — what was true when the order was placed — and the row cannot say.` },
  { stop: "Two systems", title: "So they live in two systems, and a copy flows one way",
    note: `The analytical side gets a copy of the transactional data, reshaped for questions and kept as history. The scan of millions never competes with the clerk for CPU, memory and disk. The lab's <code>mart</code> holds every 9th order: a sample, the same order ${D.id} among them.` },
];

// 400 dots for the 5,000,000 orders: one dot is 12,500 of them.
const COLS = 40, ROWS = 10;
const dots = () => Array.from({ length: COLS * ROWS }, (_, i) =>
  `<circle class="pt ${i === 0 ? "one" : ""}" cx="${352 + (i % COLS) * 9.4}" cy="${70 + Math.floor(i / COLS) * 16}" r="3.4"/>`).join("");

const AXES = [
  ["the application", "Who asks", "an analyst, for a report"],
  ["one order, by its key", "What", "every order of a year"],
  ["1 row", "Rows read", "5,000,000 rows"],
  ["all day, a row at a time", "Writes", "none"],
  ["now", "About", "what already happened"],
];

const kv = (x, y, pairs, hl = -1) => pairs.map(([k, v], i) =>
  `${t(x, y + i * 24, k, "mono l dim")}${t(x + 112, y + i * 24, v, `mono l ${i === hl ? "chg" : ""}`)}`).join("");

const scene = (D) => svg(760, 372, `
  ${on("0 1", `${zone(330, 16, 406, 340, "public.orders · ONE DOT = 12,500 ORDERS")}${dots()}`)}
  ${on("0", `${zone(24, 16, 290, 340, "THE STATEMENT")}
    ${t(40, 56, "SELECT order_id, customer_id,", "code")}${t(40, 76, "       status, created_at", "code")}${t(40, 96, "FROM orders", "code")}${t(40, 116, `WHERE order_id = ${D.id};`, "code")}
    ${t(169, 164, "1", "huge acc")}${t(169, 194, "row read, found by its key", "lbl")}
    ${kv(40, 248, D.order)}
    ${t(533, 260, "one order, found by its key", "h acc")}${t(533, 288, "the other rows are never looked at", "lbl")}`)}
  ${on("1", `${zone(24, 16, 290, 340, "THE STATEMENT")}
    ${["SELECT country, count(*)", "FROM orders", "WHERE created_at >= '2025-01-01'", "GROUP BY country;"].map((l, i) => t(40, 56 + i * 20, l, "code")).join("")}
    ${t(169, 200, fmt(D.read), "huge hot")}${t(169, 234, `rows read · ${D.out} returned`, "lbl")}
    ${t(533, 260, "every order, to answer one question", "h hot")}${t(533, 288, "nothing written", "lbl")}`)}
  ${on("2", `${zone(24, 16, 270, 340, "TRANSACTIONAL")}${zone(466, 16, 270, 340, "ANALYTICAL")}
    ${AXES.map(([a, k, b], i) => `${node(38, 48 + i * 60, 242, 44, a, "hit", "")}${t(380, 70 + i * 60, k, "lbl")}${node(480, 48 + i * 60, 242, 44, b, "warm", "")}`).join("")}`)}
  ${on("3", `${zone(24, 16, 340, 340, "public.orders — THE ROW AS IT IS")}${kv(48, 76, D.order, 2)}
    ${t(194, 210, "UPDATE … SET status = …", "mono")}${t(194, 238, "replaces the value in place", "lbl")}
    ${t(194, 300, "one row per order: the latest", "h acc")}
    ${zone(396, 16, 340, 340, "A REPORT'S QUESTION")}${t(566, 100, "what did this order", "h")}${t(566, 126, "look like on the day", "h")}${t(566, 152, "it was placed?", "h")}
    ${t(566, 220, "?", "huge hot")}${t(566, 300, "the row knows only now", "lbl")}`)}
  ${on("4", `${node(24, 20, 300, 130, "", "hit")}${t(174, 46, "transactional — public", "h acc")}
    ${t(174, 76, `orders · ${fmt(D.orderRows)}`, "mono")}${t(174, 98, `order_items · ${fmt(D.itemRows)}`, "mono")}${t(174, 120, "customers · products", "mono")}
    ${arrow(330, 85, 426, 85)}${t(378, 66, "copied", "lbl")}${t(378, 108, "one way", "lbl")}
    ${node(436, 20, 300, 130, "", "warm")}${t(586, 46, "analytical — mart", "h hot")}
    ${t(586, 76, `fact_sales · ${fmt(D.lines)}`, "mono")}${t(586, 98, "dim_date · dim_customer", "mono")}${t(586, 120, "dim_product", "mono")}
    ${grid(186, 200, ["order_id", "line_no", "date_key", "customer_key", "status"], D.copy, { cap: `fact_sales — order ${D.id}` })}`)}
`);

const css = CSS("dww") + DW_CSS("dww") + `
.lw .dww .pt { fill:var(--cell); stroke:var(--line); stroke-width:.6; transition:fill .6s; }
.lw .dww[data-at="0"] .pt.one { fill:var(--accent); stroke:var(--accent); }
.lw .dww[data-at="1"] .pt { fill:var(--hot); stroke:var(--hot); }
`;

export default widget({ key: "dww", label: "Two workloads", css, steps, scene, captured: CAPTURED });
