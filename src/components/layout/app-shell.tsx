'use client'

import { usePathname } from 'next/navigation'
import { LayerStack } from './LayerStack'
import { OfflineBadge } from './OfflineBadge'
import { JoinBusinessProvider } from '@/contexts/join-business-context'
import { CreateBusinessProvider } from '@/contexts/create-business-context'
import { BusinessProvider } from '@/contexts/business-context'
import { PendingTransferProvider } from '@/contexts/pending-transfer-context'
import { IncomingTransferProvider } from '@/contexts/incoming-transfer-context'
import { getBusinessIdFromPath } from '@/lib/navigation'

/**
 * Persistent app shell. Mounts the LayerStack which renders the appropriate
 * root + drill-down layers derived from `pathname`. Auth routes bypass the
 * stack entirely.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

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

  const businessId = getBusinessIdFromPath(pathname)
  return (
    <JoinBusinessProvider>
      <CreateBusinessProvider>
        <IncomingTransferProvider>
          <BusinessProvider businessId={businessId}>
            <PendingTransferProvider>
              <OfflineBadge />
              <LayerStack />
            </PendingTransferProvider>
          </BusinessProvider>
        </IncomingTransferProvider>
      </CreateBusinessProvider>
    </JoinBusinessProvider>
  )
}
