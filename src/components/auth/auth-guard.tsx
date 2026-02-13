'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { LoadingPage } from '@/components/ui'

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
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (requireAuth && !user) {
      // User not authenticated, redirect to login
      router.replace(redirectTo || '/login')
    } else if (!requireAuth && user) {
      // User authenticated but shouldn't be here (e.g., login page)
      router.replace(redirectTo || '/inicio')
    }
  }, [user, isLoading, requireAuth, redirectTo, router])

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingPage />
  }

  // If auth is required and user is not authenticated, don't render children
  if (requireAuth && !user) {
    return <LoadingPage />
  }

  // If auth is NOT required (auth pages) and user IS authenticated, don't render
  if (!requireAuth && user) {
    return <LoadingPage />
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
