import { test, expect } from '@playwright/test'
import { readTestOtp, fillOtp, seedUser } from './helpers'

/**
 * Extended E2E coverage for the passwordless flows that involve more
 * than just sign-in/sign-up:
 *
 *  1. Google-first then OTP — a user who has only a `google` account row
 *     should be able to sign back in via email OTP without becoming
 *     a separate user. The verified-email account-linking rule in
 *     `apps/api/src/lib/auth.ts` (`accountLinking.trustedProviders:
 *     ['google']`) handles this implicitly.
 *  2. Email-first then Google link — sign up via OTP, sign out, sign back
 *     in via Google with the same email. Should land on the same `userId`.
 *  3. Change-email dual-OTP happy path — exercises
 *     `/api/account/change-email` end to end.
 *  4. Change-email rejected when target taken — the 409
 *     `EMAIL_CHANGE_TARGET_TAKEN` envelope.
 *  5. Delete account OTP step-up happy path — exercises
 *     `/api/account/delete` with `{ confirmEmail, otp }`.
 *
 * NOTE: Several of these tests depend on infrastructure that is harder
 * to drive deterministically through Playwright alone:
 *   - The Google OAuth callback (tests 1 + 2) needs a stubbed identity
 *     provider, e.g. a mock-oauth2-server, or a Playwright route handler
 *     that intercepts `/api/auth/sign-in/social` and the redirect callback.
 *     Wiring that up is out of scope for the initial spec — once a stub
 *     is in place, drop the `.skip` and these tests will run as-is.
 *   - The ChangeEmailModal / DeleteAccountModal UIs do not yet have the
 *     stable test ids that these tests assert against. Adding them is a
 *     two-line change but was deferred to keep the modals' presentation
 *     code untouched until the test runner is wired up.
 *
 * Per the Phase D directive: structure is more important than green
 * runs at this stage. The tests below capture the canonical assertions
 * so they can be enabled with a focused follow-up once the infra is in
 * place.
 */

test.describe('passwordless auth — extended flows', () => {
  test.skip('google-first user signs back in via OTP (single userId)', async ({ page }) => {
    // TODO: requires a stubbed Google OAuth provider. Seed a google-only
    // user, sign out, then run the standard email-OTP flow with the same
    // email and assert the resolved session.user.id matches the seeded id.
    const seeded = await seedUser({
      email: `e2e-google-first-${Date.now()}@example.com`,
      name: 'Google First',
      providers: 'google',
    })

    await page.goto('/')
    await page.getByTestId('entry-email-input').fill(seeded.email)
    await page.getByTestId('entry-email-submit').click()
    const otp = await readTestOtp(seeded.email)
    await fillOtp(page, otp)
    await page.getByTestId('verify-submit').click()

    // No NameStep — the seeded row already has a name.
    await expect(page.getByTestId('name-input')).toHaveCount(0)
    await expect(page).toHaveURL('/')

    // Read the live session and confirm the id matches the seeded id.
    const session = await page.evaluate(async () => {
      const res = await fetch('/api/auth/get-session', { credentials: 'include' })
      return res.json()
    })
    expect(session?.user?.id).toBe(seeded.userId)
  })

  test.skip('email-first user signs back in via Google (account-linking merges)', async ({ page }) => {
    // TODO: requires a stubbed Google OAuth provider. Sign up via OTP,
    // sign out, then trigger the social sign-in. The
    // `accountLinking.trustedProviders: ['google']` rule should merge
    // into the same user row.
    const email = `e2e-email-first-${Date.now()}@example.com`

    await page.goto('/')
    await page.getByTestId('entry-email-input').fill(email)
    await page.getByTestId('entry-email-submit').click()
    let otp = await readTestOtp(email)
    await fillOtp(page, otp)
    await page.getByTestId('verify-submit').click()
    await page.getByTestId('name-input').fill('Email First')
    await page.getByTestId('name-submit').click()

    const sessionA = await page.evaluate(async () => {
      const res = await fetch('/api/auth/get-session', { credentials: 'include' })
      return res.json()
    })
    const firstUserId = sessionA?.user?.id as string

    // Sign out via the better-auth endpoint (cheaper than driving the
    // account UI in this test).
    await page.evaluate(async () => {
      await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' })
    })

    // Trigger Google sign-in. With a stubbed provider this would resolve
    // and we'd inspect the same /api/auth/get-session.
    await page.goto('/')
    await page.click('text=Continue with Google')

    const sessionB = await page.evaluate(async () => {
      const res = await fetch('/api/auth/get-session', { credentials: 'include' })
      return res.json()
    })
    expect(sessionB?.user?.id).toBe(firstUserId)
  })

  test.skip('change email — dual-OTP happy path revokes other sessions', async ({ page }) => {
    // TODO: depends on stable test ids in ChangeEmailModal. The flow:
    //   1. Sign in as a seeded user.
    //   2. Open the account page and click the change-email row.
    //   3. Submit the new email in the modal's initiate step.
    //   4. Fetch BOTH OTPs via readTestOtp(oldEmail) and readTestOtp(newEmail).
    //   5. Submit both codes in the modal's confirm step.
    //   6. Assert the session.user.email is the new email and other
    //      sessions (seeded ahead of time via the test endpoint) have
    //      been revoked.
    const oldEmail = `e2e-change-old-${Date.now()}@example.com`
    const newEmail = `e2e-change-new-${Date.now()}@example.com`
    await seedUser({ email: oldEmail, name: 'Change Email User' })

    // (sign-in flow + modal interaction omitted — depends on UI test ids)
    void oldEmail
    void newEmail
  })

  test.skip('change email — rejected with 409 when target taken', async ({ page }) => {
    // TODO: same UI-test-id dependency as above. Flow:
    //   1. Seed user A and user B.
    //   2. Sign in as A.
    //   3. Open ChangeEmailModal, type B's email, submit initiate.
    //   4. Assert the modal renders the EMAIL_CHANGE_TARGET_TAKEN error.
    const emailA = `e2e-conflict-a-${Date.now()}@example.com`
    const emailB = `e2e-conflict-b-${Date.now()}@example.com`
    await seedUser({ email: emailA, name: 'A' })
    await seedUser({ email: emailB, name: 'B' })

    // The deterministic shape we want to assert is the network response
    // body. When the modal is wired up, the assertion looks like:
    //
    //   const [response] = await Promise.all([
    //     page.waitForResponse('/api/account/change-email'),
    //     page.getByTestId('change-email-submit').click(),
    //   ])
    //   expect(response.status()).toBe(409)
    //   const body = await response.json()
    //   expect(body?.error?.messageCode).toBe('EMAIL_CHANGE_TARGET_TAKEN')
    void emailA
    void emailB
  })

  test.skip('delete account — OTP step-up happy path signs the user out', async ({ page }) => {
    // TODO: depends on stable test ids in DeleteAccountModal. The flow:
    //   1. Sign in as a seeded user that owns no business.
    //   2. Open the account page, click delete account, advance through
    //      the warning step to the OTP step.
    //   3. Fetch the OTP via readTestOtp(email).
    //   4. Submit the OTP.
    //   5. Assert the user lands on / and that GET /api/auth/get-session
    //      returns null.
    const email = `e2e-delete-${Date.now()}@example.com`
    await seedUser({ email, name: 'Delete User' })
    void email
  })
})
