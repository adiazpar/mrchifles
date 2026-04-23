'use client'

import { useState, useEffect, useCallback } from 'react'
import { useBusiness } from '@/contexts/business-context'
import { fetchDeduped } from '@/lib/fetch'
import { apiPost, ApiError } from '@/lib/api-client'
import { useApiMessage } from './useApiMessage'
import { scopedCache, CACHE_KEYS } from './useSessionCache'

interface PendingTransfer {
  code: string
  toEmail: string
  status: 'pending'
  expiresAt: string
}

/**
 * Reads the cached pending transfer for this business, filtering out
 * entries whose expiry has already passed. Used to seed the hook's
 * initial state so the banner and nav badge paint instantly on refresh
 * instead of waiting for the network round trip.
 */
function readCachedTransfer(businessId: string | null): PendingTransfer | null {
  if (!businessId) return null
  const cached = scopedCache<PendingTransfer | null>(CACHE_KEYS.PENDING_TRANSFER, businessId).get()
  if (!cached) return null
  if (new Date(cached.expiresAt).getTime() <= Date.now()) return null
  return cached
}

function writeCachedTransfer(
  businessId: string | null,
  transfer: PendingTransfer | null,
): void {
  if (!businessId) return
  const cache = scopedCache<PendingTransfer | null>(CACHE_KEYS.PENDING_TRANSFER, businessId)
  if (transfer) cache.set(transfer)
  else cache.clear()
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
  // Seed from sessionStorage so a refresh paints the banner/badge
  // immediately; the useEffect below still revalidates over the network.
  const [transfer, setTransfer] = useState<PendingTransfer | null>(() =>
    readCachedTransfer(businessId),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  const refresh = useCallback(async () => {
    if (!businessId || !isOwner) {
      setTransfer(null)
      writeCachedTransfer(businessId, null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetchDeduped(`/api/businesses/${businessId}/transfer/pending`)
      const data = await res.json()
      const next: PendingTransfer | null = res.ok ? (data.transfer ?? null) : null
      setTransfer(next)
      writeCachedTransfer(businessId, next)
    } catch (err) {
      console.error('Fetch pending transfer error:', err)
      setTransfer(null)
      writeCachedTransfer(businessId, null)
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
      writeCachedTransfer(businessId, null)
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
