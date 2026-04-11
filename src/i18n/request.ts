/**
 * next-intl server-side configuration. Called on every request to resolve
 * the active locale and load the matching messages file.
 *
 * We read the locale from a cookie set by the BusinessProvider when the
 * user enters a business route. No URL locale segment — see `config.ts`
 * for why.
 */

import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from './config'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value

  const locale: SupportedLocale =
    cookieValue && (SUPPORTED_LOCALES as readonly string[]).includes(cookieValue)
      ? (cookieValue as SupportedLocale)
      : DEFAULT_LOCALE

  const messages = (await import(`./messages/${locale}.json`)).default

  return {
    locale,
    messages,
  }
})
