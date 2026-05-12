'use client'

import { useIntl } from 'react-intl'
import { Package } from 'lucide-react'
import { FeatureCard } from '@/components/ui'

interface ProductsTileProps {
  productCount: number
  categoryCount: number
  onClick: () => void
}

/**
 * Products tile — count of products in the catalog with a secondary
 * category-count cell. Full-width FeatureCard. The kicker icon matches
 * the bottom-tab Products glyph (Package). Taps swap to the Products
 * tab (handled by HomeView via useIonRouter).
 *
 * Empty-state copy is handled in the ICU plural via the =0 clause so a
 * brand-new business reads as "0 products · No categories yet" rather
 * than a curt "0 products · 0 categories".
 */
export function ProductsTile({
  productCount,
  categoryCount,
  onClick,
}: ProductsTileProps) {
  const intl = useIntl()

  const kicker = (
    <span className="inline-flex items-center gap-1.5">
      <Package style={{ width: 12, height: 12 }} />
      {intl.formatMessage({ id: 'home.products_tile_kicker' })}
    </span>
  )

  return (
    <FeatureCard
      kicker={kicker}
      title={intl.formatMessage(
        { id: 'home.products_tile_title' },
        { count: productCount },
      )}
      description={intl.formatMessage(
        { id: 'home.products_tile_description' },
        { count: categoryCount },
      )}
      onClick={onClick}
    />
  )
}
