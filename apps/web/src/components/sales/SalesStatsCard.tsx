'use client'

import { useIntl } from 'react-intl';
import { useState } from 'react'
import { History, Receipt } from 'lucide-react'
import { useBusiness } from '@/contexts/business-context'
import { useSales } from '@/contexts/sales-context'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { haptic } from '@/lib/haptics'
import { SessionHistoryModal } from '@/components/sales/SessionHistoryModal'
import { ActiveSessionSalesModal } from '@/components/sales/ActiveSessionSalesModal'

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
  const t = useIntl()
  const tAction = useIntl()
  const { stats, sales } = useSales()
  const { currentSession } = useSalesSessions()
  const { formatCurrency } = useBusinessFormat()
  const { business, canManage } = useBusiness()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sessionSalesOpen, setSessionSalesOpen] = useState(false)

  const sessionSales = currentSession
    ? sales.filter((s) => s.sessionId === currentSession.id)
    : []
  const sessionRevenue = sessionSales.reduce((sum, s) => sum + s.total, 0)
  const sessionCount = sessionSales.length

  const vsLabel = stats
    ? stats.vsYesterdayPct === null
      ? t.formatMessage({
    id: 'sales.stats.no_comparison'
  })
      : stats.vsYesterdayPct >= 0
        ? t.formatMessage({
    id: 'sales.stats.vs_yesterday_up'
  }, { pct: stats.vsYesterdayPct.toFixed(1) })
        : t.formatMessage({
    id: 'sales.stats.vs_yesterday_down'
  }, { pct: stats.vsYesterdayPct.toFixed(1) })
    : t.formatMessage({
    id: 'sales.stats.no_comparison'
  })

  const vsColor =
    !stats || stats.vsYesterdayPct === null
      ? 'text-text-secondary'
      : stats.vsYesterdayPct >= 0
        ? 'text-success'
        : 'text-error'

  const revenueLabel = stats ? formatCurrency(stats.todayRevenue) : t.formatMessage({
    id: 'sales.stats.no_comparison'
  })

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
              {t.formatMessage({
                id: 'sales.stats.today'
              })}
            </div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6">
              <div>
                <div className="text-2xl font-semibold">{revenueLabel}</div>
                <div className="text-xs text-text-secondary mt-0.5">{t.formatMessage({
                  id: 'sales.stats.today_revenue'
                })}</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {stats ? stats.todayCount : t.formatMessage({
                    id: 'sales.stats.no_comparison'
                  })}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">{t.formatMessage({
                  id: 'sales.stats.today_count'
                })}</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {stats && stats.todayAvgTicket !== null
                    ? formatCurrency(stats.todayAvgTicket)
                    : t.formatMessage({
                    id: 'sales.stats.no_comparison'
                  })}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">{t.formatMessage({
                  id: 'sales.stats.avg_ticket'
                })}</div>
              </div>
              <div>
                <div className={`text-2xl font-semibold ${vsColor}`}>{vsLabel}</div>
                {!canManage && (
                  <div className="text-xs text-text-secondary mt-0.5">
                    {t.formatMessage({
                      id: 'sales.stats.employee_open_notice'
                    })}
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
                aria-label={tAction.formatMessage({
                  id: 'sales.action.history'
                })}
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
                <span>{tAction.formatMessage({
                  id: 'sales.action.open_session'
                })}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Compact layout: a small label row showing live session metrics
            sits above an action row that mirrors the open-state header
            (icon-left + 1/2 width primary action on the right). The
            Receipt icon button slots into the same anchor as History does
            when the session is closed — same affordance, same location,
            state-aware in meaning. */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: sessionOpen ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden min-h-0">
            <div className="flex items-center justify-between mb-3 text-sm text-text-secondary">
              <span>{t.formatMessage({
                id: 'sales.stats.session_sales_count'
              }, { count: sessionCount })}</span>
              <span>
                {t.formatMessage({
                  id: 'sales.stats.session_total_label'
                }, { value: formatCurrency(sessionRevenue) })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                style={{ borderRadius: 'var(--radius-full)' }}
                aria-label={tAction.formatMessage({
                  id: 'sales.action.view_session_sales'
                })}
                onClick={() => {
                  haptic()
                  setSessionSalesOpen(true)
                }}
              >
                <Receipt className="text-success" />
              </button>
              <button
                type="button"
                className="btn btn-danger w-1/2"
                disabled={!canManage}
                onClick={() => {
                  haptic()
                  onRequestCloseSession()
                }}
              >
                <span>{tAction.formatMessage({
                  id: 'sales.action.close_session'
                })}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <SessionHistoryModal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
      <ActiveSessionSalesModal
        isOpen={sessionSalesOpen}
        onClose={() => setSessionSalesOpen(false)}
        businessId={business?.id ?? ''}
      />
    </>
  );
}
