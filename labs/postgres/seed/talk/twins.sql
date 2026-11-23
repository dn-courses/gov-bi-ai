-- Authored. Builds the database `twins` from `shop`. Run by ../60-talk.sh, and only for a presented
-- course (SEED_TALK_DATA=1); see that file.
--
-- `twins` holds the same tables under different conditions, one schema per condition, so a page can
-- run ONE query text against each (`SET search_path = …`) and get a different right answer. It is
-- kept out of `shop` so the counts the performance modules print there stay as written. Used by
-- `rdbms-performance-with-ai`; change a table here only together with the numbers its pages quote.
--
--   rare       orders.state = 2 matches 445 rows of 5,000,000; customers has an index on email
--   most       orders.state = 2 matches 95% of the rows
--   norm       customers also carries an indexed column email_norm = lower(email)
--   stale      shipments: analyzed at 1,000 rows, then loaded to 2,000,000 (automatic analyze off)
--   fresh      the same shipments, analyzed after the load
--   big        events: 30,000,000 rows — one run of a plain query on it takes about half a minute
--              on the 3 CPUs a presented lab is given (compose.app.yml)
--

DROP DATABASE IF EXISTS twins WITH (FORCE);
CREATE DATABASE twins TEMPLATE template0;
ALTER DATABASE twins SET jit = off;

-- The data comes over from shop through a plain dump of the three source tables.
\! pg_dump -U postgres -d shop -t orders -t customers | psql -q -X -U postgres -d twins
\c twins
CREATE EXTENSION IF NOT EXISTS pg_buffercache;

CREATE SCHEMA rare;
CREATE SCHEMA most;
CREATE SCHEMA norm;
CREATE SCHEMA stale;
CREATE SCHEMA fresh;
CREATE SCHEMA big;

-- orders, with the word-valued status replaced by a number that says nothing about how common it is.
CREATE TABLE rare.orders AS
SELECT order_id, customer_id,
       (CASE WHEN status = 'pending' AND order_id % 100 = 7 THEN 2 WHEN status = 'delivered' THEN 3 ELSE 1 END)::smallint AS state,
       created_at, country, currency, amount, note
FROM public.orders ORDER BY order_id;

CREATE TABLE most.orders AS
SELECT order_id, customer_id,
       (CASE status WHEN 'delivered' THEN 2 WHEN 'pending' THEN 3 ELSE 1 END)::smallint AS state,
       created_at, country, currency, amount, note
FROM public.orders ORDER BY order_id;

ALTER TABLE rare.orders ADD PRIMARY KEY (order_id), ALTER customer_id SET NOT NULL, ALTER state SET NOT NULL;
ALTER TABLE most.orders ADD PRIMARY KEY (order_id), ALTER customer_id SET NOT NULL, ALTER state SET NOT NULL;

CREATE TABLE rare.customers AS SELECT * FROM public.customers ORDER BY customer_id;
ALTER TABLE rare.customers ADD PRIMARY KEY (customer_id);
CREATE INDEX customers_email_idx ON rare.customers (email);

CREATE TABLE norm.customers AS SELECT * FROM public.customers ORDER BY customer_id;
ALTER TABLE norm.customers ADD PRIMARY KEY (customer_id);
ALTER TABLE norm.customers ADD COLUMN email_norm text GENERATED ALWAYS AS (lower(email)) STORED;
CREATE INDEX customers_email_idx ON norm.customers (email);
CREATE INDEX customers_email_norm_idx ON norm.customers (email_norm);

DROP TABLE public.orders, public.customers;

-- shipments: statistics taken while the table was nearly empty, then the real load.
CREATE TABLE stale.shipments (
  shipment_id integer PRIMARY KEY,
  order_id    integer NOT NULL,
  carrier     text    NOT NULL,
  shipped_at  timestamptz NOT NULL
) WITH (autovacuum_enabled = off);
INSERT INTO stale.shipments
SELECT g, g, 'DHL', timestamptz '2024-01-01' + g * interval '1 minute'
FROM generate_series(1, 1000) g;
ANALYZE stale.shipments;
INSERT INTO stale.shipments
SELECT g, ((g::bigint * 7919) % 5000000 + 1)::int,
       CASE WHEN g % 5 < 2 THEN 'UPS' WHEN g % 5 < 4 THEN 'FedEx' ELSE 'DHL' END,
       timestamptz '2024-01-01' + g * interval '20 seconds'
FROM generate_series(1001, 2000000) g;

CREATE TABLE fresh.shipments (LIKE stale.shipments INCLUDING ALL);
INSERT INTO fresh.shipments SELECT * FROM stale.shipments;

-- events: big on purpose. Ten events to a session; the session id is text, which is what makes
-- sorting it slow. No index and no primary key: the page is about the scan and the sort.
CREATE TABLE big.events AS
SELECT g AS event_id,
       md5((g / 10)::text) AS session_id,
       ((g::bigint * 7919) % 100000 + 1)::int AS customer_id,
       (g % 12 + 1)::smallint AS kind,
       timestamptz '2024-01-01' + g * interval '600 milliseconds' AS created_at
FROM generate_series(1, 30000000) g;

VACUUM ANALYZE rare.orders, most.orders, rare.customers, norm.customers, fresh.shipments, big.events;

-- Three ways to let an agent in.
--   agent_ro     may read every table
--   agent_blind  may connect and nothing else (its password is its name: a disposable local lab)
--   explain_plan a function agent_blind may call: it returns a plan, never a row
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agent_ro')    THEN CREATE ROLE agent_ro LOGIN PASSWORD 'agent_ro'; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agent_blind') THEN CREATE ROLE agent_blind LOGIN PASSWORD 'agent_blind'; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'plan_owner')  THEN CREATE ROLE plan_owner NOLOGIN; END IF;
END $$;
GRANT pg_read_all_data TO agent_ro, plan_owner;
GRANT USAGE ON SCHEMA rare, most, norm, stale, fresh, big TO agent_blind;

-- The function runs with its owner's rights, and its owner may only read: EXPLAIN ANALYZE of a
-- statement that writes is refused. A time limit cannot be set here: `SET statement_timeout` on a
-- function does not stop a statement that is already running (measured), so the caller's session
-- sets it before the call.
CREATE FUNCTION public.explain_plan(query text, run boolean DEFAULT false) RETURNS SETOF text
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF query ~ ';' THEN RAISE EXCEPTION 'one statement only'; END IF;
  RETURN QUERY EXECUTE CASE WHEN run THEN 'EXPLAIN (ANALYZE, BUFFERS) ' ELSE 'EXPLAIN ' END || query;
END $$;
ALTER FUNCTION public.explain_plan(text, boolean) OWNER TO plan_owner;
REVOKE ALL ON FUNCTION public.explain_plan(text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.explain_plan(text, boolean) TO agent_blind;
