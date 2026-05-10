'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ModalShell } from '@/components/ui'
import type { Product, Provider } from '@kasero/shared/types'
import type { OrderFormItem } from '@/lib/products'
import {
  NewOrderNavContext,
  NewOrderCallbacksContext,
  type NewOrderCallbacks,
  type OrderNav,
} from './order-steps/OrderNavContext'
import { SelectProductsStep } from './order-steps/SelectProductsStep'
import { OrderTotalStep } from './order-steps/OrderTotalStep'
import { OrderDetailsStep } from './order-steps/OrderDetailsStep'
import { ConfirmOrderStep } from './order-steps/ConfirmOrderStep'
import { NewOrderSuccessStep } from './order-steps/NewOrderSuccessStep'

// ============================================
// STEP TYPE
// ============================================

// Each entry in the stack identifies which step body to render. The
// edit-mode jumps from ConfirmOrderStep push a -edit suffix so the
// shared step body knows its CTA pops back to confirm rather than
// pushing forward in the wizard.
type Step =
  | 'select-forward'
  | 'total-forward'
  | 'details-forward'
  | 'confirm'
  | 'select-edit'
  | 'total-edit'
  | 'details-edit'
  | 'success'

const INITIAL_STACK: Step[] = ['select-forward']

// ============================================
// PROPS INTERFACE
// ============================================

export interface NewOrderModalProps {
  isOpen: boolean
  onClose: () => void

  products: Product[]
  providers: Provider[]
  filteredProducts: Product[]

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

  isSaving: boolean
  error: string

  orderSaved: boolean

  onSaveOrder: () => Promise<boolean>
  onResetForm: () => void
}

// ============================================
// COMPONENT
// ============================================

/**
 * New-order wizard. Pattern 1 (single step-stack, conditional body
 * rendering inside one ModalShell). The previous IonNav-based version
 * registered each step's `<IonPage>` against the surrounding
 * IonRouterOutlet's StackManager — including from inside an IonModal
 * portal — which polluted the outlet's view-stack tracking and made
 * the next iOS slide pop drag for ~1-2s when the modal had been opened
 * on a same-outlet drilldown (e.g. ProviderDetailPage). See
 * `OrderNavContext` for the full note.
 */
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
  const [stack, setStack] = useState<Step[]>(INITIAL_STACK)

  // Reset to root every time the modal opens. The same modal component
  // is reused across consecutive new-order flows.
  useEffect(() => {
    if (isOpen) setStack(INITIAL_STACK)
  }, [isOpen])

  // Delayed form reset — runs ~250ms after the modal animates closed
  // so useOrderFlows state mutations don't race the dismiss animation.
  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(onResetForm, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, onResetForm])

  const push = useCallback((step: string) => {
    setStack((s) => [...s, step as Step])
  }, [])
  const pop = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  }, [])

  const nav: OrderNav = useMemo(
    () => ({ push, pop, depth: stack.length }),
    [push, pop, stack.length],
  )

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

  const current = stack[stack.length - 1]

  return (
    <NewOrderCallbacksContext.Provider value={callbacks}>
      <NewOrderNavContext.Provider value={nav}>
        <ModalShell rawContent isOpen={isOpen} onClose={onClose}>
          {current === 'select-forward' && <SelectProductsStep mode="forward" />}
          {current === 'select-edit' && <SelectProductsStep mode="edit" />}
          {current === 'total-forward' && <OrderTotalStep mode="forward" />}
          {current === 'total-edit' && <OrderTotalStep mode="edit" />}
          {current === 'details-forward' && <OrderDetailsStep mode="forward" />}
          {current === 'details-edit' && <OrderDetailsStep mode="edit" />}
          {current === 'confirm' && <ConfirmOrderStep />}
          {current === 'success' && <NewOrderSuccessStep />}
        </ModalShell>
      </NewOrderNavContext.Provider>
    </NewOrderCallbacksContext.Provider>
  )
}
