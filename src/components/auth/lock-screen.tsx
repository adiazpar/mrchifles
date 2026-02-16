'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PinPad } from './pin-pad'
import { useAuth } from '@/contexts/auth-context'
import { getUserInitials } from '@/lib/auth'

export function LockScreen() {
  const router = useRouter()
  const { user, unlockSession, logout } = useAuth()

  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handlePinComplete = useCallback(
    async (pin: string) => {
      setError('')
      setIsLoading(true)

      try {
        const success = await unlockSession(pin)

        if (!success) {
          setError('PIN incorrecto')
        }
      } catch (err) {
        console.error('Unlock error:', err)
        setError('Error al verificar el PIN')
      } finally {
        setIsLoading(false)
      }
    },
    [unlockSession]
  )

  const handleInput = useCallback(() => {
    setError('')
  }, [])

  const handleSwitchUser = useCallback(() => {
    logout()
    router.push('/login')
  }, [logout, router])

  if (!user) return null

  return (
    <div className="modal-backdrop">
      <div className="modal animate-scaleIn" style={{ maxWidth: '360px' }}>
        <div className="modal-body">
          {/* User greeting */}
          <div className="text-center mb-4">
            <div
              className="mx-auto mb-3 rounded-full bg-brand text-white flex items-center justify-center font-display font-semibold"
              style={{ width: '48px', height: '48px', fontSize: '16px' }}
            >
              {getUserInitials(user.name)}
            </div>
            <h2 className="font-display font-semibold text-lg text-text-primary">
              {user.name}
            </h2>
          </div>

          <div className="border-t border-border pt-4 mb-4">
            <p className="text-text-secondary text-center">Ingresa tu PIN para desbloquear</p>
          </div>

          <PinPad
            onComplete={handlePinComplete}
            onInput={handleInput}
            disabled={isLoading}
            error={error}
          />

          {/* Switch user link */}
          <div className="text-center mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleSwitchUser}
              className="text-sm text-brand hover:underline"
            >
              Cambiar usuario
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
