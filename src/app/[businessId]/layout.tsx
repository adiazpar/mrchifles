'use client'

import { useRef } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ContentGuard } from '@/components/auth'
import { OrdersProvider } from '@/contexts/orders-context'
import { SalesSessionsProvider } from '@/contexts/sales-sessions-context'
import { SalesProvider } from '@/contexts/sales-context'
import { ProvidersProvider } from '@/contexts/providers-context'
import { ProductsProvider } from '@/contexts/products-context'
import { ProductSettingsProvider } from '@/contexts/product-settings-context'
import { BusinessDataPreloader } from '@/components/layout/BusinessDataPreloader'
import { TabShell } from '@/components/tab-shell/TabShell'
import { RouteOverlay } from '@/components/layout/RouteOverlay'
import { usePageTransition } from '@/contexts/page-transition-context'
import { classifyOverlayRoute } from '@/lib/overlay-routing'

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams<{ businessId: string }>()
  const businessId = params?.businessId ?? ''
  const pathname = usePathname()
  const router = useRouter()
  const { pendingHref } = usePageTransition()
  const tabShellRef = useRef<HTMLDivElement>(null)
  const tCommon = useTranslations()

  const overlayKind = classifyOverlayRoute(pathname)
  const pendingKind = classifyOverlayRoute(pendingHref)
  const isOverlayOpen = overlayKind === 'business' || pendingKind === 'business'

  // The drill-down content's purpose is too varied to label precisely
  // (provider detail, product detail, etc.). Use a generic label.
  const ariaLabel = tCommon('common.detail')

  return (
    <ContentGuard>
      <OrdersProvider key={`orders-${businessId}`} businessId={businessId}>
        <SalesSessionsProvider key={`sales-sessions-${businessId}`} businessId={businessId}>
          <SalesProvider key={`sales-${businessId}`} businessId={businessId}>
            <ProvidersProvider key={`providers-${businessId}`} businessId={businessId}>
              <ProductsProvider key={`products-${businessId}`} businessId={businessId}>
                <ProductSettingsProvider key={`product-settings-${businessId}`} businessId={businessId}>
                  <BusinessDataPreloader businessId={businessId} />
                  <div className="relative h-full shell-enter">
                    <div ref={tabShellRef} className="absolute inset-0">
                      <TabShell key={`tab-shell-${businessId}`} />
                    </div>
                    <RouteOverlay
                      isOpen={isOverlayOpen}
                      onPeelDismiss={() => router.back()}
                      underlayRef={tabShellRef}
                      ariaLabel={ariaLabel}
                    >
                      {children}
                    </RouteOverlay>
                  </div>
                </ProductSettingsProvider>
              </ProductsProvider>
            </ProvidersProvider>
          </SalesProvider>
        </SalesSessionsProvider>
      </OrdersProvider>
    </ContentGuard>
  )
}
