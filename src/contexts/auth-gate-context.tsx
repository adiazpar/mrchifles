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
  | 'entering-fade-in'
  | 'entering-hold'
  | 'entering-fade-out'
  | 'exiting-fade-in'
  | 'exiting-hold'
  | 'exiting-fade-out'

export interface AuthGateContextValue {
  phase: AuthGatePhase
  reducedMotion: boolean
  playEntry: (redirectTo: string) => Promise<void>
  playExit: (redirectTo?: string) => Promise<void>
}

const ENTRY_FADE_IN_MS = 150
const ENTRY_HOLD_MS = 150
const ENTRY_FADE_OUT_MS = 200
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

  const playEntry = useCallback(async (redirectTo: string): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current

    const run = (async () => {
      if (reducedMotion) {
        setPhase('entering-fade-in')
        router.push(redirectTo)
        router.refresh()
        await wait(REDUCED_MOTION_FADE_MS)
        setPhase('entering-fade-out')
        await wait(REDUCED_MOTION_FADE_MS)
        setPhase('idle')
        return
      }

      setPhase('entering-fade-in')
      router.push(redirectTo)
      router.refresh()
      await wait(ENTRY_FADE_IN_MS)

      setPhase('entering-hold')
      await wait(ENTRY_HOLD_MS)

      setPhase('entering-fade-out')
      await wait(ENTRY_FADE_OUT_MS)

      setPhase('idle')
    })()

    inFlightRef.current = run.finally(() => {
      inFlightRef.current = null
    })
    return inFlightRef.current
  }, [reducedMotion, router])

  const playExit = useCallback(async (redirectTo: string = '/login'): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current

    const run = (async () => {
      if (reducedMotion) {
        setPhase('exiting-fade-in')
        await wait(REDUCED_MOTION_FADE_MS)
        await logout()
        router.push(redirectTo)
        setPhase('exiting-fade-out')
        await wait(REDUCED_MOTION_FADE_MS)
        setPhase('idle')
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

      setPhase('idle')
    })()

    inFlightRef.current = run.finally(() => {
      inFlightRef.current = null
    })
    return inFlightRef.current
  }, [reducedMotion, logout, router])

  const value = useMemo<AuthGateContextValue>(
    () => ({ phase, reducedMotion, playEntry, playExit }),
    [phase, reducedMotion, playEntry, playExit],
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
