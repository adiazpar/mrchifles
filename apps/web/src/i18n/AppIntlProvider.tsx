import { useEffect, useState, type ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import { useAuth } from '@/contexts/auth-context'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@kasero/shared/locales'
import { loadMessages } from './loadMessages'
import enUSMessages from './messages/en-US.json'

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
 * Mounts `react-intl`'s `IntlProvider` with a locale derived from the
 * authenticated user's `language` preference, and lazy-loads the matching
 * message bundle.
 *
 * Initial render uses the synchronously-imported `en-US` bundle so the UI
 * never blocks on a network roundtrip. When `useAuth()` resolves with a
 * non-default `user.language`, an effect swaps the bundle in. The
 * `en-US.json` bundle is also the `defaultLocale` fallback for any keys
 * that don't yet exist in the active locale.
 *
 * Must be mounted INSIDE `AuthProvider` (it calls `useAuth()`) and OUTSIDE
 * any consumer of `useIntl()` / `useTranslations()`.
 */
export function AppIntlProvider({ children }: AppIntlProviderProps) {
  const { user } = useAuth()
  const targetLocale = resolveLocale(user?.language)

  const [messages, setMessages] = useState<Record<string, string>>(enUSMessages)
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(DEFAULT_LOCALE)

  useEffect(() => {
    if (targetLocale === activeLocale) return
    let cancelled = false
    loadMessages(targetLocale)
      .then((m) => {
        if (cancelled) return
        setMessages(m)
        setActiveLocale(targetLocale)
      })
      .catch((err) => {
        // Bundle load failures fall back to the previously-active locale's
        // messages. Logged so dev sees the failure; not surfaced to the
        // user because i18n is a non-critical async resource.
        // eslint-disable-next-line no-console
        console.error('[i18n] Failed to load messages for', targetLocale, err)
      })
    return () => {
      cancelled = true
    }
  }, [targetLocale, activeLocale])

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
