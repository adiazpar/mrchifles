'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input, Card, Spinner } from '@/components/ui'
import { PinPad } from '@/components/auth/pin-pad'
import { useAuth } from '@/contexts/auth-context'
import { ownerRegistrationSchema } from '@/lib/auth'

type RegisterStep = 'info' | 'pin'

export default function RegisterPage() {
  const router = useRouter()
  const { registerOwner } = useAuth()

  const [step, setStep] = useState<RegisterStep>('info')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

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
        email,
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
    [email, password, passwordConfirm, name]
  )

  const handlePinComplete = useCallback(
    async (pin: string) => {
      setIsLoading(true)

      try {
        await registerOwner({
          email,
          password,
          name,
          pin,
        })

        router.push('/inicio')
      } catch (err) {
        console.error('Registration error:', err)
        setErrors({ general: 'Error al crear la cuenta. Intenta de nuevo.' })
        setStep('info')
      } finally {
        setIsLoading(false)
      }
    },
    [email, password, name, registerOwner, router]
  )

  const handleBackToInfo = useCallback(() => {
    setStep('info')
    setErrors({})
  }, [])

  // Info step
  if (step === 'info') {
    return (
      <>
        <Card padding="lg">
          <h2 className="text-xl font-display font-bold mb-1">Crear cuenta de dueno</h2>
          <p className="text-sm text-text-tertiary mb-6">
            Configura tu cuenta para gestionar tu negocio
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

            <Input
              label="Contrasena"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 8 caracteres"
              autoComplete="new-password"
              error={errors.password}
            />

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
            Ya tienes cuenta? <Link href="/login">Iniciar sesion</Link>
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
            Usaras este PIN de 4 digitos para acceder rapidamente a tu cuenta cada dia
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
