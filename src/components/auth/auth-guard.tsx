'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Spinner, LoadingPage } from '@/components/ui'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

/**
 * AuthGuard - For auth pages (login, register, invite)
 * Blocks entire page while checking auth, used when layout shell isn't needed
 */
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
      router.replace(redirectTo || '/login')
    } else if (!requireAuth && user) {
      router.replace(redirectTo || '/home')
    }
  }, [user, isLoading, requireAuth, redirectTo, router])

  if (isLoading) {
    return <LoadingPage />
  }

  if (requireAuth && !user) {
    return <LoadingPage />
  }

  if (!requireAuth && user) {
    return <LoadingPage />
  }

  return <>{children}</>
}

interface AuthContentProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

/**
 * AuthContent - For dashboard pages
 * Only protects content area, allows layout shell (header, navbar) to render immediately
 */
export function AuthContent({
  children,
  requireAuth = true,
  redirectTo,
}: AuthContentProps) {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (requireAuth && !user) {
      router.replace(redirectTo || '/login')
    }
  }, [user, isLoading, requireAuth, redirectTo, router])

  // Show loading spinner in content area while checking auth
  if (isLoading || (requireAuth && !user)) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  return <>{children}</>
}
