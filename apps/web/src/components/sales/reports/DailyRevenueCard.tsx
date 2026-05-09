'use client'

import { useIntl } from 'react-intl'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { DailyRevenueEntry } from '@kasero/shared/types/sales-aggregate'

interface DailyRevenueCardProps {
  entries: DailyRevenueEntry[]
}

/**
 * 7-day revenue bar chart. Today is the last entry and renders in
 * terracotta + bold mono; other days render in muted cream blocks
 * with mono numerals above the bar. Days with total = 0 render a
 * thin stub so the time axis stays legible.
 */
export function DailyRevenueCard({ entries }: DailyRevenueCardProps) {
  const t = useIntl()
  const { formatCurrency } = useBusinessFormat()
  // Day-of-week label is LANGUAGE, not formatting — use the user's UI
  // locale so an English UI doesn't show "Lun/Mar/Mié" for a Spanish-
  // locale business.
  const userLocale = t.locale

  const max = entries.reduce((m, e) => (e.total > m ? e.total : m), 0)

  return (
    <section className="report-card">
      <header className="report-card__header">
        <span className="report-card__eyebrow">
          {t.formatMessage({ id: 'sales.reports.daily_revenue_eyebrow' })}
        </span>
        <h3 className="report-card__title">
          {t.formatMessage({ id: 'sales.reports.daily_revenue_title' })}
        </h3>
      </header>
      <div className="daily-revenue-row">
        {entries.map((entry, idx) => {
          const isCurrent = idx === entries.length - 1
          const heightPct =
            max > 0 && entry.total > 0
              ? Math.max(6, (entry.total / max) * 100)
              : 0
          const dayLabel = new Intl.DateTimeFormat(userLocale, {
            weekday: 'short',
            timeZone: 'UTC',
          }).format(new Date(entry.date + 'T00:00:00Z'))
          return (
            <div key={entry.date} className="daily-revenue-col">
              <span
                className={`daily-revenue-col__amount${
                  isCurrent ? ' daily-revenue-col__amount--current' : ''
                }`}
              >
                {formatCurrency(entry.total)}
              </span>
              <div className="daily-revenue-col__bar-track">
                {entry.total > 0 ? (
                  <div
                    className={`daily-revenue-col__bar${
                      isCurrent ? ' daily-revenue-col__bar--current' : ''
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                ) : (
                  <div className="daily-revenue-col__bar daily-revenue-col__bar--empty" />
                )}
              </div>
              <span
                className={`daily-revenue-col__day${
                  isCurrent ? ' daily-revenue-col__day--current' : ''
                }`}
              >
                {dayLabel}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
