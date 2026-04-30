'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Minus, Plus, ShoppingCart, X } from 'lucide-react'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { ClearCartConfirmModal } from './ClearCartConfirmModal'
import { ChargeSheet } from './ChargeSheet'
import type { UseCartResult } from '@/hooks/useCart'

// Compact button override style — same pattern as the in-card action
// buttons in SalesStatsCard / ProvidersView.
const COMPACT_BUTTON_STYLE = {
  fontSize: 'var(--text-sm)',
  padding: 'var(--space-2) var(--space-3)',
  minHeight: 'unset',
  gap: 'var(--space-2)',
} as const

interface CartSheetProps {
  cart: UseCartResult
  businessId: string
}

export function CartSheet({ cart, businessId }: CartSheetProps) {
  const t = useTranslations('sales.cart')
  const { formatCurrency } = useBusinessFormat()
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [chargeOpen, setChargeOpen] = useState(false)

  const itemCount = cart.lines.reduce((acc, l) => acc + l.quantity, 0)
  const isEmpty = cart.lines.length === 0
  const totalLabel = formatCurrency(cart.total)

  return (
    <>
      <div className="rounded-xl border border-border bg-bg-surface p-4">
        {/* Header: title + item count + clear-cart link (when items exist) */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-wide text-text-secondary">
            {t('title')}
          </div>
          {!isEmpty && (
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span>{t('item_count', { count: itemCount })}</span>
              <button
                type="button"
                className="underline"
                onClick={() => setConfirmClearOpen(true)}
              >
                {t('clear')}
              </button>
            </div>
          )}
        </div>

        {/* Body: empty state, or scrollable line list */}
        {isEmpty ? (
          <div className="flex flex-col items-center text-center py-6 text-text-secondary">
            <ShoppingCart className="w-8 h-8 mb-2" />
            <div className="text-sm font-medium text-text-primary">
              {t('empty_title')}
            </div>
            <div className="text-xs mt-0.5 max-w-[16rem]">
              {t('empty_description')}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-4 max-h-48 overflow-y-auto">
            {cart.lines.map((line) => (
              <div key={line.productId} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {line.productName}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    {line.quantity} × {formatCurrency(line.unitPrice)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-full border border-border w-7 h-7 flex items-center justify-center"
                    aria-label={t('qty_decrease')}
                    onClick={() => cart.updateQty(line.productId, line.quantity - 1)}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm w-6 text-center">{line.quantity}</span>
                  <button
                    type="button"
                    className="rounded-full border border-border w-7 h-7 flex items-center justify-center"
                    aria-label={t('qty_increase')}
                    onClick={() => cart.updateQty(line.productId, line.quantity + 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-sm font-semibold w-16 text-right">
                  {formatCurrency(line.unitPrice * line.quantity)}
                </span>
                <button
                  type="button"
                  className="rounded-full w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary"
                  aria-label={t('remove')}
                  onClick={() => cart.removeLine(line.productId)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer: total + Finalize button. Mirrors the SalesStatsCard
            action row (1/3 + 2/3) so the two cards line up visually. */}
        <div className="grid grid-cols-3 gap-2 items-center">
          <div>
            <div className="text-2xl font-semibold truncate">{totalLabel}</div>
            <div className="text-xs text-text-secondary mt-0.5">
              {t('total_label')}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary col-span-2"
            style={COMPACT_BUTTON_STYLE}
            disabled={isEmpty}
            onClick={() => setChargeOpen(true)}
          >
            <Check className="w-4 h-4" />
            <span>{t('finalize_button')}</span>
          </button>
        </div>
      </div>

      <ClearCartConfirmModal
        isOpen={confirmClearOpen}
        itemCount={cart.lines.length}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          cart.clear()
          setConfirmClearOpen(false)
        }}
      />

      <ChargeSheet
        isOpen={chargeOpen}
        cart={cart}
        businessId={businessId}
        onClose={() => setChargeOpen(false)}
      />
    </>
  )
}
