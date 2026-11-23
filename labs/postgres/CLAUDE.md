# Lab: postgres — agent orientation

This lesson's lab is a **PostgreSQL 18** sidecar seeded with the **Pagila** dataset (a DVD-rental
store: `film`, `category`, `actor`, `customer`, `rental`, `payment`, `inventory`, `store`, `staff`, …).

The same server holds a second database, **`shop`** — a generated, deterministic dataset for the
performance modules (see below).

You (the workspace / Claude Code) run in the **workspace** container and reach Postgres as a **client**
over the shared docker network. You are *not* inside the database container.

## Bring it up

```bash
just lab postgres      # fetches the Pagila seed (first run), starts workspace + postgres,
                       # waits for healthcheck. Dataset auto-loads on first boot — no restore step.
```

Service/host: `postgres`  ·  port `5432`  ·  db `pagila`  ·  user `postgres`  ·  password `postgres`.

## The `shop` database

`seed/50-shop.sql` builds it at initdb (about 35 s; the healthcheck waits for it). It is engineered
for performance lessons, and the file's comments say what each column is for:

| table | rows | built for |
|---|---|---|
| `products` | 10,000 on exactly 100 pages, no index | cost arithmetic in round numbers (a scan costs 200.00) |
| `customers` | 100,000, primary key | the small side of a join |
| `orders` | 5,000,000, primary key only | scale: I/O against CPU, skewed `status`, `currency` determined by `country` |
| `order_items` | 15,000,000, no index | the large side of a join; a CPU-bound aggregate |

No foreign keys and no other indexes, on purpose: a lesson adds the index it is about and may drop or
reload any table. Every value is computed from the row number, so every boot gives the same rows.
`PGDATABASE` is `pagila`; reach `shop` with `psql -d shop` or by swapping the database name in
`DATABASE_URL`. Changing a row count or a column means re-checking the lessons that quote its numbers
(`rdbms-performance-fundamentals`, `rdbms-performance-tuning`).

## The `twins` database (presented courses only)

`seed/60-talk.sh` runs `seed/talk/*.sql` **only when `SEED_TALK_DATA=1`**, which `compose.app.yml`
sets: the file `just present` merges for a course shown from the lesson app. A presented course
that never queries `twins` says `app: {talk_data: false}` in its `course.yml`, and its
`just present` starts the database without it. A lab started any other
way has no `twins` and pays nothing for it (a fresh boot is healthy after 38 s without it). The same
file caps the database at **3 CPUs**: every timing a presented page quotes was measured under that cap. `seed/talk/twins.sql` builds the database from `shop`; it holds the same
tables under different conditions, one schema per condition, so one query text can be run against
each with `SET search_path = …` and have a different right answer. Used by
`rdbms-performance-with-ai`.

| schema | what differs |
|---|---|
| `rare` | `orders.state = 2` matches 445 of 5,000,000 rows; `customers` has an index on `email` |
| `most` | `orders.state = 2` matches 95% of the rows |
| `norm` | `customers` also has an indexed column `email_norm = lower(email)` |
| `stale` | `shipments` was analyzed at 1,000 rows, then loaded to 2,000,000, with automatic analyze off |
| `fresh` | the same `shipments`, analyzed after the load |
| `big` | `events`: 30,000,000 rows (2.4 GB), no index — a plain query on it runs for about half a minute |

It also creates three roles for showing what access an AI agent needs: `agent_ro` (reads every
table), `agent_blind` (may connect, no right on any table; password = its name) and `plan_owner`
(owns `public.explain_plan(query, run)`, a function `agent_blind` may call that returns a plan and
never a row). Statistics are sampled, so estimates differ slightly between boots; `stale.shipments`
must never be analyzed and never given an index, not even inside a transaction that is rolled
back: `ANALYZE` and `CREATE INDEX` update the table's row count and reset its change counter outside
the transaction (measured), and the case it exists for is then gone until the lab is recreated. Show
the effect of the fix on `fresh` instead.

The postgres image keeps its data in an anonymous volume, and compose hands that volume to a
container it merely *recreates*. So switching an existing lab to `just present` does not re-seed it
(measured: "healthy" after 5 s, old data intact). `docker compose … down` first, or remove the
container, to get the talk data.

## Inspection extensions (preloaded)

`seed/90-extensions.sql` runs at initdb (after the Pagila schema/data) and creates three read-only
contrib extensions the Postgres-internals modules use to observe live engine state:

| extension | what it exposes | used by |
|---|---|---|
| `pageinspect` | raw heap pages, tuple headers, B-tree page layout | `postgres-mvcc-vacuum` |
| `pg_walinspect` | decode WAL records / stats over a LSN range | `postgres-wal` |
| `pg_buffercache` | what's currently resident in `shared_buffers` | `postgres-architecture` |

All three ship with stock `postgres:18` contrib — no extra image layer. Superuser `postgres` can
`SELECT` from their functions/views directly (e.g. `SELECT * FROM pg_buffercache LIMIT 5;`).

## Connect

### pgAdmin (browser)

Open **http://localhost:${POSTGRES_ADMIN_PORT:-5051}** (service `postgres-admin`, pgAdmin 4 9.18). There
is no login, and Pagila is already registered: expand **Lab → pagila (postgres lab)**, then
right-click **pagila** → *Query Tool* to write SQL freely. The registration comes from
`pgadmin-servers.json`, imported on every start (no volume); the password arrives via
`PasswordExecCommand: echo postgres` — fine for a throwaway local lab, nowhere else.

### From the workspace

```bash
# psql (env PG* vars are preset in the workspace container)
psql -c "SELECT title, rental_rate FROM film ORDER BY rental_rate DESC LIMIT 5;"

# SQLAlchemy / pandas / jupysql — DATABASE_URL is preset:
#   postgresql+psycopg://postgres:postgres@postgres:5432/pagila
```

```python
import os, psycopg
with psycopg.connect(os.environ["DATABASE_URL"].replace("+psycopg", "")) as cn:
    print(cn.execute("SELECT count(*) FROM film").fetchone())
```

In MyST lessons, executable cells use jupysql against `DATABASE_URL`:
````markdown
```{code-cell} python
%%sql
SELECT category.name, count(*) AS films
FROM film_category JOIN category USING (category_id)
GROUP BY category.name ORDER BY films DESC;
```
````

## Exercises

Exercise stubs are materialized into `/workspace/hands-on/<exercise-id>/`. The student edits the stub;
`just check` runs the exercise's pytest against the live `postgres` lab. Never edit files under
`materials/` (generated read surface) — student work belongs in `/workspace/hands-on/`.

## Troubleshooting

- Healthcheck not ready: `docker compose ... ps`; give it `start_period` (~20s) on first boot while
  Pagila loads.
- `could not translate host name "postgres"`: the lab isn't up — run `just lab postgres`.
