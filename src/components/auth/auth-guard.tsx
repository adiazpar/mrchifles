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
      // User authenticated, shouldn't be on auth pages
      router.replace(redirectTo || '/home')
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

  // If auth is NOT required (auth pages) and user IS authenticated
  if (!requireAuth && user) {
    return <LoadingPage />
  }

  return <>{children}</>
}
