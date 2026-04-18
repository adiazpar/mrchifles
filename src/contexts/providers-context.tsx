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

  const ensureLoaded = useCallback((): Promise<void> => {
    if (isLoaded) return Promise.resolve()
    if (inFlight.current) return inFlight.current
    inFlight.current = fetchProviders()
    return inFlight.current
  }, [isLoaded, fetchProviders])

  const refetch = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current
    inFlight.current = fetchProviders()
    return inFlight.current
  }, [fetchProviders])

  // Stale-while-revalidate: always refetch on mount. If sessionStorage
  // hydrated us with a stale list (e.g. from a prior session where a
  // mutation bypassed the cache), this overwrites it with ground truth.
  // Cache is kept for instant first paint; it is not a source of truth.
  useEffect(() => {
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ProvidersContext.Provider
      value={{ providers, setProviders, isLoading, isLoaded, error, ensureLoaded, refetch }}
    >
      {children}
    </ProvidersContext.Provider>
  )
}
