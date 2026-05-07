/**
 * Lazy locale-bundle loader.
 *
 * `react-intl` takes a flat `Record<string, string>` of messages. We split
 * the bundles per locale so the initial JS payload only carries the active
 * locale's strings; the rest are fetched on demand when the user changes
 * language.
 *
 * Vite needs a static analysis hook to know which JSON files to bundle, so
 * we enumerate every supported locale in an explicit `switch`. Adding a
 * new locale requires:
 *   1. Adding an entry in `packages/shared/src/locales.ts`.
 *   2. Adding the matching `<code>.json` file under `./messages/`.
 *   3. Adding a `case` here.
 *
 * The TypeScript exhaustiveness check at the bottom of the switch makes
 * step 3 a compile error rather than a silent runtime fallback.
 */

import type { SupportedLocale } from '@kasero/shared/locales'

const cache = new Map<SupportedLocale, Record<string, string>>()

export async function loadMessages(
  locale: SupportedLocale,
): Promise<Record<string, string>> {
  const cached = cache.get(locale)
  if (cached) return cached

  let mod: { default: Record<string, string> }
  switch (locale) {
    case 'en-US':
      mod = await import('./messages/en-US.json')
      break
    case 'es':
      mod = await import('./messages/es.json')
      break
    case 'ja':
      mod = await import('./messages/ja.json')
      break
    default: {
      // If a new locale is registered without a corresponding case here,
      // TypeScript fails the build. Better than a runtime "missing
      // translation" cascade.
      const _exhaustive: never = locale
      throw new Error(`Unknown locale: ${String(_exhaustive)}`)
    }
  }
  cache.set(locale, mod.default)
  return mod.default
}
