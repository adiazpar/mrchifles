'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Card, Spinner } from '@/components/ui'
import { PhoneInput } from '@/components/auth/phone-input'
import { FirebasePhoneVerify } from '@/components/auth/firebase-phone-verify'
import { PinPad } from '@/components/auth/pin-pad'
import { useAuth } from '@/contexts/auth-context'
import { ownerRegistrationSchema } from '@/lib/auth'
import { isValidE164, formatPhoneForDisplay } from '@/lib/countries'

type RegisterStep = 'checking' | 'phone' | 'otp' | 'info' | 'pin'

export default function RegisterPage() {
  const router = useRouter()
  const { registerOwner, verifyFirebaseToken, setupComplete, isCheckingSetup } = useAuth()

  const [step, setStep] = useState<RegisterStep>('checking')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [_firebaseToken, setFirebaseToken] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Check if setup is already complete (owner exists)
  useEffect(() => {
    if (isCheckingSetup) return

    if (setupComplete) {
      // Owner already exists, redirect to login
      router.replace('/login')
      return
    }

    // Show phone input
    setStep('phone')
  }, [setupComplete, isCheckingSetup, router])

  const handlePhoneSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrors({})

      if (!phoneNumber || !isValidE164(phoneNumber)) {
        setErrors({ phone: 'Ingresa un numero de telefono valido' })
        return
      }

      setStep('otp')
    },
    [phoneNumber]
  )

  const handleOtpVerified = useCallback(
    async (idToken: string) => {
      setIsLoading(true)
      setErrors({})

      // Verify the token with our server
      const result = await verifyFirebaseToken(phoneNumber, idToken, 'registration')

      if (!result.valid) {
        setErrors({ otp: result.error || 'Error al verificar' })
        setIsLoading(false)
        return
      }

      // Store token for later use during registration
      setFirebaseToken(idToken)
      setIsLoading(false)
      setStep('info')
    },
    [phoneNumber, verifyFirebaseToken]
  )

  const handleBackToPhone = useCallback(() => {
    setStep('phone')
    setErrors({})
    setFirebaseToken(null)
  }, [])

  const handleInfoSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setErrors({})

      // Validate passwords match
      if (password !== passwordConfirm) {
        setErrors({ passwordConfirm: 'Las contrasenas no coinciden' })
        return
      }

      // Validate with Zod (except PIN which comes next)
      const validation = ownerRegistrationSchema.safeParse({
        phoneNumber,
        password,
        name,
        pin: '0000', // Placeholder, will be set in next step
      })

      if (!validation.success) {
        const fieldErrors: Record<string, string> = {}
        validation.error.errors.forEach((err) => {
          if (err.path[0] && err.path[0] !== 'pin') {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
        return
      }

      setStep('pin')
    },
    [phoneNumber, password, passwordConfirm, name]
  )

  const handlePinComplete = useCallback(
    async (pin: string) => {
      setIsLoading(true)

      try {
        await registerOwner({
          phoneNumber,
          password,
          name,
          pin,
        })

        router.push('/inicio')
      } catch (err) {
        console.error('Registration error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido'

        // Check for specific error messages
        if (errorMessage.includes('numero') || errorMessage.includes('phone')) {
          setErrors({ phone: errorMessage })
          setStep('phone')
        } else if (errorMessage.includes('propietario')) {
          setErrors({ general: errorMessage })
          setStep('phone')
        } else {
          setErrors({ general: `Error al crear la cuenta: ${errorMessage}` })
          setStep('info')
        }
      } finally {
        setIsLoading(false)
      }
    },
    [phoneNumber, password, name, registerOwner, router]
  )

  const handleBackToInfo = useCallback(() => {
    setStep('info')
    setErrors({})
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
      <Card padding="lg">
        <h2 className="text-xl font-display font-bold mb-1">Bienvenido a Mr. Chifles</h2>
        <p className="text-sm text-text-tertiary mb-6">
          Configura tu cuenta de propietario para comenzar
        </p>

        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {errors.general}
            </div>
          )}

          <PhoneInput
            label="Numero de telefono"
            value={phoneNumber}
            onChange={setPhoneNumber}
            error={errors.phone}
            autoFocus
          />

          <p className="text-xs text-text-tertiary">
            Te enviaremos un codigo de verificacion por SMS
          </p>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
          >
            Continuar
          </button>
        </form>
      </Card>
    )
  }

  // OTP step - use Firebase component
  if (step === 'otp') {
    return (
      <Card padding="lg">
        <FirebasePhoneVerify
          phoneNumber={phoneNumber}
          onVerified={handleOtpVerified}
          onBack={handleBackToPhone}
        />
      </Card>
    )
  }

  // Info step
  if (step === 'info') {
    return (
      <Card padding="lg">
        <div className="mb-4">
          <p className="text-sm text-text-tertiary">Registrando</p>
          <p className="font-medium text-text-primary">{formatPhoneForDisplay(phoneNumber)}</p>
        </div>

        <form onSubmit={handleInfoSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {errors.general}
            </div>
          )}

          <Input
            label="Nombre completo"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Perez"
            autoComplete="name"
            autoFocus
            error={errors.name}
          />

          <div>
            <Input
              label="Contrasena"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 8 caracteres"
              autoComplete="new-password"
              error={errors.password}
            />
            <p className="text-xs text-text-tertiary mt-1">
              Esta contrasena protege tu cuenta
            </p>
          </div>

          <Input
            label="Confirmar contrasena"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="Repite tu contrasena"
            autoComplete="new-password"
            error={errors.passwordConfirm}
          />

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={isLoading}
          >
            Continuar
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleBackToPhone}
            className="text-brand hover:underline text-sm"
          >
            Usar otro numero
          </button>
        </div>
      </Card>
    )
  }

  // PIN step
  return (
    <Card padding="lg">
      <div className="text-center mb-6">
        <h2 className="text-xl font-display font-bold mb-1">Configura tu PIN</h2>
        <p className="text-sm text-text-tertiary">
          Usaras este PIN para acceder rapidamente cada dia
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center py-8">
          <Spinner className="spinner-lg" />
          <p className="text-text-secondary mt-4">Creando tu cuenta...</p>
        </div>
      ) : (
        <PinPad
          onComplete={handlePinComplete}
          disabled={isLoading}
        />
      )}

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={handleBackToInfo}
          className="text-brand hover:underline text-sm"
          disabled={isLoading}
        >
          Volver
        </button>
      </div>
    </Card>
  )
}
