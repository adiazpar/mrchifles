'use client'

import { useIntl } from 'react-intl'
import { ShoppingCart } from 'lucide-react'
import { FeatureCard } from '@/components/ui'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'

interface ItemsSoldTileProps {
  count: number
  avgTicket: number | null
  onClick: () => void
}

export function ItemsSoldTile({ count, avgTicket, onClick }: ItemsSoldTileProps) {
  const intl = useIntl()
  const { formatCurrency } = useBusinessFormat()

  const kicker = (
    <span className="inline-flex items-center gap-1.5">
      <ShoppingCart style={{ width: 12, height: 12 }} />
      {intl.formatMessage({ id: 'home.items_kicker' })}
    </span>
  )

  return (
    <FeatureCard
      kicker={kicker}
      title={intl.formatMessage({ id: 'home.items_count' }, { count })}
      description={
        avgTicket !== null
          ? intl.formatMessage(
              { id: 'home.items_avg_ticket' },
              { amount: formatCurrency(avgTicket) },
            )
          : undefined
      }
      onClick={onClick}
    />
  )
}
