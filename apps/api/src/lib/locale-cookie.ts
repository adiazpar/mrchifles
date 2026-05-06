import { cookies } from 'next/headers'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@/i18n/config'

/**
 * Server-only helper to write the next-intl locale cookie. Call from API
 * routes on login, register, and language change. Unsupported values fall
 * back to DEFAULT_LOCALE.
 *
 * Server-only: uses `next/headers`. Do not import from client components.
 */
export async function setLocaleCookieServer(locale: string): Promise<void> {
  const cookieStore = await cookies()
  const normalized: SupportedLocale =
    (SUPPORTED_LOCALES as readonly string[]).includes(locale)
      ? (locale as SupportedLocale)
      : DEFAULT_LOCALE
  cookieStore.set(LOCALE_COOKIE, normalized, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
}
