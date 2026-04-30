'use client'

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Loader2, Minus, Package, Plus, ScanLine, X } from 'lucide-react'
import { useBusiness } from '@/contexts/business-context'
import { useProducts } from '@/contexts/products-context'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { haptic } from '@/lib/haptics'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import type { Product } from '@/types'
import type { UseCartResult } from '@/hooks/useCart'

interface ProductPickerProps {
  cart: UseCartResult
}

export function ProductPicker({ cart }: ProductPickerProps) {
  const t = useTranslations('sales.cart')
  const tSales = useTranslations('sales')
  const tProducts = useTranslations('products')
  const tToast = useTranslations('sales.toast')
  const { business } = useBusiness()
  const { products, ensureLoaded } = useProducts()
  const { formatCurrency } = useBusinessFormat()
  const [search, setSearch] = useState('')

  useEffect(() => {
    void ensureLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products
      .filter((p) => p.active !== false)
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products, search])

  // productId -> quantity in cart, derived once per cart change.
  const qtyMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const line of cart.lines) m.set(line.productId, line.quantity)
    return m
  }, [cart.lines])

  // Look up a product by barcode and add it to the cart. cart.addLine
  // already increments qty for an existing line, so a repeat scan of the
  // same code naturally bumps the count. Stock-aware: scans for
  // out-of-stock products or already-at-max-qty are rejected.
  const handleScanResult = async (result: { value: string }) => {
    if (!business?.id) return
    try {
      const url = `/api/businesses/${business.id}/products?barcode=${encodeURIComponent(result.value)}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok && data.success && data.product) {
        const product = data.product as Product
        const stock = product.stock ?? 0
        const current = cart.lines.find((l) => l.productId === product.id)?.quantity ?? 0
        if (stock <= 0 || current >= stock) {
          alert(t('out_of_stock'))
          return
        }
        cart.addLine(product)
        haptic()
        return
      }
    } catch {
      /* fall through to no-match */
    }
    alert(tToast('no_barcode_match'))
  }

  const { open: openScanner, busy: scanBusy, hiddenInput: scanHiddenInput } =
    useBarcodeScan({
      onResult: handleScanResult,
      onError: () => alert(tToast('no_barcode_match')),
    })

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Single scrollable area: search/scan row + product grid scroll
          together so the search row can move out of view and free up
          space for more product cards as the user pages through. */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
      {/* Search + scan row — same JSX/classes as the Products tab. */}
      <div className="flex gap-2 items-stretch">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={tSales('search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-search w-full h-full"
            style={{
              paddingTop: 'var(--space-2)',
              paddingBottom: 'var(--space-2)',
              paddingRight: '2.25rem',
              fontSize: 'var(--text-sm)',
              minHeight: 'unset',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-3 flex items-center text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label={tProducts('search_clear')}
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={openScanner}
          disabled={scanBusy}
          className="btn btn-secondary btn-icon flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={tSales('scan_barcode_aria')}
        >
          {scanBusy ? (
            <Loader2 className="w-[18px] h-[18px] animate-spin" />
          ) : (
            <ScanLine size={18} />
          )}
        </button>
        {scanHiddenInput}
      </div>

      {/* Product grid. */}
        <div className="grid grid-cols-2 gap-3">
          {visibleProducts.map((product) => {
          const qty = qtyMap.get(product.id) ?? 0
          const isSelected = qty > 0
          const stockTotal = product.stock ?? 0
          const outOfStock = stockTotal <= 0
          const atMaxQty = qty >= stockTotal
          const iconUrl = getProductIconUrl(product)

          const handleToggle = () => {
            if (outOfStock) return
            if (isSelected) cart.removeLine(product.id)
            else cart.addLine(product)
          }
          const handleKey = (e: React.KeyboardEvent) => {
            if (outOfStock) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleToggle()
            }
          }

          return (
            <div
              key={product.id}
              role="button"
              aria-pressed={isSelected}
              aria-disabled={outOfStock}
              tabIndex={outOfStock ? -1 : 0}
              onClick={handleToggle}
              onKeyDown={handleKey}
              className={`rounded-xl border-2 p-3 flex flex-col gap-3 transition-all outline-none ${
                outOfStock
                  ? 'cursor-default border-border bg-bg-surface'
                  : isSelected
                    ? 'border-brand bg-brand-subtle cursor-pointer'
                    : 'border-border bg-bg-surface hover:border-brand-300 cursor-pointer'
              }`}
            >
              {/* Row 1: icon + (name + price as sublabel). When the
                  product is out of stock, the name and price drop to
                  text-text-tertiary (matches the inactive-product styling
                  in ProductsTab) and the icon container fades. */}
              <div className="flex items-center gap-2">
                <div
                  className={`product-list-image ${outOfStock ? 'opacity-50' : ''}`}
                >
                  {renderProductIcon(product, iconUrl)}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium truncate ${
                      outOfStock ? 'text-text-tertiary' : ''
                    }`}
                  >
                    {product.name}
                  </div>
                  <div
                    className={`text-xs mt-0.5 ${
                      outOfStock ? 'text-text-tertiary' : 'text-text-secondary'
                    }`}
                  >
                    {formatCurrency(product.price)}
                  </div>
                </div>
              </div>

              {/* Row 2: out-of-stock label OR qty stepper. The plus
                  button is also HTML-disabled at qty >= stock so the
                  user can't add more than the available inventory. */}
              {outOfStock ? (
                <div className="text-xs text-text-tertiary text-center h-8 flex items-center justify-center">
                  {t('out_of_stock')}
                </div>
              ) : (
                <div
                  className={`flex items-center justify-between gap-1 transition-opacity ${
                    isSelected ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <QtyButton
                    active={isSelected}
                    variant="danger"
                    ariaLabel={t('qty_decrease')}
                    disabled={!isSelected}
                    onClick={(e) => {
                      e.stopPropagation()
                      cart.updateQty(product.id, qty - 1)
                    }}
                  >
                    <Minus style={{ width: 14, height: 14 }} />
                  </QtyButton>
                  <span className="text-sm font-semibold tabular-nums w-6 text-center">
                    {qty}
                  </span>
                  <QtyButton
                    active={isSelected}
                    variant="primary"
                    ariaLabel={t('qty_increase')}
                    disabled={!isSelected || atMaxQty}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (atMaxQty) return
                      cart.addLine(product)
                    }}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                  </QtyButton>
                </div>
              )}
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}

function renderProductIcon(product: Product, iconUrl: string | null) {
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

type QtyButtonVariant = 'primary' | 'danger'

function QtyButton({
  active,
  variant,
  ariaLabel,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  variant: QtyButtonVariant
  ariaLabel: string
  disabled: boolean
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}) {
  const activeColor = variant === 'primary' ? 'text-brand' : 'text-error'
  return (
    <button
      type="button"
      className={`btn border-2 border-transparent bg-transparent ${
        active ? activeColor : ''
      }`}
      style={{
        width: 48,
        height: 32,
        minHeight: 'unset',
        padding: 0,
        borderRadius: 'var(--radius-full)',
        gap: 0,
      }}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        haptic()
        onClick(e)
      }}
    >
      {children}
    </button>
  )
}
