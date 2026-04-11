/**
 * next-intl server-side configuration. Called on every request to resolve
 * the active locale and load the matching messages file.
 *
 * Locale precedence:
 *   1. `kasero-locale` cookie -- set on login from users.language, or by
 *      the user menu segmented control. Authoritative once present.
 *   2. Accept-Language header -- used for anonymous pre-auth visits so a
 *      first-time Spanish-speaking user sees a Spanish login page. See
 *      src/lib/accept-language.ts for the matching strategy.
 *   3. DEFAULT_LOCALE -- fallback when neither cookie nor header resolves.
 */

import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import {
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from './config'
import { pickLocaleFromAcceptLanguage } from '@/lib/accept-language'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value

  let locale: SupportedLocale
  if (cookieValue && (SUPPORTED_LOCALES as readonly string[]).includes(cookieValue)) {
    locale = cookieValue as SupportedLocale
  } else {
    const headerStore = await headers()
    locale = pickLocaleFromAcceptLanguage(headerStore.get('accept-language'))
  }

  const messages = (await import(`./messages/${locale}.json`)).default

  return {
    locale,
    messages,
  }
})
