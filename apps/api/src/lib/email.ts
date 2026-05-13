import { Resend } from 'resend'
import type { SupportedLocale } from '@kasero/shared/locales'
import { getMessages } from './i18n-server'
import { VerifyEmail } from './email-templates/verify-email'
import { ResetPassword } from './email-templates/reset-password'

// Resend client. The API key is read lazily so tests can mock the module
// without needing an env var, and so missing-key errors surface at send
// time rather than at module load. An empty key is passed through to the
// Resend SDK; the SDK itself returns a structured error from .emails.send()
// in that case, which we log + rethrow below. The vitest mock for 'resend'
// replaces this constructor entirely, so the missing key is a non-issue
// in unit tests.
let resend: Resend | null = null
function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY ?? '')
  }
  return resend
}

const DEFAULT_FROM = 'Kasero <noreply@kasero.app>'

// Test-mode OTP store. Allows the Playwright E2E suite (T31) to read the
// most recent verification code for a given email. Never enabled in
// production: gated on ALLOW_TEST_ENDPOINTS=='true' AND NODE_ENV !=
// 'production'. The store lives in-memory per-process; restarting the
// API clears it. Keyed by lowercase email so case-insensitive lookups
// match what better-auth records on signup.
const TEST_OTP_STORE: Map<string, string> | null =
  process.env.ALLOW_TEST_ENDPOINTS === 'true' && process.env.NODE_ENV !== 'production'
    ? new Map<string, string>()
    : null

export interface SendVerificationEmailArgs {
  email: string
  otp: string
  language?: string
}

export async function sendVerificationEmail({ email, otp, language }: SendVerificationEmailArgs): Promise<void> {
  if (TEST_OTP_STORE) {
    TEST_OTP_STORE.set(email.toLowerCase(), otp)
  }
  const intl = getMessages((language ?? 'en-US') as SupportedLocale)
  const from = process.env.EMAIL_FROM ?? DEFAULT_FROM
  try {
    await getResend().emails.send({
      from,
      to: email,
      subject: intl.formatMessage({ id: 'email_verify_subject' }),
      react: VerifyEmail({
        otp,
        preview: intl.formatMessage({ id: 'email_verify_preview' }),
        greeting: intl.formatMessage({ id: 'email_verify_greeting' }),
        instruction: intl.formatMessage({ id: 'email_verify_instruction' }),
        expires: intl.formatMessage({ id: 'email_verify_expires' }),
        ignore: intl.formatMessage({ id: 'email_verify_ignore' }),
        footer: intl.formatMessage({ id: 'email_footer_signature' }),
      }),
    })
  } catch (err) {
    // Log the email and error class but NEVER the otp value.
    console.error('[email] sendVerificationEmail failed', {
      email,
      error: err instanceof Error ? err.message : 'unknown',
    })
    throw err
  }
}

export interface SendResetPasswordEmailArgs {
  email: string
  url: string
  language?: string
}

export async function sendResetPasswordEmail({ email, url, language }: SendResetPasswordEmailArgs): Promise<void> {
  const intl = getMessages((language ?? 'en-US') as SupportedLocale)
  const from = process.env.EMAIL_FROM ?? DEFAULT_FROM
  try {
    await getResend().emails.send({
      from,
      to: email,
      subject: intl.formatMessage({ id: 'email_reset_subject' }),
      react: ResetPassword({
        url,
        preview: intl.formatMessage({ id: 'email_reset_preview' }),
        greeting: intl.formatMessage({ id: 'email_reset_greeting' }),
        instruction: intl.formatMessage({ id: 'email_reset_instruction' }),
        cta: intl.formatMessage({ id: 'email_reset_cta' }),
        expires: intl.formatMessage({ id: 'email_reset_expires' }),
        ignore: intl.formatMessage({ id: 'email_reset_ignore' }),
        footer: intl.formatMessage({ id: 'email_footer_signature' }),
      }),
    })
  } catch (err) {
    // Log url presence (truthy/falsy) but never the url itself (contains
    // a single-use reset token) and never the email body.
    console.error('[email] sendResetPasswordEmail failed', {
      email,
      hasUrl: Boolean(url),
      error: err instanceof Error ? err.message : 'unknown',
    })
    throw err
  }
}

/**
 * Test-only helper. Returns the most recent OTP captured for an email,
 * or undefined. Returns undefined unconditionally when ALLOW_TEST_ENDPOINTS
 * is not enabled — callers can safely assume undefined means "no OTP".
 */
export function _getTestOtp(email: string): string | undefined {
  return TEST_OTP_STORE?.get(email.toLowerCase())
}
