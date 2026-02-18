'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PageHeader } from '@/components/layout'
import { Spinner } from '@/components/ui'
import { PhoneInput } from '@/components/auth/phone-input'
import { PinPad } from '@/components/auth/pin-pad'
import { IconPalette, IconInfo, IconSun, IconMoon, IconMonitor, IconTransfer, IconClock, IconClose } from '@/components/icons'
import { useAuth } from '@/contexts/auth-context'
import { formatPhoneForDisplay, isValidE164 } from '@/lib/countries'

type Theme = 'light' | 'dark' | 'system'

const THEME_CONFIG = {
  light: {
    label: 'Claro',
    icon: IconSun,
    preview: 'theme-option-preview-light',
    description: 'Modo claro activado',
  },
  dark: {
    label: 'Oscuro',
    icon: IconMoon,
    preview: 'theme-option-preview-dark',
    description: 'Modo oscuro activado',
  },
  system: {
    label: 'Sistema',
    icon: IconMonitor,
    preview: 'theme-option-preview-system',
    description: 'Se ajusta automaticamente segun tu dispositivo',
  },
}

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

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

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const saved = localStorage.getItem('theme') as Theme | null
  return saved || 'system'
}

export default function SettingsPage() {
  const { user, pb } = useAuth()
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const isInitialMount = useRef(true)

  // Transfer state
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null)
  const [isLoadingTransfer, setIsLoadingTransfer] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [transferPhone, setTransferPhone] = useState('')
  const [transferError, setTransferError] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)

  const isOwner = user?.role === 'owner'

  // Fetch pending transfer on mount
  useEffect(() => {
    if (!isOwner) return

    const fetchPendingTransfer = async () => {
      setIsLoadingTransfer(true)
      try {
        const response = await fetch(`${POCKETBASE_URL}/api/transfer/pending`, {
          headers: {
            'Authorization': pb.authStore.token,
          },
        })
        const data = await response.json()
        setPendingTransfer(data.transfer || null)
      } catch (err) {
        console.error('Error fetching pending transfer:', err)
      } finally {
        setIsLoadingTransfer(false)
      }
    }

    fetchPendingTransfer()
  }, [isOwner, pb])

  // Apply theme changes only when user changes theme (not on mount)
  useEffect(() => {
    // Skip the initial mount - the inline script already applied the theme
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const root = document.documentElement

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
      localStorage.removeItem('theme')
    } else {
      root.classList.toggle('dark', theme === 'dark')
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const handleInitiateTransfer = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setTransferError('')

    if (!transferPhone || !isValidE164(transferPhone)) {
      setTransferError('Ingresa un numero de telefono valido')
      return
    }

    setTransferLoading(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/transfer/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ toPhone: transferPhone }),
      })

      const data = await response.json()

      if (!data.success) {
        setTransferError(data.error || 'Error al iniciar transferencia')
        setTransferLoading(false)
        return
      }

      // Send WhatsApp notification
      try {
        await fetch('/api/transfer/send-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pb.authStore.token}`,
          },
          body: JSON.stringify({
            phoneNumber: transferPhone,
            transferCode: data.code,
          }),
        })
      } catch (whatsappErr) {
        console.warn('WhatsApp notification failed:', whatsappErr)
        // Don't fail the transfer if WhatsApp fails
      }

      // Update pending transfer
      setPendingTransfer({
        code: data.code,
        toPhone: transferPhone,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      setShowTransferModal(false)
      setTransferPhone('')
    } catch (err) {
      console.error('Transfer initiate error:', err)
      setTransferError('Error de conexion')
    } finally {
      setTransferLoading(false)
    }
  }, [transferPhone, pb])

  const handleCancelTransfer = useCallback(async () => {
    if (!pendingTransfer) return

    setTransferLoading(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/transfer/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ code: pendingTransfer.code }),
      })

      const data = await response.json()

      if (data.success) {
        setPendingTransfer(null)
      }
    } catch (err) {
      console.error('Cancel transfer error:', err)
    } finally {
      setTransferLoading(false)
    }
  }, [pendingTransfer, pb])

  const handleConfirmTransfer = useCallback(async (pin: string) => {
    if (!pendingTransfer) return

    setTransferLoading(true)

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/transfer/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token,
        },
        body: JSON.stringify({ code: pendingTransfer.code, pin }),
      })

      const data = await response.json()

      if (!data.success) {
        setTransferError(data.error || 'Error al confirmar transferencia')
        setTransferLoading(false)
        return
      }

      // Transfer complete - reload page to reflect new role
      window.location.reload()
    } catch (err) {
      console.error('Confirm transfer error:', err)
      setTransferError('Error de conexion')
    } finally {
      setTransferLoading(false)
    }
  }, [pendingTransfer, pb])

  const formatTimeRemaining = (expiresAt: string): string => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return 'Expirado'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m restantes`
    }
    return `${minutes}m restantes`
  }

  const currentConfig = THEME_CONFIG[theme]

  return (
    <>
      <PageHeader title="Configuracion" subtitle="Personaliza tu experiencia" />

      <main className="settings-container">
        {/* Transfer Section - Owner Only */}
        {isOwner && (
          <section className="settings-section">
            <div className="settings-section-header">
              <div className="settings-section-icon">
                <IconTransfer width={20} height={20} />
              </div>
              <h2 className="settings-section-title">Transferir propiedad</h2>
            </div>
            <div className="settings-section-body">
              {isLoadingTransfer ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner />
                </div>
              ) : pendingTransfer ? (
                <div className="space-y-4">
                  {/* Pending/Accepted Transfer Card */}
                  <div className={`p-4 rounded-lg border ${pendingTransfer.status === 'accepted' ? 'border-success bg-success-subtle' : 'border-warning bg-warning-subtle'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${pendingTransfer.status === 'accepted' ? 'bg-success text-white' : 'bg-warning text-white'}`}>
                        {pendingTransfer.status === 'accepted' ? 'Aceptada' : 'Pendiente'}
                      </span>
                      <div className="flex items-center text-xs text-text-tertiary">
                        <IconClock width={14} height={14} className="mr-1" />
                        {formatTimeRemaining(pendingTransfer.expiresAt)}
                      </div>
                    </div>

                    <p className="text-sm text-text-secondary mb-1">
                      Transferencia a:
                    </p>
                    <p className="font-medium text-text-primary">
                      {pendingTransfer.toUser?.name || formatPhoneForDisplay(pendingTransfer.toPhone)}
                    </p>

                    <p className="text-xs text-text-tertiary mt-2">
                      Codigo: <span className="font-mono">{pendingTransfer.code}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    {pendingTransfer.status === 'accepted' ? (
                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        className="btn btn-primary flex-1"
                        disabled={transferLoading}
                      >
                        {transferLoading ? <Spinner /> : 'Confirmar transferencia'}
                      </button>
                    ) : (
                      <p className="text-sm text-text-tertiary">
                        Esperando que el destinatario acepte la transferencia via WhatsApp.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelTransfer}
                    className="text-sm text-error hover:underline"
                    disabled={transferLoading}
                  >
                    Cancelar transferencia
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-text-tertiary">
                    Transfiere la propiedad del negocio a otra persona. Tu cuenta se convertira en socio.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(true)}
                    className="btn btn-secondary"
                  >
                    Iniciar transferencia
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Appearance Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              <IconPalette width={20} height={20} />
            </div>
            <h2 className="settings-section-title">Apariencia</h2>
          </div>
          <div className="settings-section-body">
            <span className="settings-label">Tema</span>
            <div className="theme-options">
              {(Object.keys(THEME_CONFIG) as Theme[]).map((key) => {
                const config = THEME_CONFIG[key]
                const Icon = config.icon
                const isActive = theme === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    className={`theme-option ${isActive ? 'theme-option-active' : ''}`}
                    aria-pressed={isActive}
                  >
                    <div className={`theme-option-preview ${config.preview}`}>
                      <Icon
                        width={20}
                        height={20}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: key === 'dark' ? '#F8FAFC' : key === 'system' ? '#64748B' : '#334155',
                        }}
                      />
                    </div>
                    <span className="theme-option-label">{config.label}</span>
                  </button>
                )
              })}
            </div>
            <p className="settings-hint">{currentConfig.description}</p>
          </div>
        </section>

        {/* About Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              <IconInfo width={20} height={20} />
            </div>
            <h2 className="settings-section-title">Acerca de</h2>
          </div>
          <div className="settings-section-body">
            <div className="settings-info-row">
              <span className="settings-info-label">Version</span>
              <span className="settings-info-value">0.1.0</span>
            </div>
            <div className="settings-info-row">
              <span className="settings-info-label">Desarrollado por</span>
              <span className="settings-info-value">Mr. Chifles</span>
            </div>
          </div>
        </section>
      </main>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="modal-backdrop" onClick={() => setShowTransferModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Transferir propiedad</h3>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="modal-close"
              >
                <IconClose width={20} height={20} />
              </button>
            </div>

            <form onSubmit={handleInitiateTransfer} className="modal-body">
              <div className="mb-4 p-3 bg-warning-subtle rounded-lg">
                <p className="text-sm text-warning font-medium mb-1">Importante</p>
                <p className="text-xs text-text-secondary">
                  Al confirmar la transferencia, perderas el rol de propietario y te convertiras en socio.
                  Esta accion es irreversible.
                </p>
              </div>

              {transferError && (
                <div className="mb-4 p-3 bg-error-subtle text-error text-sm rounded-lg">
                  {transferError}
                </div>
              )}

              <PhoneInput
                label="Numero del nuevo propietario"
                value={transferPhone}
                onChange={setTransferPhone}
                autoFocus
              />

              <p className="text-xs text-text-tertiary mt-2 mb-4">
                Se enviara una invitacion por WhatsApp a este numero.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={transferLoading}
                >
                  {transferLoading ? <Spinner /> : 'Enviar invitacion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Transfer Modal (PIN) */}
      {showConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirmar transferencia</h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="modal-close"
              >
                <IconClose width={20} height={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="mb-4 p-3 bg-error-subtle rounded-lg">
                <p className="text-sm text-error font-medium mb-1">Accion irreversible</p>
                <p className="text-xs text-text-secondary">
                  Al confirmar, {pendingTransfer?.toUser?.name || 'el destinatario'} se convertira en el nuevo propietario
                  y tu cuenta pasara a ser socio.
                </p>
              </div>

              {transferError && (
                <div className="mb-4 p-3 bg-error-subtle text-error text-sm rounded-lg">
                  {transferError}
                </div>
              )}

              <p className="text-center text-sm text-text-secondary mb-4">
                Ingresa tu PIN para confirmar
              </p>

              {transferLoading ? (
                <div className="flex flex-col items-center py-8">
                  <Spinner className="spinner-lg" />
                  <p className="text-text-secondary mt-4">Procesando...</p>
                </div>
              ) : (
                <PinPad
                  onComplete={handleConfirmTransfer}
                  disabled={transferLoading}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
