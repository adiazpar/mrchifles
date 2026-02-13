'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input, Card, Spinner } from '@/components/ui'
import { PinPad } from '@/components/auth/pin-pad'
import { useAuth } from '@/contexts/auth-context'
import { employeeRegistrationSchema, getInviteRoleLabel } from '@/lib/auth'
import type { InviteRole } from '@/types'

type InviteStep = 'code' | 'info' | 'pin'

interface InviteInfo {
  code: string
  role: InviteRole
}

export default function InvitePage() {
  const router = useRouter()
  const { registerWithInvite, pb } = useAuth()

  const [step, setStep] = useState<InviteStep>('code')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

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
        setStep('info')
      } catch (err) {
        console.error('Code validation error:', err)
        setErrors({ code: 'Error al verificar el codigo' })
      } finally {
        setIsLoading(false)
      }
    },
    [inviteCode]
  )

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
        email,
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
    [email, password, passwordConfirm, name, inviteInfo]
  )

  const handlePinComplete = useCallback(
    async (pin: string) => {
      if (!inviteInfo) return

      setIsLoading(true)

      try {
        await registerWithInvite({
          inviteCode: inviteInfo.code,
          email,
          password,
          name,
          pin,
        })

        router.push('/inicio')
      } catch (err) {
        console.error('Registration error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Error al crear la cuenta'

        // Check for specific error messages
        if (errorMessage.includes('email') || errorMessage.includes('already exists')) {
          setErrors({ email: 'Ya existe una cuenta con este email' })
        } else {
          setErrors({ general: errorMessage })
        }
        setStep('info')
      } finally {
        setIsLoading(false)
      }
    },
    [inviteInfo, email, password, name, registerWithInvite, router]
  )

  const handleBackToCode = useCallback(() => {
    setStep('code')
    setErrors({})
  }, [])

  const handleBackToInfo = useCallback(() => {
    setStep('info')
    setErrors({})
  }, [])

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

  // Info step
  if (step === 'info') {
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

          <h2 className="text-xl font-display font-bold mb-1">Crear tu cuenta</h2>
          <p className="text-sm text-text-tertiary mb-6">
            Completa tus datos para unirte al equipo
          </p>

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

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              error={errors.email}
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
