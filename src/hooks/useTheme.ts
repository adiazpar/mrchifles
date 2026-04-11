'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  return saved ?? 'system'
}

export interface UseThemeReturn {
  theme: Theme
  setTheme: (theme: Theme) => void
  /** Localized description of the current theme for UI hints. */
  themeDescription: string
}

/**
 * Theme preference hook.
 *
 * - Reads/writes to localStorage under the `theme` key
 * - Applies the `dark` class to the <html> element when dark mode is active
 * - In 'system' mode, listens for OS-level color scheme changes and
 *   updates the <html> class live without requiring a re-render
 * - Returns a localized description string for UI display (via the
 *   `account.theme_description_*` i18n keys)
 *
 * User-level, not business-level -- does NOT depend on BusinessContext,
 * so it can be used on the account settings page (outside the business
 * route scope).
 */
export function useTheme(): UseThemeReturn {
  const t = useTranslations('account')
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const isInitialMount = useRef(true)

  // Apply theme changes only when the user changes theme (not on mount).
  // On initial mount the AppShell or root layout already applied the
  // persisted class; we don't want to double-apply and cause flicker.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const root = document.documentElement

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
      localStorage.removeItem(STORAGE_KEY)
    } else {
      root.classList.toggle('dark', theme === 'dark')
      localStorage.setItem(STORAGE_KEY, theme)
    }
  }, [theme])

  // When in 'system' mode, follow OS-level color scheme changes live.
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (event: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
  }, [])

  return {
    theme,
    setTheme,
    themeDescription: t(`theme_description_${theme}`),
  }
}
