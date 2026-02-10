'use client'

import { IconPlus, IconMinus, IconTrash } from '@/components/icons'
import { formatCurrency } from '@/lib/utils'

export interface CartItemProps {
  productId: string
  name: string
  unitPrice: number
  quantity: number
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (productId: string) => void
}

export function CartItem({
  productId,
  name,
  unitPrice,
  quantity,
  onIncrement,
  onDecrement,
  onRemove,
}: CartItemProps) {
  const subtotal = unitPrice * quantity

  return (
    <div className="cart-item">
      <div className="cart-item-info">
        <p className="cart-item-name">{name}</p>
        <p className="cart-item-price">{formatCurrency(unitPrice)} c/u</p>
      </div>

      <div className="cart-item-quantity">
        <button
          type="button"
          className="cart-item-qty-btn"
          onClick={() => (quantity === 1 ? onRemove(productId) : onDecrement(productId))}
          aria-label={quantity === 1 ? 'Eliminar' : 'Reducir cantidad'}
        >
          {quantity === 1 ? (
            <IconTrash className="w-4 h-4" />
          ) : (
            <IconMinus className="w-4 h-4" />
          )}
        </button>
        <span className="cart-item-qty-value">{quantity}</span>
        <button
          type="button"
          className="cart-item-qty-btn"
          onClick={() => onIncrement(productId)}
          aria-label="Aumentar cantidad"
        >
          <IconPlus className="w-4 h-4" />
        </button>
      </div>

      <span className="cart-item-subtotal">{formatCurrency(subtotal)}</span>
    </div>
  )
}
