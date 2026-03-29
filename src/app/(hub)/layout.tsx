'use client'

import { PageHeader, MobileNav, PageTransition } from '@/components/layout'
import { NavbarProvider } from '@/contexts/navbar-context'
import { JoinBusinessProvider } from '@/contexts/join-business-context'

/**
 * Hub layout - Zone 2 navigation
 * Uses PageHeader in hub mode (app name, no back button)
 * Uses MobileNav in hub mode (action buttons instead of nav items)
 */
export default function HubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NavbarProvider>
      <JoinBusinessProvider>
        <div className="h-full">
          <PageHeader />
          <div className="main-scroll-container flex flex-col h-full overflow-y-auto">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
          <MobileNav />
        </div>
      </JoinBusinessProvider>
    </NavbarProvider>
  )
}
