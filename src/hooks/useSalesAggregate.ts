'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ApiError, apiRequest } from '@/lib/api-client'
import { CACHE_KEYS, scopedCache } from '@/hooks/useSessionCache'
import { useApiMessage } from '@/hooks/useApiMessage'
import { isFresh } from '@/lib/freshness'
import { useRevalidateOnFocus } from '@/hooks/useRevalidateOnFocus'
import type { SalesAggregateResponse } from '@/types/sales-aggregate'
import type { ApiResponse } from '@/lib/api-client'

type SalesAggregateApiResponse = ApiResponse & SalesAggregateResponse

interface UseSalesAggregateResult {
  data: SalesAggregateResponse | null
  isLoaded: boolean
  isLoading: boolean
  error: string
  refetch: () => Promise<void>
}

/**
 * Fetches and caches the bundled sales-reports payload for the no-session
 * sales surface. Owns sessionStorage cache + focus revalidation. Stale-on-
 * mount: render cached data immediately, then revalidate. Matches the
 * SalesContext / SalesSessionsContext pattern.
 */
export function useSalesAggregate(businessId: string): UseSalesAggregateResult {
  const t = useTranslations('sales.reports')
  const translateApiMessage = useApiMessage()
  const cache = useRef(
    scopedCache<SalesAggregateResponse>(CACHE_KEYS.SALES_AGGREGATE, businessId),
  )
  // stale-on-mount: render cached data instantly; lastFetchedAt stays null
  // so the first ensureLoaded() always fires regardless of cache hit.
  const [data, setData] = useState<SalesAggregateResponse | null>(() =>
    cache.current.get(),
  )
  const [isLoaded, setIsLoaded] = useState(data !== null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const lastFetchedAt = useRef<number | null>(null)
  const inFlight = useRef<Promise<void> | null>(null)

  const fetchAggregate = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError('')
    try {
      const res = await apiRequest<SalesAggregateApiResponse>(
        `/api/businesses/${businessId}/sales/aggregate`,
      )
      const next: SalesAggregateResponse = {
        dailyRevenue: res.dailyRevenue,
        topProducts: res.topProducts,
        paymentSplit: res.paymentSplit,
        hourly: res.hourly,
      }
      setData(next)
      cache.current.set(next)
      setIsLoaded(true)
      lastFetchedAt.current = Date.now()
    } catch (err) {
      if (err instanceof ApiError && err.envelope) {
        setError(translateApiMessage(err.envelope))
      } else {
        setError(t('error_load_failed'))
      }
    } finally {
      setIsLoading(false)
      inFlight.current = null
    }
  }, [businessId, t, translateApiMessage])

  const ensureLoaded = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current
    if (isFresh(lastFetchedAt.current, Date.now())) return Promise.resolve()
    inFlight.current = fetchAggregate()
    return isLoaded ? Promise.resolve() : inFlight.current
  }, [fetchAggregate, isLoaded])

  const refetch = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current
    inFlight.current = fetchAggregate()
    return inFlight.current
  }, [fetchAggregate])

  useEffect(() => {
    if (!businessId) return
    void ensureLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  useRevalidateOnFocus(ensureLoaded)

  return { data, isLoaded, isLoading, error, refetch }
}
