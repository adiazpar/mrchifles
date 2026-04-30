'use client'

import { useEffect, useState } from 'react'
import { useBusiness } from '@/contexts/business-context'
import { useSales } from '@/contexts/sales-context'
import { useCart } from '@/hooks/useCart'
import { SalesStatsCard } from '@/components/sales/SalesStatsCard'
import { CartSheet } from '@/components/sales/CartSheet'
import { ProductPicker } from '@/components/sales/ProductPicker'

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
    <main className="page-content" style={{ minHeight: 0 }}>
      <div className="page-body">
        <SalesStatsCard
          compact={false}
          sessionOpen={sessionOpen}
          onToggleSession={() => setSessionOpen((v) => !v)}
        />
        {/* Product picker — fills the space between the stats card and
            the cart card while the session is open. Wrapper is a flex
            column with no overflow of its own; the picker handles its
            own internal scroll on just the product grid so the search
            row above stays anchored. */}
        {sessionOpen && (
          <div className="flex-1 min-h-0 pt-4 flex flex-col">
            <ProductPicker cart={cart} />
          </div>
        )}
        {/* Cart card — uses the grid-template-rows 1fr/0fr collapse
            trick to glide in/out as the session toggles. mt-auto pushes
            it to the bottom of .page-body when nothing else is filling
            the available height (i.e. when the picker isn't rendered). */}
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
