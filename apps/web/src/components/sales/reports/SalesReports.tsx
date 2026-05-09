'use client'

import { useIntl } from 'react-intl'
import { useSalesAggregate } from '@/hooks/useSalesAggregate'
import { DailyRevenueCard } from './DailyRevenueCard'
import { RecentSessionsCard } from './RecentSessionsCard'
import { PaymentSplitCard } from './PaymentSplitCard'
import { TopProductsCard } from './TopProductsCard'
import { HourlyDistributionCard } from './HourlyDistributionCard'

interface SalesReportsProps {
  businessId: string
}

/**
 * No-session sales-reports surface. Five cards stacked vertically that
 * read as pages of a single printed report — same chrome shell, mono
 * uppercase eyebrow above a Fraunces italic title, then the chart or
 * list. Owns the aggregate fetch + loading/error states.
 */
export function SalesReports({ businessId }: SalesReportsProps) {
  const t = useIntl()
  const { data, isLoaded, error, refetch } = useSalesAggregate(businessId)

  if (error && !isLoaded) {
    return (
      <div className="flex flex-col gap-4">
        <div className="report-card__error">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="report-card__error-retry"
          >
            {t.formatMessage({ id: 'sales.reports.error_retry' })}
          </button>
        </div>
        <RecentSessionsCard />
      </div>
    )
  }

  if (!isLoaded || !data) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard height={184} />
        <SkeletonCard height={220} />
        <SkeletonCard height={188} />
        <SkeletonCard height={360} />
        <SkeletonCard height={172} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <DailyRevenueCard entries={data.dailyRevenue} />
      <RecentSessionsCard />
      <PaymentSplitCard split={data.paymentSplit} />
      <TopProductsCard entries={data.topProducts} />
      <HourlyDistributionCard entries={data.hourly} />
    </div>
  )
}

function SkeletonCard({ height }: { height: number }) {
  return (
    <div className="report-skeleton" style={{ height }} aria-hidden="true">
      <div className="report-skeleton__bar" style={{ height: 10, width: 80 }} />
      <div className="report-skeleton__bar" style={{ height: 18, width: 160 }} />
      <div className="report-skeleton__bar" style={{ flex: 1 }} />
    </div>
  )
}
