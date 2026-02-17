'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input, Card, Spinner } from '@/components/ui'
import { PhoneInput } from '@/components/auth/phone-input'
import { useAuth } from '@/contexts/auth-context'
import { isValidE164, formatPhoneForDisplay } from '@/lib/countries'

type LoginStep = 'checking' | 'phone' | 'password'

export default function LoginPage() {
  const router = useRouter()
  const {
    loginWithPassword,
    getRememberedPhone,
    setupComplete,
    isCheckingSetup,
  } = useAuth()

  const [step, setStep] = useState<LoginStep>('checking')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Check setup state on mount
  useEffect(() => {
    if (isCheckingSetup) return

    // If setup is not complete, redirect to register for first-time setup
    if (!setupComplete) {
      router.replace('/register')
      return
    }

    // Pre-fill phone if remembered
    const rememberedPhone = getRememberedPhone()
    if (rememberedPhone) {
      setPhoneNumber(rememberedPhone)
    }

    setStep('phone')
  }, [getRememberedPhone, setupComplete, isCheckingSetup, router])

  const handlePhoneSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      if (!phoneNumber || !isValidE164(phoneNumber)) {
        setError('Ingresa un numero de telefono valido')
        return
      }

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
        if (err && typeof err === 'object' && 'status' in err) {
          const pbErr = err as { status: number; message?: string }
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

  const handleBackToPhone = useCallback(() => {
    setPassword('')
    setError('')
    setStep('phone')
  }, [])

  // Checking state
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
