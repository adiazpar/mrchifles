'use client'

import { usePathname } from '@/lib/next-navigation-shim'
import { LayerStack } from './LayerStack'
import { OfflineBadge } from './OfflineBadge'
import { JoinBusinessProvider } from '@/contexts/join-business-context'
import { CreateBusinessProvider } from '@/contexts/create-business-context'
import { BusinessProvider } from '@/contexts/business-context'
import { PendingTransferProvider } from '@/contexts/pending-transfer-context'
import { IncomingTransferProvider } from '@/contexts/incoming-transfer-context'
import { usePageTransition } from '@/contexts/page-transition-context'
import { getLayerStack } from '@/lib/layer-stack'

/**
 * Persistent app shell. Mounts the LayerStack which renders the appropriate
 * root + drill-down layers derived from `pathname`. Auth routes bypass the
 * stack entirely.
 *
 * BusinessProvider's businessId is derived from the LAYER STACK — not just
 * the URL. This matters when the user is on /account from a business: the
 * URL has no businessId (`/account`), but the layer stack includes the
 * business as an underlay (via accountUnderlay). Using the URL alone here
 * would clear business state mid-stack and ContentGuard would blank the
 * underlying business layer.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { pendingHref } = usePageTransition()

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

  // Use the same effective path the LayerStack does, so optimistic
  // navigation (pendingHref) brings BusinessProvider's businessId into
  // alignment with the rendering layer's businessId on the same render.
  const effectivePath = pendingHref || pathname
  const layers = getLayerStack(effectivePath)
  const bizDescriptor = layers.find((d) => d.kind === 'business-root')
  const businessId =
    bizDescriptor && bizDescriptor.kind === 'business-root'
      ? bizDescriptor.businessId
      : null

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
