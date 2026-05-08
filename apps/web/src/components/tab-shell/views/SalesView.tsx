'use client'

import { useEffect, useState } from 'react'
import { useBusiness } from '@/contexts/business-context'
import { useSales } from '@/contexts/sales-context'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useCart } from '@/hooks/useCart'
import { SalesStatsCard } from '@/components/sales/SalesStatsCard'
import { CartSheet } from '@/components/sales/CartSheet'
import { ProductPicker } from '@/components/sales/ProductPicker'
import { SalesReports } from '@/components/sales/reports/SalesReports'
import { CloseSessionConfirmModal } from '@/components/sales/CloseSessionConfirmModal'
import { OpenSessionModal } from '@/components/sales/OpenSessionModal'

export function SalesView() {
  const { business } = useBusiness()
  const sales = useSales()
  const salesSessions = useSalesSessions()
  const businessId = business?.id ?? ''
  const cart = useCart(businessId)

  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [openModalOpen, setOpenModalOpen] = useState(false)

  useEffect(() => {
    if (!businessId) return
    void salesSessions.ensureLoaded()
    void sales.ensureLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  if (!businessId) return null

  const sessionOpen = Boolean(salesSessions.currentSession)

  // Layout flip is deferred while either session-modal is open. Without this,
  // the underlying layout swaps from reports → POS the moment `currentSession`
  // updates inside `openSession()` — which happens DURING the modal's success
  // step. ProductPicker + CartSheet would then mount while the modal is still
  // showing the Lottie celebration; if anything in that mount path threw, the
  // whole tree (including the modal) would unmount, leaving the IonModal
  // backdrop orphaned in <body>. That presents as "blank screen + bricked
  // taps" on iOS Safari (no error boundary used to be in place either).
  //
  // Locking the layout to its pre-modal value during the modal's lifecycle
  // means the layout flip happens only after the modal has fully dismissed.
  // ErrorBoundary in App.tsx is the fallback if anything still goes wrong.
  const displaySessionOpen = openModalOpen
    ? false
    : closeModalOpen
      ? true
      : sessionOpen

  const statsCard = (
    <SalesStatsCard
      sessionOpen={sessionOpen}
      onOpenSession={() => setOpenModalOpen(true)}
      onRequestCloseSession={() => setCloseModalOpen(true)}
    />
  )

  return (
    <>
      {displaySessionOpen ? (
        // POS workspace layout: pinned stats + product grid + bottom cart sheet.
        // relative keeps CartSheet's absolute bottom-0 anchored to this container.
        // No outer padding — children handle their own padding to avoid double-margins.
        // Explicit `key` forces clean unmount/remount instead of in-place reconciliation
        // when the layout flips, so React doesn't try to diff a reports-shaped subtree
        // into a POS-shaped one mid-commit.
        <div key="pos" className="relative flex h-full flex-col">
          {statsCard}
          <div className="flex-1 min-h-0 pt-4 flex flex-col">
            <ProductPicker cart={cart} />
          </div>
          <CartSheet cart={cart} />
        </div>
      ) : (
        // Reports browse mode: vertically-scrollable column. IonContent owns scroll.
        <div key="reports" className="px-4 py-6 space-y-4">
          {statsCard}
          <SalesReports businessId={businessId} />
        </div>
      )}
      <CloseSessionConfirmModal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        onCloseComplete={() => {
          cart.clear()
        }}
      />
      <OpenSessionModal
        isOpen={openModalOpen}
        onClose={() => setOpenModalOpen(false)}
        previousCountedCash={salesSessions.sessions[0]?.countedCash ?? null}
      />
    </>
  )
}
