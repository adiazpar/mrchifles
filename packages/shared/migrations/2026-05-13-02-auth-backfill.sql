-- Backfill: move each user's existing bcrypt password into the account table
-- as a `credential` provider row, and mark all existing users as
-- email-verified (grandfathering).
-- Idempotent: re-running is safe.
--   - INSERT OR IGNORE on conflict with the unique (provider_id, account_id) row.
--   - The NOT EXISTS clause skips users that already have a credential row.
--   - The UPDATE only touches rows whose email_verified is currently false.
--
-- Prod runs: export TURSO_DATABASE_URL and TURSO_AUTH_TOKEN, then
--   npm run auth:migrate:prod -- 2026-05-13-02-auth-backfill.sql

BEGIN TRANSACTION;

INSERT OR IGNORE INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT
  lower(hex(randomblob(16))),
  u.id,
  'credential',
  u.id,
  u.password,
  unixepoch(),
  unixepoch()
FROM users u
WHERE u.password IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM account a WHERE a.user_id = u.id AND a.provider_id = 'credential'
  );

UPDATE users
SET email_verified = 1,
    email_verified_at = unixepoch()
WHERE email_verified = 0;

COMMIT;
