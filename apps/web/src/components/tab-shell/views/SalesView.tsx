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

  const statsCard = (
    <SalesStatsCard
      sessionOpen={sessionOpen}
      onOpenSession={() => setOpenModalOpen(true)}
      onRequestCloseSession={() => setCloseModalOpen(true)}
    />
  )

  return (
    <>
      {sessionOpen ? (
        // POS workspace layout: pinned stats + product grid + bottom cart sheet.
        // relative keeps CartSheet's absolute bottom-0 anchored to this container.
        // No outer padding — children handle their own padding to avoid double-margins.
        <div className="relative flex h-full flex-col">
          {statsCard}
          <div className="flex-1 min-h-0 pt-4 flex flex-col">
            <ProductPicker cart={cart} />
          </div>
          <CartSheet cart={cart} />
        </div>
      ) : (
        // Reports browse mode: vertically-scrollable column. IonContent owns scroll.
        <div className="px-4 py-6 space-y-4">
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
