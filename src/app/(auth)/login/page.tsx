'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input, Card, Spinner } from '@/components/ui'
import { PinPad } from '@/components/auth/pin-pad'
import { useAuth } from '@/contexts/auth-context'
import { getUserInitials } from '@/lib/auth'
import type { User } from '@/types'

type LoginStep = 'checking' | 'email' | 'password' | 'pin'

export default function LoginPage() {
  const router = useRouter()
  const {
    loginWithPassword,
    loginWithPin,
    lockoutRemaining,
    failedAttempts,
    getRememberedEmail,
    clearRememberedEmail,
    deviceTrusted,
    setupComplete,
    isCheckingSetup,
    pb,
  } = useAuth()

  const [step, setStep] = useState<LoginStep>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [trustedUser, setTrustedUser] = useState<User | null>(null)

  // Check setup state and trusted device on mount
  useEffect(() => {
    // Wait for setup check to complete
    if (isCheckingSetup) return

    // If setup is not complete, redirect to register for first-time setup
    if (!setupComplete) {
      router.replace('/register')
      return
    }

    // Check for trusted device with valid session
    const checkTrustedDevice = async () => {
      const rememberedEmail = getRememberedEmail()

      if (rememberedEmail && pb.authStore.isValid) {
        // Trusted device with valid session - show PIN pad
        const authUser = pb.authStore.model as User
        if (authUser && authUser.email === rememberedEmail) {
          setTrustedUser(authUser)
          setEmail(rememberedEmail)
          setStep('pin')
          return
        }
      }

      // Not a trusted device or session expired - show email input
      setStep('email')
    }

    checkTrustedDevice()
  }, [getRememberedEmail, pb, deviceTrusted, setupComplete, isCheckingSetup, router])

  const handleEmailSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      if (!email.trim()) {
        setError('Por favor ingresa tu email')
        return
      }

      // Move to password step
      setStep('password')
    },
    [email]
  )

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      if (!password) {
        setError('Por favor ingresa tu contrasena')
        return
      }

      setIsLoading(true)

      try {
        await loginWithPassword(email.trim(), password)
        router.push('/inicio')
      } catch (err) {
        console.error('Login error:', err)
        // Handle PocketBase error
        if (err && typeof err === 'object' && 'status' in err) {
          const pbErr = err as { status: number }
          if (pbErr.status === 400) {
            setError('Email o contrasena incorrectos')
          } else {
            setError('Error al iniciar sesion')
          }
        } else {
          setError('Error al iniciar sesion')
        }
      } finally {
        setIsLoading(false)
      }
    },
    [email, password, loginWithPassword, router]
  )

  const handlePinComplete = useCallback(
    async (pin: string) => {
      setError('')
      setIsLoading(true)

      try {
        const isValid = await loginWithPin(pin)

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
    [loginWithPin, failedAttempts, router]
  )

  const handleChangeUser = useCallback(() => {
    clearRememberedEmail()
    setTrustedUser(null)
    setEmail('')
    setPassword('')
    setError('')
    setStep('email')
  }, [clearRememberedEmail])

  const handleBackToEmail = useCallback(() => {
    setPassword('')
    setError('')
    setStep('email')
  }, [])

  // Checking state (also covers setup redirect)
  if (step === 'checking' || isCheckingSetup) {
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
              Continuar
            </button>
          </form>
        </Card>

        <div className="auth-footer">
          <p className="auth-footer-link">
            <Link href="/invite">Tengo un codigo de invitacion</Link>
          </p>
        </div>
      </>
    )
  }

  // Password step
  if (step === 'password') {
    return (
      <>
        <Card padding="lg">
          <div className="mb-4">
            <p className="text-sm text-text-tertiary">Iniciando sesion como</p>
            <p className="font-medium text-text-primary">{email}</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="Contrasena"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contrasena"
              autoComplete="current-password"
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
                  <span className="sr-only">Iniciando sesion...</span>
                </>
              ) : (
                'Iniciar sesion'
              )}
            </button>
          </form>
        </Card>

        <div className="auth-footer">
          <p className="auth-footer-link">
            <button
              type="button"
              onClick={handleBackToEmail}
              className="text-brand hover:underline"
            >
              Usar otro email
            </button>
          </p>
        </div>
      </>
    )
  }

  // PIN step (for trusted devices)
  return (
    <>
      {/* User greeting */}
      {trustedUser && (
        <div className="auth-user-greeting">
          <div className="auth-user-avatar">
            {getUserInitials(trustedUser.name)}
          </div>
          <h2 className="auth-user-name">Hola, {trustedUser.name.split(' ')[0]}</h2>
          <p className="auth-user-email">{trustedUser.email}</p>
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
            onClick={handleChangeUser}
            className="text-brand hover:underline"
          >
            Cambiar usuario
          </button>
        </p>
      </div>
    </>
  )
}
