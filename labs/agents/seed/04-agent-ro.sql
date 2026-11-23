-- The read-only role the SQL agent connects as.
--
-- This lives in the lab, not in a lesson, so that *any* subset of the module's lessons is
-- runnable. `20-conversation-history` and `17-end-to-end-walkthrough` both open `AGENT_URL` as
-- `agent_ro` and both claim to be self-contained, but the role was created only by
-- `15-sql-tools` — so a course that ships one without the other failed at connect time.
--
-- `06b-tools-on-the-database` teaches why the agent gets its own least-privilege role; this file
-- only guarantees the role is there first.
--
-- Runs after 01-pagila-schema and 02-pagila-data: the table grants below need the tables.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent_ro') THEN
        CREATE ROLE agent_ro LOGIN PASSWORD 'agent_ro';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE pagila TO agent_ro;
-- Pagila's dump leaves CREATE on public to PUBLIC (=UC), so a "read-only" role could still
-- create tables. Take it back from everyone but the owner.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO agent_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO agent_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO agent_ro;
