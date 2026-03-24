'use client'

import { MobileNav, Sidebar, TransferBanner, PageHeader } from '@/components/layout'
import { AuthContent } from '@/components/auth'
import { NavbarProvider } from '@/contexts/navbar-context'
import { HeaderProvider } from '@/contexts/header-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
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

            <AuthContent requireAuth>{children}</AuthContent>
          </div>

          {/* Mobile navigation */}
          <MobileNav />
        </div>
      </HeaderProvider>
    </NavbarProvider>
  )
}
