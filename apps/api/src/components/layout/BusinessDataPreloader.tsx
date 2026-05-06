'use client'

import { useEffect } from 'react'
import { useProducts } from '@/contexts/products-context'
import { useProviders } from '@/contexts/providers-context'
import { useOrders } from '@/contexts/orders-context'

interface Props {
  businessId: string
}

// Fires the three per-business `ensure*Loaded()` calls as soon as the
// user enters a business context, regardless of which page they land on.
// By the time they tap any tab, the data is already in flight or cached.
//
// Calls are idempotent — every consuming page also calls ensureLoaded(),
// and fetchDeduped() in src/lib/fetch.ts collapses duplicate in-flight
// requests to the same URL into one network call.
//
// Returns null; this is a side-effect-only component.
export function BusinessDataPreloader({ businessId }: Props) {
  const { ensureLoaded: ensureProductsLoaded } = useProducts()
  const { ensureLoaded: ensureProvidersLoaded } = useProviders()
  const { ensureActiveLoaded } = useOrders()

  useEffect(() => {
    if (!businessId) return
    void ensureProductsLoaded()
    void ensureProvidersLoaded()
    void ensureActiveLoaded()
  }, [businessId, ensureProductsLoaded, ensureProvidersLoaded, ensureActiveLoaded])

  return null
}
