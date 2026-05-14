-- 2026-05-14-01-passwordless-cleanup.sql
-- Drop the auth surfaces that are no longer used after the passwordless refactor.
-- Idempotent: every drop uses IF EXISTS (table) or is tolerated (column) by the
-- runner. Safe to apply repeatedly across environments.

-- 1. Drop two_factor. The twoFactor plugin is no longer loaded by better-auth
--    (see apps/api/src/lib/auth.ts post-refactor). FK on user_id cascade-deleted
--    naturally — dropping the parent leaves no orphans.
DROP TABLE IF EXISTS two_factor;

-- 2. Drop account.password. Stores legacy scrypt hashes for the now-removed
--    emailAndPassword credential provider. No code reads this column post-A1.
ALTER TABLE account DROP COLUMN password;

-- 3. Drop any surviving legacy columns on users. Migration
--    2026-05-13-03-drop-legacy-auth-columns.sql may already have removed
--    these in some environments; in others (newer setups) the columns
--    never existed in the first place. The runner ignores "no such column"
--    errors on DROP COLUMN, so these run as no-ops when columns are absent.
ALTER TABLE users DROP COLUMN password;
ALTER TABLE users DROP COLUMN password_changed_at;
ALTER TABLE users DROP COLUMN tokens_invalid_before;

-- 4. Sanity reads (no state change). Verify the unique index on users.email
--    and the provider lookup index on account are still in place after the
--    column drops.
SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_email_lower';
SELECT name FROM sqlite_master WHERE type='index' AND name='idx_account_provider';
