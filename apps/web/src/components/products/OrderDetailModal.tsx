'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ModalShell } from '@/components/ui'
import type { Product, Provider } from '@kasero/shared/types'
import type { ExpandedOrder, OrderFormItem } from '@/lib/products'
import {
  OrderDetailNavContext,
  OrderDetailCallbacksContext,
  type OrderDetailCallbacks,
  type OrderNav,
} from './order-steps/OrderNavContext'
import { OrderOverviewStep } from './order-steps/OrderOverviewStep'
import { EditOrderStep } from './order-steps/EditOrderStep'
import { EditItemsStep } from './order-steps/EditItemsStep'
import { OrderTotalStep } from './order-steps/OrderTotalStep'
import { OrderDetailsStep } from './order-steps/OrderDetailsStep'
import { EditOrderSuccessStep } from './order-steps/EditOrderSuccessStep'
import { ReceiveOrderStep } from './order-steps/ReceiveOrderStep'
import { ReceiveOrderSuccessStep } from './order-steps/ReceiveOrderSuccessStep'
import { DeleteOrderConfirmStep } from './order-steps/DeleteOrderConfirmStep'
import { DeleteOrderSuccessStep } from './order-steps/DeleteOrderSuccessStep'

// ============================================
// STEP TYPE
// ============================================

type Step =
  | 'overview'
  | 'edit'
  | 'edit-items'
  | 'edit-total'
  | 'edit-details'
  | 'edit-success'
  | 'receive'
  | 'receive-success'
  | 'delete'
  | 'delete-success'

// initialStep prop -> starting stack. Numbers map to the legacy
// initialStep contract (0=overview, 1=edit, 3=receive, 5=delete) so
// the swipe-tray callsites in useOrderFlows don't need updating.
function stackFromInitialStep(n: number): Step[] {
  if (n === 1) return ['edit']
  if (n === 3) return ['receive']
  if (n === 5) return ['delete']
  return ['overview']
}

// ============================================
// PROPS INTERFACE
// ============================================

export interface OrderDetailModalProps {
  isOpen: boolean
  /** Step to open on (0 = overview, 1 = edit, 3 = receive, 5 = delete). Default 0. */
  initialStep?: number
  onClose: () => void
  onExitComplete: () => void

  order: ExpandedOrder | null

  products: Product[]
  providers: Provider[]

  orderItems: OrderFormItem[]
  setOrderItems: React.Dispatch<React.SetStateAction<OrderFormItem[]>>
  onToggleProduct: (product: Product) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  orderTotal: string
  onOrderTotalChange: (total: string) => void
  orderEstimatedArrival: string
  onOrderEstimatedArrivalChange: (date: string) => void
  orderProvider: string
  onOrderProviderChange: (providerId: string) => void
  orderReceiptFile: File | null
  onOrderReceiptFileChange: (file: File | null) => void
  orderReceiptPreview: string | null
  onOrderReceiptPreviewChange: (preview: string | null) => void

  isSaving: boolean
  isReceiving: boolean
  isDeleting: boolean
  error: string

  orderReceived: boolean
  orderDeleted: boolean
  editOrderSaved: boolean

  onInitializeEditForm: (order: ExpandedOrder) => void
  onInitializeReceiveQuantities: (order: ExpandedOrder) => void
  onSaveEditOrder: () => Promise<boolean>
  onReceiveOrder: () => Promise<boolean>
  onDeleteOrder: () => Promise<boolean>
  getReceiptUrl: (order: ExpandedOrder) => string | null

  initialEditSnapshot: string

  canDelete: boolean
  canManage: boolean
}

// ============================================
// COMPONENT
// ============================================

/**
 * Order detail / edit / receive / delete flow. Pattern 1, single
 * step-stack inside one ModalShell. See `OrderNavContext` for why we
 * removed IonNav: the per-step `<IonPage>` components were registering
 * against the surrounding IonRouterOutlet's StackManager from inside an
 * IonModal portal, which made same-outlet pop animations drag for
 * ~1-2s on drilldown pages (most visibly on ProviderDetailPage).
 */
export function OrderDetailModal({
  isOpen,
  initialStep = 0,
  onClose,
  onExitComplete,
  order,
  products,
  providers,
  orderItems,
  setOrderItems,
  onToggleProduct,
  onUpdateQuantity,
  orderTotal,
  onOrderTotalChange,
  orderEstimatedArrival,
  onOrderEstimatedArrivalChange,
  orderProvider,
  onOrderProviderChange,
  orderReceiptFile,
  onOrderReceiptFileChange,
  orderReceiptPreview,
  onOrderReceiptPreviewChange,
  isSaving,
  isReceiving,
  isDeleting,
  error,
  orderReceived,
  orderDeleted,
  editOrderSaved,
  onInitializeEditForm,
  onInitializeReceiveQuantities,
  onSaveEditOrder,
  onReceiveOrder,
  onDeleteOrder,
  getReceiptUrl,
  initialEditSnapshot,
  canDelete,
  canManage,
}: OrderDetailModalProps) {
  const [stack, setStack] = useState<Step[]>(() => stackFromInitialStep(initialStep))

  // Reset to the initialStep-derived stack every time the modal opens so
  // a stale stack from a prior order's flow doesn't persist.
  useEffect(() => {
    if (isOpen) setStack(stackFromInitialStep(initialStep))
  }, [isOpen, initialStep])

  // Delayed cleanup — runs ~250ms after the modal animates closed.
  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(onExitComplete, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, onExitComplete])

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

  // When opened directly at a sub-step (via swipe tray), the overview
  // isn't part of the user's mental stack — back / cancel should
  // dismiss the modal rather than slide to overview. Matches the legacy
  // behavior: openedFromSwipe = initialStep !== 0.
  const openedFromSwipe = initialStep !== 0

  if (!order) return null

  const callbacks: OrderDetailCallbacks = {
    onClose,
    onExitComplete,
    order,
    products,
    providers,
    orderItems,
    setOrderItems,
    onToggleProduct,
    onUpdateQuantity,
    orderTotal,
    onOrderTotalChange,
    orderEstimatedArrival,
    onOrderEstimatedArrivalChange,
    orderProvider,
    onOrderProviderChange,
    orderReceiptFile,
    onOrderReceiptFileChange,
    orderReceiptPreview,
    onOrderReceiptPreviewChange,
    isSaving,
    isReceiving,
    isDeleting,
    error,
    orderReceived,
    orderDeleted,
    editOrderSaved,
    onInitializeEditForm,
    onInitializeReceiveQuantities,
    onSaveEditOrder,
    onReceiveOrder,
    onDeleteOrder,
    getReceiptUrl,
    initialEditSnapshot,
    canDelete,
    canManage,
    openedFromSwipe,
  }

  const current = stack[stack.length - 1]

  return (
    <OrderDetailCallbacksContext.Provider value={callbacks}>
      <OrderDetailNavContext.Provider value={nav}>
        <ModalShell rawContent isOpen={isOpen} onClose={onClose}>
          {current === 'overview' && <OrderOverviewStep />}
          {current === 'edit' && <EditOrderStep />}
          {current === 'edit-items' && <EditItemsStep />}
          {current === 'edit-total' && <OrderTotalStep mode="edit" />}
          {current === 'edit-details' && <OrderDetailsStep mode="edit" />}
          {current === 'edit-success' && <EditOrderSuccessStep />}
          {current === 'receive' && <ReceiveOrderStep />}
          {current === 'receive-success' && <ReceiveOrderSuccessStep />}
          {current === 'delete' && <DeleteOrderConfirmStep />}
          {current === 'delete-success' && <DeleteOrderSuccessStep />}
        </ModalShell>
      </OrderDetailNavContext.Provider>
    </OrderDetailCallbacksContext.Provider>
  )
}
