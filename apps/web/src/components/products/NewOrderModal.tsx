'use client'

import { useRef, useCallback, useEffect } from 'react'
import { IonNav } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import type { Product, Provider } from '@kasero/shared/types'
import type { OrderFormItem } from '@/lib/products'
import {
  OrderNavRefContext,
  NewOrderCallbacksContext,
  type NewOrderCallbacks,
} from './order-steps/OrderNavContext'
import { SelectProductsStep } from './order-steps/SelectProductsStep'

// ============================================
// PROPS INTERFACE
// ============================================

export interface NewOrderModalProps {
  // Modal state
  isOpen: boolean
  onClose: () => void

  // Products and providers
  products: Product[]
  providers: Provider[]
  filteredProducts: Product[]

  // Form state
  orderItems: OrderFormItem[]
  onToggleProduct: (product: Product) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  setOrderItems: React.Dispatch<React.SetStateAction<OrderFormItem[]>>

  orderTotal: string
  onOrderTotalChange: (total: string) => void
  orderEstimatedArrival: string
  onOrderEstimatedArrivalChange: (date: string) => void
  orderReceiptFile: File | null
  onOrderReceiptFileChange: (file: File | null) => void
  orderReceiptPreview: string | null
  onOrderReceiptPreviewChange: (preview: string | null) => void
  orderProvider: string
  onOrderProviderChange: (providerId: string) => void
  productSearchQuery: string
  onProductSearchQueryChange: (query: string) => void

  // Operation states
  isSaving: boolean
  error: string

  // Success state
  orderSaved: boolean

  // Handlers
  onSaveOrder: () => Promise<boolean>
  onResetForm: () => void
}

// ============================================
// COMPONENT
// ============================================

export function NewOrderModal({
  isOpen,
  onClose,
  products,
  providers,
  filteredProducts,
  orderItems,
  onToggleProduct,
  onUpdateQuantity,
  setOrderItems,
  orderTotal,
  onOrderTotalChange,
  orderEstimatedArrival,
  onOrderEstimatedArrivalChange,
  orderReceiptFile,
  onOrderReceiptFileChange,
  orderReceiptPreview,
  onOrderReceiptPreviewChange,
  orderProvider,
  onOrderProviderChange,
  productSearchQuery,
  onProductSearchQueryChange,
  isSaving,
  error,
  orderSaved,
  onSaveOrder,
  onResetForm,
}: NewOrderModalProps) {
  const navRef = useRef<HTMLIonNavElement>(null)

  // Delayed form reset — runs ~250ms after the modal animates closed.
  // Calling onResetForm synchronously alongside onClose would mutate
  // useOrderFlows state mid-dismiss-animation, re-rendering IonNav
  // children during the transition and leaving a stale "active view"
  // reference in the IonRouterOutlet stack machine — which silently
  // breaks subsequent business-tab switching. Same pattern used by
  // AddProductModal / EditProductModal.
  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(onResetForm, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, onResetForm])

  const callbacks: NewOrderCallbacks = {
    onClose,
    onResetForm,
    products,
    providers,
    filteredProducts,
    orderItems,
    onToggleProduct,
    onUpdateQuantity,
    setOrderItems,
    orderTotal,
    onOrderTotalChange,
    orderEstimatedArrival,
    onOrderEstimatedArrivalChange,
    orderReceiptFile,
    onOrderReceiptFileChange,
    orderReceiptPreview,
    onOrderReceiptPreviewChange,
    orderProvider,
    onOrderProviderChange,
    productSearchQuery,
    onProductSearchQueryChange,
    isSaving,
    error,
    orderSaved,
    onSaveOrder,
  }

  // Stable root thunk — useCallback with [] so IonNav never remounts the step
  // stack due to a new function reference produced on every parent render.
  const selectProductsRoot = useCallback(() => <SelectProductsStep />, [])

  return (
    <NewOrderCallbacksContext.Provider value={callbacks}>
      <OrderNavRefContext.Provider value={navRef}>
        <ModalShell rawContent isOpen={isOpen} onClose={onClose}>
          <IonNav ref={navRef} root={selectProductsRoot} swipeGesture={false} />
        </ModalShell>
      </OrderNavRefContext.Provider>
    </NewOrderCallbacksContext.Provider>
  )
}
