'use client'

import { useEffect } from 'react'
import { useBusiness } from '@/contexts/business-context'
import { useSales } from '@/contexts/sales-context'
import { HomeHero, RevenueCard } from '@/components/home'

export function HomeView() {
  const { businessId } = useBusiness()
  const { stats, isLoaded, ensureLoaded } = useSales()

  useEffect(() => {
    if (!businessId) return
    void ensureLoaded()
  }, [businessId, ensureLoaded])

  return (
    <div className="home-body">
      <HomeHero />
      <RevenueCard
        isLoading={!isLoaded}
        amount={stats?.todayRevenue ?? null}
        vsYesterdayPct={stats?.vsYesterdayPct ?? null}
      />
    </div>
  )
}
