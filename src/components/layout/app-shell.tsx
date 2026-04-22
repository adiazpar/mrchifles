'use client'

import { usePathname } from 'next/navigation'
import { PageHeader } from './page-header'
import { MobileNav } from './mobile-nav'
import { JoinBusinessProvider } from '@/contexts/join-business-context'
import { CreateBusinessProvider } from '@/contexts/create-business-context'
import { BusinessProvider } from '@/contexts/business-context'
import { PendingTransferProvider } from '@/contexts/pending-transfer-context'
import { getBusinessIdFromPath } from '@/lib/navigation'

/**
 * Persistent app shell that renders header and navbar.
 * This component lives in the root layout to prevent unmounting during navigation.
 * Auth routes (/login, /register) don't show the shell.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Auth routes have their own layout without header/nav
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')

  if (isAuthRoute) {
    return (
      <div className="h-full">
        <div className="main-scroll-container flex flex-col h-full overflow-y-auto">
          {children}
        </div>
      </div>
    )
  }

  // Extract businessId from pathname for business routes
  const businessId = getBusinessIdFromPath(pathname)

  // Modals are rendered inside their respective providers
  // BusinessProvider always renders to maintain stable tree structure
  // (prevents remounting when switching between hub and business views)
  return (
    <JoinBusinessProvider>
      <CreateBusinessProvider>
        <BusinessProvider businessId={businessId}>
          <PendingTransferProvider>
            <div className="h-full">
              <PageHeader />
              <div className="main-scroll-container flex flex-col h-full overflow-y-auto overflow-x-hidden">
                {children}
              </div>
              <MobileNav />
            </div>
          </PendingTransferProvider>
        </BusinessProvider>
      </CreateBusinessProvider>
    </JoinBusinessProvider>
  )
}
