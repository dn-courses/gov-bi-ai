// dw-snowflake — the same product in three shapes: the classic relational tables, a snowflake and a
// star, and what each costs the person writing the query.
// The rows are those of order 4473, line 3: product 3555 (a Tools product) for customer 21688 on
// 2024-01-01, two units at 8,535 cents. Measured 2026-11-23 on the agents lab's `shop`:
//   fact       SELECT * FROM mart.fact_sales WHERE product_key = 3555 ORDER BY order_id LIMIT 1
//   star       SELECT * FROM mart.dim_product WHERE product_key = 3555        -> Tools
//   snowflake  the page's cell builds dim_category (dense_rank over the 20 names: Tools is 19)
//   classic    the same line as the transactional tables would hold it (orders, order_items,
//              products, categories; category 16 is Tools there). An example: the drawing says so nowhere.
//   repeats    SELECT count(*) FROM dim_product WHERE category = 'Tools'                -> 500 of 10,000
//              the fact lines of Tools products: count(*) of fact_sales joined to it     -> 83,331
//              Tools rows shown: product_key 15, 35, 55 (the first three) and 3555
//   answer     revenue of Tools in 2025, excluding pending, from the snowflake and the star -> 6,209,800.75 both
import { CSS, DW_CSS, SHOP, fmt, grid, on, schema, svg, t, widget } from "./dw-lib.js";

const CAPTURED = {
  ...SHOP, id: 3555, tools: 500, toolLines: 83331, answer: "6,209,800.75",
  order: "4473", customer: "21688",
  toolRows: [["15", "Product 000015", "Tools", "1055"], ["35", "Product 000035", "Tools", "1795"], ["55", "Product 000055", "Tools", "2535"], ["3555", "Product 003555", "Tools", "8535"]],
};

const steps = (D) => [
  { stop: "Classic", title: "Classic relational: built to write one order",
    note: `A sale is split in two: the order holds the day and the customer, its lines hold the product and the quantity. The line knows neither when nor for whom. Every table points to the next, in a chain, and none is the centre.` },
  { stop: "Snowflake", title: "Snowflake: one fact in the centre, the dimensions still normalized",
    note: `The order and its lines become one fact row per line, and that row holds every key itself: the day, the customer, the product, beside the measures. The dimensions around it stay normalized: the word "Tools" is one table further out, behind <code>category_key</code>.` },
  { stop: "Two facts", title: "A snowflake with two facts, on the same dimensions",
    note: `A warehouse holds more than one fact. Stock is counted per product, warehouse and day: a second fact at its own grain, beside sales. Both stand on the same <code>dim_date</code> and <code>dim_product</code>, so a report can put sales and stock side by side by month and by category. Shared dimensions are what make two facts comparable.` },
  { stop: "Star", title: "Star: the category folded into the product",
    note: `Same fact, but each dimension is one table. The product's row carries the word itself, so every attribute is one hop from the fact.` },
  { stop: "Two facts", title: "A star with the same two facts",
    note: `Each dimension is one table again, and both facts reach every attribute in one hop. Start from the dimensions a question names, then add the measures from whichever fact holds them.` },
  { stop: "Repeats", title: "The star repeats a word, in a small table", decisive: true,
    note: `"Tools" is written on ${fmt(D.tools)} of the ${fmt(D.products)} product rows. Folding it into the dimension costs ${fmt(D.tools)} repeats; folding it into the fact, as a wide row, would cost ${fmt(D.toolLines)}. The dimension is the small table, so that is where the repetition goes.` },
  { stop: "The query", title: "What each shape asks of the person writing the query",
    note: `Revenue by category in 2025, written the way it is reasoned: start from the dimension the answer is grouped by, the category, join the fact for the measure, then the date to keep 2025. Classic: three joins, and the year is found on the order, not the line. Snowflake: three joins, the category two tables out. Star: two joins, one hop each. The snowflake and the star give the same answer: Tools, ${D.answer}.` },
];

const PAD = 14;
const SCOLS = ["product_key", "name", "category", "list_cents"];
const FACT = (D, cls = "chg") => grid(24, 172, ["order_id", "line_no", "date_key", "customer_key", "product_key", "quantity", "unit_cents"],
  [[D.order, "3", ["20240101", cls], [D.customer, cls], ["3555", cls], "2", "8535"]], { cap: "fact_sales — one row per order line", pad: PAD });

// Classic: order_items → orders → customers, order_items → products → categories.
const classic = (D) => `${schema([["customers", 96, 40], ["orders", 270, 40], ["order_items", 470, 40, "now"], ["products", 470, 104], ["categories", 660, 104]],
    [[2, 1], [1, 0], [2, 3], [3, 4]])}
  ${grid(24, 190, ["order_id", "line_no", "product_id", "quantity"], [[[D.order, "chg"], "3", "3555", "2"]], { cap: "order_items — the line", pad: PAD })}
  ${grid(24, 306, ["order_id", "customer_id", "created_at"], [[D.order, [D.customer, "rep"], ["2024-01-01 14:54", "rep"]]], { cap: "orders — the day and the customer", pad: PAD })}
  ${grid(440, 190, ["product_id", "category_id"], [["3555", ["16", "chg"]]], { cap: "products", pad: PAD })}
  ${grid(440, 306, ["category_id", "name"], [["16", "Tools"]], { cap: "categories", pad: PAD })}`;

// Snowflake: the fact in the centre; dim_product → dim_category one step further.
const snowflake = (D) => `${schema([["dim_date", 96, 36], ["dim_customer", 96, 104], ["fact_sales", 330, 70, "fact"], ["dim_product", 506, 70], ["dim_category", 672, 70, "now"]],
    [[0, 2], [1, 2], [3, 2], [4, 3]])}
  ${FACT(D)}
  ${grid(24, 296, ["product_key", "name", "category_key"], [["3555", "Product 003555", ["19", "chg"]]], { cap: "dim_product", pad: PAD })}
  ${grid(440, 296, ["category_key", "category"], [["19", "Tools"]], { cap: "dim_category", pad: PAD })}`;

// Two facts on shared dimensions: the dimensions below, the facts and their measures on top of them.
const FACTS = (cx1, cx2) => `${t(cx1, 52, "one row per order line", "lbl")}${t(cx1, 74, "quantity · unit_cents", "mono acc")}
  ${t(cx2, 52, "one row per product, warehouse, day", "lbl")}${t(cx2, 74, "units_on_hand", "mono acc")}`;
const twoFacts = (snow) => `${schema([["fact_sales", 250, 112, "fact"], ["fact_stock", 540, 112, "fact"],
    ["dim_customer", 100, 250], ["dim_date", 300, 250], ["dim_product", 490, 250], ["dim_warehouse", 670, 250],
    ...(snow ? [["dim_category", 490, 344, "now"]] : [])],
    [[2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 1], ...(snow ? [[6, 4]] : [])])}${FACTS(250, 540)}
  ${t(395, 32, "the facts: what is measured", "h")}${t(200, 296, "the dimensions: who, what, when, where", "lbl")}
  ${snow ? t(490, 388, "the category, one table further out", "lbl") : t(395, 350, "every attribute one hop from each fact", "h acc")}`;

// Star: the fact in the centre, every dimension one hop away.
const star = (D) => `${schema([["dim_date", 150, 36], ["dim_customer", 150, 104], ["fact_sales", 380, 70, "fact"], ["dim_product", 600, 70, "now"]],
    [[0, 2], [1, 2], [3, 2]])}
  ${FACT(D, "")}
  ${grid(24, 296, ["product_key", "name", "category", "list_cents"], [["3555", "Product 003555", ["Tools", "chg"], "8535"]], { cap: "dim_product — the word on the product's row", pad: PAD })}`;

const CODE = [
  ["classic relational", ["FROM categories c", "JOIN products p", "JOIN order_items i", "JOIN orders o"], "3 joins", "the year is on the order"],
  ["snowflake", ["FROM dim_category c", "JOIN dim_product p", "JOIN fact_sales f", "JOIN dim_date d"], "3 joins", "the category two tables out"],
  ["star", ["FROM dim_product p", "JOIN fact_sales f", "JOIN dim_date d"], "2 joins", "one hop each"],
];

const scene = (D) => svg(760, 400, `
  ${on("0", classic(D))}
  ${on("1", snowflake(D))}
  ${on("2", twoFacts(true))}
  ${on("3", star(D))}
  ${on("4", twoFacts(false))}
  ${on("5", `${grid(40, 40, SCOLS, D.toolRows.map(([a, b, c, d]) => [a, b, [c, "rep"], d]), { cap: "dim_product — 4 of the 500 Tools rows", pad: PAD })}
    ${t(200, 250, fmt(D.tools), "huge hot")}${t(200, 284, `rows of ${fmt(D.products)}: the dimension`, "lbl")}
    ${t(560, 250, fmt(D.toolLines), "huge")}${t(560, 284, "fact lines, had the word gone there", "lbl")}
    ${t(380, 344, "repeat in the small table, never in the big one", "h acc")}`)}
  ${on("6", `${CODE.map(([name, lines, joins, why], i) => {
    const x = 24 + i * 244;
    return `${t(x + 8, 34, name.toUpperCase(), "cap")}<rect class="term" x="${x}" y="46" width="228" height="120" rx="8"/>
      ${lines.map((l, j) => t(x + 14, 70 + j * 24, l, "code")).join("")}
      ${t(x + 114, 200, joins, `num ${i === 2 ? "acc" : "hot"}`)}${t(x + 114, 230, why, "lbl")}`;
  }).join("")}
    ${t(380, 300, `Tools, 2025: ${D.answer}`, "h")}${t(380, 328, "the same from the snowflake and the star — the cell runs both", "lbl")}`)}
`);

const css = CSS("dwf") + DW_CSS("dwf");

export default widget({ key: "dwf", label: "Classic relational, snowflake, star", css, steps, scene, captured: CAPTURED });
