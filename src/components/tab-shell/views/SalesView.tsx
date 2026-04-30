'use client'

import { useEffect, useState } from 'react'
import { useBusiness } from '@/contexts/business-context'
import { useSales } from '@/contexts/sales-context'
import { useCart } from '@/hooks/useCart'
import { SalesStatsCard } from '@/components/sales/SalesStatsCard'
import { CartSheet } from '@/components/sales/CartSheet'

export function SalesView() {
  const { business } = useBusiness()
  const sales = useSales()
  const businessId = business?.id ?? ''
  const cart = useCart(businessId)
  // Local placeholder for the cash-session lifecycle until the real backend
  // and persistence layer for sessions exists.
  const [sessionOpen, setSessionOpen] = useState(false)

  useEffect(() => {
    if (!businessId) return
    void sales.ensureLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  if (!businessId) return null

  return (
    <main className="page-content">
      <div className="page-body">
        <SalesStatsCard
          compact={false}
          sessionOpen={sessionOpen}
          onToggleSession={() => setSessionOpen((v) => !v)}
        />
        {/* Cart card: mt-auto pushes it to the bottom of .page-body
            (which is already a flex column with min-height: 0). The grid
            grid-template-rows: 1fr | 0fr trick gives a smooth glide-in
            and glide-out as the session opens/closes. */}
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
    </main>
  )
}
