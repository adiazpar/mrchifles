'use client'

import { useTranslations } from 'next-intl'
import { History, Power, PowerOff } from 'lucide-react'
import { useSales } from '@/contexts/sales-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'

interface SalesStatsCardProps {
  compact: boolean
  sessionOpen: boolean
  onToggleSession: () => void
}

// Compact button override style — matches the established pattern used by
// the in-card action buttons in ProvidersView so a row of buttons fits
// comfortably inside a card without inheriting the full touch-target size.
const COMPACT_BUTTON_STYLE = {
  fontSize: 'var(--text-sm)',
  padding: 'var(--space-2) var(--space-3)',
  minHeight: 'unset',
  gap: 'var(--space-2)',
} as const

export function SalesStatsCard({
  compact,
  sessionOpen,
  onToggleSession,
}: SalesStatsCardProps) {
  const t = useTranslations('sales.stats')
  const tAction = useTranslations('sales.action')
  const { stats } = useSales()
  const { formatCurrency } = useBusinessFormat()
  const SessionIcon = sessionOpen ? PowerOff : Power

  if (compact) {
    if (!stats) {
      return (
        <div
          className="rounded-xl border border-border bg-bg-surface px-4 py-2 text-sm text-text-secondary"
          aria-hidden="true"
        />
      )
    }
    return (
      <div className="rounded-xl border border-border bg-bg-surface px-4 py-2 text-sm text-text-secondary flex items-center gap-3">
        <span>{t('today')}: {formatCurrency(stats.todayRevenue)}</span>
        <span aria-hidden="true">·</span>
        <span>{stats.todayCount} {t('today_count').toLowerCase()}</span>
      </div>
    )
  }

  const vsLabel = stats
    ? stats.vsYesterdayPct === null
      ? t('no_comparison')
      : stats.vsYesterdayPct >= 0
        ? t('vs_yesterday_up', { pct: stats.vsYesterdayPct.toFixed(1) })
        : t('vs_yesterday_down', { pct: stats.vsYesterdayPct.toFixed(1) })
    : t('no_comparison')

  const vsColor =
    !stats || stats.vsYesterdayPct === null
      ? 'text-text-secondary'
      : stats.vsYesterdayPct >= 0
        ? 'text-success'
        : 'text-error'

  return (
    <div className="rounded-xl border border-border bg-bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-text-secondary mb-3">
        {t('today')}
      </div>
      <div className="grid grid-cols-2 gap-y-3 gap-x-6">
        <div>
          <div className="text-2xl font-semibold">
            {stats ? formatCurrency(stats.todayRevenue) : t('no_comparison')}
          </div>
          <div className="text-xs text-text-secondary mt-0.5">{t('today_revenue')}</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">
            {stats ? stats.todayCount : t('no_comparison')}
          </div>
          <div className="text-xs text-text-secondary mt-0.5">{t('today_count')}</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">
            {stats && stats.todayAvgTicket !== null
              ? formatCurrency(stats.todayAvgTicket)
              : t('no_comparison')}
          </div>
          <div className="text-xs text-text-secondary mt-0.5">{t('avg_ticket')}</div>
        </div>
        <div>
          <div className={`text-2xl font-semibold ${vsColor}`}>{vsLabel}</div>
        </div>
      </div>

      {/* Bottom action row: 1/3 History, 2/3 Open/Close cash session (rightmost). */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <button
          type="button"
          className="btn btn-secondary"
          style={COMPACT_BUTTON_STYLE}
          onClick={() => {
            /* placeholder — wired up when history is rebuilt under the cash-session model */
          }}
        >
          <History className="w-4 h-4" />
          <span>{tAction('history')}</span>
        </button>
        <button
          type="button"
          className="btn btn-primary col-span-2"
          style={COMPACT_BUTTON_STYLE}
          onClick={onToggleSession}
        >
          <SessionIcon className="w-4 h-4" />
          <span>{sessionOpen ? tAction('close_session') : tAction('open_session')}</span>
        </button>
      </div>
    </div>
  )
}
