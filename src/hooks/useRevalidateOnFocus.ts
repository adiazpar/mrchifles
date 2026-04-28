'use client'

import { useEffect, useRef } from 'react'

// Debounce window for refocus revalidation. If a focus / visibility event
// fires within this many ms of the previous one, ignore the second event.
// This prevents alt-tabbing rapidly from triggering a refetch storm.
const FOCUS_DEBOUNCE_MS = 5_000

// Subscribes to `visibilitychange` (preferred — fires on tab switches)
// and `focus` (covers OS-level window focus changes that don't trigger
// visibility). When the tab/window becomes visible after being hidden,
// fires the callback — debounced to FOCUS_DEBOUNCE_MS so back-and-forth
// alt-tabbing doesn't spam refetches.
//
// The callback is held in a ref so consumers don't need to memoize it
// just to satisfy the effect's dependency array.
export function useRevalidateOnFocus(callback: () => void) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    let lastFiredAt = 0

    const handler = () => {
      // Visibility 'hidden' events fire too — we only care about becoming visible.
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return
      }
      const now = Date.now()
      if (now - lastFiredAt < FOCUS_DEBOUNCE_MS) return
      lastFiredAt = now
      callbackRef.current()
    }

    document.addEventListener('visibilitychange', handler)
    window.addEventListener('focus', handler)
    return () => {
      document.removeEventListener('visibilitychange', handler)
      window.removeEventListener('focus', handler)
    }
  }, [])
}
