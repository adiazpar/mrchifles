'use client'

import { MobileNav, Sidebar, UserMenu } from '@/components/layout'
import { AuthGuard } from '@/components/auth'
import { LockScreen } from '@/components/auth/lock-screen'
import { useAuth } from '@/contexts/auth-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLocked } = useAuth()

  return (
    <AuthGuard requireAuth>
      <div className="min-h-screen">
        {/* Sidebar for desktop */}
        <Sidebar />

        {/* Mobile user avatar (top right) */}
        <div className="mobile-user-menu">
          <UserMenu variant="mobile" />
        </div>

        {/* Main content area */}
        <div className="with-sidebar flex flex-col min-h-screen">
          {children}
        </div>

        {/* Mobile navigation */}
        <MobileNav />

        {/* Lock screen overlay */}
        {isLocked && <LockScreen />}
      </div>
    </AuthGuard>
  )
}
