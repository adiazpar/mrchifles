'use client'

import React, { useRef, useCallback } from 'react'
import { IonNav } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import type { Product, Provider } from '@kasero/shared/types'
import type { ExpandedOrder, OrderFormItem } from '@/lib/products'
import {
  OrderNavRefContext,
  OrderDetailCallbacksContext,
  type OrderDetailCallbacks,
} from './order-steps/OrderNavContext'
import { OrderOverviewStep } from './order-steps/OrderOverviewStep'
import { EditOrderStep } from './order-steps/EditOrderStep'
import { ReceiveOrderStep } from './order-steps/ReceiveOrderStep'
import { DeleteOrderConfirmStep } from './order-steps/DeleteOrderConfirmStep'

// ============================================
// PROPS INTERFACE
// ============================================

export interface OrderDetailModalProps {
  // Modal state
  isOpen: boolean
  /** Step to open on (0 = overview, 1 = edit, 3 = receive, 5 = delete). Default 0. */
  initialStep?: number
  onClose: () => void
  onExitComplete: () => void

  // Order being viewed
  order: ExpandedOrder | null

  // Products and providers
  products: Product[]
  providers: Provider[]

  // Form state for editing
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

  // Operation states
  isSaving: boolean
  isReceiving: boolean
  isDeleting: boolean
  error: string

  // Success states
  orderReceived: boolean
  orderDeleted: boolean
  editOrderSaved: boolean

  // Handlers
  onInitializeEditForm: (order: ExpandedOrder) => void
  onInitializeReceiveQuantities: (order: ExpandedOrder) => void
  onSaveEditOrder: () => Promise<boolean>
  onReceiveOrder: () => Promise<boolean>
  onDeleteOrder: () => Promise<boolean>
  getReceiptUrl: (order: ExpandedOrder) => string | null

  // Edit change detection
  initialEditSnapshot: string

  // Permissions
  canDelete: boolean
  /** Owners + partners; false for employees. Gates Edit and Receive buttons
   *  on the pending-order overview footer. */
  canManage: boolean
}

// ============================================
// COMPONENT
// ============================================

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
  const navRef = useRef<HTMLIonNavElement>(null)

  // When the modal was opened at a sub-step directly (via a swipe-tray action
  // on the list row), the overview isn't part of the user's mental stack —
  // so Back / Cancel should dismiss the modal rather than slide to overview.
  const openedFromSwipe = initialStep !== 0

  const handleClose = useCallback(() => {
    onClose()
    onExitComplete()
  }, [onClose, onExitComplete])

  // Stable root thunks — all hooks must run before any early return.
  // useCallback with [] so IonNav never remounts the step stack due to a new
  // function reference on every parent render.
  const editOrderStepRoot = useCallback(() => <EditOrderStep />, [])
  const receiveOrderStepRoot = useCallback(() => <ReceiveOrderStep />, [])
  const deleteOrderStepRoot = useCallback(() => <DeleteOrderConfirmStep />, [])
  const overviewStepRoot = useCallback(() => <OrderOverviewStep />, [])

  if (!order) return null

  // Resolve which step component is the IonNav root based on initialStep.
  // 0 = overview, 1 = edit, 3 = receive, 5 = delete
  let rootStep: () => React.ReactElement
  if (initialStep === 1) rootStep = editOrderStepRoot
  else if (initialStep === 3) rootStep = receiveOrderStepRoot
  else if (initialStep === 5) rootStep = deleteOrderStepRoot
  else rootStep = overviewStepRoot

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

  return (
    <OrderDetailCallbacksContext.Provider value={callbacks}>
      <OrderNavRefContext.Provider value={navRef}>
        <ModalShell rawContent isOpen={isOpen} onClose={handleClose}>
          <IonNav ref={navRef} root={rootStep} swipeGesture={false} />
        </ModalShell>
      </OrderNavRefContext.Provider>
    </OrderDetailCallbacksContext.Provider>
  )
}
