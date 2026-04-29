'use client'

import type { UseCartResult } from '@/hooks/useCart'

export function ProductPicker({ cart }: { cart: UseCartResult }) {
  void cart
  return <div data-testid="product-picker">Picker</div>
}
