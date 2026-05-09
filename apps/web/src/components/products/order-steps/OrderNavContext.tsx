import { createContext, useContext } from 'react'
import type { Product, Provider } from '@kasero/shared/types'
import type { ExpandedOrder, OrderFormItem } from '@/lib/products'

// ---------------------------------------------------------------------------
// Nav ref context — steps call navRef.current?.push / .pop to navigate.
// ---------------------------------------------------------------------------

export const OrderNavRefContext = createContext<React.RefObject<HTMLIonNavElement | null> | null>(null)

export function useOrderNavRef(): React.RefObject<HTMLIonNavElement | null> {
  const ctx = useContext(OrderNavRefContext)
  if (!ctx) throw new Error('useOrderNavRef must be used inside NewOrderModal or OrderDetailModal')
  return ctx
}

// ---------------------------------------------------------------------------
// Shared callbacks + state for NewOrderModal steps
// ---------------------------------------------------------------------------

export interface NewOrderCallbacks {
  onClose: () => void
  onResetForm: () => void

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
}

export const NewOrderCallbacksContext = createContext<NewOrderCallbacks | null>(null)

export function useNewOrderCallbacks(): NewOrderCallbacks {
  const ctx = useContext(NewOrderCallbacksContext)
  if (!ctx) throw new Error('useNewOrderCallbacks must be used inside NewOrderModal')
  return ctx
}

// ---------------------------------------------------------------------------
// Shared callbacks + state for OrderDetailModal steps
// ---------------------------------------------------------------------------

export interface OrderDetailCallbacks {
  onClose: () => void
  onExitComplete: () => void

  order: ExpandedOrder
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

  /** True when opened at a sub-step (e.g. from swipe tray) rather than overview. */
  openedFromSwipe: boolean
}

export const OrderDetailCallbacksContext = createContext<OrderDetailCallbacks | null>(null)

export function useOrderDetailCallbacks(): OrderDetailCallbacks {
  const ctx = useContext(OrderDetailCallbacksContext)
  if (!ctx) throw new Error('useOrderDetailCallbacks must be used inside OrderDetailModal')
  return ctx
}

// ---------------------------------------------------------------------------
// Unified callbacks for shared steps that work in BOTH the new-order and
// edit-order flows (OrderTotalStep, OrderDetailsStep). Returns whichever
// context is mounted. The shape exposed is the intersection of fields
// these steps actually read — total, arrival, provider, receipt — plus
// `error` and `onClose`. Save-callback differs between flows so it's
// NOT exposed here; each step that needs save-on-this-button pushes a
// flow-specific step instead.
// ---------------------------------------------------------------------------

export interface SharedOrderFieldCallbacks {
  providers: Provider[]
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
  error: string
  onClose: () => void
}

export function useOrderCallbacks(): SharedOrderFieldCallbacks {
  const newCtx = useContext(NewOrderCallbacksContext)
  const editCtx = useContext(OrderDetailCallbacksContext)
  const ctx = newCtx ?? editCtx
  if (!ctx) {
    throw new Error('useOrderCallbacks must be used inside NewOrderModal or OrderDetailModal')
  }
  return {
    providers: ctx.providers,
    orderTotal: ctx.orderTotal,
    onOrderTotalChange: ctx.onOrderTotalChange,
    orderEstimatedArrival: ctx.orderEstimatedArrival,
    onOrderEstimatedArrivalChange: ctx.onOrderEstimatedArrivalChange,
    orderProvider: ctx.orderProvider,
    onOrderProviderChange: ctx.onOrderProviderChange,
    orderReceiptFile: ctx.orderReceiptFile,
    onOrderReceiptFileChange: ctx.onOrderReceiptFileChange,
    orderReceiptPreview: ctx.orderReceiptPreview,
    onOrderReceiptPreviewChange: ctx.onOrderReceiptPreviewChange,
    isSaving: ctx.isSaving,
    error: ctx.error,
    onClose: ctx.onClose,
  }
}
