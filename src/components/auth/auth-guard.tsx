'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { LoadingPage, Card } from '@/components/ui'
import { PinPad } from './pin-pad'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo,
}: AuthGuardProps) {
  const router = useRouter()
  const { user, isLoading, requiresPinVerification, verifyPinForSession, logout, getRememberedName } = useAuth()
  const [pinError, setPinError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (isLoading) return

    if (requireAuth && !user) {
      // User not authenticated, redirect to login
      router.replace(redirectTo || '/login')
    } else if (!requireAuth && user && !requiresPinVerification) {
      // User authenticated and PIN verified, shouldn't be on auth pages
      router.replace(redirectTo || '/inicio')
    }
  }, [user, isLoading, requireAuth, requiresPinVerification, redirectTo, router])

  const handlePinComplete = useCallback(async (pin: string) => {
    setPinError('')
    setIsVerifying(true)
    try {
      const success = await verifyPinForSession(pin)
      if (!success) {
        setPinError('PIN incorrecto')
      }
    } catch {
      setPinError('Error al verificar PIN')
    } finally {
      setIsVerifying(false)
    }
  }, [verifyPinForSession])

  const handlePinInput = useCallback(() => {
    setPinError('')
  }, [])

  const handleChangeUser = useCallback(() => {
    logout()
    router.replace('/login')
  }, [logout, router])

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingPage />
  }

  // If auth is required and user is not authenticated, don't render children
  if (requireAuth && !user) {
    return <LoadingPage />
  }

  // If auth is NOT required (auth pages) and user IS authenticated and PIN verified
  if (!requireAuth && user && !requiresPinVerification) {
    return <LoadingPage />
  }

  // Show PIN verification overlay if needed
  if (requireAuth && requiresPinVerification) {
    const rememberedName = getRememberedName()
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-sm">
          <Card padding="lg">
            <div className="text-center mb-4">
              <h2 className="font-display font-semibold text-lg text-text-primary mb-1">
                {rememberedName ? `Hola, ${rememberedName.split(' ')[0]}` : 'Bienvenido'}
              </h2>
              <p className="text-text-secondary">Ingresa tu PIN de 4 digitos</p>
            </div>

            <PinPad
              onComplete={handlePinComplete}
              onInput={handlePinInput}
              disabled={isVerifying}
              error={pinError}
            />
          </Card>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleChangeUser}
              className="text-sm text-brand hover:underline"
            >
              Cambiar usuario
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Higher-order component version
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AuthGuardProps, 'children'>
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}
