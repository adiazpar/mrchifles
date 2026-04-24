'use client'

import {
  createContext,
  useCallback,
  useContext,
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
  const [phase, _setPhase] = useState<AuthGatePhase>('idle')
  const [reducedMotion, _setReducedMotion] = useState(false)
  const _inFlightRef = useRef<Promise<void> | null>(null)

  // Orchestration lands in Tasks 5 and 6. Stubs return immediately so the
  // provider is usable from the start.
  const playEntry = useCallback(async (_redirectTo: string): Promise<void> => {
    void _redirectTo
    void router
    return
  }, [router])

  const playExit = useCallback(async (_redirectTo?: string): Promise<void> => {
    void _redirectTo
    void logout
    return
  }, [logout])

  const value = useMemo<AuthGateContextValue>(
    () => ({ phase, reducedMotion, playEntry, playExit }),
    [phase, reducedMotion, playEntry, playExit],
  )

  return (
    <AuthGateContext.Provider value={value}>
      {children}
    </AuthGateContext.Provider>
  )
}
