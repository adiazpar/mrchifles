'use client'

import { useIntl } from 'react-intl'
import { Wallet } from 'lucide-react'
import { FeatureCard } from '@/components/ui'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'

interface SessionTileProps {
  isOpen: boolean
  openedAt: string | null
  runningTotal: number
  onClick: () => void
}

export function SessionTile({ isOpen, openedAt, runningTotal, onClick }: SessionTileProps) {
  const intl = useIntl()
  const { formatCurrency, formatTime } = useBusinessFormat()

  const kicker = (
    <span className="inline-flex items-center gap-1.5">
      <Wallet style={{ width: 12, height: 12 }} />
      {intl.formatMessage({ id: 'home.session_kicker' })}
    </span>
  )

  if (isOpen && openedAt) {
    return (
      <FeatureCard
        kicker={kicker}
        title={intl.formatMessage({ id: 'home.session_open_title' })}
        description={intl.formatMessage(
          { id: 'home.session_open_description' },
          {
            time: formatTime(new Date(openedAt)),
            amount: formatCurrency(runningTotal),
          },
        )}
        onClick={onClick}
      />
    )
  }

  return (
    <FeatureCard
      kicker={kicker}
      title={intl.formatMessage({ id: 'home.session_closed_title' })}
      description={intl.formatMessage({ id: 'home.session_closed_description' })}
      onClick={onClick}
    />
  )
}
