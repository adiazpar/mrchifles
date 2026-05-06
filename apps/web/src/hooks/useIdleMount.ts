'use client'

import { useEffect, useRef } from 'react'

// Default stagger between mounts when requestIdleCallback isn't available
// (iOS Safari < 17). Without staggering, the setTimeout-fallback path
// would mount all queued tabs in one frame and defeat the purpose.
const FALLBACK_STAGGER_MS = 80

// Schedules `onIdle` to run when the browser is idle (or after a small
// stagger if requestIdleCallback isn't available). Cleanup cancels the
// scheduled call.
//
// `onIdle` is held in a ref so consumers don't need to memoize it just
// to keep the effect's dep array stable. Mirrors the pattern in
// useRevalidateOnFocus from Tier 2.
export function useIdleMount(
  shouldMount: boolean,
  onIdle: () => void,
  delayMs: number = FALLBACK_STAGGER_MS,
): void {
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  useEffect(() => {
    if (!shouldMount || typeof window === 'undefined') return

    const win = window as Window & {
      requestIdleCallback?: (cb: IdleRequestCallback, opts?: { timeout: number }) => number
      cancelIdleCallback?: (handle: number) => void
    }
    const ric = win.requestIdleCallback
    const cic = win.cancelIdleCallback

    if (typeof ric === 'function') {
      const handle = ric(() => onIdleRef.current(), { timeout: 2000 })
      return () => { if (typeof cic === 'function') cic(handle) }
    }

    const handle = setTimeout(() => onIdleRef.current(), delayMs)
    return () => clearTimeout(handle)
  }, [shouldMount, delayMs])
}
