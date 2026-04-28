'use client'

import { useEffect, useState } from 'react'

const FLICKER_DEBOUNCE_MS = 500

// Subscribes to the browser's `online` / `offline` window events. Returns
// the current online state (true if connected). Debounced by 500ms so a
// rapidly-flapping connection on a flaky wifi doesn't cause the offline
// banner to strobe.
//
// Initial value is read from navigator.onLine but defaults to true on the
// server (where navigator is undefined) so the offline banner doesn't
// SSR/hydrate as visible.
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | null = null

    const apply = (next: boolean) => {
      if (pending) clearTimeout(pending)
      pending = setTimeout(() => {
        pending = null
        setIsOnline(next)
      }, FLICKER_DEBOUNCE_MS)
    }

    const handleOnline = () => apply(true)
    const handleOffline = () => apply(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Sync once on mount in case state changed between SSR and now.
    if (navigator.onLine !== isOnline) setIsOnline(navigator.onLine)

    return () => {
      if (pending) clearTimeout(pending)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return isOnline
}
