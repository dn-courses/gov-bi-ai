# Agents lab seed

Files here are mounted read-only into the Postgres container at
`/docker-entrypoint-initdb.d/` and executed in filename order on first startup.

| Order | File | Source | Purpose |
|---|---|---|---|
| 00 | `00-extensions.sql`  | repo | Enables the `vector` extension (pgvector) for the RAG sidebar |
| 01 | `01-pagila-schema.sql` | upstream (vendored) | Pagila schema — tables, views, functions |
| 02 | `02-pagila-data.sql`   | upstream (vendored) | Pagila row data (~1000 films, rentals, customers, …) |
| 03 | `03-docs.sql`          | repo | Small `docs` table (company-knowledge snippets) for the RAG sidebar |

The Pagila files are **vendored** (committed) so the lab boots offline, matching
the `postgres` lab. `fetch-seed.sh` re-fetches them from
`devrimgunduz/pagila` if you ever need to refresh.

The `docs.embedding` column is filled in by the lesson code via the OpenAI
embeddings API — we ship the schema + raw text only.

## Re-seeding

The lab uses **no persistent volume**, so the seed re-runs on every fresh start:

    docker compose -f labs/base/compose.yml -f labs/agents/compose.yml down
    docker compose -f labs/base/compose.yml -f labs/agents/compose.yml up
