'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { ArrowLeftRight, X } from 'lucide-react'

interface IncomingTransfer {
  code: string
  fromUser: {
    id: string
    name: string
  } | null
  status: 'pending' | 'accepted'
  expiresAt: string
}

interface PendingTransfer {
  code: string
  toEmail: string
  status: 'pending' | 'accepted'
  expiresAt: string
  toUser?: {
    id: string
    name: string
  }
}

export function TransferBanner() {
  const router = useRouter()
  const { user } = useAuth()
  const [incomingTransfer, setIncomingTransfer] = useState<IncomingTransfer | null>(null)
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  const isOwner = user?.role === 'owner'

  // Fetch transfer data on mount
  // TODO: Implement with Drizzle API routes
  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    const fetchTransferData = async () => {
      try {
        if (isOwner) {
          // Owner: check for pending transfers that are accepted
          const response = await fetch('/api/transfer/pending')
          const data = await response.json()
          if (response.ok && data.success) {
            setPendingTransfer(data.transfer || null)
          }
        } else {
          // Non-owner: check for incoming transfers
          const response = await fetch('/api/transfer/incoming')
          const data = await response.json()
          if (response.ok && data.success) {
            setIncomingTransfer(data.transfer || null)
          }
        }
      } catch (err) {
        console.error('Error fetching transfer:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransferData()
  }, [user, isOwner])

  const handleGoToSettings = useCallback(() => {
    router.push('/settings')
  }, [router])

  // Don't show if loading or dismissed
  if (isLoading || isDismissed) {
    return null
  }

  // Owner banner: show when there's an accepted transfer waiting for confirmation
  if (isOwner && pendingTransfer?.status === 'accepted') {
    return (
      <div className="transfer-banner">
        <div className="transfer-banner-content">
          <div className="transfer-banner-icon">
            <ArrowLeftRight size={24} />
          </div>

          <div className="transfer-banner-text">
            <p className="transfer-banner-title">
              Transfer ready to confirm
            </p>
            <p className="transfer-banner-subtitle">
              <strong>{pendingTransfer.toUser?.name || 'The recipient'}</strong> has accepted the transfer. Confirm with your PIN to complete.
            </p>
          </div>

          <div className="transfer-banner-actions">
            <button
              type="button"
              onClick={handleGoToSettings}
              className="btn btn-primary btn-sm"
            >
              Confirm
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="transfer-banner-dismiss"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    )
  }

  // Recipient banner: show when there's a pending or accepted incoming transfer
  if (!isOwner && incomingTransfer) {
    const isAccepted = incomingTransfer.status === 'accepted'

    return (
      <div className="transfer-banner">
        <div className="transfer-banner-content">
          <div className="transfer-banner-icon">
            <ArrowLeftRight size={24} />
          </div>

          <div className="transfer-banner-text">
            <p className="transfer-banner-title">
              {isAccepted ? 'Awaiting confirmation' : 'Ownership transfer'}
            </p>
            <p className="transfer-banner-subtitle">
              {isAccepted ? (
                <>Waiting for <strong>{incomingTransfer.fromUser?.name || 'the owner'}</strong> to confirm the transfer</>
              ) : (
                <><strong>{incomingTransfer.fromUser?.name || 'The owner'}</strong> wants to transfer ownership of the business to you</>
              )}
            </p>
          </div>

          <div className="transfer-banner-actions">
            <button
              type="button"
              onClick={handleGoToSettings}
              className="btn btn-primary btn-sm"
            >
              {isAccepted ? 'View status' : 'Accept'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="transfer-banner-dismiss"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    )
  }

  return null
}
