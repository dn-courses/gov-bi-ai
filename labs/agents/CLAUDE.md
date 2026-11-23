# Lab: agents — agent orientation

This lab backs `modules/agents/` — the AI agent development module built around a "talk to your
data" SQL agent over **Pagila**, a warehouse slice (`shop`) and a bonus page on embeddings. The
module's lessons are lesson-app pages (`workspace-app/content/agents/`) written for **Gemini on
Vertex AI**; they run when the lab is presented from the app.

You (the workspace / Claude Code) run in the **workspace** container and reach Postgres as a
**client** over the shared docker network. You are *not* inside the database container.

## What's in the box

| Service | Purpose | Reach it via |
|---|---|---|
| `workspace` | Jupyter + MyST docs (from `labs/base`) | http://localhost:8888, http://localhost:3000 |
| `postgres` | Pagila **+ pgvector** — backs both the SQL agent and the embeddings page | service `postgres`, port `5432`, db `pagila` |

## Environment

The module's pages call Gemini, with the environment `compose.app.yml` sets (next section):
`GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_CLOUD_LOCATION`,
`GEMINI_MODEL`. No page calls OpenAI. `compose.yml` still passes `OPENAI_API_KEY` and `OPENAI_MODEL`
through from the host shell or `.env` when they are set; nothing in the module reads them, and the
lab starts without them.

## Presented from the lesson app: Gemini, traces, ADK

`compose.app.yml` is merged when a course is presented (`just present agents`). It adds:

| What | Where | Notes |
|---|---|---|
| Gemini on Google Cloud | cells: `genai.Client()`; env `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_CLOUD_LOCATION=global`, `GEMINI_MODEL` (default `gemini-3.5-flash-lite`: the newest low-cost model on 2026-11-22) | authenticates with the key file in the course's `secrets/` folder; the project is read from that file at start |
| `phoenix` | http://localhost:6006 | Arize Phoenix, no sign-in, traces kept while the lab is up; cells and ADK send to `PHOENIX_COLLECTOR_ENDPOINT` |
| `adk` | http://localhost:8000 | ADK's dev UI over `/work/agents` (`AGENTS_DIR`), the folder cells write agents to: one folder per agent with `__init__.py` and an `agent.py` defining `root_agent` |

Python cells may `await` at the top level, which is how ADK's runner is written.

## The `shop` database: a warehouse slice for an agent

`seed/05-shop-mart.sql` builds a second database, `shop`, with one star in the schema `mart`:
`fact_sales` (1,666,665 order lines of 555,555 orders, 2024-01-01 to 2025-11-25), `dim_date`,
`dim_customer` (100,000; 20 countries in 4 regions) and `dim_product` (10,000; 20 categories). It
is generated from row numbers with the formulas of `labs/postgres`'s `shop`, loads in about two
seconds, and is the same on every boot. Its table and column comments carry the grain, the units
and the business rules (revenue is `quantity * unit_cents / 100.0` and leaves pending orders out;
orders are `COUNT(DISTINCT order_id)`), because an agent reads them.

The role `analyst_ro` (password the same) is what an agent connects as: `SHOP_URL` when presented.
It reads the star only, not `dim_customer.email`, is read-only, and its queries stop after 5 s.
Revenue of the whole table is 259,563,950.13.

## Connect to Postgres

```python
import os, psycopg
# DATABASE_URL is preset (plain libpq form): postgresql://postgres:postgres@postgres:5432/pagila
with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
    cur.execute("SELECT title, rental_rate FROM film ORDER BY rental_rate DESC LIMIT 5;")
    print(cur.fetchall())
```

`pgvector` is enabled (`seed/00-extensions.sql`); the embeddings page uses the `docs` table seeded
by `seed/03-docs.sql` (six short policy documents, `embedding vector(1536)`) and fills that column at
runtime with `gemini-embedding-001` on Vertex AI.

## Cost note

The pages quote their own prices where they measure cost (`20-conversation-history`,
`22-prompt-caching`: USD per 1M tokens for `gemini-3.5-flash-lite` on Vertex AI, checked
2026-11-23). The model calls and the BigQuery queries are billed to the project of the key file in
the course's `secrets/` folder; a BigQuery cell that would cost more than
`BIGQUERY_MAX_DOLLARS_PER_QUERY` ($0.05 unless set) is priced and not run.
