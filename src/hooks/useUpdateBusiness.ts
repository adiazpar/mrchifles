'use client'

import { useState, useCallback } from 'react'
import { apiPatchForm, ApiError } from '@/lib/api-client'
import { useApiMessage } from './useApiMessage'
import { useBusiness } from '@/contexts/business-context'

export interface UpdateBusinessPayload {
  name?: string
  type?: string
  locale?: string
  logoFile?: File | null
  removeLogo?: boolean
}

export interface UseUpdateBusinessReturn {
  update: (payload: UpdateBusinessPayload) => Promise<boolean>
  isSubmitting: boolean
  error: string
  reset: () => void
}

export function useUpdateBusiness(): UseUpdateBusinessReturn {
  const { businessId, refreshBusiness } = useBusiness()
  const translateApiMessage = useApiMessage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const reset = useCallback(() => setError(''), [])

  const update = useCallback(async (payload: UpdateBusinessPayload) => {
    if (!businessId) return false
    setIsSubmitting(true)
    setError('')
    try {
      const fd = new FormData()
      if (payload.name !== undefined) fd.set('name', payload.name)
      if (payload.type !== undefined) fd.set('type', payload.type)
      if (payload.locale !== undefined) fd.set('locale', payload.locale)
      if (payload.removeLogo) fd.set('removeLogo', 'true')
      if (payload.logoFile) fd.set('logo', payload.logoFile)

      await apiPatchForm(`/api/businesses/${businessId}`, fd)
      await refreshBusiness()
      return true
    } catch (err) {
      console.error('Update business error:', err)
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : '',
      )
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [businessId, refreshBusiness, translateApiMessage])

  return { update, isSubmitting, error, reset }
}
