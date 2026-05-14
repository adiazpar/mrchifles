/**
 * Shared E2E helpers for the passwordless auth flows.
 *
 * These helpers depend on two test-only API endpoints that are gated
 * behind `ALLOW_TEST_ENDPOINTS=true` and `NODE_ENV !== 'production'` —
 * see `apps/api/src/app/api/test/last-otp/route.ts` and
 * `apps/api/src/app/api/test/seed-user/route.ts`.
 *
 * Playwright is not yet a dependency of this workspace. The specs here
 * are written against the standard `@playwright/test` API so they can
 * be wired up by running `npm i -D @playwright/test` + adding a
 * playwright.config.ts at the workspace root. Until then the files
 * compile cleanly but are not executed by CI.
 */
import type { Page } from '@playwright/test'

/**
 * Poll the test-only `/api/test/last-otp` endpoint until a 6-digit code
 * shows up for the supplied email or we exceed `timeoutMs`. The endpoint
 * reads the most recently inserted `verification` row whose identifier
 * matches `email-verification-otp-${email}` and returns the OTP value.
 *
 * Throws if we time out so the test fails fast rather than hanging.
 */
export async function readTestOtp(
  email: string,
  options: { baseURL?: string; timeoutMs?: number; pollIntervalMs?: number } = {},
): Promise<string> {
  const baseURL = options.baseURL ?? 'http://localhost:8000'
  const timeoutMs = options.timeoutMs ?? 10_000
  const pollIntervalMs = options.pollIntervalMs ?? 250
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const res = await fetch(
        `${baseURL}/api/test/last-otp?email=${encodeURIComponent(email)}&kind=otp`,
      )
      if (res.ok) {
        const data = (await res.json()) as { otp?: string | null }
        if (data.otp && /^\d{6}$/.test(data.otp)) {
          return data.otp
        }
      }
    } catch {
      // Network hiccup — keep polling until the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(`Timed out waiting for OTP for ${email} after ${timeoutMs}ms`)
}

/**
 * Fill a 6-digit OTP into the OTPInput cluster. Each cell is a separate
 * `<input>` element keyed by `data-testid="otp-input-${i}"`. Returns once
 * the last cell has been filled — VerifyStep auto-submits when the
 * code reaches length 6, but tests should still explicitly click
 * `verify-submit` to make the timing deterministic.
 */
export async function fillOtp(page: Page, otp: string): Promise<void> {
  if (otp.length !== 6) {
    throw new Error(`fillOtp expected a 6-digit code, got "${otp}"`)
  }
  for (let i = 0; i < otp.length; i++) {
    await page.getByTestId(`otp-input-${i}`).fill(otp[i])
  }
}

/**
 * Seed a user directly into the DB via the test-only `/api/test/seed-user`
 * endpoint. Returns the created `userId` so a follow-up test step can
 * assert it survives the OAuth-then-OTP merge path.
 *
 * `providers` controls which `account` rows get inserted alongside the
 * `users` row:
 *   - `'email'` (default) — no `account` row. First sign-in via OTP will
 *     materialize the credential row.
 *   - `'google'` — only a google `account` row, no credential row. Useful
 *     for the "user-first-signed-in-via-Google" baseline.
 *   - `'both'` — both rows, matching a user who has linked Google after
 *     signing up via OTP.
 */
export interface SeedUserInput {
  email: string
  name?: string
  providers?: 'email' | 'google' | 'both'
}

export interface SeedUserResult {
  userId: string
  email: string
}

export async function seedUser(
  input: SeedUserInput,
  options: { baseURL?: string } = {},
): Promise<SeedUserResult> {
  const baseURL = options.baseURL ?? 'http://localhost:8000'
  const res = await fetch(`${baseURL}/api/test/seed-user`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>')
    throw new Error(`seedUser failed: ${res.status} ${body}`)
  }
  return (await res.json()) as SeedUserResult
}

/**
 * Best-effort cleanup of every seeded test user — useful for global
 * teardown so the local SQLite doesn't accumulate fixture rows across
 * runs. Resolves with the count of deleted rows.
 */
export async function clearTestUsers(
  options: { baseURL?: string } = {},
): Promise<{ deleted: number }> {
  const baseURL = options.baseURL ?? 'http://localhost:8000'
  const res = await fetch(`${baseURL}/api/test/seed-user`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    return { deleted: 0 }
  }
  return (await res.json()) as { deleted: number }
}
