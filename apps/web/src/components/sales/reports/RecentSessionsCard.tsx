'use client'

import { useIntl } from 'react-intl'
import { useState } from 'react'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { haptic } from '@/lib/haptics'
import { SessionHistoryModal } from '@/components/sales/SessionHistoryModal'

/**
 * Up to three most-recent closed sessions. Italic Fraunces date,
 * mono uppercase transaction count, mono total, variance chip
 * (green when zero, red otherwise). The "View all" footer link and
 * any row tap opens SessionHistoryModal at step 0.
 */
export function RecentSessionsCard() {
  const t = useIntl()
  const { sessions } = useSalesSessions()
  const { formatCurrency, formatDate } = useBusinessFormat()
  const [historyOpen, setHistoryOpen] = useState(false)

  const recent = sessions.slice(0, 3)

  return (
    <>
      <section className="report-card">
        <header className="report-card__header">
          <span className="report-card__eyebrow">
            {t.formatMessage({ id: 'sales.reports.recent_sessions_eyebrow' })}
          </span>
          <h3 className="report-card__title">
            {t.formatMessage({ id: 'sales.reports.recent_sessions_title' })}
          </h3>
        </header>
        {recent.length === 0 ? (
          <p className="report-card__empty">
            {t.formatMessage({ id: 'sales.reports.recent_sessions_empty' })}
          </p>
        ) : (
          <div className="recent-sessions-list">
            {recent.map((s) => {
              const variance = s.variance ?? 0
              const varianceClass =
                variance === 0
                  ? 'recent-session-row__variance recent-session-row__variance--zero'
                  : 'recent-session-row__variance recent-session-row__variance--off'
              return (
                <button
                  key={s.id}
                  type="button"
                  className="recent-session-row"
                  onClick={() => {
                    haptic()
                    setHistoryOpen(true)
                  }}
                >
                  <div className="recent-session-row__lead">
                    <span className="recent-session-row__date">
                      {formatDate(new Date(s.openedAt))}
                    </span>
                    <span className="recent-session-row__count">
                      {t.formatMessage(
                        { id: 'sales.reports.recent_sessions_count' },
                        { count: s.salesCount ?? 0 },
                      )}
                    </span>
                  </div>
                  <div className="recent-session-row__trail">
                    <span className="recent-session-row__total">
                      {formatCurrency(s.salesTotal ?? 0)}
                    </span>
                    <span className={varianceClass}>
                      {formatCurrency(variance)}
                    </span>
                  </div>
                </button>
              )
            })}
            <button
              type="button"
              className="recent-sessions-view-all"
              onClick={() => {
                haptic()
                setHistoryOpen(true)
              }}
            >
              {t.formatMessage({ id: 'sales.reports.recent_sessions_view_all' })}
            </button>
          </div>
        )}
      </section>
      <SessionHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  )
}
