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
import type { Provider } from '@/types'

type ProvidersUpdater = Provider[] | ((prev: Provider[]) => Provider[])

interface ProvidersContextValue {
  providers: Provider[]
  setProviders: (updater: ProvidersUpdater) => void
  isLoading: boolean
  isLoaded: boolean
  error: string
  ensureLoaded: () => Promise<void>
  refetch: () => Promise<void>
}

const ProvidersContext = createContext<ProvidersContextValue | null>(null)

export function useProviders(): ProvidersContextValue {
  const ctx = useContext(ProvidersContext)
  if (!ctx) {
    throw new Error('useProviders must be used within a ProvidersProvider')
  }
  return ctx
}

interface ProvidersProviderProps {
  businessId: string
  children: ReactNode
}

// Business-scoped providers store. Shared by the /products new-order
// flow, the provider detail page (order modal dropdown + stats), and
// the /providers list page so that a mutation on one surface (e.g.
// deleting a provider from its detail page) is reflected on the
// others without stale-cache bugs. Mirrors OrdersContext.
//
// Mount with key={businessId} so state is re-initialized when the
// user switches businesses.
export function ProvidersProvider({ businessId, children }: ProvidersProviderProps) {
  const cache = useRef(
    createSessionCache<Provider[]>(`${CACHE_KEYS.PROVIDERS}_${businessId}`)
  )
  const [providers, setProvidersState] = useState<Provider[]>(
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

  const setProviders = useCallback((updater: ProvidersUpdater) => {
    setProvidersState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      cache.current.set(next)
      return next
    })
  }, [])

  const fetchProviders = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetchDeduped(
        `/api/businesses/${businessId}/providers`
      )
      const data = await response.json()
      if (response.ok && data.success) {
        setProvidersState(data.providers)
        cache.current.set(data.providers)
        setIsLoaded(true)
      } else {
        setError(data.error || 'Failed to load providers')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers')
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
    inFlight.current = fetchProviders()
    return isLoaded ? Promise.resolve() : inFlight.current
  }, [isLoaded, fetchProviders])

  const refetch = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current
    hasRevalidated.current = true
    inFlight.current = fetchProviders()
    return inFlight.current
  }, [fetchProviders])

  return (
    <ProvidersContext.Provider
      value={{ providers, setProviders, isLoading, isLoaded, error, ensureLoaded, refetch }}
    >
      {children}
    </ProvidersContext.Provider>
  )
}
