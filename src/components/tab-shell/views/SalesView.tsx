'use client'

import { useEffect, useState } from 'react'
import { useBusiness } from '@/contexts/business-context'
import { useSales } from '@/contexts/sales-context'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useCart } from '@/hooks/useCart'
import { SalesStatsCard } from '@/components/sales/SalesStatsCard'
import { CartSheet } from '@/components/sales/CartSheet'
import { ProductPicker } from '@/components/sales/ProductPicker'
import { CloseSessionConfirmModal } from '@/components/sales/CloseSessionConfirmModal'

export function SalesView() {
  const { business } = useBusiness()
  const sales = useSales()
  const salesSessions = useSalesSessions()
  const businessId = business?.id ?? ''
  const cart = useCart(businessId)

  const [closeModalOpen, setCloseModalOpen] = useState(false)

  useEffect(() => {
    if (!businessId) return
    void salesSessions.ensureLoaded()
    void sales.ensureLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  if (!businessId) return null

  const sessionOpen = Boolean(salesSessions.currentSession)

  return (
    <main className="page-content" style={{ minHeight: 0 }}>
      <div className="page-body">
        <SalesStatsCard
          sessionOpen={sessionOpen}
          onOpenSession={() => {
            // PR 4 will mount OpenSessionModal here. For now, no-op
            // because the modal isn't implemented yet — testing will use
            // the API directly until PR 4 lands.
          }}
          onRequestCloseSession={() => setCloseModalOpen(true)}
        />
        {sessionOpen && (
          <div className="flex-1 min-h-0 pt-4 flex flex-col">
            <ProductPicker cart={cart} />
          </div>
        )}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out mt-auto"
          style={{ gridTemplateRows: sessionOpen ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden min-h-0">
            <div className="pt-4">
              <CartSheet cart={cart} businessId={businessId} />
            </div>
          </div>
        </div>
      </div>
      <CloseSessionConfirmModal
        isOpen={closeModalOpen}
        stats={sales.stats}
        onClose={() => setCloseModalOpen(false)}
        onConfirm={() => {
          setCloseModalOpen(false)
          // PR 4 will rebuild this modal as a 3-step flow that calls
          // salesSessions.closeSession() with the counted cash. For now,
          // just dismisses so we don't break existing UI.
        }}
      />
    </main>
  )
}
