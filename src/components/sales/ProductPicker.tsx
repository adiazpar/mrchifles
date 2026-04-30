'use client'

import { useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Minus, Package, Plus } from 'lucide-react'
import { useProducts } from '@/contexts/products-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { UseCartResult } from '@/hooks/useCart'

interface ProductPickerProps {
  cart: UseCartResult
}

export function ProductPicker({ cart }: ProductPickerProps) {
  const t = useTranslations('sales.cart')
  const { products, ensureLoaded } = useProducts()
  const { formatCurrency } = useBusinessFormat()

  useEffect(() => {
    void ensureLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleProducts = useMemo(
    () =>
      products
        .filter((p) => p.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  )

  // productId -> quantity in cart, derived once per cart change.
  const qtyMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const line of cart.lines) m.set(line.productId, line.quantity)
    return m
  }, [cart.lines])

  return (
    <div className="grid grid-cols-2 gap-3">
      {visibleProducts.map((product) => {
        const qty = qtyMap.get(product.id) ?? 0
        const isSelected = qty > 0

        return (
          <div
            key={product.id}
            className="rounded-xl border border-border bg-bg-surface p-3 flex flex-col gap-3"
          >
            {/* Row 1: icon + (name + price as sublabel). Tapping
                anywhere in the row adds qty 1 to the cart. */}
            <button
              type="button"
              className="flex items-center gap-2 text-left rounded-md -m-1 p-1"
              onClick={() => cart.addLine(product)}
            >
              <div className="w-10 h-10 rounded-lg bg-bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                {product.icon?.startsWith('data:') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.icon}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : product.icon ? (
                  <span className="text-xl leading-none">{product.icon}</span>
                ) : (
                  <Package className="w-5 h-5 text-text-secondary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {product.name}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {formatCurrency(product.price)}
                </div>
              </div>
            </button>

            {/* Row 2: -/qty/+. Visually disabled (opacity-40) until the
                product has been added; the minus button is also
                HTML-disabled at qty 0 so it can't go negative. The plus
                button stays enabled so it works as an alternate
                add-to-cart affordance from the disabled-look state. */}
            <div
              className={`flex items-center justify-between gap-1 transition-opacity ${
                isSelected ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <button
                type="button"
                className="rounded-full border border-border w-7 h-7 flex items-center justify-center disabled:cursor-not-allowed"
                aria-label={t('qty_decrease')}
                disabled={!isSelected}
                onClick={() => cart.updateQty(product.id, qty - 1)}
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-medium tabular-nums w-6 text-center">
                {qty}
              </span>
              <button
                type="button"
                className="rounded-full border border-border w-7 h-7 flex items-center justify-center"
                aria-label={t('qty_increase')}
                onClick={() => cart.addLine(product)}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
