'use client'

import { useIntl } from 'react-intl'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'

interface RevenueCardProps {
  isLoading: boolean
  amount: number | null
  vsYesterdayPct: number | null
}

export function RevenueCard({ isLoading, amount, vsYesterdayPct }: RevenueCardProps) {
  const intl = useIntl()
  const { formatCurrency } = useBusinessFormat()

  return (
    <div className="home-revenue">
      <span className="home-revenue__label">
        {intl.formatMessage({ id: 'home.revenue_label' })}
      </span>
      {isLoading || amount === null ? (
        <div className="home-revenue__skeleton" aria-hidden="true" />
      ) : (
        <div className="home-revenue__amount">{formatCurrency(amount)}</div>
      )}
      {!isLoading && amount !== null && vsYesterdayPct !== null ? (
        <DeltaChip percent={vsYesterdayPct} />
      ) : null}
    </div>
  )
}

function DeltaChip({ percent }: { percent: number }) {
  const intl = useIntl()
  const isUp = percent >= 0
  const display = Math.round(percent).toString()
  return (
    <span className={`home-revenue__delta home-revenue__delta--${isUp ? 'up' : 'down'}`}>
      {intl.formatMessage(
        { id: isUp ? 'home.delta_up' : 'home.delta_down' },
        { percent: display },
      )}
    </span>
  )
}
