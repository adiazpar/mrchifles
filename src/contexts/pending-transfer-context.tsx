'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { usePendingTransfer, type UsePendingTransferReturn } from '@/hooks/usePendingTransfer'

const PendingTransferContext = createContext<UsePendingTransferReturn | null>(null)

/**
 * Single source of truth for the current business's pending outgoing
 * ownership transfer. Mounted once at the business-shell level so every
 * consumer (the manage-page banner, the mobile-nav badge, the transfer
 * modal's refresh-on-success) reads from and writes to the same state
 * -- otherwise each call site would hold its own independent copy and
 * refresh() on one instance would leave the other stale.
 *
 * The underlying hook already no-ops for non-owners and hub routes, so
 * mounting this provider broadly is cheap.
 */
export function PendingTransferProvider({ children }: { children: ReactNode }) {
  const value = usePendingTransfer()
  return (
    <PendingTransferContext.Provider value={value}>
      {children}
    </PendingTransferContext.Provider>
  )
}

export function usePendingTransferContext(): UsePendingTransferReturn {
  const ctx = useContext(PendingTransferContext)
  if (!ctx) {
    throw new Error(
      'usePendingTransferContext must be used within a PendingTransferProvider',
    )
  }
  return ctx
}
