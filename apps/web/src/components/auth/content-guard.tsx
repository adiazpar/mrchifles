'use client'

import { useEffect } from 'react'
import { useRouter } from '@/lib/next-navigation-shim'
import { useAuth } from '@/contexts/auth-context'
import { useBusiness } from '@/contexts/business-context'
import { PageSpinner } from '@/components/ui'

/**
 * ContentGuard - Protects page content while allowing the layout shell to render.
 * Shows a spinner during auth or business loading.
 * Redirects to login if not authenticated.
 * Business access validation is handled by BusinessContext.
 */
export function ContentGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { business, isLoading: businessLoading, error: businessError } = useBusiness()

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.replace('/login')
      return
    }
  }, [user, authLoading, router])

  // Show spinner while loading auth or business access
  if (authLoading || businessLoading) {
    return (
      <PageSpinner />
    )
  }

  // No user - waiting for redirect
  if (!user) {
    return (
      <PageSpinner />
    )
  }

  // Business error - BusinessContext handles redirect
  if (businessError) {
    return (
      <PageSpinner />
    )
  }

  // No business context (e.g. during route transition through hub)
  if (!business) {
    return null
  }

  // Render children
  return <>{children}</>
}
