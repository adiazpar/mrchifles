'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'

export type AuthGatePhase =
  | 'idle'
  // Entry sequence (login/register -> hub) is broken into five phases so
  // the overlay fade, the icon animations, and the breath gaps between
  // them are all independently tunable. Exit sequence keeps its simpler
  // three-phase shape — logout doesn't need the same branded choreography.
  | 'entering-overlay-in'
  | 'entering-icon-in'
  | 'entering-hold'
  | 'entering-icon-out'
  | 'entering-overlay-out'
  | 'exiting-fade-in'
  | 'exiting-hold'
  | 'exiting-fade-out'

export interface AuthGateContextValue {
  phase: AuthGatePhase
  reducedMotion: boolean
  playEntry: (redirectTo: string) => Promise<void>
  playExit: (redirectTo?: string) => Promise<void>
  // Called by the hub page once it has rendered with its data. Releases the
  // entering-hold phase of playEntry so the fade-out can begin. No-op if
  // called outside of an active entry (e.g. on warm hub re-mounts).
  markHubReady: () => void
}

const ENTRY_OVERLAY_IN_MS = 250
const ENTRY_PRE_ICON_GAP_MS = 150
const ENTRY_ICON_IN_MS = 400
const ENTRY_HOLD_MIN_MS = 600
const ENTRY_HOLD_CAP_MS = 2000
const ENTRY_ICON_OUT_MS = 400
const ENTRY_POST_ICON_GAP_MS = 150
const ENTRY_OVERLAY_OUT_MS = 300
const EXIT_FADE_IN_MS = 200
const EXIT_HOLD_MS = 100
const EXIT_FADE_OUT_MS = 200
const REDUCED_MOTION_FADE_MS = 200

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null)

export function useAuthGate(): AuthGateContextValue {
  const ctx = useContext(AuthGateContext)
  if (!ctx) {
    throw new Error('useAuthGate must be used within an AuthGateProvider')
  }
  return ctx
}

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { logout } = useAuth()
  const [phase, setPhase] = useState<AuthGatePhase>('idle')
  const [reducedMotion, setReducedMotion] = useState(false)
  const inFlightRef = useRef<Promise<void> | null>(null)
  // Resolver for the current entry's hub-ready gate. Populated at the start
  // of playEntry (before router.push, so the hub's mount-effect is always
  // observed), cleared in the finally block. Null between entries so stray
  // markHubReady calls from warm hub re-mounts are harmless no-ops.
  const hubReadyResolverRef = useRef<(() => void) | null>(null)

  const markHubReady = useCallback(() => {
    hubReadyResolverRef.current?.()
    hubReadyResolverRef.current = null
  }, [])

  const playEntry = useCallback(async (redirectTo: string): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current

    // The try/finally around the whole phase progression guarantees the
    // overlay returns to 'idle' even if router.push or anything else
    // throws mid-animation. Without this guard, a thrown navigation error
    // would leave the overlay stuck on the screen until a page reload.
    const run = (async () => {
      try {
        if (reducedMotion) {
          setPhase('entering-overlay-in')
          router.push(redirectTo)
          router.refresh()
          await wait(REDUCED_MOTION_FADE_MS)
          setPhase('entering-overlay-out')
          await wait(REDUCED_MOTION_FADE_MS)
          return
        }

        // Create the hub-ready promise BEFORE navigation so the hub page's
        // on-mount effect always has a resolver to call, even if it loads
        // from cache fast enough to run before the 'entering-hold' phase.
        const hubReadyPromise = new Promise<void>((resolve) => {
          hubReadyResolverRef.current = resolve
        })

        // 1. Overlay fades in over the login page.
        setPhase('entering-overlay-in')
        router.push(redirectTo)
        router.refresh()
        await wait(ENTRY_OVERLAY_IN_MS)

        // 2. Breath: overlay is fully opaque, icon not yet visible. This
        //    separates the curtain-drop gesture from the logo entry.
        await wait(ENTRY_PRE_ICON_GAP_MS)

        // 3. Logo pops in.
        setPhase('entering-icon-in')
        await wait(ENTRY_ICON_IN_MS)

        // 4. Hold for at least the min timer so the logo reads; release
        //    as soon as the hub signals ready (or the cap fires, so a
        //    slow network can never freeze the overlay).
        setPhase('entering-hold')
        await Promise.all([
          wait(ENTRY_HOLD_MIN_MS),
          Promise.race([hubReadyPromise, wait(ENTRY_HOLD_CAP_MS)]),
        ])

        // 5. Logo pops out.
        setPhase('entering-icon-out')
        await wait(ENTRY_ICON_OUT_MS)

        // 6. Breath: icon is gone, overlay still opaque. Separates the
        //    logo exit from the hub reveal so they don't blur together.
        await wait(ENTRY_POST_ICON_GAP_MS)

        // 7. Overlay fades out, hub revealed.
        setPhase('entering-overlay-out')
        await wait(ENTRY_OVERLAY_OUT_MS)
      } finally {
        setPhase('idle')
        hubReadyResolverRef.current = null
      }
    })()

    inFlightRef.current = run.finally(() => {
      inFlightRef.current = null
    })
    return inFlightRef.current
  }, [reducedMotion, router])

  const playExit = useCallback(async (redirectTo: string = '/login'): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current

    const run = (async () => {
      try {
        if (reducedMotion) {
          setPhase('exiting-fade-in')
          await wait(REDUCED_MOTION_FADE_MS)
          await logout()
          router.push(redirectTo)
          setPhase('exiting-fade-out')
          await wait(REDUCED_MOTION_FADE_MS)
          return
        }

        setPhase('exiting-fade-in')
        await wait(EXIT_FADE_IN_MS)

        // Overlay is now fully opaque. Safe to clear auth state and navigate.
        // Anything behind the overlay that re-renders on logout (user menu,
        // page header) is hidden — no visible state flash.
        await logout()
        router.push(redirectTo)

        setPhase('exiting-hold')
        await wait(EXIT_HOLD_MS)

        setPhase('exiting-fade-out')
        await wait(EXIT_FADE_OUT_MS)
      } finally {
        setPhase('idle')
      }
    })()

    inFlightRef.current = run.finally(() => {
      inFlightRef.current = null
    })
    return inFlightRef.current
  }, [reducedMotion, logout, router])

  const value = useMemo<AuthGateContextValue>(
    () => ({ phase, reducedMotion, playEntry, playExit, markHubReady }),
    [phase, reducedMotion, playEntry, playExit, markHubReady],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <AuthGateContext.Provider value={value}>
      {children}
    </AuthGateContext.Provider>
  )
}
