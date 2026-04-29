'use client'

import { useParams, usePathname } from 'next/navigation'
import { ContentGuard } from '@/components/auth'
import { OrdersProvider } from '@/contexts/orders-context'
import { SalesProvider } from '@/contexts/sales-context'
import { ProvidersProvider } from '@/contexts/providers-context'
import { ProductsProvider } from '@/contexts/products-context'
import { ProductSettingsProvider } from '@/contexts/product-settings-context'
import { BusinessDataPreloader } from '@/components/layout/BusinessDataPreloader'
import { TabShell } from '@/components/tab-shell/TabShell'
import { DrillDownOverlay } from '@/components/tab-shell/DrillDownOverlay'
import { isDrillDownPath } from '@/lib/tab-routing'

/**
 * Business layout.
 * Shell (header, nav) and BusinessProvider are provided by AppShell in root layout.
 * This layout adds the per-business data providers and the persistent TabShell
 * that owns all 6 tab views. Drill-down routes (e.g. /providers/[id]) are
 * rendered through DrillDownOverlay, which slides over TabShell without
 * unmounting it — so going back returns the user to the exact previous tab
 * state (scroll, expanded rows, in-progress edits, etc.).
 */
export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams<{ businessId: string }>()
  const businessId = params?.businessId ?? ''
  const pathname = usePathname()
  const isDrillDown = isDrillDownPath(pathname, businessId)

  return (
    <ContentGuard>
      <OrdersProvider key={`orders-${businessId}`} businessId={businessId}>
        <SalesProvider key={`sales-${businessId}`} businessId={businessId}>
          <ProvidersProvider key={`providers-${businessId}`} businessId={businessId}>
            <ProductsProvider key={`products-${businessId}`} businessId={businessId}>
              <ProductSettingsProvider key={`product-settings-${businessId}`} businessId={businessId}>
                <BusinessDataPreloader businessId={businessId} />
                {/*
                  Positioning context for absolutely-positioned TabShell views
                  and the drill-down overlay. h-full takes the height that
                  AppShell's main-scroll-container provides; relative
                  establishes the positioning context for inset:0 children.
                */}
                <div className="relative h-full">
                  <TabShell key={`tab-shell-${businessId}`} />
                  <DrillDownOverlay isOpen={isDrillDown}>
                    {children}
                  </DrillDownOverlay>
                </div>
              </ProductSettingsProvider>
            </ProductsProvider>
          </ProvidersProvider>
        </SalesProvider>
      </OrdersProvider>
    </ContentGuard>
  )
}
