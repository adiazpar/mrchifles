'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Package } from 'lucide-react'
import { Modal, Spinner } from '@/components/ui'
import { useProducts } from '@/contexts/products-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { apiRequest } from '@/lib/api-client'
import { getProductIconUrl } from '@/lib/utils'
import { getPresetIcon, isPresetIcon } from '@/lib/preset-icons'
import type { Product } from '@/types'
import type { Sale } from '@/types/sale'

interface SaleDetailContentProps {
  businessId: string
  saleId: string | null
}

/**
 * Receipt-format detail for a single sale. Fetches the full Sale
 * (with line items) from /api/businesses/[businessId]/sales/[id] when
 * saleId changes. Returns Modal.Item siblings via a fragment — must
 * be invoked as direct children of a Modal.Step. Receipt layout
 * mirrors OrderDetailModal: items list → dashed divider → totals.
 *
 * Used by both ActiveSessionSalesModal (current session sales) and
 * SessionHistoryModal (historic session sales).
 */
export function SaleDetailContent({ businessId, saleId }: SaleDetailContentProps) {
  const t = useTranslations('sales.session.active_sales_modal')
  const tMethod = useTranslations('sales.cart')
  const { products } = useProducts()
  const { formatCurrency, formatTime } = useBusinessFormat()

  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Live product lookup for icons. Falls back to the Package
  // placeholder if a product was deleted post-sale.
  const productById = useMemo(() => {
    const m = new Map<string, Product>()
    for (const p of products) m.set(p.id, p)
    return m
  }, [products])

  useEffect(() => {
    if (!saleId) {
      setSale(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    apiRequest<{ sale: Sale }>(`/api/businesses/${businessId}/sales/${saleId}`)
      .then(({ sale: fetched }) => {
        if (!cancelled) setSale(fetched)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load sale')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [businessId, saleId])

  if (!saleId || loading) {
    return (
      <Modal.Item>
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      </Modal.Item>
    )
  }

  if (error || !sale) {
    return (
      <Modal.Item>
        <p className="text-sm text-error text-center py-4">
          {error || tMethod('modal_error_generic')}
        </p>
      </Modal.Item>
    )
  }

  const methodLabelKey = `modal_method_${sale.paymentMethod}` as const

  return (
    <>
      <Modal.Item>
        <div className="space-y-2">
          {sale.items.map((item, idx) => {
            const product = item.productId ? productById.get(item.productId) : undefined
            const iconUrl = product ? getProductIconUrl(product) : null
            return (
              <div
                key={`${item.productId ?? 'item'}-${idx}`}
                className="flex items-center gap-2 text-sm"
              >
                <div className="product-list-image flex-shrink-0">
                  {product ? renderIcon(product, iconUrl) : (
                    <Package className="w-5 h-5 text-text-tertiary" />
                  )}
                </div>
                <span className="text-text-primary truncate flex-1 min-w-0">
                  {item.productName}
                </span>
                <span className="text-text-secondary flex-shrink-0 tabular-nums w-12 text-right">
                  {item.quantity}x
                </span>
                <span className="text-text-tertiary flex-shrink-0 tabular-nums w-16 text-right">
                  {formatCurrency(item.unitPrice)}
                </span>
                <span className="text-text-primary flex-shrink-0 tabular-nums w-20 text-right font-medium">
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
            )
          })}
        </div>
      </Modal.Item>

      <Modal.Item>
        <div className="border-t border-dashed border-border" />
      </Modal.Item>

      <Modal.Item>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-tertiary">{t('detail_total_label')}</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(sale.total)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">{t('detail_method_label')}</span>
            <span>{tMethod(methodLabelKey)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">{t('detail_time_label')}</span>
            <span>{formatTime(new Date(sale.createdAt))}</span>
          </div>
        </div>
      </Modal.Item>
    </>
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
