'use client'

import { useState, useCallback } from 'react'
import { apiPost, ApiError } from '@/lib/api-client'
import { useApiMessage } from './useApiMessage'
import { useBusiness } from '@/contexts/business-context'

export interface UseLeaveBusinessReturn {
  leave: () => Promise<boolean>
  isSubmitting: boolean
  error: string
}

export function useLeaveBusiness(): UseLeaveBusinessReturn {
  const { businessId } = useBusiness()
  const translateApiMessage = useApiMessage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const leave = useCallback(async () => {
    if (!businessId) return false
    setIsSubmitting(true)
    setError('')
    try {
      await apiPost(`/api/businesses/${businessId}/leave`, {})
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
  }, [businessId, translateApiMessage])

  return { leave, isSubmitting, error }
}
