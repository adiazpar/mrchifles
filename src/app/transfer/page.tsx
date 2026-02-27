'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input, Card, Spinner } from '@/components/ui'
import { PhoneInput } from '@/components/auth/phone-input'
import { FirebasePhoneVerify } from '@/components/auth/firebase-phone-verify'
import { PinPad } from '@/components/auth/pin-pad'
import { useAuth } from '@/contexts/auth-context'
import { formatPhoneForDisplay } from '@/lib/countries'
import { hashPin } from '@/lib/auth'

type TransferStep = 'loading' | 'code' | 'details' | 'login' | 'phone' | 'otp' | 'info' | 'pin' | 'success'

interface TransferInfo {
  code: string
  ownerName: string
  toPhone: string
  existingUser?: boolean // true if recipient already has an account
  existingUserName?: string // name of existing user
}

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

export default function TransferPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, verifyFirebaseToken, verifyPinForSession, pb } = useAuth()
  const hasAutoValidated = useRef(false)

  // Check for code in URL query parameter
  const codeFromUrl = searchParams.get('code')

  const [step, setStep] = useState<TransferStep>(codeFromUrl ? 'loading' : 'code')
  const [transferCode, setTransferCode] = useState(codeFromUrl?.toUpperCase() || '')
  const [transferInfo, setTransferInfo] = useState<TransferInfo | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [_firebaseToken, setFirebaseToken] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Auto-validate code from URL parameter
  useEffect(() => {
    if (!codeFromUrl || hasAutoValidated.current) return
    hasAutoValidated.current = true

    const validateCodeFromUrl = async () => {
      const code = codeFromUrl.trim().toUpperCase()

      if (!code || code.length !== 8) {
        setErrors({ code: 'Codigo invalido' })
        setStep('code')
        return
      }

      try {
        const response = await fetch(`${POCKETBASE_URL}/api/transfer/validate`, {
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

        setTransferInfo({
          code,
          ownerName: result.ownerName,
          toPhone: result.toPhone,
          existingUser: result.existingUser,
          existingUserName: result.existingUserName,
        })

        // If user is logged in and phone matches, go directly to details
        if (isAuthenticated && user?.phoneNumber === result.toPhone) {
          setStep('details')
        } else if (isAuthenticated) {
          // Logged in but wrong phone
          setErrors({ code: 'Este codigo no es para tu cuenta' })
          setStep('code')
        } else {
          // Not logged in, set the phone from transfer and go to details
          setPhoneNumber(result.toPhone)
          setStep('details')
        }
      } catch (err) {
        console.error('Code validation error:', err)
        setErrors({ code: 'Error al verificar el codigo' })
        setStep('code')
      }
    }

    validateCodeFromUrl()
  }, [codeFromUrl, isAuthenticated, user])

  const handleCodeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrors({})

      const code = transferCode.trim().toUpperCase()

      if (!code || code.length !== 8) {
        setErrors({ code: 'El codigo debe tener 8 caracteres' })
        return
      }

      setIsLoading(true)

      try {
        const response = await fetch(`${POCKETBASE_URL}/api/transfer/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        const result = await response.json()

        if (!result.valid) {
          setErrors({ code: result.error || 'Codigo invalido o expirado' })
          setIsLoading(false)
          return
        }

        setTransferInfo({
          code,
          ownerName: result.ownerName,
          toPhone: result.toPhone,
          existingUser: result.existingUser,
          existingUserName: result.existingUserName,
        })

        // If user is logged in and phone matches, go directly to details
        if (isAuthenticated && user?.phoneNumber === result.toPhone) {
          setStep('details')
        } else if (isAuthenticated) {
          // Logged in but wrong phone
          setErrors({ code: 'Este codigo no es para tu cuenta' })
        } else {
          // Not logged in, set the phone from transfer and go to details
          setPhoneNumber(result.toPhone)
          setStep('details')
        }
      } catch (err) {
        console.error('Code validation error:', err)
        setErrors({ code: 'Error al verificar el codigo' })
      } finally {
        setIsLoading(false)
      }
    },
    [transferCode, isAuthenticated, user]
  )

  const handleAcceptTransfer = useCallback(async () => {
    if (!transferInfo) return

    // If already authenticated, accept directly
    if (isAuthenticated) {
      setIsLoading(true)
      try {
        const response = await fetch(`${POCKETBASE_URL}/api/transfer/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token,
          },
          body: JSON.stringify({ code: transferInfo.code }),
        })

        const result = await response.json()

        if (!result.success) {
          setErrors({ general: result.error || 'Error al aceptar la transferencia' })
          setIsLoading(false)
          return
        }

        setStep('success')
      } catch (err) {
        console.error('Accept error:', err)
        setErrors({ general: 'Error al aceptar la transferencia' })
      } finally {
        setIsLoading(false)
      }
    } else {
      // Not authenticated, need to register/login first
      if (transferInfo.existingUser) {
        // Existing user - go to login step
        setStep('login')
      } else {
        // New user - go through phone verification and registration
        setStep('phone')
      }
    }
  }, [isAuthenticated, transferInfo, pb])

  const handlePhoneSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrors({})

      // Phone must match the transfer's toPhone
      if (transferInfo && phoneNumber !== transferInfo.toPhone) {
        setErrors({ phone: 'El numero debe coincidir con el de la invitacion' })
        return
      }

      setStep('otp')
    },
    [phoneNumber, transferInfo]
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

      // Store token for later use
      setFirebaseToken(idToken)
      setIsLoading(false)
      setStep('info')
    },
    [phoneNumber, verifyFirebaseToken]
  )

  const handleInfoSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setErrors({})

      // Validate name
      if (!name || name.length < 2) {
        setErrors({ name: 'El nombre debe tener al menos 2 caracteres' })
        return
      }

      // Validate password
      if (!password || password.length < 8) {
        setErrors({ password: 'La contrasena debe tener al menos 8 caracteres' })
        return
      }

      // Validate passwords match
      if (password !== passwordConfirm) {
        setErrors({ passwordConfirm: 'Las contrasenas no coinciden' })
        return
      }

      setStep('pin')
    },
    [name, password, passwordConfirm]
  )

  const handlePinComplete = useCallback(
    async (pin: string) => {
      if (!transferInfo) return

      setIsLoading(true)

      try {
        // Create user as employee (temporary - will become owner after transfer completes)
        const authEmail = phoneNumber.replace('+', '') + '@phone.local'

        await pb.collection('users').create({
          email: authEmail,
          emailVisibility: false,
          password: password,
          passwordConfirm: password,
          name: name,
          phoneNumber: phoneNumber,
          phoneVerified: true,
          pin: await hashPin(pin),
          role: 'partner', // Partner until owner confirms transfer
          status: 'active',
        })

        // Log in
        await pb.collection('users').authWithPassword(authEmail, password)

        // Mark PIN as verified for this session (user just created it)
        await verifyPinForSession(pin)

        // Accept the transfer
        const response = await fetch(`${POCKETBASE_URL}/api/transfer/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token,
          },
          body: JSON.stringify({ code: transferInfo.code }),
        })

        const result = await response.json()

        if (!result.success) {
          setErrors({ general: result.error || 'Error al aceptar la transferencia' })
          setStep('info')
          setIsLoading(false)
          return
        }

        setStep('success')
      } catch (err) {
        console.error('Registration error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error al crear la cuenta'

        // Check for specific error messages
        if (errorMessage.includes('numero') || errorMessage.includes('phone') || errorMessage.includes('email')) {
          setErrors({ phone: 'Ya existe una cuenta con este numero' })
          setStep('phone')
        } else {
          setErrors({ general: errorMessage })
          setStep('info')
        }
      } finally {
        setIsLoading(false)
      }
    },
    [transferInfo, phoneNumber, password, name, pb, verifyPinForSession]
  )

  const handleLoginSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!transferInfo) return

      setErrors({})
      setIsLoading(true)

      try {
        // Build email from phone number
        const authEmail = transferInfo.toPhone.replace('+', '') + '@phone.local'

        // Authenticate with PocketBase
        await pb.collection('users').authWithPassword(authEmail, loginPassword)

        // Accept the transfer
        const response = await fetch(`${POCKETBASE_URL}/api/transfer/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token,
          },
          body: JSON.stringify({ code: transferInfo.code }),
        })

        const result = await response.json()

        if (!result.success) {
          setErrors({ general: result.error || 'Error al aceptar la transferencia' })
          setIsLoading(false)
          return
        }

        setStep('success')
      } catch (err) {
        console.error('Login error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error al iniciar sesion'
        if (errorMessage.includes('password') || errorMessage.includes('credentials')) {
          setErrors({ loginPassword: 'Contrasena incorrecta' })
        } else {
          setErrors({ general: errorMessage })
        }
      } finally {
        setIsLoading(false)
      }
    },
    [transferInfo, loginPassword, pb]
  )

  const handleBackToCode = useCallback(() => {
    setStep('code')
    setErrors({})
    setTransferInfo(null)
  }, [])

  const handleBackToDetails = useCallback(() => {
    setStep('details')
    setErrors({})
  }, [])

  const handleBackToPhone = useCallback(() => {
    setStep('phone')
    setErrors({})
    setFirebaseToken(null)
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
          <h2 className="text-xl font-display font-bold mb-1">Codigo de transferencia</h2>
          <p className="text-sm text-text-tertiary mb-6">
            Ingresa el codigo que te enviaron para recibir la propiedad
          </p>

          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <Input
              label="Codigo"
              type="text"
              value={transferCode}
              onChange={(e) => setTransferCode(e.target.value.toUpperCase())}
              placeholder="ABCD1234"
              autoComplete="off"
              autoFocus
              maxLength={8}
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

  // Details step (show transfer info and accept button)
  if (step === 'details') {
    return (
      <>
        <Card padding="lg">
          <div className="text-center mb-6">
            <h2 className="text-xl font-display font-bold mb-2">Transferencia de propiedad</h2>
            <p className="text-sm text-text-tertiary">
              {transferInfo?.ownerName} quiere transferirte la propiedad de Mr. Chifles
            </p>
          </div>

          <div className="mb-6 p-4 bg-warning-subtle rounded-lg text-center">
            <p className="text-sm text-warning font-medium mb-2">
              Importante
            </p>
            <p className="text-xs text-text-secondary">
              Iniciaras como Socio hasta que el propietario confirme la transferencia.
            </p>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-error-subtle text-error text-sm rounded-lg">
              {errors.general}
            </div>
          )}

          <button
            type="button"
            onClick={handleAcceptTransfer}
            className="btn btn-primary btn-lg w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner />
                <span>Procesando...</span>
              </>
            ) : isAuthenticated ? (
              'Aceptar transferencia'
            ) : (
              'Continuar'
            )}
          </button>

          {!isAuthenticated && (
            <p className="text-xs text-text-tertiary mt-4 text-center">
              {transferInfo?.existingUser
                ? 'Necesitas iniciar sesion para aceptar'
                : 'Necesitas crear una cuenta para aceptar'}
            </p>
          )}
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

  // Login step (for existing users)
  if (step === 'login') {
    return (
      <>
        <Card padding="lg">
          <div className="mb-6 p-3 bg-brand-subtle rounded-lg text-center">
            <p className="text-sm text-text-secondary">Transferencia de</p>
            <p className="font-display font-bold text-brand">
              {transferInfo?.ownerName}
            </p>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-display font-bold mb-1">
              Hola, {transferInfo?.existingUserName}
            </h2>
            <p className="text-sm text-text-tertiary">
              Ingresa tu contrasena para aceptar la transferencia
            </p>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-error-subtle text-error text-sm rounded-lg">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <Input
              label="Contrasena"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Tu contrasena"
              autoComplete="current-password"
              autoFocus
              error={errors.loginPassword}
            />

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={isLoading || !loginPassword}
            >
              {isLoading ? (
                <>
                  <Spinner />
                  <span>Iniciando sesion...</span>
                </>
              ) : (
                'Aceptar transferencia'
              )}
            </button>
          </form>
        </Card>

        <div className="auth-footer">
          <p className="auth-footer-link">
            <button
              type="button"
              onClick={handleBackToDetails}
              className="text-brand hover:underline"
            >
              Volver
            </button>
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
          <div className="mb-6 p-3 bg-brand-subtle rounded-lg text-center">
            <p className="text-sm text-text-secondary">Transferencia de</p>
            <p className="font-display font-bold text-brand">
              {transferInfo?.ownerName}
            </p>
          </div>

          <h2 className="text-xl font-display font-bold mb-1">Tu numero de telefono</h2>
          <p className="text-sm text-text-tertiary mb-2">
            Debe coincidir con el numero al que se envio la invitacion
          </p>
          <p className="text-xs text-brand mb-6">
            {/* Show only last 4 digits for privacy */}
            {transferInfo?.toPhone ? `****${transferInfo.toPhone.slice(-4)}` : ''}
          </p>

          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <PhoneInput
              label="Numero de telefono"
              value={phoneNumber}
              onChange={setPhoneNumber}
              error={errors.phone}
              autoFocus
              autoComplete="off"
            />

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
            >
              Continuar
            </button>
          </form>
        </Card>

        <div className="auth-footer">
          <p className="auth-footer-link">
            <button
              type="button"
              onClick={handleBackToDetails}
              className="text-brand hover:underline"
            >
              Volver
            </button>
          </p>
        </div>
      </>
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
  if (step === 'pin') {
    return (
      <>
        <Card padding="lg">
          <div className="text-center mb-6">
            <h2 className="text-xl font-display font-bold mb-1">Configura tu PIN</h2>
            <p className="text-sm text-text-tertiary">
              4 digitos para acceso rapido diario
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

  // Success step
  return (
    <Card padding="lg">
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-subtle flex items-center justify-center">
          <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-display font-bold mb-2">Transferencia aceptada</h2>
        <p className="text-sm text-text-tertiary mb-4">
          {transferInfo?.existingUser
            ? 'Cuando el propietario confirme la transferencia, te convertiras en el nuevo propietario.'
            : 'Tu cuenta ha sido creada como Socio. Cuando el propietario confirme la transferencia, te convertiras en el nuevo propietario.'}
        </p>
        <p className="text-xs text-text-quaternary mb-6">
          Mientras tanto, puedes usar la aplicacion normalmente.
        </p>
        <button
          type="button"
          onClick={() => router.push('/inicio')}
          className="btn btn-primary btn-lg w-full"
        >
          Ir al inicio
        </button>
      </div>
    </Card>
  )
}
