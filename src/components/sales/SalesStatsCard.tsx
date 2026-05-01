'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { History } from 'lucide-react'
import { useBusiness } from '@/contexts/business-context'
import { useSales } from '@/contexts/sales-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { haptic } from '@/lib/haptics'
import { SessionHistoryModal } from '@/components/sales/SessionHistoryModal'

interface SalesStatsCardProps {
  sessionOpen: boolean
  onOpenSession: () => void
  onRequestCloseSession: () => void
}

export function SalesStatsCard({
  sessionOpen,
  onOpenSession,
  onRequestCloseSession,
}: SalesStatsCardProps) {
  const t = useTranslations('sales.stats')
  const tAction = useTranslations('sales.action')
  const { stats } = useSales()
  const { formatCurrency } = useBusinessFormat()
  const { canManage } = useBusiness()
  const [historyOpen, setHistoryOpen] = useState(false)

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
    <>
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
              {!canManage && (
                <div className="text-xs text-text-secondary mt-0.5">
                  {t('employee_open_notice')}
                </div>
              )}
            </div>
          </div>

          {/* Action row: History (circular icon button) anchored left,
              Open Session locked to 50% width on the right — matches the
              compact-state Close Session footprint. Both follow the
              canonical .btn framework. */}
          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              style={{ borderRadius: 'var(--radius-full)' }}
              aria-label={tAction('history')}
              onClick={() => {
                haptic()
                setHistoryOpen(true)
              }}
            >
              <History />
            </button>
            <button
              type="button"
              className="btn btn-primary w-1/2"
              disabled={!canManage}
              onClick={() => {
                haptic()
                onOpenSession()
              }}
            >
              <span>{tAction('open_session')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Compact layout: 50/50 grid — balance value on the left, Close
          button on the right. Session button keeps 1/2 width across both
          states (Open and Close share the same proportion). */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: sessionOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="grid grid-cols-2 gap-2 items-center">
            <div className="text-2xl font-semibold truncate">{revenueLabel}</div>
            <button
              type="button"
              className="btn btn-danger"
              disabled={!canManage}
              onClick={() => {
                haptic()
                onRequestCloseSession()
              }}
            >
              <span>{tAction('close_session')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <SessionHistoryModal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  )
}
