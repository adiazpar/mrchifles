'use client'

import { useEffect } from 'react'
import { useBusiness } from '@/contexts/business-context'
import { useSales } from '@/contexts/sales-context'
import { useCart } from '@/hooks/useCart'
import { SalesStatsCard } from '@/components/sales/SalesStatsCard'
import { ProductPicker } from '@/components/sales/ProductPicker'
import { SalesHistoryList } from '@/components/sales/SalesHistoryList'
import { CartSheet } from '@/components/sales/CartSheet'

export function SalesView() {
  const { business } = useBusiness()
  const sales = useSales()
  const businessId = business?.id ?? ''
  const cart = useCart(businessId)

  useEffect(() => {
    if (!businessId) return
    void sales.ensureLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  if (!businessId) return null

  const cartHasItems = cart.lines.length > 0

  return (
    <main className="page-content">
      <div className="page-body">
        <SalesStatsCard compact={cartHasItems} />
        <div className={cartHasItems ? 'is-cart-active' : 'is-cart-empty'}>
          <ProductPicker cart={cart} />
          <SalesHistoryList hidden={cartHasItems} />
        </div>
      </div>
      {cartHasItems && <CartSheet cart={cart} businessId={businessId} />}
    </main>
  )
}
