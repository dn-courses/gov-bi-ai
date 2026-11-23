-- Authored initdb step (NOT a vendored download — tracked via a .gitignore exception).
-- Runs after the Pagila schema (01) + data (02) because docker-entrypoint-initdb.d executes
-- *.sql in filename order. Enables the read-only inspection extensions the Postgres-internals
-- modules use to observe live engine state:
--   pageinspect    -> tuple/page layout, heap headers      (postgres-mvcc-vacuum)
--   pg_walinspect  -> decode WAL records                   (postgres-wal)
--   pg_buffercache -> what's resident in shared_buffers     (postgres-architecture)
-- All three ship with the stock postgres:18 contrib; no extra image layer.
CREATE EXTENSION IF NOT EXISTS pageinspect;
CREATE EXTENSION IF NOT EXISTS pg_walinspect;
CREATE EXTENSION IF NOT EXISTS pg_buffercache;
