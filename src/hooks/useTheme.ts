'use client'

import { useEffect, useCallback, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'

// ---------------------------------------------------------------------------
// Shared module-level store so every useTheme() instance sees the same value.
// ---------------------------------------------------------------------------
type Listener = () => void
const listeners = new Set<Listener>()
let currentTheme: Theme = 'system'

function readFromStorage(): Theme {
  if (typeof window === 'undefined') return 'system'
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  return saved ?? 'system'
}

// Hydrate once when the module loads (client-side).
if (typeof window !== 'undefined') {
  currentTheme = readFromStorage()
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Theme {
  return currentTheme
}

function getServerSnapshot(): Theme {
  return 'system'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
    localStorage.removeItem(STORAGE_KEY)
  } else {
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(STORAGE_KEY, theme)
  }
}

// ---------------------------------------------------------------------------

export interface UseThemeReturn {
  theme: Theme
  setTheme: (theme: Theme) => void
  themeDescription: string
}

export function useTheme(): UseThemeReturn {
  const t = useTranslations('account')
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setTheme = useCallback((next: Theme) => {
    if (next === currentTheme) return
    currentTheme = next
    applyTheme(next)
    listeners.forEach((l) => l())
  }, [])

  // In 'system' mode, follow OS-level color scheme changes live.
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (event: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  return {
    theme,
    setTheme,
    themeDescription: t(`theme_description_${theme}`),
  }
}
