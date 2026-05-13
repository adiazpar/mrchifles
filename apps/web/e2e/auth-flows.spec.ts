import { test, expect, type Page } from '@playwright/test'

const API_BASE = 'http://localhost:8000'

async function readTestOtp(email: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${API_BASE}/api/test/last-otp?email=${encodeURIComponent(email)}`)
    if (res.ok) {
      const body = (await res.json()) as { otp?: string }
      if (body.otp) return body.otp
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`OTP for ${email} not found after retries`)
}

async function readTestResetToken(email: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${API_BASE}/api/test/last-otp?kind=reset&email=${encodeURIComponent(email)}`)
    if (res.ok) {
      const body = (await res.json()) as { token?: string }
      if (body.token) return body.token
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Reset token for ${email} not found after retries`)
}

async function fillOtp(page: Page, otp: string) {
  const inputs = page.locator('.otp-input input')
  await expect(inputs.first()).toBeVisible()
  for (let i = 0; i < 6; i++) {
    await inputs.nth(i).fill(otp[i] ?? '')
  }
}

test.describe('Auth flows', () => {
  test('register, verify email, land on hub', async ({ page }) => {
    const email = `test-${Date.now()}-${Math.floor(Math.random() * 1000)}@kasero.dev`
    const password = 'test-password-123'

    await page.goto('/register')

    // Wizard step: name
    await page.getByRole('textbox', { name: /name/i }).first().fill('Test User')
    await page.getByRole('button', { name: /continue/i }).click()

    // Wizard step: email
    await page.getByRole('textbox', { name: /email/i }).first().fill(email)
    await page.getByRole('button', { name: /continue/i }).click()

    // Wizard step: password
    await page.locator('input[type="password"]').first().fill(password)
    await page.getByRole('button', { name: /continue|create|sign up|register/i }).click()

    // Wizard step: verify — wait for OTP
    const otp = await readTestOtp(email)
    await fillOtp(page, otp)

    // After verify, the wizard may show a profile step or jump straight
    // to the hub. Accept either as success. Add-later if present.
    const addLater = page.getByRole('button', { name: /add later|後で|más tarde/i })
    if (await addLater.isVisible().catch(() => false)) {
      await addLater.click()
    }

    // Final destination is the hub (/) — confirm we left the auth flow.
    await expect(page).not.toHaveURL(/login|register|verify/, { timeout: 15_000 })
  })

  test('forgot password flow lands the user back at login', async ({ page }) => {
    // Use an existing seeded user. For dev this should be any of the 6
    // backfilled accounts; their bcrypt hash no longer verifies (T30
    // dropped bcrypt), but forgotPassword / resetPassword still work
    // against the account record. Replace EMAIL below with a real dev
    // account email or skip this test if no seeded user exists.
    const seedEmail = process.env.E2E_RESET_EMAIL
    if (!seedEmail) {
      test.skip(true, 'E2E_RESET_EMAIL not set; skipping forgot-password test')
    }

    await page.goto('/forgot-password')
    await page.getByRole('textbox', { name: /email/i }).fill(seedEmail!)
    await page.getByRole('button', { name: /send|reset/i }).click()
    await expect(page.getByText(/check your email|revise su correo|メール/i)).toBeVisible()

    const token = await readTestResetToken(seedEmail!)
    await page.goto(`/reset-password?token=${encodeURIComponent(token)}`)
    await page.locator('input[type="password"]').fill('new-password-456')
    await page.getByRole('button', { name: /reset|restablecer|リセット/i }).click()

    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })
})
