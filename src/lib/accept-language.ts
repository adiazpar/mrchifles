/**
 * Accept-Language header parser for pre-auth locale detection.
 *
 * Pure function: takes the raw header value, returns a SupportedLocale.
 * Used by:
 *   - src/i18n/request.ts    → RSC message bundle selection for anonymous
 *                              visitors (login, register, pre-auth pages)
 *   - /api/auth/register     → persisting the detected language on signup
 *                              so the user's first post-login experience is
 *                              also in their browser language
 *
 * Precedence is strictly cookie > header > default. This module handles
 * only the header side; callers check the cookie first.
 */

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@/i18n/config'

interface AcceptLanguageEntry {
  tag: string
  q: number
}

/**
 * Parse an Accept-Language header into entries sorted by quality (highest
 * first). Drops wildcards and zero-quality entries.
 */
function parseAcceptLanguage(header: string): AcceptLanguageEntry[] {
  return header
    .split(',')
    .map((entry) => {
      const [rawTag, ...params] = entry.trim().split(';')
      const tag = rawTag.trim().toLowerCase()
      const qParam = params.find((p) => p.trim().startsWith('q='))
      const parsedQ = qParam ? parseFloat(qParam.trim().slice(2)) : 1.0
      const q = isNaN(parsedQ) ? 0 : parsedQ
      return { tag, q }
    })
    .filter((entry) => entry.tag.length > 0 && entry.tag !== '*' && entry.q > 0)
    .sort((a, b) => b.q - a.q)
}

/**
 * Pick the best matching SupportedLocale from an Accept-Language header.
 *
 * Matching strategy, per entry in q-order:
 *   1. Exact match against SUPPORTED_LOCALES (e.g. "en-US" === "en-US")
 *   2. Language-prefix match (e.g. "es-MX", "es-PE", "es-AR" → "es")
 *   3. English variants (e.g. "en", "en-GB", "en-AU") → "en-US"
 *
 * Falls back to DEFAULT_LOCALE when the header is missing, malformed, or
 * names only unsupported languages. Extend the prefix-match block when
 * adding new SUPPORTED_LOCALES.
 */
export function pickLocaleFromAcceptLanguage(
  header: string | null | undefined,
): SupportedLocale {
  if (!header) return DEFAULT_LOCALE

  const entries = parseAcceptLanguage(header)

  for (const { tag } of entries) {
    // 1. Exact match against SUPPORTED_LOCALES
    const exact = SUPPORTED_LOCALES.find((s) => s.toLowerCase() === tag)
    if (exact) return exact

    // 2. Language-prefix match. Extend when adding new SUPPORTED_LOCALES.
    const base = tag.split('-')[0]
    if (base === 'es') return 'es'
    if (base === 'ja') return 'ja'
    if (base === 'en') return 'en-US'
  }

  return DEFAULT_LOCALE
}
