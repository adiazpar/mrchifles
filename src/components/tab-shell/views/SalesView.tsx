'use client'

import { useEffect, useState } from 'react'
import { useBusiness } from '@/contexts/business-context'
import { useSales } from '@/contexts/sales-context'
import { SalesStatsCard } from '@/components/sales/SalesStatsCard'

export function SalesView() {
  const { business } = useBusiness()
  const sales = useSales()
  const businessId = business?.id ?? ''
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
      </div>
    </main>
  )
}
