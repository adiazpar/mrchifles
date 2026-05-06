'use client'

import { useIntl } from 'react-intl';
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { PaymentSplit } from '@kasero/shared/types/sales-aggregate'

interface PaymentSplitCardProps {
  split: PaymentSplit
}

interface Segment {
  key: 'cash' | 'card' | 'other'
  amount: number
  color: string
  i18nKey: 'modal_method_cash' | 'modal_method_card' | 'modal_method_other'
}

/**
 * Hand-rolled SVG donut. Three concentric arcs drawn via stroke-dasharray
 * on a single circle path with rotated <circle> elements (one per
 * segment). Legend on the right with swatch + label + amount + percent.
 */
export function PaymentSplitCard({ split }: PaymentSplitCardProps) {
  const t = useIntl()
  const tMethod = useIntl()
  const { formatCurrency } = useBusinessFormat()

  const total = split.cash + split.card + split.other

  const segments: Segment[] = [
    { key: 'cash', amount: split.cash, color: 'var(--color-success)', i18nKey: 'modal_method_cash' },
    { key: 'card', amount: split.card, color: 'var(--color-brand)', i18nKey: 'modal_method_card' },
    { key: 'other', amount: split.other, color: 'var(--color-text-secondary)', i18nKey: 'modal_method_other' },
  ]

  return (
    <div className="card p-4 space-y-4">
      <div className="text-sm text-text-secondary">{t.formatMessage({
        id: 'sales.reports.payment_split_title'
      })}</div>
      <hr className="border-border" />
      {total === 0 ? (
        <p className="text-sm text-text-tertiary text-center py-4">
          {t.formatMessage({
            id: 'sales.reports.payment_split_no_data'
          })}
        </p>
      ) : (
        <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
          <Donut segments={segments} total={total} />
          <div className="space-y-2">
            {segments.map((seg) => {
              const pct = total > 0 ? Math.round((seg.amount / total) * 100) : 0
              return (
                <div key={seg.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: seg.color }}
                  />
                  <span className="flex-1 truncate">{tMethod.formatMessage({
                    id: 'sales.cart.' + seg.i18nKey
                  })}</span>
                  <span className="text-text-secondary tabular-nums">
                    {formatCurrency(seg.amount)}
                  </span>
                  <span className="text-text-tertiary tabular-nums w-10 text-right">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface DonutProps {
  segments: Segment[]
  total: number
}

/**
 * SVG donut: each segment is a <circle> with stroke-dasharray that
 * represents only its arc fraction of the circumference, and a
 * stroke-dashoffset that rotates it to start at the cumulative offset
 * of preceding segments. Center hole achieved via `fill="none"` + the
 * stroke-only treatment.
 */
function Donut({ segments, total }: DonutProps) {
  const radius = 38
  const stroke = 14
  const circumference = 2 * Math.PI * radius

  let cumulative = 0
  const arcs = segments.map((seg) => {
    const fraction = total > 0 ? seg.amount / total : 0
    const arcLength = fraction * circumference
    const arc = (
      <circle
        key={seg.key}
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={seg.color}
        strokeWidth={stroke}
        strokeDasharray={`${arcLength} ${circumference - arcLength}`}
        strokeDashoffset={-cumulative}
        // Rotate -90deg so the first arc starts at 12 o'clock instead of 3.
        transform="rotate(-90 50 50)"
      />
    )
    cumulative += arcLength
    return arc
  })

  return (
    <svg viewBox="0 0 100 100" width="120" height="120" aria-hidden="true">
      {arcs}
    </svg>
  )
}
