'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { IconTransfer, IconClose } from '@/components/icons'

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

interface PendingTransfer {
  code: string
  toPhone: string
  status: 'pending' | 'accepted'
  expiresAt: string
  toUser?: {
    id: string
    name: string
  }
}

export function TransferBanner() {
  const router = useRouter()
  const { user, pb } = useAuth()
  const [incomingTransfer, setIncomingTransfer] = useState<IncomingTransfer | null>(null)
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  const isOwner = user?.role === 'owner'

  // Fetch transfer data on mount
  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    const fetchTransferData = async () => {
      try {
        if (isOwner) {
          // Owner: check for pending transfers that are accepted
          const response = await fetch(`${POCKETBASE_URL}/api/transfer/pending`, {
            headers: {
              'Authorization': pb.authStore.token,
            },
          })
          const data = await response.json()
          setPendingTransfer(data.transfer || null)
        } else {
          // Non-owner: check for incoming transfers
          const response = await fetch(`${POCKETBASE_URL}/api/transfer/incoming`, {
            headers: {
              'Authorization': pb.authStore.token,
            },
          })
          const data = await response.json()
          setIncomingTransfer(data.transfer || null)
        }
      } catch (err) {
        console.error('Error fetching transfer:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransferData()
  }, [user, pb, isOwner])

  const handleGoToSettings = useCallback(() => {
    router.push('/ajustes')
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
            <IconTransfer width={24} height={24} />
          </div>

          <div className="transfer-banner-text">
            <p className="transfer-banner-title">
              Transferencia lista para confirmar
            </p>
            <p className="transfer-banner-subtitle">
              <strong>{pendingTransfer.toUser?.name || 'El destinatario'}</strong> ha aceptado la transferencia. Confirma con tu PIN para completar.
            </p>
          </div>

          <div className="transfer-banner-actions">
            <button
              type="button"
              onClick={handleGoToSettings}
              className="btn btn-primary btn-sm"
            >
              Confirmar
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

  // Recipient banner: show when there's a pending incoming transfer
  if (!isOwner && incomingTransfer) {
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
              <strong>{incomingTransfer.fromUser?.name || 'El propietario'}</strong> quiere transferirte la propiedad del negocio
            </p>
          </div>

          <div className="transfer-banner-actions">
            <button
              type="button"
              onClick={handleGoToSettings}
              className="btn btn-primary btn-sm"
            >
              Aceptar
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

  return null
}
