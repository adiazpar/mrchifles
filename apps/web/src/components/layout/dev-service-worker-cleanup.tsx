'use client'

import { useEffect } from 'react'

// Bouncing between `start:local` (registers the production Serwist SW) and
// `npm run dev` on the same origin leaves a stale SW installed on the
// client. The dev server emits chunks with different hashes than the
// precached ones, the SW serves the wrong factory for a lazy chunk, and
// React explodes with `originalFactory.call`. Serwist's `disable: true`
// only stops new registrations — it cannot evict an SW already on the
// device. This effect does the eviction.
export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const RELOAD_FLAG = '__dev_sw_cleared__'

    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      if (registrations.length === 0) return

      await Promise.all(registrations.map((r) => r.unregister()))

      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }

      if (sessionStorage.getItem(RELOAD_FLAG)) return
      sessionStorage.setItem(RELOAD_FLAG, '1')
      console.warn('[dev] Unregistered stale service worker; reloading')
      window.location.reload()
    })()
  }, [])

  return null
}
