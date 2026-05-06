'use client'

import { useIntl } from 'react-intl';
import type { HourlyEntry } from '@kasero/shared/types/sales-aggregate'

interface HourlyDistributionCardProps {
  entries: HourlyEntry[]
}

/**
 * 24-bar chart of revenue by hour-of-day, aggregated across the last
 * 7 days (UTC). The hour with the highest total renders in brand color;
 * all others render muted. Hour labels at 12am / 6am / 12pm / 6pm via
 * an aligned 4-column grid below the bar row.
 */
export function HourlyDistributionCard({ entries }: HourlyDistributionCardProps) {
  const t = useIntl()

  const max = entries.reduce((m, e) => (e.total > m ? e.total : m), 0)
  const peakIdx = entries.findIndex((e) => e.total === max && max > 0)

  return (
    <div className="card p-4 space-y-4">
      <div className="text-sm text-text-secondary">{t.formatMessage({
        id: 'sales.reports.hourly_title'
      })}</div>
      <hr className="border-border" />
      {max === 0 ? (
        <p className="text-sm text-text-tertiary text-center py-4">
          {t.formatMessage({
            id: 'sales.reports.hourly_no_data'
          })}
        </p>
      ) : (
        <>
          <div className="flex items-end gap-px h-32">
            {entries.map((e, idx) => {
              const heightPct = max > 0 && e.total > 0 ? (e.total / max) * 100 : 0
              const isPeak = idx === peakIdx
              return (
                <div
                  key={e.hour}
                  className={`flex-1 rounded-sm ${
                    isPeak ? 'bg-brand' : 'bg-bg-muted'
                  }`}
                  style={{
                    height: e.total > 0 ? `${heightPct}%` : '3px',
                    minHeight: '3px',
                  }}
                  aria-hidden="true"
                />
              )
            })}
          </div>
          <div className="grid grid-cols-4 text-xs text-text-tertiary">
            <span className="text-left">{t.formatMessage({
              id: 'sales.reports.hourly_label_12am'
            })}</span>
            <span className="text-left">{t.formatMessage({
              id: 'sales.reports.hourly_label_6am'
            })}</span>
            <span className="text-left">{t.formatMessage({
              id: 'sales.reports.hourly_label_12pm'
            })}</span>
            <span className="text-left">{t.formatMessage({
              id: 'sales.reports.hourly_label_6pm'
            })}</span>
          </div>
        </>
      )}
    </div>
  );
}
