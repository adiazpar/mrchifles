'use client'

import { useTranslations } from 'next-intl'
import { useSalesAggregate } from '@/hooks/useSalesAggregate'
import { DailyRevenueCard } from './DailyRevenueCard'
import { RecentSessionsCard } from './RecentSessionsCard'

interface SalesReportsProps {
  businessId: string
}

/**
 * No-session sales-reports surface. Mounts five summary cards in a
 * vertical stack. Owns the aggregate fetch + loading/error states.
 * Placeholder cards (Tasks 7-11 fill these in).
 */
export function SalesReports({ businessId }: SalesReportsProps) {
  const t = useTranslations('sales.reports')
  const { data, isLoaded, error, refetch } = useSalesAggregate(businessId)

  if (error && !isLoaded) {
    return (
      <div className="rounded-lg bg-error-subtle p-4 text-sm text-error flex items-center justify-between gap-3">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="font-medium underline whitespace-nowrap"
        >
          {t('error_retry')}
        </button>
      </div>
    )
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
      {/* Card slots — Tasks 7-11 replace these placeholders. */}
      <DailyRevenueCard entries={data.dailyRevenue} />
      <RecentSessionsCard />
      <PlaceholderCard label="Payment split (Task 9)" />
      <PlaceholderCard label="Top products (Task 10)" />
      <PlaceholderCard label="Hourly distribution (Task 11)" />
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

function PlaceholderCard({ label }: { label: string }) {
  return (
    <div className="card p-4 text-sm text-text-tertiary">{label}</div>
  )
}
