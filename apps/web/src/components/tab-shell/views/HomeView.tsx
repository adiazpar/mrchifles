'use client'

import { useEffect, useMemo } from 'react'
import { useIntl } from 'react-intl'
import { useBusiness } from '@/contexts/business-context'
import { useSales } from '@/contexts/sales-context'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { usePageTransition } from '@/contexts/page-transition-context'
import { GroupLabel } from '@/components/ui'
import {
  HomeHero,
  RevenueCard,
  SessionTile,
  ItemsSoldTile,
} from '@/components/home'

export function HomeView() {
  const intl = useIntl()
  const { businessId } = useBusiness()
  const { sales, stats, isLoaded: salesLoaded, ensureLoaded: ensureSalesLoaded } = useSales()
  const {
    currentSession,
    ensureLoaded: ensureSessionsLoaded,
  } = useSalesSessions()
  const { navigate } = usePageTransition()

  useEffect(() => {
    if (!businessId) return
    void ensureSalesLoaded()
    void ensureSessionsLoaded()
  }, [businessId, ensureSalesLoaded, ensureSessionsLoaded])

  // Mirror SalesStatsCard.tsx — open-session running total is computed
  // from the sales list, not currentSession.salesTotal (which is nullable
  // on the wire and not kept live for the open session).
  const sessionRunningTotal = useMemo(() => {
    if (!currentSession) return 0
    return sales
      .filter((s) => s.sessionId === currentSession.id)
      .reduce((sum, s) => sum + s.total, 0)
  }, [sales, currentSession])

  const handleSalesClick = () => {
    if (businessId) navigate(`/${businessId}/sales`)
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
    </div>
  )
}
