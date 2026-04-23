'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
  // Whether the first consumer on this mount has already triggered the
  // SWR revalidation. Flips once and stays true for the life of the
  // provider (a business switch remounts via key={businessId}).
  const hasRevalidated = useRef(false)

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

  // Lazy load + stale-while-revalidate. The first consumer to call this per
  // mount kicks off the fetch; subsequent callers either await the in-flight
  // promise or no-op. When a sessionStorage cache hydrated the initial state
  // we return immediately so consumers paint instantly, and revalidate in
  // the background so a stale cache can't serve as ground truth.
  const ensureLoaded = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current
    if (hasRevalidated.current) return Promise.resolve()
    hasRevalidated.current = true
    inFlight.current = fetchOrders()
    return isLoaded ? Promise.resolve() : inFlight.current
  }, [isLoaded, fetchOrders])

  const refetch = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current
    hasRevalidated.current = true
    inFlight.current = fetchOrders()
    return inFlight.current
  }, [fetchOrders])

  // Memoize the context value so consumers only re-render when one of
  // these fields actually changes. Without this, every provider render
  // rebuilds the object and fans out a re-render to every useOrders()
  // consumer — meaningful because the Products page, provider detail
  // page, and Orders tab all subscribe.
  const value = useMemo<OrdersContextValue>(
    () => ({ orders, setOrders, isLoading, isLoaded, error, ensureLoaded, refetch }),
    [orders, setOrders, isLoading, isLoaded, error, ensureLoaded, refetch],
  )

  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  )
}
