'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { fetchDeduped } from '@/lib/fetch'
import { useAuth } from '@/contexts/auth-context'
import { useApiMessage } from '@/hooks/useApiMessage'
import { hasMessageEnvelope } from '@/lib/api-messages'
import { NewOrderModal, OrderDetailModal } from '@/components/products'
import type { Product, Provider } from '@/types'
import type { ExpandedOrder, OrderFormItem } from '@/lib/products'

export interface UseOrderFlowsOptions {
  businessId: string
  products: Product[]
  providers: Provider[]
  setOrders: (
    updater: ExpandedOrder[] | ((prev: ExpandedOrder[]) => ExpandedOrder[])
  ) => void
  /**
   * Only needed by consumers that display product stock, so the receive flow
   * can refresh the in-memory product list after the API updates stock.
   * Omit on pages that don't care about product state (e.g. provider detail).
   */
  setProducts?: (
    updater: Product[] | ((prev: Product[]) => Product[])
  ) => void
  canDelete: boolean
}

export interface UseOrderFlowsReturn {
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
  openOrderDetail: (order: ExpandedOrder) => void
  closeOrderDetail: () => void

  // Ready-to-render modal JSX. Drop into your page: {orderFlows.modals}
  modals: ReactNode
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
  const { businessId, products, providers, setOrders, setProducts, canDelete } = opts

  const tOrders = useTranslations('orders')
  const translateApiMessage = useApiMessage()
  const { user } = useAuth()

  // ===== Modal state =====
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<ExpandedOrder | null>(null)

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

  // ===== Filtered products for the New Order picker =====
  const orderFilteredProducts = useMemo(() => {
    if (!orderProductSearchQuery.trim()) return products.filter(p => p.active)
    const query = orderProductSearchQuery.toLowerCase()
    return products.filter(p => p.active && p.name.toLowerCase().includes(query))
  }, [products, orderProductSearchQuery])

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
    if (orderEstimatedArrival) formData.append('estimatedArrival', new Date(orderEstimatedArrival).toISOString())
    if (orderReceiptFile) formData.append('receipt', orderReceiptFile)
    if (orderProvider) formData.append('providerId', orderProvider)
    formData.append('items', JSON.stringify(orderItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
    }))))

    try {
      const response = await fetch(`/api/businesses/${businessId}/orders`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (response.ok && data.success && data.order) {
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
        formData.append('estimatedArrival', new Date(orderEstimatedArrival).toISOString())
      }
      if (orderReceiptFile) formData.append('receipt', orderReceiptFile)
      formData.append('providerId', orderProvider || '')
      formData.append('items', JSON.stringify(orderItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
      }))))

      const response = await fetch(`/api/businesses/${businessId}/orders/${viewingOrder.id}`, {
        method: 'PATCH',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(
          hasMessageEnvelope(data)
            ? translateApiMessage(data)
            : tOrders('error_failed_to_save_order')
        )
        return false
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
      const response = await fetch(`/api/businesses/${businessId}/orders/${viewingOrder.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receivedQuantities }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(
          hasMessageEnvelope(data)
            ? translateApiMessage(data)
            : tOrders('error_failed_to_receive_order')
        )
        return false
      }

      // Refetch orders always; products only if the consumer cares about stock.
      const fetches: Promise<Response>[] = [
        fetchDeduped(`/api/businesses/${businessId}/orders`),
      ]
      if (setProducts) {
        fetches.push(fetchDeduped(`/api/businesses/${businessId}/products`))
      }
      const responses = await Promise.all(fetches)
      const payloads = await Promise.all(responses.map(r => r.json()))
      const [ordersData, productsData] = payloads

      if (responses[0].ok && ordersData.success) {
        setOrders(ordersData.orders)
      }
      if (setProducts && responses[1]?.ok && productsData?.success) {
        setProducts(productsData.products)
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
  }, [businessId, viewingOrder, user, receivedQuantities, setProducts, setOrders, tOrders, translateApiMessage])

  const handleDeleteOrder = useCallback(async (): Promise<boolean> => {
    if (!viewingOrder) return false

    setIsDeletingOrder(true)
    setError('')

    try {
      const response = await fetch(`/api/businesses/${businessId}/orders/${viewingOrder.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(
          hasMessageEnvelope(data)
            ? translateApiMessage(data)
            : tOrders('error_failed_to_delete_order')
        )
        return false
      }

      setOrders(prev => prev.filter(o => o.id !== viewingOrder.id))
      setOrderDeleted(true)
      return true
    } catch (err) {
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
    const arrival = order.estimatedArrival ? new Date(order.estimatedArrival).toISOString().split('T')[0] : ''
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

  const openOrderDetail = useCallback((order: ExpandedOrder) => {
    setViewingOrder(order)
    setReceivedQuantities({})
    setOrderReceived(false)
    setOrderDeleted(false)
    setEditOrderSaved(false)
    setError('')
    setIsOrderDetailOpen(true)
  }, [])

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
          onClose={closeOrderDetail}
          onExitComplete={() => {
            setViewingOrder(null)
            setReceivedQuantities({})
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
