'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Minus, Plus, X } from 'lucide-react'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { ClearCartConfirmModal } from './ClearCartConfirmModal'
import { ChargeSheet } from './ChargeSheet'
import type { UseCartResult } from '@/hooks/useCart'

interface CartSheetProps {
  cart: UseCartResult
  businessId: string
}

export function CartSheet({ cart, businessId }: CartSheetProps) {
  const t = useTranslations('sales')
  const tCart = useTranslations('sales.cart')
  const { formatCurrency } = useBusinessFormat()
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [chargeOpen, setChargeOpen] = useState(false)

  return (
    <>
      <div className="sticky bottom-0 left-0 right-0 z-30 border-t border-border bg-bg-elevated px-4 pt-3 pb-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">{formatCurrency(cart.total)}</span>
          <button
            type="button"
            className="text-xs text-text-secondary underline"
            onClick={() => setConfirmClearOpen(true)}
          >
            {tCart('clear')}
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto mb-3 flex flex-col gap-2">
          {cart.lines.map((line) => (
            <div key={line.productId} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{line.productName}</div>
                <div className="text-xs text-text-secondary">
                  {formatCurrency(line.unitPrice * line.quantity)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-full border border-border w-7 h-7 flex items-center justify-center"
                  aria-label="Decrease"
                  onClick={() => cart.updateQty(line.productId, line.quantity - 1)}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm w-6 text-center">{line.quantity}</span>
                <button
                  type="button"
                  className="rounded-full border border-border w-7 h-7 flex items-center justify-center"
                  aria-label="Increase"
                  onClick={() => cart.updateQty(line.productId, line.quantity + 1)}
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="rounded-full border border-border w-7 h-7 flex items-center justify-center ml-1"
                  aria-label={tCart('remove')}
                  onClick={() => cart.removeLine(line.productId)}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => setChargeOpen(true)}
        >
          {t('charge_button', { total: formatCurrency(cart.total) })}
        </button>
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
