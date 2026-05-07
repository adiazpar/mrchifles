'use client'

import { useState, useCallback } from 'react'
import { apiPost, ApiError } from '@/lib/api-client'
import { useApiMessage } from './useApiMessage'
import { useBusiness } from '@/contexts/business-context'
import { usePageTransition } from '@/contexts/page-transition-context'

interface UseLeaveBusinessReturn {
  leave: () => Promise<boolean>
  isSubmitting: boolean
  error: string
  reset: () => void
}

export function useLeaveBusiness(): UseLeaveBusinessReturn {
  const { businessId } = useBusiness()
  const { clearCachedBusiness } = usePageTransition()
  const translateApiMessage = useApiMessage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const leave = useCallback(async () => {
    if (!businessId) return false
    setIsSubmitting(true)
    setError('')
    try {
      await apiPost(`/api/businesses/${businessId}/leave`, {})
      clearCachedBusiness(businessId)
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

  const reset = useCallback(() => setError(''), [])

  return { leave, isSubmitting, error, reset }
}
