-- Adds the rate_limit table managed by better-auth's database rate-limiter.
-- Idempotent: re-running is a no-op (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS rate_limit (
  key text PRIMARY KEY NOT NULL,
  count integer NOT NULL,
  last_request integer NOT NULL
);
