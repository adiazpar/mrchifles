'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input, Card, Spinner } from '@/components/ui'
import { PinPad } from '@/components/auth/pin-pad'
import { useAuth } from '@/contexts/auth-context'
import { getUserInitials } from '@/lib/auth'
import type { User } from '@/types'

type LoginStep = 'email' | 'pin'

export default function LoginPage() {
  const router = useRouter()
  const { loginWithEmail, verifyUserPin, lockoutRemaining, failedAttempts, getRememberedEmail, clearRememberedEmail } = useAuth()

  const [step, setStep] = useState<LoginStep>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingUser, setPendingUser] = useState<User | null>(null)
  const [isCheckingRemembered, setIsCheckingRemembered] = useState(true)

  // Check for remembered email on mount and auto-advance to PIN step
  useEffect(() => {
    const checkRememberedEmail = async () => {
      const rememberedEmail = getRememberedEmail()

      if (rememberedEmail) {
        try {
          const result = await loginWithEmail(rememberedEmail)

          if (result.exists && result.user) {
            setEmail(rememberedEmail)
            setPendingUser(result.user)
            setStep('pin')
          }
        } catch (err) {
          console.error('Error checking remembered email:', err)
        }
      }

      setIsCheckingRemembered(false)
    }

    checkRememberedEmail()
  }, [getRememberedEmail, loginWithEmail])

  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      if (!email.trim()) {
        setError('Por favor ingresa tu email')
        return
      }

      setIsLoading(true)

      try {
        const result = await loginWithEmail(email.trim())

        if (!result.exists) {
          setError('No existe una cuenta con este email')
          setIsLoading(false)
          return
        }

        setPendingUser(result.user || null)
        setStep('pin')
      } catch (err) {
        console.error('Login error:', err)
        setError('Error al verificar el email')
      } finally {
        setIsLoading(false)
      }
    },
    [email, loginWithEmail]
  )

  const handlePinComplete = useCallback(
    async (pin: string) => {
      setError('')
      setIsLoading(true)

      try {
        const isValid = await verifyUserPin(pin)

        if (isValid) {
          router.push('/inicio')
        } else {
          const attemptsLeft = 3 - failedAttempts - 1
          if (attemptsLeft > 0) {
            setError(`PIN incorrecto. ${attemptsLeft} intento${attemptsLeft === 1 ? '' : 's'} restante${attemptsLeft === 1 ? '' : 's'}`)
          } else {
            setError('Demasiados intentos fallidos')
          }
        }
      } catch (err) {
        console.error('PIN verification error:', err)
        setError('Error al verificar el PIN')
      } finally {
        setIsLoading(false)
      }
    },
    [verifyUserPin, failedAttempts, router]
  )

  const handleBackToEmail = useCallback(() => {
    setStep('email')
    setError('')
    setPendingUser(null)
    setEmail('')
    clearRememberedEmail()
  }, [clearRememberedEmail])

  // Loading state while checking remembered email
  if (isCheckingRemembered) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center py-8">
          <Spinner className="spinner-lg" />
          <p className="text-text-secondary mt-4">Cargando...</p>
        </div>
      </Card>
    )
  }

  // Email step
  if (step === 'email') {
    return (
      <>
        <Card padding="lg">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              autoFocus
              error={error}
            />

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner />
                  <span className="sr-only">Verificando...</span>
                </>
              ) : (
                'Continuar'
              )}
            </button>
          </form>
        </Card>

        <div className="auth-footer">
          <p className="auth-footer-link">
            <Link href="/invite">Tengo un codigo de invitacion</Link>
          </p>
          <p className="auth-footer-link mt-2">
            <Link href="/register">Crear cuenta de dueno</Link>
          </p>
        </div>
      </>
    )
  }

  // PIN step
  return (
    <>
      {/* User greeting */}
      {pendingUser && (
        <div className="auth-user-greeting">
          <div className="auth-user-avatar">
            {getUserInitials(pendingUser.name)}
          </div>
          <h2 className="auth-user-name">Hola, {pendingUser.name.split(' ')[0]}</h2>
          <p className="auth-user-email">{pendingUser.email}</p>
        </div>
      )}

      <Card padding="lg">
        <div className="text-center mb-4">
          <p className="text-text-secondary">Ingresa tu PIN de 4 digitos</p>
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
            onClick={handleBackToEmail}
            className="text-brand hover:underline"
          >
            Cambiar usuario
          </button>
        </p>
      </div>
    </>
  )
}
