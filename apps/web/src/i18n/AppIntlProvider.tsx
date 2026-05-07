import { useEffect, useState, type ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@kasero/shared/locales'
import { loadMessages } from './loadMessages'
import enUSMessages from './messages/en-US.json'
import {
  LANGUAGE_CHANGE_EVENT,
  USER_CACHE_KEY,
  getCachedUser,
} from '@/lib/user-cache'

interface AppIntlProviderProps {
  children: ReactNode
}

/**
 * Resolve the active translation locale from the user's stored preference.
 *
 * `users.language` is a free-form string column; if a stale value (or one
 * from a deprecated locale) lands here we fall back to `DEFAULT_LOCALE`
 * rather than throw inside `IntlProvider`.
 */
function resolveLocale(language: string | null | undefined): SupportedLocale {
  if (!language) return DEFAULT_LOCALE
  if ((SUPPORTED_LOCALES as readonly string[]).includes(language)) {
    return language as SupportedLocale
  }
  return DEFAULT_LOCALE
}

/**
 * Read the active locale from the persisted user cache (single source of
 * truth — see `@/lib/user-cache`). Returning `DEFAULT_LOCALE` whenever no
 * cached user exists keeps fresh-load and logged-out paths identical.
 */
function readInitialLocale(): SupportedLocale {
  const cached = getCachedUser()
  return resolveLocale(cached?.language)
}

/**
 * Mounts `react-intl`'s `IntlProvider` with a locale derived from the
 * authenticated user's `language` preference, and lazy-loads the matching
 * message bundle.
 *
 * Initial render uses the synchronously-imported `en-US` bundle so the UI
 * never blocks on a network roundtrip — this is what keeps the first
 * paint from being a flash of empty strings. When the active locale
 * resolves to a non-default value, an effect swaps the bundle in. The
 * `en-US.json` bundle is also the `defaultLocale` fallback for any keys
 * that don't yet exist in the active locale.
 *
 * IMPORTANT: This provider is mounted ABOVE `AuthProvider` in the React
 * tree because `AuthProvider` calls `useIntl()` / `useApiMessage()` at
 * render time (for non-envelope error fallbacks). It therefore can NOT
 * consume `useAuth()` — instead, it reads `user.language` directly from
 * the persisted user cache (`@/lib/user-cache`) on mount, listens for
 * the `LANGUAGE_CHANGE_EVENT` custom event for in-tab updates, and
 * listens for the `storage` event for cross-tab updates. `auth-context`
 * dispatches `LANGUAGE_CHANGE_EVENT` whenever it mutates `user.language`
 * (login, register, logout, refreshUser, changeLanguage).
 */
export function AppIntlProvider({ children }: AppIntlProviderProps) {
  // Seed locale from cache on first render so the initial bundle load
  // doesn't have to wait for a useEffect tick — keeps the first paint
  // in the user's preferred language whenever a cached identity exists.
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(
    readInitialLocale,
  )
  const [messages, setMessages] = useState<Record<string, string>>(enUSMessages)

  // Load the matching bundle whenever the active locale changes. The
  // synchronously-imported en-US bundle is the initial value of
  // `messages`, so the first render never shows raw IDs.
  useEffect(() => {
    if (activeLocale === DEFAULT_LOCALE) {
      // Synchronous bundle is already the active one — avoid a needless
      // dynamic import + re-render cycle.
      setMessages(enUSMessages)
      return
    }
    let cancelled = false
    loadMessages(activeLocale)
      .then((m) => {
        if (cancelled) return
        setMessages(m)
      })
      .catch((err) => {
        // Bundle load failures fall back to the previously-active locale's
        // messages. Logged so dev sees the failure; not surfaced to the
        // user because i18n is a non-critical async resource.
        // eslint-disable-next-line no-console
        console.error('[i18n] Failed to load messages for', activeLocale, err)
      })
    return () => {
      cancelled = true
    }
  }, [activeLocale])

  // React to runtime language changes broadcast by auth-context, plus
  // cross-tab updates via the native `storage` event.
  useEffect(() => {
    function onLanguageChange(e: Event) {
      const detail = (e as CustomEvent<{ language?: string }>).detail
      setActiveLocale(resolveLocale(detail?.language))
    }
    function onStorage(e: StorageEvent) {
      if (e.key === USER_CACHE_KEY) {
        setActiveLocale(readInitialLocale())
      }
    }
    window.addEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, onLanguageChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return (
    <IntlProvider
      locale={activeLocale}
      defaultLocale={DEFAULT_LOCALE}
      messages={messages}
      onError={(err) => {
        // react-intl surfaces missing keys as errors. During incremental
        // translation rollouts (es / ja may lag en-US) we'd rather see a
        // single warning than a wall of red — the `defaultLocale` fallback
        // already renders the English string for the user.
        if (err.code === 'MISSING_TRANSLATION') {
          // eslint-disable-next-line no-console
          console.warn(err.message)
          return
        }
        // eslint-disable-next-line no-console
        console.error(err)
      }}
    >
      {children}
    </IntlProvider>
  )
}
