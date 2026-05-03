'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Package } from 'lucide-react'
import { useProducts } from '@/contexts/products-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { getProductIconUrl } from '@/lib/utils'
import { getPresetIcon, isPresetIcon } from '@/lib/preset-icons'
import type { Product } from '@/types'
import type { TopProductEntry } from '@/types/sales-aggregate'

interface TopProductsCardProps {
  entries: TopProductEntry[]
}

export function TopProductsCard({ entries }: TopProductsCardProps) {
  const t = useTranslations('sales.reports')
  const { products } = useProducts()
  const { formatCurrency } = useBusinessFormat()

  const productById = useMemo(() => {
    const m = new Map<string, Product>()
    for (const p of products) m.set(p.id, p)
    return m
  }, [products])

  const max = entries.reduce((m, e) => (e.revenue > m ? e.revenue : m), 0)

  return (
    <div className="card p-4 space-y-4">
      <div className="text-sm text-text-secondary">{t('top_products_title')}</div>
      <hr className="border-border" />
      {entries.length === 0 ? (
        <p className="text-sm text-text-tertiary text-center py-2">
          {t('top_products_empty')}
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const product = entry.productId ? productById.get(entry.productId) : undefined
            const iconUrl = product ? getProductIconUrl(product) : null
            const widthPct = max > 0 ? Math.max(2, (entry.revenue / max) * 100) : 0
            // productId can be null when the product was deleted post-sale
            // (sale_items.product_id has onDelete: 'set null'). Use the
            // index as a tiebreaker so React keys stay unique even if
            // multiple null-productId rows survive aggregation.
            const key = entry.productId ?? `deleted-${idx}-${entry.productName}`
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="product-list-image flex-shrink-0">
                    {product ? (
                      renderIcon(product, iconUrl)
                    ) : (
                      <Package className="w-5 h-5 text-text-tertiary" />
                    )}
                  </div>
                  <span className="flex-1 min-w-0 text-sm font-medium truncate">
                    {entry.productName}
                  </span>
                  <span className="text-sm font-semibold tabular-nums flex-shrink-0">
                    {formatCurrency(entry.revenue)}
                  </span>
                  <span className="text-xs text-text-tertiary tabular-nums flex-shrink-0 w-16 text-right">
                    {t('top_products_qty', { count: entry.quantity })}
                  </span>
                </div>
                <div className="ml-[60px]">
                  <div className="h-1.5 rounded-full bg-brand-subtle overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
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
