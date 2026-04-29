'use client'

import { useTranslations } from 'next-intl'
import { useSales } from '@/contexts/sales-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'

interface SalesStatsCardProps {
  compact: boolean
}

export function SalesStatsCard({ compact }: SalesStatsCardProps) {
  const t = useTranslations('sales.stats')
  const { stats } = useSales()
  const { formatCurrency } = useBusinessFormat()

  if (!stats) {
    // Render an empty placeholder card with the same outer dimensions as
    // the loaded state so the layout doesn't reflow when stats arrive.
    return (
      <div
        className={
          compact
            ? 'rounded-xl border border-border bg-bg-elevated px-4 py-2 text-sm text-text-secondary'
            : 'rounded-xl border border-border bg-bg-elevated p-4 min-h-[140px]'
        }
        aria-hidden="true"
      />
    )
  }

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-bg-elevated px-4 py-2 text-sm text-text-secondary flex items-center gap-3">
        <span>{t('today')}: {formatCurrency(stats.todayRevenue)}</span>
        <span aria-hidden="true">·</span>
        <span>{stats.todayCount} {t('today_count').toLowerCase()}</span>
      </div>
    )
  }

  const vsLabel = (() => {
    if (stats.vsYesterdayPct === null) return t('no_comparison')
    if (stats.vsYesterdayPct >= 0) return t('vs_yesterday_up', { pct: stats.vsYesterdayPct.toFixed(1) })
    return t('vs_yesterday_down', { pct: stats.vsYesterdayPct.toFixed(1) })
  })()
  const vsColor =
    stats.vsYesterdayPct === null
      ? 'text-text-secondary'
      : stats.vsYesterdayPct >= 0
        ? 'text-success'
        : 'text-error'

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wide text-text-secondary mb-3">{t('today')}</div>
      <div className="grid grid-cols-2 gap-y-3 gap-x-6">
        <div>
          <div className="text-2xl font-semibold">{formatCurrency(stats.todayRevenue)}</div>
          <div className="text-xs text-text-secondary mt-0.5">{t('today_revenue')}</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">{stats.todayCount}</div>
          <div className="text-xs text-text-secondary mt-0.5">{t('today_count')}</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">
            {stats.todayAvgTicket !== null ? formatCurrency(stats.todayAvgTicket) : t('no_comparison')}
          </div>
          <div className="text-xs text-text-secondary mt-0.5">{t('avg_ticket')}</div>
        </div>
        <div>
          <div className={`text-2xl font-semibold ${vsColor}`}>{vsLabel}</div>
        </div>
      </div>
    </div>
  )
}
