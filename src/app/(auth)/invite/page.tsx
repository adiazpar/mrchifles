'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input, Card, Spinner } from '@/components/ui'
import { PhoneInput } from '@/components/auth/phone-input'
import { OTPInput } from '@/components/auth/otp-input'
import { PinPad } from '@/components/auth/pin-pad'
import { useAuth } from '@/contexts/auth-context'
import { employeeRegistrationSchema, getInviteRoleLabel } from '@/lib/auth'
import { isValidE164, formatPhoneForDisplay } from '@/lib/countries'
import type { InviteRole } from '@/types'

type InviteStep = 'loading' | 'code' | 'phone' | 'otp' | 'info' | 'pin'

interface InviteInfo {
  code: string
  role: InviteRole
}

export default function InvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { registerWithInvite, sendOTP, verifyOTP } = useAuth()
  const hasAutoValidated = useRef(false)

  // Check for code in URL query parameter
  const codeFromUrl = searchParams.get('code')

  const [step, setStep] = useState<InviteStep>(codeFromUrl ? 'loading' : 'code')
  const [inviteCode, setInviteCode] = useState(codeFromUrl?.toUpperCase() || '')
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [otpSending, setOtpSending] = useState(false)

  // Auto-validate code from URL parameter
  useEffect(() => {
    if (!codeFromUrl || hasAutoValidated.current) return
    hasAutoValidated.current = true

    const validateCodeFromUrl = async () => {
      const code = codeFromUrl.trim().toUpperCase()

      if (!code || code.length !== 6) {
        setErrors({ code: 'Codigo invalido' })
        setStep('code')
        return
      }

      try {
        const pocketbaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
        const response = await fetch(`${pocketbaseUrl}/api/validate-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        const result = await response.json()

        if (!result.valid) {
          setErrors({ code: result.error || 'Codigo invalido o expirado' })
          setStep('code')
          return
        }

        setInviteInfo({
          code,
          role: result.role as InviteRole,
        })
        setStep('phone')
      } catch (err) {
        console.error('Code validation error:', err)
        setErrors({ code: 'Error al verificar el codigo' })
        setStep('code')
      }
    }

    validateCodeFromUrl()
  }, [codeFromUrl])

  const handleCodeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrors({})

      const code = inviteCode.trim().toUpperCase()

      if (!code || code.length !== 6) {
        setErrors({ code: 'El codigo debe tener 6 caracteres' })
        return
      }

      setIsLoading(true)

      try {
        // Use server-side validation endpoint (rate-limited, prevents enumeration)
        const pocketbaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
        const response = await fetch(`${pocketbaseUrl}/api/validate-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        const result = await response.json()

        if (response.status === 429) {
          // Rate limited
          setErrors({ code: result.error || 'Demasiados intentos' })
          setIsLoading(false)
          return
        }

        if (!result.valid) {
          setErrors({ code: result.error || 'Codigo invalido o expirado' })
          setIsLoading(false)
          return
        }

        setInviteInfo({
          code,
          role: result.role as InviteRole,
        })
        setStep('phone')
      } catch (err) {
        console.error('Code validation error:', err)
        setErrors({ code: 'Error al verificar el codigo' })
      } finally {
        setIsLoading(false)
      }
    },
    [inviteCode]
  )

  const handlePhoneSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrors({})

      if (!phoneNumber || !isValidE164(phoneNumber)) {
        setErrors({ phone: 'Ingresa un numero de telefono valido' })
        return
      }

      setOtpSending(true)

      // Send OTP
      const result = await sendOTP(phoneNumber, 'registration')

      if (!result.success) {
        setErrors({ phone: result.error || 'Error al enviar el codigo' })
        setOtpSending(false)
        return
      }

      // In dev mode, show the code
      if (result.devCode) {
        setDevCode(result.devCode)
      }

      setOtpSending(false)
      setStep('otp')
    },
    [phoneNumber, sendOTP]
  )

  const handleOtpComplete = useCallback(
    async (code: string) => {
      setIsLoading(true)
      setErrors({})

      const result = await verifyOTP(phoneNumber, code)

      if (!result.valid) {
        setErrors({ otp: result.error || 'Codigo incorrecto' })
        setIsLoading(false)
        return
      }

      setIsLoading(false)
      setStep('info')
    },
    [phoneNumber, verifyOTP]
  )

  const handleResendOtp = useCallback(async () => {
    setOtpSending(true)
    setErrors({})

    const result = await sendOTP(phoneNumber, 'registration')

    if (!result.success) {
      setErrors({ otp: result.error || 'Error al reenviar el codigo' })
    } else if (result.devCode) {
      setDevCode(result.devCode)
    }

    setOtpSending(false)
  }, [phoneNumber, sendOTP])

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
      const validation = employeeRegistrationSchema.safeParse({
        inviteCode: inviteInfo?.code || '',
        phoneNumber,
        password,
        name,
        pin: '0000', // Placeholder, will be set in next step
      })

      if (!validation.success) {
        const fieldErrors: Record<string, string> = {}
        validation.error.errors.forEach((err) => {
          if (err.path[0] && err.path[0] !== 'pin' && err.path[0] !== 'inviteCode') {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
        return
      }

      setStep('pin')
    },
    [phoneNumber, password, passwordConfirm, name, inviteInfo]
  )

  const handlePinComplete = useCallback(
    async (pin: string) => {
      if (!inviteInfo) return

      setIsLoading(true)

      try {
        await registerWithInvite({
          inviteCode: inviteInfo.code,
          phoneNumber,
          password,
          name,
          pin,
        })

        router.push('/inicio')
      } catch (err) {
        console.error('Registration error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error al crear la cuenta'

        // Check for specific error messages
        if (errorMessage.includes('numero') || errorMessage.includes('phone')) {
          setErrors({ phone: errorMessage })
          setStep('phone')
        } else {
          setErrors({ general: errorMessage })
          setStep('info')
        }
      } finally {
        setIsLoading(false)
      }
    },
    [inviteInfo, phoneNumber, password, name, registerWithInvite, router]
  )

  const handleBackToCode = useCallback(() => {
    setStep('code')
    setErrors({})
    setInviteInfo(null)
  }, [])

  const handleBackToPhone = useCallback(() => {
    setStep('phone')
    setErrors({})
    setDevCode(null)
  }, [])

  const handleBackToInfo = useCallback(() => {
    setStep('info')
    setErrors({})
  }, [])

  // Loading state (auto-validating code from URL)
  if (step === 'loading') {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center py-8">
          <Spinner className="spinner-lg" />
          <p className="text-text-secondary mt-4">Verificando codigo...</p>
        </div>
      </Card>
    )
  }

  // Code step
  if (step === 'code') {
    return (
      <>
        <Card padding="lg">
          <h2 className="text-xl font-display font-bold mb-1">Codigo de invitacion</h2>
          <p className="text-sm text-text-tertiary mb-6">
            Ingresa el codigo que te compartio el dueno
          </p>

          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <Input
              label="Codigo"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              autoComplete="off"
              autoFocus
              maxLength={6}
              className="text-center text-2xl tracking-widest uppercase"
              error={errors.code}
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
                'Verificar codigo'
              )}
            </button>
          </form>
        </Card>

        <div className="auth-footer">
          <p className="auth-footer-link">
            Ya tienes cuenta? <Link href="/login">Iniciar sesion</Link>
          </p>
        </div>
      </>
    )
  }

  // Phone step
  if (step === 'phone') {
    return (
      <>
        <Card padding="lg">
          {inviteInfo && (
            <div className="mb-6 p-3 bg-brand-subtle rounded-lg text-center">
              <p className="text-sm text-text-secondary">Te uniras como</p>
              <p className="font-display font-bold text-brand">
                {getInviteRoleLabel(inviteInfo.role)}
              </p>
            </div>
          )}

          <h2 className="text-xl font-display font-bold mb-1">Tu numero de telefono</h2>
          <p className="text-sm text-text-tertiary mb-6">
            Te enviaremos un codigo de verificacion por WhatsApp
          </p>

          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <PhoneInput
              label="Numero de telefono"
              value={phoneNumber}
              onChange={setPhoneNumber}
              error={errors.phone}
              autoFocus
            />

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={otpSending}
            >
              {otpSending ? (
                <>
                  <Spinner />
                  <span>Enviando codigo...</span>
                </>
              ) : (
                'Continuar'
              )}
            </button>
          </form>
        </Card>

        <div className="auth-footer">
          <p className="auth-footer-link">
            <button
              type="button"
              onClick={handleBackToCode}
              className="text-brand hover:underline"
            >
              Usar otro codigo
            </button>
          </p>
        </div>
      </>
    )
  }

  // OTP step
  if (step === 'otp') {
    return (
      <Card padding="lg">
        <div className="text-center mb-6">
          <h2 className="text-xl font-display font-bold mb-1">Verifica tu numero</h2>
          <p className="text-sm text-text-tertiary">
            Ingresa el codigo enviado a {formatPhoneForDisplay(phoneNumber)}
          </p>
        </div>

        {devCode && (
          <div className="mb-4 p-3 bg-warning-subtle text-warning text-sm rounded-lg text-center">
            Codigo de desarrollo: <strong>{devCode}</strong>
          </div>
        )}

        <OTPInput
          onComplete={handleOtpComplete}
          error={errors.otp}
          disabled={isLoading}
        />

        <div className="mt-6 text-center space-y-2">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={otpSending}
            className="text-brand hover:underline text-sm"
          >
            {otpSending ? 'Reenviando...' : 'Reenviar codigo'}
          </button>
          <br />
          <button
            type="button"
            onClick={handleBackToPhone}
            className="text-text-tertiary hover:underline text-sm"
          >
            Cambiar numero
          </button>
        </div>
      </Card>
    )
  }

  // Info step
  if (step === 'info') {
    return (
      <>
        <Card padding="lg">
          <div className="mb-4">
            <p className="text-sm text-text-tertiary">Registrando</p>
            <p className="font-medium text-text-primary">
              {formatPhoneForDisplay(phoneNumber)}
            </p>
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

  // PIN step
  return (
    <>
      <Card padding="lg">
        <div className="text-center mb-6">
          <h2 className="text-xl font-display font-bold mb-1">Configura tu PIN</h2>
          <p className="text-sm text-text-tertiary">
            Este PIN de 4 digitos te permite acceder rapidamente cada dia sin ingresar tu contrasena
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
      </Card>

      <div className="auth-footer">
        <p className="auth-footer-link">
          <button
            type="button"
            onClick={handleBackToInfo}
            className="text-brand hover:underline"
            disabled={isLoading}
          >
            Volver
          </button>
        </p>
      </div>
    </>
  )
}
