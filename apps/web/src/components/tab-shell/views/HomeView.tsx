'use client'

import { useEffect, useMemo } from 'react'
import { useIntl } from 'react-intl'
import { useBusiness } from '@/contexts/business-context'
import { useSales } from '@/contexts/sales-context'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useProducts } from '@/contexts/products-context'
import { useOrders } from '@/contexts/orders-context'
import { usePageTransition } from '@/contexts/page-transition-context'
import { GroupLabel } from '@/components/ui'
import {
  HomeHero,
  RevenueCard,
  SessionTile,
  ItemsSoldTile,
  AlertsSection,
} from '@/components/home'

export function HomeView() {
  const intl = useIntl()
  const { businessId } = useBusiness()
  const { sales, stats, isLoaded: salesLoaded, ensureLoaded: ensureSalesLoaded } = useSales()
  const {
    currentSession,
    ensureLoaded: ensureSessionsLoaded,
  } = useSalesSessions()
  const { products, ensureLoaded: ensureProductsLoaded } = useProducts()
  const { orders, ensureActiveLoaded } = useOrders()
  const { navigate } = usePageTransition()

  useEffect(() => {
    if (!businessId) return
    void ensureSalesLoaded()
    void ensureSessionsLoaded()
    void ensureProductsLoaded()
    void ensureActiveLoaded()
  }, [
    businessId,
    ensureSalesLoaded,
    ensureSessionsLoaded,
    ensureProductsLoaded,
    ensureActiveLoaded,
  ])

  // Mirror SalesStatsCard — open-session running total is computed from
  // the sales list, not currentSession.salesTotal (which is nullable on
  // the wire and not kept live for the open session).
  const sessionRunningTotal = useMemo(() => {
    if (!currentSession) return 0
    return sales
      .filter((s) => s.sessionId === currentSession.id)
      .reduce((sum, s) => sum + s.total, 0)
  }, [sales, currentSession])

  // Low-stock threshold matches apps/web/src/hooks/useProductFilters.ts —
  // per-product threshold with a default of 10 when unset; nullable stock
  // treated as 0 (matches the same hook).
  const lowStockCount = useMemo(
    () =>
      products.filter((p) => (p.stock ?? 0) <= (p.lowStockThreshold ?? 10))
        .length,
    [products],
  )

  // Pending = not yet received. The active bucket holds pending + overdue
  // (matches apps/web/src/contexts/orders-context.tsx partitioning).
  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.status !== 'received').length,
    [orders],
  )

  const handleSalesClick = () => {
    if (businessId) navigate(`/${businessId}/sales`)
  }

  const handleLowStockClick = () => {
    if (businessId) navigate(`/${businessId}/products?filter=low_stock`)
  }

  const handlePendingOrdersClick = () => {
    if (businessId) navigate(`/${businessId}/products?tab=orders`)
  }

  return (
    <div className="home-body">
      <HomeHero />
      <RevenueCard
        isLoading={!salesLoaded}
        amount={stats?.todayRevenue ?? null}
        vsYesterdayPct={stats?.vsYesterdayPct ?? null}
      />
      <GroupLabel>{intl.formatMessage({ id: 'home.section_today' })}</GroupLabel>
      <div className="home-grid">
        <SessionTile
          isOpen={Boolean(currentSession)}
          openedAt={currentSession?.openedAt ?? null}
          runningTotal={sessionRunningTotal}
          onClick={handleSalesClick}
        />
        <ItemsSoldTile
          count={stats?.todayCount ?? 0}
          avgTicket={stats?.todayAvgTicket ?? null}
          onClick={handleSalesClick}
        />
      </div>
      <AlertsSection
        lowStockCount={lowStockCount}
        pendingOrdersCount={pendingOrdersCount}
        onLowStockClick={handleLowStockClick}
        onPendingOrdersClick={handlePendingOrdersClick}
      />
    </div>
  )
}
