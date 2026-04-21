'use client'

import { useState, useCallback } from 'react'
import { apiPost, ApiError } from '@/lib/api-client'
import { useApiMessage } from './useApiMessage'
import { useBusiness } from '@/contexts/business-context'

export interface UseTransferOwnershipReturn {
  submit: (toEmail: string) => Promise<boolean>
  isSubmitting: boolean
  error: string
  reset: () => void
}

export function useTransferOwnership(): UseTransferOwnershipReturn {
  const { businessId } = useBusiness()
  const translateApiMessage = useApiMessage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const reset = useCallback(() => setError(''), [])

  const submit = useCallback(async (toEmail: string) => {
    if (!businessId) return false
    setIsSubmitting(true)
    setError('')
    try {
      await apiPost(`/api/businesses/${businessId}/transfer/initiate`, { toEmail })
      return true
    } catch (err) {
      console.error('Initiate transfer error:', err)
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

  return { submit, isSubmitting, error, reset }
}
