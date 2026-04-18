'use client'

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { fetchDeduped } from '@/lib/fetch'
import { CACHE_KEYS, createSessionCache } from '@/hooks'
import type { ExpandedOrder } from '@/lib/products'

type OrdersUpdater =
  | ExpandedOrder[]
  | ((prev: ExpandedOrder[]) => ExpandedOrder[])

interface OrdersContextValue {
  orders: ExpandedOrder[]
  setOrders: (updater: OrdersUpdater) => void
  isLoading: boolean
  isLoaded: boolean
  error: string
  ensureLoaded: () => Promise<void>
  refetch: () => Promise<void>
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext)
  if (!ctx) {
    throw new Error('useOrders must be used within an OrdersProvider')
  }
  return ctx
}

interface OrdersProviderProps {
  businessId: string
  children: ReactNode
}

// Business-scoped orders store. Multiple pages (products Orders tab,
// provider detail page) share this single source of truth so that a
// mutation on one page is reflected on the others without manual
// refetches. Lazy-loads on first ensureLoaded() call and persists to
// sessionStorage so return visits paint instantly.
//
// Mount this with key={businessId} so state is re-initialized when the
// user switches businesses.
export function OrdersProvider({ businessId, children }: OrdersProviderProps) {
  const cache = useRef(
    createSessionCache<ExpandedOrder[]>(`${CACHE_KEYS.ORDERS}_${businessId}`)
  )
  const [orders, setOrdersState] = useState<ExpandedOrder[]>(
    () => cache.current.get() || []
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(() => !!cache.current.get())
  const [error, setError] = useState('')
  const inFlight = useRef<Promise<void> | null>(null)

  const setOrders = useCallback((updater: OrdersUpdater) => {
    setOrdersState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      cache.current.set(next)
      return next
    })
  }, [])

  const fetchOrders = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetchDeduped(
        `/api/businesses/${businessId}/orders`
      )
      const data = await response.json()
      if (response.ok && data.success) {
        setOrdersState(data.orders)
        cache.current.set(data.orders)
        setIsLoaded(true)
      } else {
        setError(data.error || 'Failed to load orders')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setIsLoading(false)
      inFlight.current = null
    }
  }, [businessId])

  const ensureLoaded = useCallback((): Promise<void> => {
    if (isLoaded) return Promise.resolve()
    if (inFlight.current) return inFlight.current
    inFlight.current = fetchOrders()
    return inFlight.current
  }, [isLoaded, fetchOrders])

  const refetch = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current
    inFlight.current = fetchOrders()
    return inFlight.current
  }, [fetchOrders])

  return (
    <OrdersContext.Provider
      value={{ orders, setOrders, isLoading, isLoaded, error, ensureLoaded, refetch }}
    >
      {children}
    </OrdersContext.Provider>
  )
}
