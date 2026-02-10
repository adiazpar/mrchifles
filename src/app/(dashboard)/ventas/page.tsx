'use client'

import { useState, useCallback, useEffect } from 'react'
import { PageHeader } from '@/components/layout'
import { ProductGrid, Cart, PaymentMethod } from '@/components/sales'
import { useToast } from '@/components/ui'
import { IconCalendar } from '@/components/icons'
import { formatDate } from '@/lib/utils'

// Mock products for demo - will be replaced with PocketBase data
const MOCK_PRODUCTS = [
  { id: '1', name: 'Chifles Natural', price: 5.0 },
  { id: '2', name: 'Chifles con Sal', price: 5.0 },
  { id: '3', name: 'Chifles Tocino', price: 6.0 },
  { id: '4', name: 'Chifles Picante', price: 6.0 },
  { id: '5', name: 'Chifles Ajo', price: 6.0 },
  { id: '6', name: 'Chifles BBQ', price: 6.5 },
  { id: '7', name: 'Chifles Mix', price: 8.0 },
  { id: '8', name: 'Combo Familiar', price: 15.0 },
]

interface CartItem {
  productId: string
  quantity: number
}

export default function VentasPage() {
  const [products] = useState(MOCK_PRODUCTS)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)
  const { addToast } = useToast()

  const today = formatDate(new Date())

  const handleSelectProduct = useCallback((productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId)
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { productId, quantity: 1 }]
    })
  }, [])

  const handleIncrement = useCallback((productId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    )
  }, [])

  const handleDecrement = useCallback((productId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    )
  }, [])

  const handleRemove = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }, [])

  const handleCompleteSale = useCallback(async () => {
    if (cart.length === 0 || !paymentMethod) return

    setIsProcessing(true)

    // Simulate API call - will be replaced with PocketBase
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const total = cart.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)
      return sum + (product?.price || 0) * item.quantity
    }, 0)

    addToast('success', `Venta completada por S/ ${total.toFixed(2)}`)

    // Reset cart
    setCart([])
    setPaymentMethod(null)
    setIsProcessing(false)
    setIsMobileCartOpen(false)
  }, [cart, paymentMethod, products, addToast])

  // Calculate cart total for mobile preview
  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)
    return sum + (product?.price || 0) * item.quantity
  }, 0)

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Handle escape key to close mobile cart
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileCartOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <div className="flex flex-col h-screen lg:h-auto">
      <PageHeader
        title="Ventas"
        subtitle={today}
        actions={
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <IconCalendar className="w-4 h-4" />
            <span className="hidden sm:inline">Hoy</span>
          </div>
        }
      />

      {/* Desktop layout: side by side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Products section */}
        <div className="flex-1 lg:flex-[2] overflow-y-auto main-content">
          <ProductGrid
            products={products}
            cart={cart}
            onSelectProduct={handleSelectProduct}
          />
        </div>

        {/* Cart sidebar - desktop only */}
        <div className="hidden lg:block lg:flex-1 border-l border-border bg-bg-surface overflow-hidden">
          <Cart
            items={cart}
            products={products}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onCompleteSale={handleCompleteSale}
            loading={isProcessing}
          />
        </div>
      </div>

      {/* Mobile cart preview bar */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-mobile-nav left-0 right-0 bg-bg-surface border-t border-border p-3 z-sticky">
          <button
            type="button"
            className="w-full btn btn-primary flex items-center justify-between"
            onClick={() => setIsMobileCartOpen(true)}
          >
            <span className="flex items-center gap-2">
              <span className="badge bg-white text-brand">{cartItemCount}</span>
              <span>Ver carrito</span>
            </span>
            <span className="font-display font-bold">S/ {cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Mobile cart modal */}
      {isMobileCartOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-modal-backdrop animate-fadeIn"
            onClick={() => setIsMobileCartOpen(false)}
          />
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-modal bg-bg-surface rounded-t-2xl animate-fadeInUp max-h-[85vh] overflow-hidden">
            <div className="w-12 h-1 bg-border rounded-full mx-auto my-3" />
            <Cart
              items={cart}
              products={products}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onRemove={handleRemove}
              onCompleteSale={handleCompleteSale}
              loading={isProcessing}
            />
          </div>
        </>
      )}
    </div>
  )
}
