'use client'

import { useTranslations } from 'next-intl'
import { Receipt, ShoppingCart } from 'lucide-react'
import { haptic } from '@/lib/haptics'
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
    <div className="rounded-full border border-border bg-bg-surface p-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 text-sm font-medium text-center">
          {t('item_count', { count: itemCount })}
        </div>
        {/* Session-sales icon button — same .btn framework, same vertical
            padding/font as the view-cart button so heights match; square
            via equal var(--space-2) padding all around. Same w-4 h-4 icon
            size as the view-cart's ShoppingCart. Receipt in text-success
            (green) for the 'completed sales' semantic; bg stays neutral
            via btn-secondary. Haptic on tap. */}
        <button
          type="button"
          className="btn btn-secondary flex-shrink-0"
          style={{
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-2)',
            minHeight: 'unset',
            gap: 0,
          }}
          aria-label={t('view_session_sales')}
          onClick={() => {
            haptic()
            /* placeholder — opens the session sales view when wired up */
          }}
        >
          <Receipt
            style={{ width: 16, height: 16 }}
            className="text-success"
          />
        </button>
        <button
          type="button"
          className="btn btn-primary flex-shrink-0"
          style={COMPACT_BUTTON_STYLE}
          disabled={isEmpty}
          onClick={() => {
            haptic()
            /* placeholder — opens the View cart drawer when wired up */
          }}
        >
          <ShoppingCart style={{ width: 16, height: 16 }} />
          <span>{t('view_cart')}</span>
        </button>
      </div>
    </div>
  )
}
