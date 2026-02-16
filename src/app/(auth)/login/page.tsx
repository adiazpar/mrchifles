'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input, Card, Spinner } from '@/components/ui'
import { PhoneInput } from '@/components/auth/phone-input'
import { PinPad } from '@/components/auth/pin-pad'
import { useAuth } from '@/contexts/auth-context'
import { getUserInitials } from '@/lib/auth'
import { isValidE164, formatPhoneForDisplay } from '@/lib/countries'
import type { User } from '@/types'

type LoginStep = 'checking' | 'phone' | 'password' | 'pin'

export default function LoginPage() {
  const router = useRouter()
  const {
    loginWithPassword,
    loginWithPin,
    getRememberedPhone,
    clearRememberedPhone,
    deviceTrusted,
    setupComplete,
    isCheckingSetup,
    pb,
  } = useAuth()

  const [step, setStep] = useState<LoginStep>('checking')
  const [phoneNumber, setPhoneNumber] = useState('')
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
      const rememberedPhone = getRememberedPhone()

      if (rememberedPhone && pb.authStore.isValid) {
        // Trusted device with valid session - show PIN pad
        const authUser = pb.authStore.model as User
        if (authUser && authUser.phoneNumber === rememberedPhone) {
          setTrustedUser(authUser)
          setPhoneNumber(rememberedPhone)
          setStep('pin')
          return
        }
      }

      // Not a trusted device or session expired - show phone input
      setStep('phone')
    }

    checkTrustedDevice()
  }, [getRememberedPhone, pb, deviceTrusted, setupComplete, isCheckingSetup, router])

  const handlePhoneSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      if (!phoneNumber || !isValidE164(phoneNumber)) {
        setError('Ingresa un numero de telefono valido')
        return
      }

      // Move to password step
      setStep('password')
    },
    [phoneNumber]
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
        await loginWithPassword(phoneNumber, password)
        router.push('/inicio')
      } catch (err) {
        // Handle PocketBase error - check for custom message from server
        if (err && typeof err === 'object' && 'status' in err) {
          const pbErr = err as { status: number; message?: string }
          // Check if server sent a custom error message (e.g., "disabled account")
          if (pbErr.message && pbErr.message.includes('deshabilitada')) {
            setError(pbErr.message)
          } else if (pbErr.status === 400) {
            setError('Numero o contrasena incorrectos')
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
    [phoneNumber, password, loginWithPassword, router]
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
          setError('PIN incorrecto')
        }
      } catch (err) {
        console.error('PIN verification error:', err)
        setError('Error al verificar el PIN')
      } finally {
        setIsLoading(false)
      }
    },
    [loginWithPin, router]
  )

  const handleChangeUser = useCallback(() => {
    clearRememberedPhone()
    setTrustedUser(null)
    setPhoneNumber('')
    setPassword('')
    setError('')
    setStep('phone')
  }, [clearRememberedPhone])

  const handleBackToPhone = useCallback(() => {
    setPassword('')
    setError('')
    setStep('phone')
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

  // Phone step
  if (step === 'phone') {
    return (
      <>
        <Card padding="lg">
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <PhoneInput
              label="Numero de telefono"
              value={phoneNumber}
              onChange={setPhoneNumber}
              error={error}
              autoFocus
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
            <p className="font-medium text-text-primary">
              {formatPhoneForDisplay(phoneNumber)}
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Hidden phone field for accessibility and password managers */}
            <input
              type="tel"
              value={phoneNumber}
              autoComplete="username"
              readOnly
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
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
              onClick={handleBackToPhone}
              className="text-brand hover:underline"
            >
              Usar otro numero
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
          <p className="auth-user-email">{formatPhoneForDisplay(trustedUser.phoneNumber)}</p>
        </div>
      )}

      <Card padding="lg">
        <div className="text-center mb-4">
          <p className="text-text-secondary">Ingresa tu PIN de 4 digitos</p>
        </div>

        <PinPad
          onComplete={handlePinComplete}
          disabled={isLoading}
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
