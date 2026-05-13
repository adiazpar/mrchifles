-- T5: Auth hardening — add better-auth tables and new users columns.
--
-- Hand-written because drizzle-kit push wants to DROP the legacy SQL
-- columns `users.password`, `users.password_changed_at`,
-- `users.tokens_invalid_before` (no longer declared in TS) which still
-- hold bcrypt hashes for existing users until the T6 backfill copies
-- them into the new `account` table. They will be dropped in T30.
--
-- The new users.created_at / users.updated_at columns are declared
-- NOT NULL with no TS default. SQLite ALTER TABLE ADD COLUMN rejects
-- NOT NULL without a default when rows exist, so we add a SQL-level
-- DEFAULT (unixepoch()) — this does not affect Drizzle's drift
-- detection (it compares type + nullability only).
--
-- Prod runs: export TURSO_DATABASE_URL and TURSO_AUTH_TOKEN, then
--   npm run auth:migrate:prod -- 2026-05-13-01-auth-schema.sql

BEGIN TRANSACTION;

-- ===========================================
-- New auth tables (better-auth managed)
-- ===========================================
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);
CREATE INDEX `idx_session_user_id` ON `session` (`user_id`);
CREATE INDEX `idx_session_expires_at` ON `session` (`expires_at`);

CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `idx_account_user_id` ON `account` (`user_id`);
CREATE INDEX `idx_account_provider` ON `account` (`provider_id`,`account_id`);

CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
CREATE INDEX `idx_verification_identifier` ON `verification` (`identifier`);
CREATE INDEX `idx_verification_expires_at` ON `verification` (`expires_at`);

CREATE TABLE `two_factor` (
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`backup_codes` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `idx_two_factor_user_id` ON `two_factor` (`user_id`);

-- ===========================================
-- New users columns
-- ===========================================
ALTER TABLE `users` ADD COLUMN `email_verified` integer DEFAULT 0 NOT NULL;
ALTER TABLE `users` ADD COLUMN `email_verified_at` integer;
ALTER TABLE `users` ADD COLUMN `phone_number` text;
ALTER TABLE `users` ADD COLUMN `phone_number_verified` integer DEFAULT 0 NOT NULL;
-- SQLite forbids non-constant defaults (e.g. unixepoch()) on ALTER TABLE
-- ADD COLUMN. We backfill existing rows with a constant snapshot of the
-- migration timestamp; future inserts always go through Drizzle, which
-- supplies the value at write time (TS schema has notNull() with no
-- default, so application code is always responsible).
ALTER TABLE `users` ADD COLUMN `created_at` integer NOT NULL DEFAULT 1778702530;
ALTER TABLE `users` ADD COLUMN `updated_at` integer NOT NULL DEFAULT 1778702530;

COMMIT;
