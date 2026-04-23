'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { fetchDeduped } from '@/lib/fetch'
import { useAuth } from '@/contexts/auth-context'
import { useProducts } from '@/contexts/products-context'
import { useApiMessage } from '@/hooks/useApiMessage'
import { useProductSettings } from '@/contexts/product-settings-context'
import { ApiError, apiDelete, apiPost, apiPatchForm, apiPostForm } from '@/lib/api-client'
import { NewOrderModal, OrderDetailModal } from '@/components/products'
import { sortProducts } from '@/lib/products'
import type { Product, Provider } from '@/types'
import type { ExpandedOrder, OrderFormItem } from '@/lib/products'

interface UseOrderFlowsOptions {
  businessId: string
  /**
   * Active providers used by the new-order modal's provider dropdown. The
   * caller is responsible for filtering since different pages have
   * different rules for what counts as "selectable" (e.g. provider detail
   * pre-selects the current one even if inactive).
   */
  providers: Provider[]
  setOrders: (
    updater: ExpandedOrder[] | ((prev: ExpandedOrder[]) => ExpandedOrder[])
  ) => void
  canDelete: boolean
}

interface UseOrderFlowsReturn {
  // Modal open state
  isNewOrderOpen: boolean
  isOrderDetailOpen: boolean
  viewingOrder: ExpandedOrder | null

  // Error shared across both flows (consumers can also show it)
  error: string
  setError: (message: string) => void

  // Openers / closers
  openNewOrder: (presetProviderId?: string) => void
  closeNewOrder: () => void
  /**
   * Open the order detail modal. Pass `initialAction` to land directly on a
   * sub-step (receive / edit / delete confirm) — used by the swipe tray on
   * list rows so a single tap takes the user straight to the action.
   */
  openOrderDetail: (order: ExpandedOrder, initialAction?: 'receive' | 'edit' | 'delete') => void
  closeOrderDetail: () => void

  // Ready-to-render modal JSX. Drop into your page: {orderFlows.modals}
  modals: ReactNode
}

/**
 * Convert an HTML "YYYY-MM-DD" date-input value into an ISO timestamp
 * anchored at local midnight of that calendar day.
 *
 * `new Date("2026-04-19")` parses as UTC midnight, which for any user
 * west of UTC becomes the previous day once formatted back in local
 * time — a classic off-by-one on date-only pickers. Building the Date
 * from local components avoids that shift.
 */
function dateOnlyToLocalISO(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return new Date(ymd).toISOString()
  return new Date(y, m - 1, d).toISOString()
}

/**
 * Inverse of dateOnlyToLocalISO: extract the local calendar day from a
 * stored ISO timestamp as "YYYY-MM-DD", suitable for seeding an HTML
 * date input. Using the UTC date (via .toISOString().split('T')[0])
 * would shift by a day for users east or west of UTC.
 */
function isoToLocalDateOnly(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Encapsulates the New Order and Order Detail modal flows (create, edit,
 * receive, delete) so multiple pages can reuse them without duplicating ~250
 * lines of state and handlers.
 *
 * Consumer owns the orders list and passes in `setOrders`. After each
 * mutation the hook calls `setOrders` with the optimistic/refetched result.
 * Pages that need to filter (e.g. provider detail showing only this
 * provider's orders) can wrap `setOrders` with a filter on the way in.
 */
export function useOrderFlows(opts: UseOrderFlowsOptions): UseOrderFlowsReturn {
  const { businessId, providers, setOrders, canDelete } = opts

  const tOrders = useTranslations('orders')
  const translateApiMessage = useApiMessage()
  const { user } = useAuth()
  // Products come from the shared ProductsProvider. Refetching here keeps
  // the provider's in-memory state + session cache in sync, so every page
  // that reads useProducts() sees stock changes from the receive flow
  // without any caller-level plumbing.
  const {
    products,
    ensureLoaded: ensureProductsLoaded,
    refetch: refetchProducts,
  } = useProducts()

  // Every page using this hook (products, providers, provider detail) opens
  // the new-order / order-detail modals that drive a product picker, so make
  // sure products are loaded. ensureLoaded is idempotent across callers.
  useEffect(() => {
    ensureProductsLoaded()
  }, [ensureProductsLoaded])
  // The new-order picker respects the user's Products-tab sort preference
  // (saved on the businesses row via useProductSettings). That way
  // whatever ordering the user curated on the Products page applies
  // everywhere they pick products — consistent muscle memory on the
  // Products page Orders tab, provider detail, and providers list swipe.
  const { settings: productSettings, categories: productCategories } = useProductSettings()

  // ===== Modal state =====
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<ExpandedOrder | null>(null)
  // Step the OrderDetailModal should open on. Set by openOrderDetail when a
  // swipe-tray action jumps straight into receive/edit/delete. Modal reads
  // this at mount only; subsequent opens reset it to 0 (overview).
  const [detailInitialStep, setDetailInitialStep] = useState(0)

  // ===== Order form state =====
  const [orderItems, setOrderItems] = useState<OrderFormItem[]>([])
  const [orderTotal, setOrderTotal] = useState('')
  const [orderEstimatedArrival, setOrderEstimatedArrival] = useState('')
  const [orderReceiptFile, setOrderReceiptFile] = useState<File | null>(null)
  const [orderReceiptPreview, setOrderReceiptPreview] = useState<string | null>(null)
  const [orderProvider, setOrderProvider] = useState('')
  const [orderProductSearchQuery, setOrderProductSearchQuery] = useState('')

  // ===== Operation state =====
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [isReceiving, setIsReceiving] = useState(false)
  const [isDeletingOrder, setIsDeletingOrder] = useState(false)
  const [orderSaved, setOrderSaved] = useState(false)
  const [orderReceived, setOrderReceived] = useState(false)
  const [orderDeleted, setOrderDeleted] = useState(false)
  const [editOrderSaved, setEditOrderSaved] = useState(false)
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({})
  const [initialEditSnapshot, setInitialEditSnapshot] = useState('')

  // Error shared across modals so they can display it
  const [error, setError] = useState('')

  // ===== Filtered + sorted products for the New Order picker =====
  const orderFilteredProducts = useMemo(() => {
    const query = orderProductSearchQuery.trim().toLowerCase()
    const filtered = query
      ? products.filter(p => p.active && p.name.toLowerCase().includes(query))
      : products.filter(p => p.active)
    // Default to name_asc if the user hasn't saved a preference yet so the
    // picker is never at the API's arbitrary row order.
    const sortBy = productSettings?.sortPreference ?? 'name_asc'
    return sortProducts(filtered, sortBy, productCategories)
  }, [products, orderProductSearchQuery, productSettings?.sortPreference, productCategories])

  // ===== Form manipulation =====
  const resetOrderForm = useCallback(() => {
    setOrderItems([])
    setOrderTotal('')
    setOrderEstimatedArrival('')
    setOrderReceiptFile(null)
    setOrderReceiptPreview(null)
    setOrderProvider('')
    setOrderProductSearchQuery('')
    setError('')
    setOrderSaved(false)
    setOrderReceived(false)
    setOrderDeleted(false)
    setEditOrderSaved(false)
  }, [])

  const handleToggleProductInOrder = useCallback((product: Product) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) return prev.filter(item => item.product.id !== product.id)
      return [...prev, { product, quantity: 1 }]
    })
  }, [])

  const handleUpdateOrderItemQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) return
    setOrderItems(prev => prev.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    ))
  }, [])

  // ===== Mutations =====
  const handleSaveOrder = useCallback(async (): Promise<boolean> => {
    if (orderItems.length === 0) {
      setError(tOrders('error_add_at_least_one_product'))
      return false
    }
    const totalNum = parseFloat(orderTotal)
    if (isNaN(totalNum) || totalNum <= 0) {
      setError(tOrders('error_enter_total_paid'))
      return false
    }

    setIsSavingOrder(true)
    setError('')

    const formData = new FormData()
    formData.append('date', new Date().toISOString())
    formData.append('total', totalNum.toString())
    formData.append('status', 'pending')
    if (orderEstimatedArrival) formData.append('estimatedArrival', dateOnlyToLocalISO(orderEstimatedArrival))
    if (orderReceiptFile) formData.append('receipt', orderReceiptFile)
    if (orderProvider) formData.append('providerId', orderProvider)
    formData.append('items', JSON.stringify(orderItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
    }))))

    try {
      const data = await apiPostForm<{ order: ExpandedOrder }>(
        `/api/businesses/${businessId}/orders`,
        formData,
      )

      if (data.order) {
        setOrders(prev => [data.order, ...prev])
        setOrderSaved(true)
        return true
      }

      setError(tOrders('error_failed_to_save_order'))
      return false
    } catch (err) {
      console.error('Error saving order:', err)
      setError(tOrders('error_failed_to_save_order'))
      return false
    } finally {
      setIsSavingOrder(false)
    }
  }, [businessId, orderItems, orderTotal, orderEstimatedArrival, orderReceiptFile, orderProvider, setOrders, tOrders])

  const handleSaveEditOrder = useCallback(async (): Promise<boolean> => {
    if (!viewingOrder) return false
    if (orderItems.length === 0) {
      setError(tOrders('error_add_at_least_one_product'))
      return false
    }
    const totalNum = parseFloat(orderTotal)
    if (isNaN(totalNum) || totalNum <= 0) {
      setError(tOrders('error_enter_total_paid'))
      return false
    }

    setIsSavingOrder(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('total', totalNum.toString())
      if (orderEstimatedArrival) {
        formData.append('estimatedArrival', dateOnlyToLocalISO(orderEstimatedArrival))
      }
      if (orderReceiptFile) formData.append('receipt', orderReceiptFile)
      formData.append('providerId', orderProvider || '')
      formData.append('items', JSON.stringify(orderItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
      }))))

      try {
        await apiPatchForm(`/api/businesses/${businessId}/orders/${viewingOrder.id}`, formData)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(
            err.envelope
              ? translateApiMessage(err.envelope)
              : tOrders('error_failed_to_save_order')
          )
          return false
        }
        throw err
      }

      // Refetch all orders so the list (and any consumer-provided filter) reflect the edit
      const ordersResponse = await fetchDeduped(`/api/businesses/${businessId}/orders`)
      const ordersData = await ordersResponse.json()
      if (ordersResponse.ok && ordersData.success) {
        setOrders(ordersData.orders)
      }

      setEditOrderSaved(true)
      return true
    } catch (err) {
      console.error('Error saving order:', err)
      setError(tOrders('error_failed_to_save_order'))
      return false
    } finally {
      setIsSavingOrder(false)
    }
  }, [businessId, orderItems, orderTotal, orderEstimatedArrival, orderReceiptFile, orderProvider, viewingOrder, setOrders, tOrders, translateApiMessage])

  const handleReceiveOrder = useCallback(async (): Promise<boolean> => {
    if (!viewingOrder || !user) return false

    setIsReceiving(true)
    setError('')

    try {
      try {
        await apiPost(`/api/businesses/${businessId}/orders/${viewingOrder.id}/receive`, {
          receivedQuantities,
        })
      } catch (err) {
        if (err instanceof ApiError) {
          setError(
            err.envelope
              ? translateApiMessage(err.envelope)
              : tOrders('error_failed_to_receive_order')
          )
          return false
        }
        throw err
      }

      // Orders: always refetch so any server-side computed fields (status,
      // totals) are fresh. Products: receiving increments stock in the DB,
      // so we refetch via the shared provider — every page reading from
      // useProducts() sees the new stock without any page-local plumbing.
      const [ordersResponse] = await Promise.all([
        fetchDeduped(`/api/businesses/${businessId}/orders`),
        refetchProducts(),
      ])
      const ordersData = await ordersResponse.json()
      if (ordersResponse.ok && ordersData.success) {
        setOrders(ordersData.orders)
      }

      setOrderReceived(true)
      return true
    } catch (err) {
      console.error('Error receiving order:', err)
      setError(tOrders('error_failed_to_receive_order'))
      return false
    } finally {
      setIsReceiving(false)
    }
  }, [businessId, viewingOrder, user, receivedQuantities, refetchProducts, setOrders, tOrders, translateApiMessage])

  const handleDeleteOrder = useCallback(async (): Promise<boolean> => {
    if (!viewingOrder) return false

    setIsDeletingOrder(true)
    setError('')

    try {
      await apiDelete(`/api/businesses/${businessId}/orders/${viewingOrder.id}`)

      setOrders(prev => prev.filter(o => o.id !== viewingOrder.id))
      setOrderDeleted(true)
      return true
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.envelope
            ? translateApiMessage(err.envelope)
            : tOrders('error_failed_to_delete_order')
        )
        return false
      }
      console.error('Error deleting order:', err)
      setError(tOrders('error_failed_to_delete_order'))
      return false
    } finally {
      setIsDeletingOrder(false)
    }
  }, [businessId, viewingOrder, setOrders, tOrders, translateApiMessage])

  const initializeReceiveQuantities = useCallback((order: ExpandedOrder) => {
    const items = order.expand?.['order_items(order)'] || []
    const initialQuantities: Record<string, number> = {}
    for (const item of items) {
      initialQuantities[item.id] = item.quantity
    }
    setReceivedQuantities(initialQuantities)
  }, [])

  const initializeEditForm = useCallback((order: ExpandedOrder) => {
    const items = order.expand?.['order_items(order)'] || []
    const formItems = items.map(item => {
      const fullProduct = products.find(p => p.id === item.productId)
      return fullProduct ? { product: fullProduct, quantity: item.quantity } : null
    }).filter((item): item is OrderFormItem => item !== null)
    setOrderItems(formItems)
    const total = order.total.toString()
    const provider = order.providerId || ''
    const arrival = order.estimatedArrival ? isoToLocalDateOnly(order.estimatedArrival) : ''
    setOrderTotal(total)
    setOrderEstimatedArrival(arrival)
    setOrderProvider(provider)
    setOrderReceiptFile(null)
    setOrderReceiptPreview(null)
    setOrderProductSearchQuery('')
    setError('')
    setEditOrderSaved(false)
    setInitialEditSnapshot(JSON.stringify({
      items: formItems.map(i => ({ id: i.product.id, qty: i.quantity })),
      total,
      provider,
      arrival,
      hasReceipt: false,
    }))
  }, [products])

  const getOrderReceiptUrl = useCallback((order: ExpandedOrder): string | null => {
    return order.receipt || null
  }, [])

  // ===== Openers / closers =====
  const openNewOrder = useCallback((presetProviderId?: string) => {
    resetOrderForm()
    if (presetProviderId) setOrderProvider(presetProviderId)
    setIsNewOrderOpen(true)
  }, [resetOrderForm])

  const closeNewOrder = useCallback(() => setIsNewOrderOpen(false), [])

  const openOrderDetail = useCallback((order: ExpandedOrder, initialAction?: 'receive' | 'edit' | 'delete') => {
    setViewingOrder(order)
    setReceivedQuantities({})
    setOrderReceived(false)
    setOrderDeleted(false)
    setEditOrderSaved(false)
    setError('')

    // Seed the form state for edit/receive so landing directly on those steps
    // renders with data populated (normally done by the step-button click in
    // the overview). Delete has no form state to prime.
    if (initialAction === 'edit') initializeEditForm(order)
    if (initialAction === 'receive') initializeReceiveQuantities(order)

    const stepByAction: Record<'receive' | 'edit' | 'delete', number> = {
      edit: 1,
      receive: 3,
      delete: 5,
    }
    setDetailInitialStep(initialAction ? stepByAction[initialAction] : 0)
    setIsOrderDetailOpen(true)
  }, [initializeEditForm, initializeReceiveQuantities])

  const closeOrderDetail = useCallback(() => setIsOrderDetailOpen(false), [])

  // ===== Ready-to-render modals =====
  const modals = (
    <>
      <NewOrderModal
        isOpen={isNewOrderOpen}
        onClose={closeNewOrder}
        products={products}
        providers={providers}
        filteredProducts={orderFilteredProducts}
        orderItems={orderItems}
        onToggleProduct={handleToggleProductInOrder}
        onUpdateQuantity={handleUpdateOrderItemQuantity}
        setOrderItems={setOrderItems}
        orderTotal={orderTotal}
        onOrderTotalChange={setOrderTotal}
        orderEstimatedArrival={orderEstimatedArrival}
        onOrderEstimatedArrivalChange={setOrderEstimatedArrival}
        orderReceiptFile={orderReceiptFile}
        onOrderReceiptFileChange={setOrderReceiptFile}
        orderReceiptPreview={orderReceiptPreview}
        onOrderReceiptPreviewChange={setOrderReceiptPreview}
        orderProvider={orderProvider}
        onOrderProviderChange={setOrderProvider}
        productSearchQuery={orderProductSearchQuery}
        onProductSearchQueryChange={setOrderProductSearchQuery}
        isSaving={isSavingOrder}
        error={error}
        orderSaved={orderSaved}
        onSaveOrder={handleSaveOrder}
        onResetForm={resetOrderForm}
      />
      {viewingOrder && (
        <OrderDetailModal
          isOpen={isOrderDetailOpen}
          initialStep={detailInitialStep}
          onClose={closeOrderDetail}
          onExitComplete={() => {
            setViewingOrder(null)
            setReceivedQuantities({})
            setDetailInitialStep(0)
          }}
          order={viewingOrder}
          products={products}
          providers={providers}
          orderItems={orderItems}
          setOrderItems={setOrderItems}
          onToggleProduct={handleToggleProductInOrder}
          onUpdateQuantity={handleUpdateOrderItemQuantity}
          orderTotal={orderTotal}
          onOrderTotalChange={setOrderTotal}
          orderEstimatedArrival={orderEstimatedArrival}
          onOrderEstimatedArrivalChange={setOrderEstimatedArrival}
          orderProvider={orderProvider}
          onOrderProviderChange={setOrderProvider}
          orderReceiptFile={orderReceiptFile}
          onOrderReceiptFileChange={setOrderReceiptFile}
          orderReceiptPreview={orderReceiptPreview}
          onOrderReceiptPreviewChange={setOrderReceiptPreview}
          isSaving={isSavingOrder}
          isReceiving={isReceiving}
          isDeleting={isDeletingOrder}
          error={error}
          orderReceived={orderReceived}
          orderDeleted={orderDeleted}
          editOrderSaved={editOrderSaved}
          onInitializeEditForm={initializeEditForm}
          onInitializeReceiveQuantities={initializeReceiveQuantities}
          onSaveEditOrder={handleSaveEditOrder}
          onReceiveOrder={handleReceiveOrder}
          onDeleteOrder={handleDeleteOrder}
          getReceiptUrl={getOrderReceiptUrl}
          initialEditSnapshot={initialEditSnapshot}
          canDelete={canDelete}
        />
      )}
    </>
  )

  return {
    isNewOrderOpen,
    isOrderDetailOpen,
    viewingOrder,
    error,
    setError,
    openNewOrder,
    closeNewOrder,
    openOrderDetail,
    closeOrderDetail,
    modals,
  }
}
