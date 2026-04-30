'use client'

import { useEffect, useMemo, type MouseEvent } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Minus, Package, Plus } from 'lucide-react'
import { useProducts } from '@/contexts/products-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import type { Product } from '@/types'
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
        const iconUrl = getProductIconUrl(product)

        const handleToggle = () => {
          if (isSelected) cart.removeLine(product.id)
          else cart.addLine(product)
        }
        const handleKey = (e: React.KeyboardEvent) => {
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
            tabIndex={0}
            onClick={handleToggle}
            onKeyDown={handleKey}
            className={`rounded-xl border-2 p-3 flex flex-col gap-3 transition-all cursor-pointer outline-none ${
              isSelected
                ? 'border-brand bg-brand-subtle'
                : 'border-border bg-bg-surface hover:border-brand-300'
            }`}
          >
            {/* Row 1: icon + (name + price as sublabel). */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                {renderProductIcon(product, iconUrl, isSelected)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {product.name}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {formatCurrency(product.price)}
                </div>
              </div>
            </div>

            {/* Row 2: -/qty/+. Both buttons HTML-disabled until the
                product is selected; stopPropagation prevents the card-
                level toggle from firing when the user adjusts qty. */}
            <div
              className={`flex items-center justify-between gap-1 transition-opacity ${
                isSelected ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <QtyButton
                active={isSelected}
                ariaLabel={t('qty_decrease')}
                disabled={!isSelected}
                onClick={(e) => {
                  e.stopPropagation()
                  cart.updateQty(product.id, qty - 1)
                }}
              >
                <Minus className="w-4 h-4" />
              </QtyButton>
              <span className="text-base font-semibold tabular-nums w-8 text-center">
                {qty}
              </span>
              <QtyButton
                active={isSelected}
                ariaLabel={t('qty_increase')}
                disabled={!isSelected}
                onClick={(e) => {
                  e.stopPropagation()
                  cart.addLine(product)
                }}
              >
                <Plus className="w-4 h-4" />
              </QtyButton>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function renderProductIcon(
  product: Product,
  iconUrl: string | null,
  isSelected: boolean,
) {
  if (iconUrl && isPresetIcon(iconUrl)) {
    const preset = getPresetIcon(iconUrl)
    return preset ? (
      <preset.icon
        size={22}
        className={isSelected ? 'text-brand' : 'text-text-secondary'}
      />
    ) : null
  }
  if (iconUrl) {
    return (
      <Image
        src={iconUrl}
        alt=""
        width={40}
        height={40}
        className="w-full h-full object-cover"
        unoptimized
      />
    )
  }
  return (
    <Package
      className={`w-5 h-5 ${isSelected ? 'text-brand' : 'text-text-secondary'}`}
    />
  )
}

function QtyButton({
  active,
  ariaLabel,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  ariaLabel: string
  disabled: boolean
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`rounded-full bg-bg-muted w-11 h-11 flex items-center justify-center border-2 transition-colors hover:bg-bg-elevated disabled:cursor-not-allowed ${
        active ? 'border-brand' : 'border-transparent'
      }`}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
