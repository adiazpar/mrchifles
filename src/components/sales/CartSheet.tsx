'use client'

import { useTranslations } from 'next-intl'
import { Receipt, ShoppingCart } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import type { UseCartResult } from '@/hooks/useCart'

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
      <div className="grid grid-cols-3 gap-2 items-center">
        <div className="text-sm font-medium text-center">
          {t('item_count', { count: itemCount })}
        </div>
        {/* Right cluster spans 2/3 of the bar: session-sales icon button
            (auto width) + view-cart button (flex-1). Both follow the
            project's button design tokens — same .btn / .btn-icon classes
            as the Modal.Footer pattern (e.g. EditProductModal, ProvidersView
            edit/back buttons). 44px touch-target height, 24px icons,
            built-in tap-scale + brightness from the .btn framework, plus
            a haptic() on tap. */}
        <div className="col-span-2 flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            aria-label={t('view_session_sales')}
            onClick={() => {
              haptic()
              /* placeholder — opens the session sales view when wired up */
            }}
          >
            <Receipt className="text-success" />
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={isEmpty}
            onClick={() => {
              haptic()
              /* placeholder — opens the View cart drawer when wired up */
            }}
          >
            <ShoppingCart />
            <span>{t('view_cart')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
