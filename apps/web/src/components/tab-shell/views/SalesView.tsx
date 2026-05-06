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
    <main className="page-content" style={{ minHeight: 0 }}>
      <div className="page-body relative">
        {sessionOpen ? (
          <>
            {statsCard}
            <div className="flex-1 min-h-0 pt-4 flex flex-col">
              <ProductPicker cart={cart} />
            </div>
            <CartSheet cart={cart} />
          </>
        ) : (
          /* No session: header + reports scroll together inside one
             overflow container so the SalesStatsCard slides up out of
             view as the user explores the report cards below. */
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
            {statsCard}
            <div className="pt-4">
              <SalesReports businessId={businessId} />
            </div>
          </div>
        )}
      </div>
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
    </main>
  )
}
