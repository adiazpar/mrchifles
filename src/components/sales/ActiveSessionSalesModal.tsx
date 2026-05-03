'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Package } from 'lucide-react'
import { Modal, Spinner, useModal } from '@/components/ui'
import { useProducts } from '@/contexts/products-context'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { haptic } from '@/lib/haptics'
import { apiRequest } from '@/lib/api-client'
import { getProductIconUrl } from '@/lib/utils'
import { getPresetIcon, isPresetIcon } from '@/lib/preset-icons'
import type { Product } from '@/types'
import type { Sale } from '@/types/sale'

interface ActiveSessionSalesModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
}

interface SaleProjection {
  id: string
  saleNumber: number
  total: number
  paymentMethod: 'cash' | 'card' | 'other'
  createdAt: string
}

export function ActiveSessionSalesModal({
  isOpen,
  onClose,
  businessId,
}: ActiveSessionSalesModalProps) {
  const t = useTranslations('sales.session.active_sales_modal')
  const tCommon = useTranslations('common')
  const { currentSession } = useSalesSessions()
  const { formatTime } = useBusinessFormat()

  const [items, setItems] = useState<SaleProjection[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !currentSession) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentSession?.id])

  async function load() {
    if (!currentSession) return
    setLoading(true)
    try {
      const data = await apiRequest<{ sales: SaleProjection[] }>(
        `/api/businesses/${businessId}/sales-sessions/${currentSession.id}/sales?limit=50`,
      )
      setItems(data.sales)
    } finally {
      setLoading(false)
    }
  }

  // Find the projection for the selected row so the detail step can show
  // the saleNumber in the header without waiting on the detail fetch.
  const selectedProjection = useMemo(
    () => items.find((s) => s.id === selectedSaleId) ?? null,
    [items, selectedSaleId],
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={() => setSelectedSaleId(null)}
      title={t('title')}
    >
      <Modal.Step title={t('title')}>
        {items.length === 0 && !loading ? (
          <Modal.Item>
            <p className="text-sm text-text-tertiary text-center py-4">{t('empty')}</p>
          </Modal.Item>
        ) : (
          <Modal.Item>
            <div className="space-y-2">
              {items.map((s) => (
                <SaleRow
                  key={s.id}
                  sale={s}
                  onTap={() => {
                    haptic()
                    setSelectedSaleId(s.id)
                  }}
                />
              ))}
            </div>
          </Modal.Item>
        )}
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon('close')}
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Sale detail (receipt). Always-rendered per modal-system
          rules; gates content on selectedSaleId. Header shows the
          saleNumber from the cached projection so it's available before
          the detail fetch resolves. */}
      <Modal.Step
        title={
          selectedProjection
            ? t('detail_title', { number: selectedProjection.saleNumber })
            : t('detail_title', { number: 0 })
        }
      >
        <SaleDetailContent
          businessId={businessId}
          saleId={selectedSaleId}
          formatTime={formatTime}
        />
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon('close')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}

interface SaleRowProps {
  sale: SaleProjection
  onTap: () => void
}

function SaleRow({ sale, onTap }: SaleRowProps) {
  const t = useTranslations('sales.session.active_sales_modal')
  const { goToStep } = useModal()
  const { formatCurrency, formatTime } = useBusinessFormat()

  return (
    <button
      type="button"
      onClick={() => {
        onTap()
        goToStep(1)
      }}
      className="w-full flex items-center justify-between py-2 border-b border-border last:border-b-0 transition-colors hover:bg-bg-base"
    >
      <div className="flex flex-col items-start text-left">
        <span className="text-sm font-medium">
          {t('sale_label', { number: sale.saleNumber })}
        </span>
        <span className="text-xs text-text-tertiary">
          {formatTime(new Date(sale.createdAt))} · {sale.paymentMethod}
        </span>
      </div>
      <span className="text-sm font-semibold tabular-nums">
        {formatCurrency(sale.total)}
      </span>
    </button>
  )
}

interface SaleDetailContentProps {
  businessId: string
  saleId: string | null
  formatTime: (date: Date) => string
}

/**
 * Content-only Modal.Items for the sale detail / receipt step. Fetches
 * the full Sale (with line items) when saleId changes. Receipt format
 * mirrors OrderDetailModal: items list → dashed divider → totals block.
 */
function SaleDetailContent({ businessId, saleId, formatTime }: SaleDetailContentProps) {
  const t = useTranslations('sales.session.active_sales_modal')
  const tMethod = useTranslations('sales.cart')
  const { products } = useProducts()
  const { formatCurrency } = useBusinessFormat()

  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Look up live product data for icon rendering. Falls back to the
  // Package placeholder when a product was deleted post-sale.
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
      {/* Receipt: line items. Mirrors OrderDetailModal's products row. */}
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
                <span className="text-text-secondary flex-shrink-0 tabular-nums">
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

      {/* Totals block. */}
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
