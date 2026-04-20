'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { fetchDeduped } from '@/lib/fetch'
import { CACHE_KEYS, createSessionCache } from '@/hooks'
import type { Product } from '@/types'

type ProductsUpdater =
  | Product[]
  | ((prev: Product[]) => Product[])

interface ProductsContextValue {
  products: Product[]
  setProducts: (updater: ProductsUpdater) => void
  isLoading: boolean
  isLoaded: boolean
  error: string
  ensureLoaded: () => Promise<void>
  refetch: () => Promise<void>
}

const ProductsContext = createContext<ProductsContextValue | null>(null)

export function useProducts(): ProductsContextValue {
  const ctx = useContext(ProductsContext)
  if (!ctx) {
    throw new Error('useProducts must be used within a ProductsProvider')
  }
  return ctx
}

interface ProductsProviderProps {
  businessId: string
  children: ReactNode
}

// Business-scoped products store. Multiple pages (products list, orders
// flows that need the product picker, provider detail + providers list for
// the new-order swipe action) share this single source of truth so
// navigation between them doesn't trigger duplicate fetches. Lazy-loads on
// first ensureLoaded() call and persists to sessionStorage so return
// visits paint instantly.
//
// Mount this with key={businessId} so state is re-initialized when the
// user switches businesses.
export function ProductsProvider({ businessId, children }: ProductsProviderProps) {
  const cache = useRef(
    createSessionCache<Product[]>(`${CACHE_KEYS.PRODUCTS}_${businessId}`)
  )
  const [products, setProductsState] = useState<Product[]>(
    () => cache.current.get() || []
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(() => !!cache.current.get())
  const [error, setError] = useState('')
  const inFlight = useRef<Promise<void> | null>(null)

  const setProducts = useCallback((updater: ProductsUpdater) => {
    setProductsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      cache.current.set(next)
      return next
    })
  }, [])

  const fetchProducts = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetchDeduped(
        `/api/businesses/${businessId}/products`
      )
      const data = await response.json()
      if (response.ok && data.success) {
        setProductsState(data.products)
        cache.current.set(data.products)
        setIsLoaded(true)
      } else {
        setError(data.error || 'Failed to load products')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setIsLoading(false)
      inFlight.current = null
    }
  }, [businessId])

  const ensureLoaded = useCallback((): Promise<void> => {
    if (isLoaded) return Promise.resolve()
    if (inFlight.current) return inFlight.current
    inFlight.current = fetchProducts()
    return inFlight.current
  }, [isLoaded, fetchProducts])

  const refetch = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current
    inFlight.current = fetchProducts()
    return inFlight.current
  }, [fetchProducts])

  // Stale-while-revalidate: always refetch on mount so a stale
  // sessionStorage cache (e.g. from a prior session) can't serve as the
  // source of truth. Cache is kept for instant first paint only.
  useEffect(() => {
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ProductsContext.Provider
      value={{ products, setProducts, isLoading, isLoaded, error, ensureLoaded, refetch }}
    >
      {children}
    </ProductsContext.Provider>
  )
}
