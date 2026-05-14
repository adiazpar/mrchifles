-- Adds an `id` primary-key column to the rate_limit table.
--
-- The original 04 migration declared `key` as the primary key, but
-- better-auth's drizzleAdapter auto-injects a generated `id` field on
-- every create() call (see node_modules/@better-auth/drizzle-adapter/
-- dist/index.mjs:224 checkMissingFields). Without an `id` column the
-- adapter throws at the first rate-limit write:
--   "The field 'id' does not exist in the 'rateLimit' Drizzle schema."
--
-- SQLite cannot ALTER an existing primary key, so we rebuild the table.
-- The previous rate_limit table only ever held transient counters, so
-- copying old rows is unnecessary; we just recreate empty.
--
-- Idempotent: re-running is safe.

BEGIN TRANSACTION;

DROP TABLE IF EXISTS rate_limit;

CREATE TABLE rate_limit (
  id text PRIMARY KEY NOT NULL,
  key text NOT NULL,
  count integer NOT NULL,
  last_request integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS rate_limit_key_unique ON rate_limit (key);

COMMIT;
