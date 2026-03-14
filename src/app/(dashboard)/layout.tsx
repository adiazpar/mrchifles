'use client'

import { MobileNav, Sidebar, TransferBanner, PageHeader } from '@/components/layout'
import { AuthGuard } from '@/components/auth'
import { NavbarProvider } from '@/contexts/navbar-context'
import { HeaderProvider } from '@/contexts/header-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAuth>
      <NavbarProvider>
        <HeaderProvider>
          <div className="h-full">
            {/* Sidebar for desktop */}
            <Sidebar />

            {/* Fixed header - always visible at top */}
            <PageHeader />

            {/* Main content area */}
            <div className="with-sidebar flex flex-col h-full overflow-y-auto">
              {/* Transfer banner for recipients with pending transfers */}
              <TransferBanner />

              {children}
            </div>

            {/* Mobile navigation */}
            <MobileNav />
          </div>
        </HeaderProvider>
      </NavbarProvider>
    </AuthGuard>
  )
}
