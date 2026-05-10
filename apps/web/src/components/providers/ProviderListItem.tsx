'use client'

import { useIntl } from 'react-intl'
import { ChevronRight } from 'lucide-react'
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
 * Mirrors the team's TeamMemberListItem primitive: 36px terracotta avatar
 * (initials) → italic Fraunces name on the top line → mono uppercase
 * caption on the bottom line. The caption carries the provider's phone, or
 * "NO PHONE" when missing; paused providers append "PAUSED" and the whole
 * row dims to 0.55 opacity, matching the disabled-member treatment on the
 * team page.
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
      <span className="tm-roster__avatar" aria-hidden="true">
        <span>{getProviderInitials(provider.name)}</span>
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
