'use client'

import { MobileNav, Sidebar, TransferBanner } from '@/components/layout'
import { AuthGuard } from '@/components/auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAuth>
      <div className="min-h-screen">
        {/* Sidebar for desktop */}
        <Sidebar />

        {/* Main content area */}
        <div className="with-sidebar flex flex-col h-screen overflow-y-auto">
          {/* Transfer banner for recipients with pending transfers */}
          <TransferBanner />

          {children}
        </div>

        {/* Mobile navigation */}
        <MobileNav />
      </div>
    </AuthGuard>
  )
}
