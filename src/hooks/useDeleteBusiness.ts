'use client'

import { useState, useCallback } from 'react'
import { apiDelete, ApiError } from '@/lib/api-client'
import { useApiMessage } from './useApiMessage'
import { useBusiness } from '@/contexts/business-context'

export interface UseDeleteBusinessReturn {
  deleteBusiness: () => Promise<boolean>
  isSubmitting: boolean
  error: string
}

export function useDeleteBusiness(): UseDeleteBusinessReturn {
  const { businessId } = useBusiness()
  const translateApiMessage = useApiMessage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const deleteBusiness = useCallback(async () => {
    if (!businessId) return false
    setIsSubmitting(true)
    setError('')
    try {
      await apiDelete(`/api/businesses/${businessId}`)
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

  return { deleteBusiness, isSubmitting, error }
}
