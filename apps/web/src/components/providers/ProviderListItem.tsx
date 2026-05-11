'use client'

import { useIntl } from 'react-intl'
import { ChevronRight } from 'lucide-react'
import { pickProviderMarkColor } from '@/lib/provider-mark'
import type { Provider } from '@kasero/shared/types'

export function getProviderInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export interface ProviderListItemProps {
  provider: Provider
}

/**
 * Single ledger row in the suppliers roster.
 *
 * Avatar is the unified .pv-mark--sm primitive: rounded square, solid
 * fill driven by `pickProviderMarkColor` (so the same provider keeps the
 * same hue across the list, the detail-page hero, and the delete-confirm
 * specimen). Italic Fraunces name on the top line; mono uppercase caption
 * on the bottom line carries the provider's phone (or "NO PHONE"). Paused
 * providers append "PAUSED" and the whole row dims to 0.55 opacity via
 * the .tm-roster__row--inactive chassis.
 *
 * The row renders as bare markup (no <button>) because the wrapping
 * IonItem owns the click target so IonItemSliding can drive the
 * edit / delete / new-order swipe actions.
 */
export function ProviderListItem({ provider }: ProviderListItemProps) {
  const t = useIntl()

  const isInactive = !provider.active
  const rowClass = isInactive
    ? 'tm-roster__row tm-roster__row--inactive'
    : 'tm-roster__row'

  const phoneLabel =
    provider.phone?.trim() ||
    t.formatMessage({ id: 'providers.roster_no_phone' })

  return (
    <div className={rowClass}>
      <span
        className="pv-mark pv-mark--sm"
        data-active={provider.active}
        style={provider.active ? { background: pickProviderMarkColor(provider.id) } : undefined}
        aria-hidden="true"
      >
        {getProviderInitials(provider.name)}
      </span>

      <span className="tm-roster__row-body">
        <span className="tm-roster__row-name">{provider.name}</span>
        <span className="tm-roster__row-meta">
          <span>{phoneLabel.toUpperCase()}</span>
          {isInactive && (
            <>
              <span className="tm-roster__row-meta-sep" aria-hidden="true">
                ·
              </span>
              <span>
                {t.formatMessage({ id: 'providers.roster_status_inactive' }).toUpperCase()}
              </span>
            </>
          )}
        </span>
      </span>

      <ChevronRight size={16} className="tm-roster__row-chev" aria-hidden="true" />
    </div>
  )
}
