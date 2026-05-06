'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { haptic } from '@/lib/haptics'
import { SessionHistoryModal } from '@/components/sales/SessionHistoryModal'

/**
 * Up to three most-recent closed sessions. Each row + the "View all"
 * footer link opens the existing SessionHistoryModal at step 0.
 * Drilling directly into a session's detail step would require lifting
 * setSelectedSessionId externally; deferred for v2.
 */
export function RecentSessionsCard() {
  const t = useTranslations('sales.reports')
  const { sessions } = useSalesSessions()
  const { formatCurrency, formatDate } = useBusinessFormat()
  const [historyOpen, setHistoryOpen] = useState(false)

  const recent = sessions.slice(0, 3)

  return (
    <>
      <div className="card p-4 space-y-4">
        <div className="text-sm text-text-secondary">
          {t('recent_sessions_title')}
        </div>
        <hr className="border-border" />
        {recent.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-2">
            {t('recent_sessions_empty')}
          </p>
        ) : (
          <div className="space-y-2">
            {recent.map((s) => {
              const variance = s.variance ?? 0
              const varianceColor = variance === 0 ? 'text-success' : 'text-error'
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    haptic()
                    setHistoryOpen(true)
                  }}
                  className="w-full text-left rounded-lg border border-border p-3 transition-colors hover:bg-bg-base flex items-center justify-between gap-3"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">
                      {formatDate(new Date(s.openedAt))}
                    </span>
                    <span className="text-xs text-text-tertiary tabular-nums">
                      {t('recent_sessions_count', { count: s.salesCount ?? 0 })}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(s.salesTotal ?? 0)}
                    </span>
                    <span className={`text-xs tabular-nums ${varianceColor}`}>
                      {formatCurrency(variance)}
                    </span>
                  </div>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => {
                haptic()
                setHistoryOpen(true)
              }}
              className="w-full text-center text-sm text-brand font-medium py-1"
            >
              {t('recent_sessions_view_all')}
            </button>
          </div>
        )}
      </div>
      <SessionHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  )
}
