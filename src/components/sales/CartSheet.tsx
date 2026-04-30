'use client'

import { useTranslations } from 'next-intl'
import { ShoppingCart } from 'lucide-react'
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

  // businessId is retained on the props for the View cart drawer that will
  // mount from this card — it'll need it to drive the charge / commit flow.
  void businessId

  const itemCount = cart.lines.reduce((acc, l) => acc + l.quantity, 0)
  const isEmpty = cart.lines.length === 0

  return (
    <div className="rounded-xl border border-border bg-bg-surface p-4">
      <div className="grid grid-cols-2 gap-2 items-center">
        <div className="text-sm font-medium">
          {t('item_count', { count: itemCount })}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={COMPACT_BUTTON_STYLE}
          disabled={isEmpty}
          onClick={() => {
            /* placeholder — opens the View cart drawer when wired up */
          }}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{t('view_cart')}</span>
        </button>
      </div>
    </div>
  )
}
