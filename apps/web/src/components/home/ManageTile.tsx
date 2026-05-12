'use client'

import { useIntl } from 'react-intl'
import { Settings } from 'lucide-react'
import { FeatureCard } from '@/components/ui'

interface ManageTileProps {
  providerCount: number
  role: 'owner' | 'manager' | 'employee'
  onClick: () => void
}

/**
 * Manage tile — provider count + a role-identity description. Full-width
 * FeatureCard. The kicker icon matches the bottom-tab Manage glyph
 * (Settings). Taps swap to the Manage tab (handled by HomeView via
 * useIonRouter).
 *
 * Role copy is short and warm rather than terse — this is the tile that
 * tells the user who they are inside this business, so the voice is
 * personal ("This is your business" / "You run most of this place")
 * rather than technical ("Owner permissions" / "Read/write access").
 */
export function ManageTile({ providerCount, role, onClick }: ManageTileProps) {
  const intl = useIntl()

  const kicker = (
    <span className="inline-flex items-center gap-1.5">
      <Settings style={{ width: 12, height: 12 }} />
      {intl.formatMessage({ id: 'home.manage_tile_kicker' })}
    </span>
  )

  const descriptionId =
    role === 'owner'
      ? 'home.manage_tile_description_owner'
      : role === 'manager'
      ? 'home.manage_tile_description_manager'
      : 'home.manage_tile_description_employee'

  return (
    <FeatureCard
      kicker={kicker}
      title={intl.formatMessage(
        { id: 'home.manage_tile_title' },
        { count: providerCount },
      )}
      description={intl.formatMessage({ id: descriptionId })}
      onClick={onClick}
    />
  )
}
