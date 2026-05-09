'use client'

import { useIntl } from 'react-intl'
import Image from '@/lib/Image'
import { useMemo } from 'react'
import { Package } from 'lucide-react'
import { useProducts } from '@/contexts/products-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { getProductIconUrl } from '@/lib/utils'
import { getPresetIcon, isPresetIcon } from '@/lib/preset-icons'
import type { Product } from '@kasero/shared/types'
import type { TopProductEntry } from '@kasero/shared/types/sales-aggregate'

interface TopProductsCardProps {
  entries: TopProductEntry[]
}

/**
 * Ranked list of top-selling products by revenue. Each row carries a
 * Fraunces italic rank numeral (terracotta on rank 1), the product
 * icon + name, mono revenue + qty, and a thin terracotta progress bar
 * normalized to the leader's revenue.
 */
export function TopProductsCard({ entries }: TopProductsCardProps) {
  const t = useIntl()
  const { products } = useProducts()
  const { formatCurrency } = useBusinessFormat()

  const productById = useMemo(() => {
    const m = new Map<string, Product>()
    for (const p of products) m.set(p.id, p)
    return m
  }, [products])

  const max = entries.reduce((m, e) => (e.revenue > m ? e.revenue : m), 0)

  return (
    <section className="report-card">
      <header className="report-card__header">
        <span className="report-card__eyebrow">
          {t.formatMessage({ id: 'sales.reports.top_products_eyebrow' })}
        </span>
        <h3 className="report-card__title">
          {t.formatMessage({ id: 'sales.reports.top_products_title' })}
        </h3>
      </header>
      {entries.length === 0 ? (
        <p className="report-card__empty">
          {t.formatMessage({ id: 'sales.reports.top_products_empty' })}
        </p>
      ) : (
        <div className="top-products-list">
          {entries.map((entry, idx) => {
            const product = entry.productId ? productById.get(entry.productId) : undefined
            const iconUrl = product ? getProductIconUrl(product) : null
            const widthPct = max > 0 ? Math.max(2, (entry.revenue / max) * 100) : 0
            // productId can be null when the product was deleted post-sale
            // (sale_items.product_id has onDelete: 'set null'). Use idx
            // as a tiebreaker so React keys stay unique even with multiple
            // null-productId rows.
            const key = entry.productId ?? `deleted-${idx}-${entry.productName}`
            return (
              <div
                key={key}
                className={`top-product-row${idx === 0 ? ' top-product-row--first' : ''}`}
              >
                <span className="top-product-row__rank">{idx + 1}</span>
                <div className="product-list-image top-product-row__icon">
                  {product ? (
                    renderIcon(product, iconUrl)
                  ) : (
                    <Package className="w-5 h-5 text-text-tertiary" />
                  )}
                </div>
                <span className="top-product-row__name">{entry.productName}</span>
                <div className="top-product-row__metrics">
                  <span className="top-product-row__revenue">
                    {formatCurrency(entry.revenue)}
                  </span>
                  <span className="top-product-row__qty">
                    {t.formatMessage(
                      { id: 'sales.reports.top_products_qty' },
                      { count: entry.quantity },
                    )}
                  </span>
                </div>
                <div className="top-product-row__bar">
                  <div
                    className="top-product-row__bar-fill"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function renderIcon(product: Product, iconUrl: string | null) {
  if (iconUrl && isPresetIcon(iconUrl)) {
    const preset = getPresetIcon(iconUrl)
    return preset ? (
      <preset.icon size={24} className="text-text-primary" />
    ) : null
  }
  if (iconUrl) {
    return (
      <Image
        src={iconUrl}
        alt={product.name}
        width={40}
        height={40}
        className="product-list-image-img"
        unoptimized
      />
    )
  }
  return <Package className="w-5 h-5 text-text-tertiary" />
}
