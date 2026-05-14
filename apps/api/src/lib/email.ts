import { Resend } from 'resend'
import type { SupportedLocale } from '@kasero/shared/locales'
import { getMessages } from './i18n-server'
import { VerifyEmail } from './email-templates/verify-email'
import { ResetPassword } from './email-templates/reset-password'

// Resend client. The API key is read lazily so the module can load
// without it set (e.g., in vitest where the SDK is mocked). An empty
// key passes through to the Resend SDK which returns a structured
// error from .emails.send() that we log + rethrow below.
let resend: Resend | null = null
function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY ?? '')
  }
  return resend
}

const DEFAULT_FROM = 'Kasero <noreply@kasero.app>'

export interface SendVerificationEmailArgs {
  email: string
  otp: string
  language?: string
}

export async function sendVerificationEmail({ email, otp, language }: SendVerificationEmailArgs): Promise<void> {
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
