'use client'

import { useState, useEffect, useCallback } from 'react'
import { useBusiness } from '@/contexts/business-context'
import { fetchDeduped } from '@/lib/fetch'
import { apiPost, ApiError } from '@/lib/api-client'
import { useApiMessage } from './useApiMessage'

export interface PendingTransfer {
  code: string
  toEmail: string
  status: 'pending'
  expiresAt: string
}

export interface UsePendingTransferReturn {
  transfer: PendingTransfer | null
  isLoading: boolean
  error: string
  isCancelling: boolean
  cancel: () => Promise<void>
  refresh: () => Promise<void>
}

export function usePendingTransfer(): UsePendingTransferReturn {
  const { businessId, isOwner } = useBusiness()
  const translateApiMessage = useApiMessage()
  const [transfer, setTransfer] = useState<PendingTransfer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  const refresh = useCallback(async () => {
    if (!businessId || !isOwner) {
      setTransfer(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetchDeduped(`/api/businesses/${businessId}/transfer/pending`)
      const data = await res.json()
      setTransfer(res.ok ? (data.transfer ?? null) : null)
    } catch (err) {
      console.error('Fetch pending transfer error:', err)
      setTransfer(null)
    } finally {
      setIsLoading(false)
    }
  }, [businessId, isOwner])

  useEffect(() => {
    refresh()
  }, [refresh])

  const cancel = useCallback(async () => {
    if (!businessId || !transfer) return
    setIsCancelling(true)
    setError('')
    try {
      await apiPost(`/api/businesses/${businessId}/transfer/cancel`, { code: transfer.code })
      setTransfer(null)
    } catch (err) {
      console.error('Cancel transfer error:', err)
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : '',
      )
    } finally {
      setIsCancelling(false)
    }
  }, [businessId, transfer, translateApiMessage])

  return { transfer, isLoading, error, isCancelling, cancel, refresh }
}
