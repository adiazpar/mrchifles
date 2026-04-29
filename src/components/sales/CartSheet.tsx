'use client'

import type { UseCartResult } from '@/hooks/useCart'

export function CartSheet({ cart, businessId }: { cart: UseCartResult; businessId: string }) {
  void cart; void businessId
  return <div data-testid="cart-sheet">Cart</div>
}
