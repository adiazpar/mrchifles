'use client'

import { useEffect, useState } from 'react'

const FLICKER_DEBOUNCE_MS = 500

// Subscribes to the browser's `online` / `offline` window events. Returns
// the current online state (true if connected). Debounced by 500ms so a
// rapidly-flapping connection on a flaky wifi doesn't cause the offline
// banner to strobe.
//
// Initial state is unconditionally `true` so SSR and the first client
// render agree (the server has no `navigator`). The real `navigator.onLine`
// value is read in the mount effect below; if the user is actually offline,
// the state flips on the second render — after hydration, so React doesn't
// see a tree mismatch.
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true)

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

    // Sync once on mount: this is the first time we can safely read
    // navigator.onLine without breaking hydration.
    if (!navigator.onLine) setIsOnline(false)

    return () => {
      if (pending) clearTimeout(pending)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
