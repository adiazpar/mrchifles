'use client'

import { useState, useCallback } from 'react'
import { apiDelete, ApiError } from '@/lib/api-client'
import { useApiMessage } from './useApiMessage'
import { useBusiness } from '@/contexts/business-context'
import { usePageTransition } from '@/contexts/page-transition-context'
import { clearHubBusinessesCache, clearPerBusinessCaches } from './useSessionCache'

interface UseDeleteBusinessReturn {
  deleteBusiness: () => Promise<boolean>
  isSubmitting: boolean
  error: string
}

export function useDeleteBusiness(): UseDeleteBusinessReturn {
  const { businessId } = useBusiness()
  const { clearCachedBusiness } = usePageTransition()
  const translateApiMessage = useApiMessage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const deleteBusiness = useCallback(async () => {
    if (!businessId) return false
    setIsSubmitting(true)
    setError('')
    try {
      await apiDelete(`/api/businesses/${businessId}`)
      // Drop every client-side cache that referenced this business:
      // the page-transition role cache (already cleared), the hub
      // businesses list, and every per-business sessionStorage entry
      // (products, providers, orders, categories, settings, pending
      // transfer). Otherwise the next hub render or a later business
      // switch would show ghost data from the now-deleted record.
      clearCachedBusiness(businessId)
      clearHubBusinessesCache()
      clearPerBusinessCaches(businessId)
      return true
    } catch (err) {
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : '',
      )
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [businessId, translateApiMessage, clearCachedBusiness])

  return { deleteBusiness, isSubmitting, error }
}
