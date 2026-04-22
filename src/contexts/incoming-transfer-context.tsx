'use client'

import { createContext, useContext, type ReactNode } from 'react'
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
  const value = useIncomingTransfer()
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
