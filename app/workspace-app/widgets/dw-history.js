// dw-history — state and history: a customer moves country, the transactional row is overwritten, and
// the warehouse chooses between overwriting (Type 1) and a new row per version (Type 2).
// CAPTURED on the postgres lab's `shop`, 2026-11-22:
//   the row       SELECT customer_id, country, signed_up FROM public.customers WHERE customer_id = 21688
//   the copy      SELECT customer_key, country, region FROM mart.dim_customer WHERE customer_key = 21688
//   the orders    the customer's six orders in mart.fact_sales, revenue = sum(quantity * unit_cents) / 100.0
//   the report    the page's second cell: revenue of 2024 (pending excluded) for Sweden and Norway, from the
//                 stored dimension, a Type 1 and a Type 2 dimension each built inside the query
// THE MOVE IS AN EXAMPLE: customer 21688 lives in Sweden in the lab; the move to Norway on 2025-06-01,
// the Type 1 and Type 2 rows, and surrogate key 100001 exist only inside the cells' queries, and every
// step that shows them says so.
import { CSS, DW_CSS, grid, node, on, svg, t, widget } from "./dw-lib.js";

const CAPTURED = {
  id: 21688, moved: "1,112.37",
  orders: [["4473", "2024-01-01", "568.31"], ["904473", "2024-05-05", "155.79"], ["1804473", "2024-09-07", "388.27"],
    ["2704473", "2025-01-10", "540.75"], ["3604473", "2025-05-15", "578.23"], ["4504473", "2025-09-17", "335.71"]],
  report: [["Norway", "7,596,384.59", "7,597,496.96", "7,596,384.59"], ["Sweden", "6,081,415.67", "6,080,303.30", "6,081,415.67"]],
};

const steps = (D) => [
  { stop: "State", title: "The transactional row holds where the customer lives now",
    note: `Customer ${D.id}, as the application stores them: one row, one country.` },
  { stop: "The move", title: "The customer moves: the row is overwritten",
    note: `Suppose the customer moves to Norway (an example: in the lab they live in Sweden). The application updates one value, and <code>SE</code> is gone. That is right for the application: the next parcel goes to Norway.` },
  { stop: "The copy", title: "The warehouse holds a copy, and the orders point at it",
    note: `In <code>mart</code> the customer is a row of <code>dim_customer</code>, and each of their six order lines in <code>fact_sales</code> carries its key. Every order reports under Sweden.` },
  { stop: "Type 1", title: "Type 1: overwrite the dimension row",
    note: `The copy takes the new country, as the source did. One row per customer, always current. Every order now reports under Norway, including the three from 2024, when the customer lived in Sweden.` },
  { stop: "Type 2", title: "Type 2: close the old row, add a new one", decisive: true,
    note: `The old row stays, with the last day it was true. The new row gets dates of its own and a new key, <code>customer_sk</code>, which identifies a version, not a customer: <code>customer_id</code> stays the same on both. Orders before the move keep pointing at the Sweden version; only the order after it points at Norway.` },
  { stop: "2024 report", title: "The 2024 revenue-by-country report, under each",
    note: `Type 1 rewrote 2024: ${D.moved} — the customer's three 2024 orders — moved from Sweden to Norway, and a report printed before the move no longer matches. Type 2 still says what the 2024 report said.` },
  { stop: "Choose", title: "Each attribute gets one of the two, on purpose",
    note: `Type 1 suits corrections and attributes nobody reports history by. Type 2 suits anything a report slices by over time; it costs a key, two dates and a row per change. A Type 2 dimension still answers "by today's country": join on <code>customer_id</code> to the current row.` },
];

const PAD = 14;
const OCOLS = (key, joined) => ["order_id", "day", key, "revenue", ...(joined ? ["country"] : [])];

// The customer's six orders; `key(i)` and `country(i)` give the cells this step shows.
const orders = (D, keyName, key, country, cap) =>
  grid(24, 176, OCOLS(keyName, !!country), D.orders.map(([o, d, r], i) => [o, d, key(i), r, ...(country ? [country(i)] : [])]), { cap, pad: PAD, rowH: 25 });

const scene = (D) => svg(760, 420, `
  ${on("0", `${grid(24, 60, ["customer_id", "country", "signed_up"], [[`${D.id}`, "SE", "2021-11-19"]], { cap: "customers — the state now", pad: PAD })}
    ${t(560, 90, "one row per customer", "h acc")}${t(560, 116, "holding the state now", "lbl")}`)}
  ${on("1", `${grid(24, 60, ["customer_id", "country", "signed_up"], [[`${D.id}`, ["NO", "chg"], "2021-11-19"]], { cap: "customers — after the move", pad: PAD })}
    ${t(24, 190, `UPDATE customers SET country = 'NO' WHERE customer_id = ${D.id};`, "code")}
    ${t(560, 90, "SE is gone", "h hot")}${t(560, 116, "and that is right, here", "lbl")}`)}
  ${on("2", `${grid(24, 60, ["customer_key", "country", "region"], [[`${D.id}`, "Sweden", "Europe"]], { cap: "dim_customer", pad: PAD })}
    ${orders(D, "customer_key", () => `${D.id}`, () => "Sweden", "fact_sales — the customer's orders, joined")}`)}
  ${on("3", `${grid(24, 60, ["customer_key", "country", "region"], [[`${D.id}`, ["Norway", "chg"], "Europe"]], { cap: "dim_customer — Type 1: overwrite", pad: PAD })}
    ${orders(D, "customer_key", () => `${D.id}`, () => ["Norway", "rep"], "fact_sales — joined to the Type 1 row")}
    ${t(600, 260, "all six orders:", "h")}${t(600, 286, "Norway", "h hot")}${t(600, 312, "2024 included", "lbl")}`)}
  ${on("4", `${grid(24, 44, ["customer_sk", "customer_id", "country", "valid_from", "valid_to"],
      [[`${D.id}`, `${D.id}`, "Sweden", "2024-01-01", ["2025-05-31", "chg"]], [["100001", "chg"], [`${D.id}`, "chg"], ["Norway", "chg"], ["2025-06-01", "chg"], ["9999-12-31", "chg"]]],
      { cap: "dim_customer — Type 2: a new version", pad: PAD })}
    ${orders(D, "customer_sk", (i) => (i === 5 ? ["100001", "chg"] : `${D.id}`), (i) => (i === 5 ? ["Norway", "chg"] : "Sweden"), "fact_sales — each order with its version")}
    ${t(600, 260, "five orders: Sweden", "h")}${t(600, 286, "one, after the move:", "h")}${t(600, 312, "Norway", "h acc")}`)}
  ${on("5", `${grid(80, 70, ["country", "before the move", "Type 1", "Type 2"],
      D.report.map(([c, b, t1, t2]) => [c, b, [t1, "rep"], t2]), { cap: "revenue 2024 — by country", pad: 40, rowH: 34 })}
    ${t(380, 250, `${D.moved} moved`, "num hot")}${t(380, 282, "under Type 1, the customer's 2024 orders changed country", "lbl")}
    ${t(380, 334, "Type 2: the 2024 report is the 2024 report", "h acc")}`)}
  ${on("6", `${node(24, 40, 346, 230, "", "")}${t(197, 76, "Type 1 — overwrite", "h")}
    ${["a correction: a misspelt name", "nobody reports history by it", "one row per customer", "the old value is gone"].map((l, i) => t(197, 120 + i * 30, l, "lbl")).join("")}
    ${node(390, 40, 346, 230, "", "hit")}${t(563, 76, "Type 2 — a row per version", "h acc")}
    ${["a report slices by it over time", "a surrogate key and two dates", "a row per change", "today's view: the current row"].map((l, i) => t(563, 120 + i * 30, l, "lbl")).join("")}
    ${t(380, 320, "history is a decision, made per attribute", "h")}`)}
`);

const css = CSS("dwy") + DW_CSS("dwy");

export default widget({ key: "dwy", label: "State and history", css, steps, scene, captured: CAPTURED });
