'use client'

import { useIntl } from 'react-intl'
import { ShoppingCart } from 'lucide-react'
import { FeatureCard } from '@/components/ui'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'

interface SalesTileProps {
  isOpen: boolean
  openedAt: string | null
  runningTotal: number
  itemCount: number
  avgTicket: number | null
  onClick: () => void
}

/**
 * Sales tile — consolidates session state, running total, item count, and
 * average ticket into a single full-width FeatureCard. Taps swap to the
 * Sales tab (handled by HomeView via useIonRouter, not by this tile).
 *
 * The kicker icon matches the bottom-tab Sales glyph (ShoppingCart) so the
 * visual mapping between the Home tile and its destination is immediate.
 *
 * When the session is closed, both the "since {time}" cell and the
 * running-total cell collapse — there's no meaningful "since" anchor and
 * no running total to show. The closed-state description is a single
 * call to action so the tile reads as an invitation, not a placeholder.
 */
export function SalesTile({
  isOpen,
  openedAt,
  runningTotal,
  itemCount,
  avgTicket,
  onClick,
}: SalesTileProps) {
  const intl = useIntl()
  const { formatCurrency, formatTime } = useBusinessFormat()

  const kicker = (
    <span className="inline-flex items-center gap-1.5">
      <ShoppingCart style={{ width: 12, height: 12 }} />
      {intl.formatMessage({ id: 'home.sales_tile_kicker' })}
    </span>
  )

  if (isOpen && openedAt) {
    // Pick the four-cell or three-cell description based on whether we
    // have an average ticket to show. We don't show "$0 avg" because it
    // reads as a complete cell with no signal — better to drop it.
    const descriptionId =
      avgTicket !== null
        ? 'home.sales_tile_open_description'
        : 'home.sales_tile_open_description_no_avg'

    const descriptionValues =
      avgTicket !== null
        ? {
            time: formatTime(new Date(openedAt)),
            amount: formatCurrency(runningTotal),
            count: itemCount,
            avgTicket: formatCurrency(avgTicket),
          }
        : {
            time: formatTime(new Date(openedAt)),
            amount: formatCurrency(runningTotal),
            count: itemCount,
          }

    return (
      <FeatureCard
        kicker={kicker}
        title={intl.formatMessage({ id: 'home.session_open_title' })}
        description={intl.formatMessage({ id: descriptionId }, descriptionValues)}
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
