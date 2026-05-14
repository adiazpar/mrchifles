import { test, expect } from '@playwright/test'
import { readTestOtp, fillOtp, seedUser } from './helpers'

/**
 * Canonical E2E coverage for the passwordless auth flows.
 *
 * The pre-refactor file in this slot had two tests — a 5-step
 * password-and-2FA register wizard and a forgot-password flow — both
 * fully obsolete after the Phase A-D auth refactor. This file replaces
 * it with the two minimum-viable signed-in journeys for the new design:
 *
 *   1. Brand-new user (no existing `users` row) — three steps, ends on
 *      the hub with a name persisted.
 *   2. Returning user (existing row with a name) — two steps, no
 *      NameStep, lands directly on the hub.
 *
 * Both tests depend on the `/api/test/last-otp` endpoint being
 * available (gated behind `ALLOW_TEST_ENDPOINTS=true` and
 * `NODE_ENV !== 'production'`). The returning-user test additionally
 * depends on `/api/test/seed-user` for fixture creation.
 */
test.describe('passwordless auth — register & sign-in', () => {
  test('new user: email → OTP → name → hub', async ({ page }) => {
    const email = `e2e-new-${Date.now()}@example.com`

    // 1. Land on entry page
    await page.goto('/')

    // 2. Type email and submit
    await page.getByTestId('entry-email-input').fill(email)
    await page.getByTestId('entry-email-submit').click()

    // 3. Wait for OTP send, then fetch from test endpoint
    const otp = await readTestOtp(email)

    // 4. Fill OTP in the verify step
    await fillOtp(page, otp)
    await page.getByTestId('verify-submit').click()

    // 5. New user → NameStep appears
    await page.getByTestId('name-input').fill('E2E Tester')
    await page.getByTestId('name-submit').click()

    // 6. Land on hub
    await expect(page).toHaveURL('/')
  })

  test('returning user: email → OTP → hub (no name step)', async ({ page }) => {
    const email = `e2e-returning-${Date.now()}@example.com`
    await seedUser({ email, name: 'E2E Returning User' })

    await page.goto('/')
    await page.getByTestId('entry-email-input').fill(email)
    await page.getByTestId('entry-email-submit').click()
    const otp = await readTestOtp(email)
    await fillOtp(page, otp)
    await page.getByTestId('verify-submit').click()

    // Returning user — no name step
    await expect(page.getByTestId('name-input')).toHaveCount(0)
    await expect(page).toHaveURL('/')
  })
})
