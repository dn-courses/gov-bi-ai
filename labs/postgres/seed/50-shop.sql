-- Authored initdb step (NOT a vendored download). Builds a second database, `shop`, beside Pagila.
--
-- `shop` is a teaching dataset for performance lessons, and it is built to be STERILE:
--   * every value is computed from the row number — no random() — so every boot gives the same rows,
--     the same page counts and the same plans, and a lesson can quote a number;
--   * no foreign keys, so a lesson may drop, rebuild or reload any table;
--   * no index beyond the two primary keys, so a lesson adds the index it is about;
--   * each column has one job (see the comments on the columns below).
-- Change a row count or a column here only together with the lessons that quote its numbers:
-- modules/rdbms/rdbms-performance-fundamentals and rdbms-performance-tuning.

CREATE DATABASE shop;
-- JIT compilation adds a block of lines to every plan above a cost threshold and is never a lesson's
-- subject here, so it is off for this database. (A session can still turn it on.)
ALTER DATABASE shop SET jit = off;
\connect shop

CREATE EXTENSION pageinspect;
CREATE EXTENSION pg_buffercache;
CREATE EXTENSION pg_prewarm;

-- products: 10,000 rows on exactly 100 pages (100 rows a page), no index at all. The round numbers
-- are the point: a sequential scan costs 100 pages x 1.0 + 10,000 rows x 0.01 = 200.00, by hand.
-- Every row is the same width (a 27-character name, with no comma, so a lesson can split an
-- exported line by hand), and fillfactor 84 stops each page at exactly
-- 100 rows — 83 gives 99 a page, 85 gives 101. Do not "tidy" either.
CREATE TABLE products (
    product_id  integer NOT NULL,
    category_id integer NOT NULL,        -- 20 categories, even
    price_cents integer NOT NULL,
    name        text    NOT NULL
) WITH (fillfactor = 84);
INSERT INTO products
SELECT g, 1 + g % 20, 500 + (g * 37) % 9500,
       'Product ' || lpad(g::text, 6, '0') || ' category ' || lpad((1 + g % 20)::text, 3, '0')
FROM generate_series(1, 10000) g;

-- customers: 100,000 rows; the small side of a join.
CREATE TABLE customers (
    customer_id integer PRIMARY KEY,
    email       text NOT NULL,           -- mixed case: a lookup has to lower() it
    country     text NOT NULL,           -- 20 countries, even
    signed_up   date NOT NULL
);
INSERT INTO customers
SELECT g,
       'User' || g || '@Example.com',
       (ARRAY['US','GB','DE','FR','IL','ES','IT','NL','SE','PL','BR','MX','CA','AU','JP','IN','ZA','AR','CH','NO'])[1 + g % 20],
       date '2020-01-01' + (g % 1500)
FROM generate_series(1, 100000) g;

-- orders: 5,000,000 rows, in order of creation.
CREATE TABLE orders (
    order_id    integer     PRIMARY KEY,
    customer_id integer     NOT NULL,    -- 50 orders per customer, scattered over the whole table
    status      text        NOT NULL,    -- skewed: ~95% delivered, ~4% shipped, ~1% pending
    created_at  timestamptz NOT NULL,    -- rises with order_id, i.e. with physical position
    country     text        NOT NULL,    -- the customer's country
    currency    text        NOT NULL,    -- fully determined by country
    amount      numeric(10,2) NOT NULL,
    note        text        NOT NULL     -- padding: makes a row wide enough that page reads matter
);
INSERT INTO orders
SELECT g,
       c,
       CASE WHEN r = 0 THEN 'pending' WHEN r < 5 THEN 'shipped' ELSE 'delivered' END,
       timestamptz '2024-01-01 00:00:00+00' + g * interval '12 seconds',
       (ARRAY['US','GB','DE','FR','IL','ES','IT','NL','SE','PL','BR','MX','CA','AU','JP','IN','ZA','AR','CH','NO'])[1 + c % 20],
       (ARRAY['USD','GBP','EUR','EUR','ILS','EUR','EUR','EUR','SEK','PLN','BRL','MXN','CAD','AUD','JPY','INR','ZAR','ARS','CHF','NOK'])[1 + c % 20],
       5 + (g * 7 % 49500) / 100.0,
       md5(g::text)
FROM (SELECT g,
             1 + (g::bigint * 7919 % 100000)::int AS c,
             -- r scatters 0..99 over the rows with a multiplier unrelated to the one behind c. A plain
             -- `g % 100` would tie status to customer_id (every pending order would belong to the same
             -- 1,000 customers) — a hidden correlation no lesson asked for.
             (g::bigint * 48271 % 2147483647 % 100)::int AS r
      FROM generate_series(1, 5000000) g) s;

-- order_items: three lines per order, 15,000,000 rows, no index. The large side of a large join and
-- the input of a CPU-bound aggregate.
CREATE TABLE order_items (
    order_id   integer  NOT NULL,
    line_no    smallint NOT NULL,
    product_id integer  NOT NULL,
    quantity   smallint NOT NULL,
    unit_cents integer  NOT NULL
);
INSERT INTO order_items
SELECT o, l, 1 + (o::bigint * 31 + l * 17) % 10000, 1 + (o + l) % 5, 500 + ((1 + (o::bigint * 31 + l * 17) % 10000) * 37) % 9500
FROM generate_series(1, 5000000) o, generate_series(1, 3) l;

-- Statistics first, then VACUUM: it compacts nothing here but sets the visibility map (index-only
-- scans depend on it) and, having read every page, leaves an EXACT row count in pg_class — ANALYZE
-- alone leaves a sampled one that differs a little on every boot. Column statistics on the two large
-- tables are still sampled, so their row estimates move in the last digits; `products` and
-- `customers` are small enough to be read whole and are exact.
ANALYZE products, customers, orders, order_items;
VACUUM products, customers, orders, order_items;
