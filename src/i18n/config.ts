/**
 * i18n configuration for Kasero.
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

export const SUPPORTED_LOCALES = ['en-US', 'es', 'ja'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en-US'

export const LOCALE_COOKIE = 'kasero-locale'

/**
 * Map a business locale (e.g., `'es-PE'`, `'pt-BR'`) to one of our
 * supported translation files. All Spanish-speaking countries collapse to
 * `'es'` for translation purposes — formatting still uses the specific
 * locale (`'es-PE'`) via `Intl.NumberFormat` / `Intl.DateTimeFormat`.
 */
export function resolveTranslationLocale(
  businessLocale: string | null | undefined,
): SupportedLocale {
  if (!businessLocale) return DEFAULT_LOCALE
  if (businessLocale.startsWith('es')) return 'es'
  if (businessLocale.startsWith('ja')) return 'ja'
  return DEFAULT_LOCALE
}
