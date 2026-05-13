-- Drop legacy auth columns from `users` now that all password material
-- lives in `account.password` (managed by better-auth) and session
-- invalidation is tracked via the `session` table.
--
-- IMPORTANT BEFORE RUNNING IN PROD:
--   * Verify SELECT COUNT(*) FROM account WHERE password LIKE '$2%' returns 0,
--     OR accept that users with remaining bcrypt hashes will need to use
--     "Forgot password" to recover. After this migration runs, the
--     password-hash dispatcher no longer supports bcrypt and any bcrypt
--     hash sitting in account.password will fail to verify.
--   * SQLite ALTER TABLE DROP COLUMN requires SQLite 3.35+ (released 2021)
--     which both libsql and modern Turso satisfy.

BEGIN TRANSACTION;
ALTER TABLE users DROP COLUMN password;
ALTER TABLE users DROP COLUMN password_changed_at;
ALTER TABLE users DROP COLUMN tokens_invalid_before;
COMMIT;
