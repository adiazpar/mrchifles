'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui'
import { PinPad } from './pin-pad'
import { useAuth } from '@/contexts/auth-context'
import { getUserInitials } from '@/lib/auth'

export function LockScreen() {
  const router = useRouter()
  const { user, unlockSession, logout, lockoutRemaining, failedAttempts } = useAuth()

  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handlePinComplete = useCallback(
    async (pin: string) => {
      setError('')
      setIsLoading(true)

      try {
        const success = await unlockSession(pin)

        if (!success) {
          const attemptsLeft = 3 - failedAttempts - 1
          if (attemptsLeft > 0) {
            setError(`PIN incorrecto. ${attemptsLeft} intento${attemptsLeft === 1 ? '' : 's'} restante${attemptsLeft === 1 ? '' : 's'}`)
          } else {
            setError('Demasiados intentos fallidos')
          }
        }
      } catch (err) {
        console.error('Unlock error:', err)
        setError('Error al verificar el PIN')
      } finally {
        setIsLoading(false)
      }
    },
    [unlockSession, failedAttempts]
  )

  const handleSwitchUser = useCallback(() => {
    logout()
    router.push('/login')
  }, [logout, router])

  if (!user) return null

  return (
    <div className="lock-screen-overlay">
      <div className="auth-card animate-scaleIn">
        {/* User greeting */}
        <div className="auth-user-greeting">
          <div className="auth-user-avatar">
            {getUserInitials(user.name)}
          </div>
          <h2 className="auth-user-name">{user.name}</h2>
          <p className="auth-user-email">Sesion bloqueada</p>
        </div>

        <Card padding="lg">
          <div className="text-center mb-4">
            <p className="text-text-secondary">Ingresa tu PIN para desbloquear</p>
          </div>

          {/* Lockout message */}
          {lockoutRemaining > 0 && (
            <div className="auth-lockout">
              <p className="auth-lockout-text">Demasiados intentos fallidos</p>
              <p className="auth-lockout-timer">{lockoutRemaining}s</p>
            </div>
          )}

          <PinPad
            onComplete={handlePinComplete}
            disabled={isLoading || lockoutRemaining > 0}
            error={error}
          />
        </Card>

        <div className="auth-footer">
          <p className="auth-footer-link">
            <button
              type="button"
              onClick={handleSwitchUser}
              className="text-brand hover:underline"
            >
              Cambiar usuario
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
