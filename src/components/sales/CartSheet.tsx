'use client'

import { useTranslations } from 'next-intl'
import { ShoppingCart } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import type { UseCartResult } from '@/hooks/useCart'

interface CartSheetProps {
  cart: UseCartResult
}

export function CartSheet({ cart }: CartSheetProps) {
  const t = useTranslations('sales.cart')

  const itemCount = cart.lines.reduce((acc, l) => acc + l.quantity, 0)
  const isEmpty = cart.lines.length === 0

  // Persistent floating action: anchored to the bottom of the page-body
  // (which is `relative`-positioned in SalesView). Removes the bar from
  // layout flow so the product picker can scroll the full remaining
  // height behind it.
  return (
    <div className="absolute bottom-0 left-0 right-0">
      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={isEmpty}
        onClick={() => {
          haptic()
          /* placeholder — opens the View cart drawer when wired up */
        }}
      >
        <ShoppingCart />
        <span>{t('view_cart', { count: itemCount })}</span>
      </button>
    </div>
  )
}
