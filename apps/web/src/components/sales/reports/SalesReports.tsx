'use client'

import { useIntl } from 'react-intl';
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
 * No-session sales-reports surface. Mounts five summary cards in a
 * vertical stack. Owns the aggregate fetch + loading/error states.
 */
export function SalesReports({ businessId }: SalesReportsProps) {
  const t = useIntl()
  const { data, isLoaded, error, refetch } = useSalesAggregate(businessId)

  if (error && !isLoaded) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-error-subtle p-4 text-sm text-error flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="font-medium underline whitespace-nowrap"
          >
            {t.formatMessage({
              id: 'sales.reports.error_retry'
            })}
          </button>
        </div>
        <RecentSessionsCard />
      </div>
    );
  }

  if (!isLoaded || !data) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard height={144} />
        <SkeletonCard height={180} />
        <SkeletonCard height={160} />
        <SkeletonCard height={360} />
        <SkeletonCard height={128} />
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
    <div
      className="card p-4 animate-pulse"
      style={{ height }}
      aria-hidden="true"
    >
      <div className="h-4 w-32 bg-bg-muted rounded mb-3" />
      <div className="flex-1 bg-bg-muted rounded opacity-60" style={{ height: '70%' }} />
    </div>
  )
}
