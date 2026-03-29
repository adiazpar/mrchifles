import { useCallback } from 'react'

/**
 * Hook for caching data in sessionStorage.
 *
 * Useful for caching API responses to avoid redundant fetches when
 * the user navigates away and returns to a page.
 *
 * @example
 * const productsCache = useSessionCache<Product[]>('products')
 *
 * // Check cache on mount
 * const cached = productsCache.get()
 * if (cached) setProducts(cached)
 *
 * // Update cache when data changes
 * productsCache.set(newProducts)
 *
 * // Clear cache on logout
 * productsCache.clear()
 */
export function useSessionCache<T>(key: string) {
  const get = useCallback((): T | null => {
    if (typeof window === 'undefined') return null
    try {
      const cached = sessionStorage.getItem(key)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }, [key])

  const set = useCallback((data: T) => {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.setItem(key, JSON.stringify(data))
    } catch {
      // Storage error (quota exceeded, etc.), ignore
    }
  }, [key])

  const clear = useCallback(() => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(key)
  }, [key])

  return { get, set, clear }
}

/**
 * Creates standalone cache functions for use outside of React components.
 * Useful for initializing state in useState callbacks.
 *
 * @example
 * const { get, set, clear } = createSessionCache<Product[]>('products')
 *
 * const [products, setProducts] = useState<Product[]>(() => get() || [])
 */
export function createSessionCache<T>(key: string) {
  const get = (): T | null => {
    if (typeof window === 'undefined') return null
    try {
      const cached = sessionStorage.getItem(key)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }

  const set = (data: T) => {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.setItem(key, JSON.stringify(data))
    } catch {
      // Storage error, ignore
    }
  }

  const clear = () => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(key)
  }

  return { get, set, clear }
}

// Pre-defined cache keys for common data
export const CACHE_KEYS = {
  PRODUCTS: 'products_cache',
  PROVIDERS: 'providers_cache',
  ORDERS: 'orders_cache',
  CATEGORIES: 'categories_cache',
} as const
