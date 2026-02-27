'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { IconTransfer, IconClose, IconClock } from '@/components/icons'
import { Spinner } from '@/components/ui'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

interface IncomingTransfer {
  code: string
  fromUser: {
    id: string
    name: string
  } | null
  status: 'pending' | 'accepted'
  expiresAt: string
}

export function TransferBanner() {
  const router = useRouter()
  const { user, pb } = useAuth()
  const [transfer, setTransfer] = useState<IncomingTransfer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)

  // Fetch incoming transfer on mount
  useEffect(() => {
    // Don't check for owners (they initiate transfers, not receive them)
    if (!user || user.role === 'owner') {
      setIsLoading(false)
      return
    }

    const fetchIncomingTransfer = async () => {
      try {
        const response = await fetch(`${POCKETBASE_URL}/api/transfer/incoming`, {
          headers: {
            'Authorization': pb.authStore.token,
          },
        })
        const data = await response.json()
        setTransfer(data.transfer || null)
      } catch (err) {
        console.error('Error fetching incoming transfer:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchIncomingTransfer()
  }, [user, pb])

  const handleAccept = useCallback(async () => {
    if (!transfer) return

    setIsAccepting(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/transfer/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ code: transfer.code }),
      })

      const result = await response.json()

      if (result.success) {
        // Redirect to settings to show the accepted state
        router.push('/ajustes')
        // Refresh the page to update the user's role display
        window.location.reload()
      }
    } catch (err) {
      console.error('Accept transfer error:', err)
    } finally {
      setIsAccepting(false)
    }
  }, [transfer, pb, router])

  const formatTimeRemaining = (expiresAt: string): string => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return 'Expirado'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Don't show if loading, dismissed, no transfer, or user is owner
  if (isLoading || isDismissed || !transfer || user?.role === 'owner') {
    return null
  }

  return (
    <div className="transfer-banner">
      <div className="transfer-banner-content">
        <div className="transfer-banner-icon">
          <IconTransfer width={24} height={24} />
        </div>

        <div className="transfer-banner-text">
          <p className="transfer-banner-title">
            Transferencia de propiedad
          </p>
          <p className="transfer-banner-subtitle">
            <strong>{transfer.fromUser?.name || 'El propietario'}</strong> quiere transferirte la propiedad del negocio
          </p>
        </div>

        <div className="transfer-banner-time">
          <IconClock width={14} height={14} />
          <span>{formatTimeRemaining(transfer.expiresAt)}</span>
        </div>

        <div className="transfer-banner-actions">
          <button
            type="button"
            onClick={handleAccept}
            className="btn btn-primary btn-sm"
            disabled={isAccepting}
          >
            {isAccepting ? <Spinner /> : 'Aceptar'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="transfer-banner-dismiss"
          aria-label="Cerrar"
        >
          <IconClose width={18} height={18} />
        </button>
      </div>
    </div>
  )
}
