'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import {
  useIncomingTransfer,
  type UseIncomingTransferReturn,
} from '@/hooks/useIncomingTransfer'

const IncomingTransferContext = createContext<UseIncomingTransferReturn | null>(null)

/**
 * Single source of truth for the current user's pending incoming
 * ownership transfer. Mounted once at the app-shell level so every
 * consumer -- the account-page banner, the target-business manage-page
 * banner, the top-header avatar badge, the user-menu drawer badge,
 * and the mobile-nav Manage badge -- reads from the same state.
 *
 * The hook is user-scoped (not business-scoped), so this provider sits
 * above BusinessProvider.
 */
export function IncomingTransferProvider({ children }: { children: ReactNode }) {
  // Stabilize the value against the hook returning a fresh literal each
  // render. This context's consumers are numerous — avatar badge,
  // menu badge, nav badge, two different banner positions — so a
  // per-render reference change is visibly expensive.
  const {
    transfer,
    isLoading,
    error,
    isAccepting,
    isDeclining,
    handleAccept,
    handleDecline,
  } = useIncomingTransfer()
  const value = useMemo<UseIncomingTransferReturn>(
    () => ({ transfer, isLoading, error, isAccepting, isDeclining, handleAccept, handleDecline }),
    [transfer, isLoading, error, isAccepting, isDeclining, handleAccept, handleDecline],
  )
  return (
    <IncomingTransferContext.Provider value={value}>
      {children}
    </IncomingTransferContext.Provider>
  )
}

export function useIncomingTransferContext(): UseIncomingTransferReturn {
  const ctx = useContext(IncomingTransferContext)
  if (!ctx) {
    throw new Error(
      'useIncomingTransferContext must be used within an IncomingTransferProvider',
    )
  }
  return ctx
}
