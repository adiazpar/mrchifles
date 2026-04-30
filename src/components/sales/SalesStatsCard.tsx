'use client'

import { useTranslations } from 'next-intl'
import { History, Wallet } from 'lucide-react'
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
  // Industry pattern (Square POS, Loyverse, Lightspeed, Shopify): a single
  // static "money/session" icon, with state conveyed by the button color
  // (btn-primary when ready to open, btn-danger when ready to close) and
  // the label, NOT by swapping the icon.
  const SessionIcon = Wallet

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

  const revenueLabel = stats ? formatCurrency(stats.todayRevenue) : t('no_comparison')

  return (
    <div className="rounded-xl border border-border bg-bg-surface p-4">
      {/* Expanded layout: TODAY label + 4-stat grid + History/Open buttons.
          Uses the grid-template-rows 1fr ↔ 0fr collapse technique so the
          card auto-heights smoothly when sessionOpen flips. */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: sessionOpen ? '0fr' : '1fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="text-xs uppercase tracking-wide text-text-secondary mb-3">
            {t('today')}
          </div>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6">
            <div>
              <div className="text-2xl font-semibold">{revenueLabel}</div>
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

          {/* Action row: History + Open Session. */}
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
              <span>{tAction('open_session')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Compact layout: revenue in the first 1/3 column (where History
          lives in the full layout) + Close button in cols 2-3 (same
          col-span-2 as the Open button above), so the session button
          stays the exact same width between states. */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: sessionOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="grid grid-cols-3 gap-2 items-center">
            <div>
              <div className="text-2xl font-semibold truncate">{revenueLabel}</div>
              <div className="text-xs text-text-secondary mt-0.5">{t('balance')}</div>
            </div>
            <button
              type="button"
              className="btn btn-danger col-span-2"
              style={COMPACT_BUTTON_STYLE}
              onClick={onToggleSession}
            >
              <SessionIcon className="w-4 h-4" />
              <span>{tAction('close_session')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
