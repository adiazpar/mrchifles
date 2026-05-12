'use client'

import { useEffect, useMemo } from 'react'
import { useIntl } from 'react-intl'
import { useIonRouter } from '@ionic/react'
import { useBusiness } from '@/contexts/business-context'
import { useSales } from '@/contexts/sales-context'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useProducts } from '@/contexts/products-context'
import { useOrders } from '@/contexts/orders-context'
import { useProviders } from '@/contexts/providers-context'
import { useProductSettings } from '@/contexts/product-settings-context'
import { useSalesAggregate } from '@/hooks/useSalesAggregate'
import { GroupLabel } from '@/components/ui'
import { getOrderDisplayStatus } from '@/lib/products'
import {
  HomeHero,
  RevenueCard,
  SalesTile,
  ProductsTile,
  ManageTile,
  WeekTrendCard,
  AlertsSection,
} from '@/components/home'

export function HomeView() {
  const intl = useIntl()
  const { businessId, canManage, isOwner } = useBusiness()
  const { sales, stats, isLoaded: salesLoaded, ensureLoaded: ensureSalesLoaded } = useSales()
  const {
    currentSession,
    ensureLoaded: ensureSessionsLoaded,
  } = useSalesSessions()
  const { products, ensureLoaded: ensureProductsLoaded } = useProducts()
  const {
    orders,
    ensureActiveLoaded,
    ensureCompletedLoaded,
  } = useOrders()
  const { providers, ensureLoaded: ensureProvidersLoaded } = useProviders()
  const { categories } = useProductSettings()
  const aggregate = useSalesAggregate(businessId ?? '')
  // Ionic-aware router. Used for cross-tab navigation (Home -> Sales /
  // Products / Manage and the alert rows) with the ('none', 'replace')
  // signature so IonTabs recognizes the destination as a sibling tab
  // and performs a tab swap instead of stacking a push on top of Home.
  // Without this, tapping a tile then the back button would walk back
  // through Home before reaching the Hub. Precedent: user-menu-content.
  const ionRouter = useIonRouter()

  useEffect(() => {
    if (!businessId) return
    void ensureSalesLoaded()
    void ensureSessionsLoaded()
    void ensureProductsLoaded()
    void ensureActiveLoaded()
    // Completed orders feed the "spent this week" sub-line on the trend
    // card. ensureCompletedLoaded is idempotent.
    void ensureCompletedLoaded()
    // Providers feed the Manage tile's provider count.
    void ensureProvidersLoaded()
  }, [
    businessId,
    ensureSalesLoaded,
    ensureSessionsLoaded,
    ensureProductsLoaded,
    ensureActiveLoaded,
    ensureCompletedLoaded,
    ensureProvidersLoaded,
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

  // Overdue = pending + estimatedArrival in the past (per
  // getOrderDisplayStatus in lib/products.ts).
  const overdueCount = useMemo(
    () => orders.filter((o) => getOrderDisplayStatus(o) === 'overdue').length,
    [orders],
  )

  // Pending excludes overdue so the two alert rows don't double-count.
  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => getOrderDisplayStatus(o) === 'pending').length,
    [orders],
  )

  // This-week spend = sum of order totals whose date falls in the last 7
  // calendar days (UTC). Mirrors the aggregate API's dailyRevenue window
  // so "earned" and "spent" cover the same range.
  const thisWeekSpend = useMemo(() => {
    if (!orders.length) return 0
    const now = new Date()
    const startOfTodayUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    )
    // Inclusive 7-day window: [startOfTodayUtc - 6d, startOfTodayUtc + 1d).
    // Matches the aggregate API's existing convention.
    const sevenDaysAgo = startOfTodayUtc - 6 * 24 * 60 * 60 * 1000
    const tomorrow = startOfTodayUtc + 24 * 60 * 60 * 1000
    return orders.reduce((sum, o) => {
      const t = new Date(o.date).getTime()
      return t >= sevenDaysAgo && t < tomorrow ? sum + o.total : sum
    }, 0)
  }, [orders])

  // 7-day total from the server-aggregated dailyRevenue.
  const thisWeekTotal = useMemo(() => {
    if (!aggregate.isLoaded || !aggregate.data) return null
    return aggregate.data.dailyRevenue.reduce((sum, e) => sum + e.total, 0)
  }, [aggregate.isLoaded, aggregate.data])

  // Role label for the Manage tile. canManage covers owner + manager
  // (partner) roles; isOwner narrows further. Everyone else falls
  // through to "employee" — the read-only voice on the description.
  const role: 'owner' | 'manager' | 'employee' = isOwner
    ? 'owner'
    : canManage
    ? 'manager'
    : 'employee'

  // Cross-tab navigation. push(href, 'none', 'replace') tells Ionic to
  // perform a tab swap instead of stacking a push on top of Home — so
  // the back button from the destination tab leaves the shell at Hub
  // level rather than walking back through Home first.
  const pushTab = (href: string) => {
    ionRouter.push(href, 'none', 'replace')
  }

  const handleSalesClick = () => {
    if (businessId) pushTab(`/${businessId}/sales`)
  }

  const handleProductsClick = () => {
    if (businessId) pushTab(`/${businessId}/products`)
  }

  const handleManageClick = () => {
    if (businessId) pushTab(`/${businessId}/manage`)
  }

  const handleLowStockClick = () => {
    if (businessId) pushTab(`/${businessId}/products?filter=low_stock`)
  }

  const handleOverdueClick = () => {
    if (businessId) pushTab(`/${businessId}/products?tab=orders&filter=overdue`)
  }

  const handlePendingOrdersClick = () => {
    if (businessId) pushTab(`/${businessId}/products?tab=orders`)
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
      <div className="home-tiles">
        <SalesTile
          isOpen={Boolean(currentSession)}
          openedAt={currentSession?.openedAt ?? null}
          runningTotal={sessionRunningTotal}
          itemCount={stats?.todayCount ?? 0}
          avgTicket={stats?.todayAvgTicket ?? null}
          onClick={handleSalesClick}
        />
        <ProductsTile
          productCount={products.length}
          categoryCount={categories.length}
          onClick={handleProductsClick}
        />
        <ManageTile
          providerCount={providers.length}
          role={role}
          onClick={handleManageClick}
        />
      </div>
      <GroupLabel>
        {intl.formatMessage({ id: 'home.section_this_week' })}
      </GroupLabel>
      <WeekTrendCard
        isLoading={!aggregate.isLoaded}
        dailyRevenue={aggregate.data?.dailyRevenue ?? null}
        thisWeekTotal={thisWeekTotal}
        previousWeekTotal={aggregate.data?.previousWeekRevenue ?? null}
        thisWeekSpend={thisWeekSpend}
      />
      <AlertsSection
        lowStockCount={lowStockCount}
        overdueCount={overdueCount}
        pendingOrdersCount={pendingOrdersCount}
        onLowStockClick={handleLowStockClick}
        onOverdueClick={handleOverdueClick}
        onPendingOrdersClick={handlePendingOrdersClick}
      />
    </div>
  )
}
