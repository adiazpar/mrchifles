'use client'

import { useTranslations } from 'next-intl'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { DailyRevenueEntry } from '@/types/sales-aggregate'

interface DailyRevenueCardProps {
  entries: DailyRevenueEntry[]
}

/**
 * 7-day revenue bar chart. Today is the last entry (highest index) and
 * renders in brand color; other days render muted. Days with total = 0
 * render a thin stub so the time axis stays legible. Mirrors the
 * provider-detail monthly-spend chart pattern.
 */
export function DailyRevenueCard({ entries }: DailyRevenueCardProps) {
  const t = useTranslations('sales.reports')
  const { formatCurrency } = useBusinessFormat()

  const max = entries.reduce((m, e) => (e.total > m ? e.total : m), 0)

  return (
    <div className="card p-4 space-y-4">
      <div className="text-sm text-text-secondary">{t('daily_revenue_title')}</div>
      <hr className="border-border" />
      <div className="flex items-stretch gap-2 h-36">
        {entries.map((entry, idx) => {
          const isCurrent = idx === entries.length - 1
          const heightPct =
            max > 0 && entry.total > 0
              ? Math.max(6, (entry.total / max) * 100)
              : 0
          // Day-of-week label from the entry's UTC date.
          const dayLabel = new Intl.DateTimeFormat(undefined, {
            weekday: 'short',
            timeZone: 'UTC',
          }).format(new Date(entry.date + 'T00:00:00Z'))
          return (
            <div
              key={entry.date}
              className="flex-1 flex flex-col items-center min-w-0"
            >
              <span
                className={`text-xs tabular-nums truncate ${
                  isCurrent ? 'text-brand font-semibold' : 'text-text-tertiary'
                }`}
              >
                {formatCurrency(entry.total)}
              </span>
              <div className="flex-1 w-full flex items-end py-1">
                {entry.total > 0 ? (
                  <div
                    className={`w-full rounded-lg ${
                      isCurrent ? 'bg-brand' : 'bg-bg-muted'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                ) : (
                  <div className="w-full h-[3px] rounded-full bg-bg-muted opacity-60" />
                )}
              </div>
              <span
                className={`text-xs mt-1 truncate ${
                  isCurrent ? 'text-brand font-semibold' : 'text-text-tertiary'
                }`}
              >
                {dayLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
