'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { fetchDeduped } from '@/lib/fetch'
import { apiPost, ApiError } from '@/lib/api-client'
import { useApiMessage } from './useApiMessage'

interface IncomingTransfer {
  code: string
  status: 'pending'
  expiresAt: string
  business: {
    id: string
    name: string
  }
  fromUser: {
    id: string
    name: string
  } | null
}

export interface UseIncomingTransferReturn {
  transfer: IncomingTransfer | null
  isLoading: boolean
  error: string
  isAccepting: boolean
  isDeclining: boolean
  handleAccept: () => Promise<boolean>
  handleDecline: () => Promise<void>
}

/**
 * User-level hook that fetches any pending incoming ownership transfer
 * for the current user.
 *
 * Lives outside the business context because the recipient may not yet
 * be a member of the business -- they only become one after the
 * transfer is completed.
 *
 * On accept/decline the hook reloads the page so every context
 * (auth, business list, transfer state) picks up the new ownership
 * state.
 */
export function useIncomingTransfer(): UseIncomingTransferReturn {
  const { user } = useAuth()
  const translateApiMessage = useApiMessage()
  const [transfer, setTransfer] = useState<IncomingTransfer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)

  const userId = user?.id
  useEffect(() => {
    if (!userId) {
      setTransfer(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function fetchIncoming() {
      setIsLoading(true)
      try {
        const response = await fetchDeduped('/api/transfer/incoming')
        const data = await response.json()
        if (cancelled) return
        if (response.ok) {
          setTransfer(data.transfer ?? null)
        } else {
          setTransfer(null)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Fetch incoming transfer error:', err)
        setTransfer(null)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchIncoming()

    return () => {
      cancelled = true
    }
  }, [userId])

  const handleAccept = useCallback(async (): Promise<boolean> => {
    if (!transfer) return false
    setIsAccepting(true)
    setError('')
    try {
      await apiPost('/api/transfer/accept', { code: transfer.code })
      // The caller (IncomingTransferModal) owns the post-success flow:
      // it paints the celebration step, then reloads so every context
      // picks up the new ownership + membership state. Don't reload
      // here or the Lottie never paints.
      return true
    } catch (err) {
      console.error('Accept transfer error:', err)
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : '',
      )
      return false
    } finally {
      setIsAccepting(false)
    }
  }, [transfer, translateApiMessage])

  const handleDecline = useCallback(async () => {
    if (!transfer) return
    setIsDeclining(true)
    setError('')
    try {
      await apiPost('/api/transfer/decline', { code: transfer.code })
      setTransfer(null)
    } catch (err) {
      console.error('Decline transfer error:', err)
      setError(
        err instanceof ApiError && err.envelope
          ? translateApiMessage(err.envelope)
          : '',
      )
    } finally {
      setIsDeclining(false)
    }
  }, [transfer, translateApiMessage])

  return {
    transfer,
    isLoading,
    error,
    isAccepting,
    isDeclining,
    handleAccept,
    handleDecline,
  }
}
