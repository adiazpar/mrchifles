'use client'

import { CartItem } from './cart-item'
import { PaymentSelector } from './payment-selector'
import { Button, EmptyState } from '@/components/ui'
import { IconSales } from '@/components/icons'
import { formatCurrency } from '@/lib/utils'

export interface CartProduct {
  id: string
  name: string
  price: number
}

export interface CartItemData {
  productId: string
  quantity: number
}

export type PaymentMethod = 'cash' | 'yape' | 'plin'

export interface CartProps {
  items: CartItemData[]
  products: CartProduct[]
  paymentMethod: PaymentMethod | null
  onPaymentMethodChange: (method: PaymentMethod) => void
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (productId: string) => void
  onCompleteSale: () => void
  loading?: boolean
}

export function Cart({
  items,
  products,
  paymentMethod,
  onPaymentMethodChange,
  onIncrement,
  onDecrement,
  onRemove,
  onCompleteSale,
  loading = false,
}: CartProps) {
  const getProduct = (productId: string) =>
    products.find((p) => p.id === productId)

  const total = items.reduce((sum, item) => {
    const product = getProduct(item.productId)
    return sum + (product?.price || 0) * item.quantity
  }, 0)

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const canComplete = items.length > 0 && paymentMethod !== null

  if (items.length === 0) {
    return (
      <div className="cart-container h-full">
        <div className="cart-header">
          <h2 className="cart-title">Carrito</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<IconSales className="w-full h-full" />}
            title="Carrito vacio"
            description="Selecciona productos para agregar al carrito"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="cart-container h-full flex flex-col">
      <div className="cart-header flex items-center justify-between">
        <h2 className="cart-title">Carrito</h2>
        <span className="badge badge-brand">{itemCount} items</span>
      </div>

      <div className="cart-items flex-1 scrollbar-hidden">
        {items.map((item) => {
          const product = getProduct(item.productId)
          if (!product) return null

          return (
            <CartItem
              key={item.productId}
              productId={item.productId}
              name={product.name}
              unitPrice={product.price}
              quantity={item.quantity}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onRemove={onRemove}
            />
          )
        })}
      </div>

      <div className="cart-footer">
        <div className="cart-total">
          <span className="cart-total-label">Total</span>
          <span className="cart-total-value">{formatCurrency(total)}</span>
        </div>

        <PaymentSelector
          selected={paymentMethod}
          onSelect={onPaymentMethodChange}
        />

        <Button
          variant="primary"
          size="lg"
          className="w-full mt-4"
          disabled={!canComplete}
          loading={loading}
          onClick={onCompleteSale}
        >
          Completar Venta
        </Button>
      </div>
    </div>
  )
}
