-- 2026-05-15-01-drop-rate-limit-table.sql
-- Drop the rate_limit table. Better-auth now uses Upstash Redis
-- (secondary-storage) for rate-limit counters with TTL-based expiry.
-- See apps/api/src/lib/auth.ts (secondaryStorage config + rateLimit.storage).
-- Idempotent: IF EXISTS guards.

DROP TABLE IF EXISTS rate_limit;

-- Sanity read.
SELECT name FROM sqlite_master WHERE type='table' AND name='rate_limit';
-- Expected: empty result.
