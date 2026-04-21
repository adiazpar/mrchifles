'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'

const SPLASH_ID = 'app-splash'
const MAX_DURATION_MS = 2000

function isStandalone(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  // iOS Safari exposes a non-standard `navigator.standalone` for legacy PWAs;
  // modern iOS + Android + desktop all honor the display-mode media query.
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function SplashController() {
  const { isLoading } = useAuth()
  const mountedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isStandalone()) return

    const el = document.getElementById(SPLASH_ID)
    if (!el) return

    if (mountedAtRef.current === null) {
      mountedAtRef.current = performance.now()
    }

    let dismissed = false
    const dismiss = () => {
      if (dismissed) return
      dismissed = true
      // Flip the data attribute and let CSS fade + disable pointer events.
      // Do NOT call el.remove(): the splash div is rendered by React in
      // layout.tsx, so detaching it externally makes React's next commit
      // fail with NotFoundError when it tries to unmount the fiber.
      el.setAttribute('data-dismissed', 'true')
    }

    // Hard cap is measured from mount, not from the current effect run, so
    // re-renders driven by isLoading don't extend the cap.
    const elapsed = performance.now() - mountedAtRef.current
    const remaining = Math.max(0, MAX_DURATION_MS - elapsed)
    const hardCap = window.setTimeout(dismiss, remaining)

    if (!isLoading) {
      const fontsReady = document.fonts?.ready ?? Promise.resolve()
      fontsReady.then(() => {
        window.clearTimeout(hardCap)
        dismiss()
      })
    }

    return () => window.clearTimeout(hardCap)
  }, [isLoading])

  return null
}
