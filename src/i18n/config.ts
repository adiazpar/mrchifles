/**
 * i18n configuration for Kasero.
 *
 * The locale registry lives in `./locales.ts` — that's the only file you
 * need to touch when adding a new language. This module re-exports the
 * registry-derived constants (`SUPPORTED_LOCALES`, `DEFAULT_LOCALE`,
 * `SupportedLocale`, `LOCALES`) and adds the cookie name and the
 * business-locale → translation-file resolver.
 *
 * Kasero uses cookie-based locale detection instead of URL-based routing
 * because our app already has a `/[businessId]/...` dynamic segment at the
 * root level — stacking a locale segment on top would be ambiguous and
 * force every route to restructure.
 *
 * The locale is resolved server-side from (in order):
 *   1. Business context — every business has its own `locale` column in
 *      the database, and the BusinessProvider sets a cookie when the user
 *      enters a business route.
 *   2. Cookie fallback (if set by a previous session).
 *   3. `DEFAULT_LOCALE`.
 *
 * UI strings fall back from the requested locale to `DEFAULT_LOCALE`, so
 * partial translation coverage is safe — missing keys render in English
 * rather than breaking the page.
 */

import {
  DEFAULT_LOCALE,
  LOCALES,
  SUPPORTED_LOCALES,
  resolveLocaleByPrefix,
  type SupportedLocale,
} from './locales'

export { DEFAULT_LOCALE, LOCALES, SUPPORTED_LOCALES }
export type { SupportedLocale }

export const LOCALE_COOKIE = 'kasero-locale'

/**
 * Map a business locale (e.g., `'es-PE'`, `'pt-BR'`, `'ja-JP'`) to one of
 * our supported translation files. All variants of a language collapse to
 * the registered locale (e.g. every `'es-*'` → `'es'`). Formatting still
 * uses the specific locale via `Intl.NumberFormat` / `Intl.DateTimeFormat`.
 */
export function resolveTranslationLocale(
  businessLocale: string | null | undefined,
): SupportedLocale {
  if (!businessLocale) return DEFAULT_LOCALE
  return resolveLocaleByPrefix(businessLocale) ?? DEFAULT_LOCALE
}
