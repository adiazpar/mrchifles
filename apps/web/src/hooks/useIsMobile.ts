'use client'

import { useEffect, useState } from 'react'

// Capability-based media query for touch-first devices. Matches phones and
// tablets (primary input is touch) and excludes desktops with mice — even
// touchscreen laptops, because their primary pointing device is a mouse
// so `pointer: coarse` evaluates false.
const TOUCH_PRIMARY_QUERY = '(pointer: coarse)'

/**
 * Detect whether the current device is primarily touch-first (a phone or
 * tablet). Used to dispatch between file-input and live-camera flows
 * across the app.
 *
 * Why media query instead of user-agent sniffing:
 * - It's capability-based, not brand-based — new devices and custom
 *   UAs don't need regex updates.
 * - It correctly identifies iPads, which modern iPadOS Safari reports
 *   with a Mac user-agent string by default.
 * - It correctly excludes touchscreen laptops (Surface, iPad Pro with
 *   a trackpad) — their primary pointer is a mouse.
 * - It's the standard the CSS spec intends for device classification.
 *
 * SSR-safe: returns `false` during the server render and first client
 * render, then updates on mount via a `useEffect` listener that also
 * responds to live changes (e.g., docking a tablet or attaching a mouse).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(TOUCH_PRIMARY_QUERY)

    // Set the initial value from the media query on mount.
    setIsMobile(mediaQuery.matches)

    // Keep the state in sync if the device's pointer type changes at
    // runtime (rare, but happens when docking/undocking a tablet or
    // attaching a USB mouse).
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return isMobile
}
