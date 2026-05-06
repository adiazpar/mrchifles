'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ContentGuard } from '@/components/auth'
import { OrdersProvider } from '@/contexts/orders-context'
import { SalesSessionsProvider } from '@/contexts/sales-sessions-context'
import { SalesProvider } from '@/contexts/sales-context'
import { ProvidersProvider } from '@/contexts/providers-context'
import { ProductsProvider } from '@/contexts/products-context'
import { ProductSettingsProvider } from '@/contexts/product-settings-context'
import { BusinessDataPreloader } from '@/components/layout/BusinessDataPreloader'
import { TabShell } from '@/components/tab-shell/TabShell'
import { PageHeader } from './page-header'
import { MobileNav } from './mobile-nav'
import { NavigationErrorNotice } from './NavigationErrorNotice'
import type { TabId } from '@/lib/tab-routing'

interface BusinessRootProps {
  businessId: string
  activeTab: TabId
}

export function BusinessRoot({ businessId, activeTab }: BusinessRootProps) {
  const router = useRouter()
  // If the URL is bare /<biz> with no tab, normalize to /<biz>/<activeTab>
  // so refresh and deep-link end up on the same canonical URL.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const path = window.location.pathname
    if (path === `/${businessId}` || path === `/${businessId}/`) {
      router.replace(`/${businessId}/${activeTab}`, { scroll: false })
    }
  }, [businessId, activeTab, router])

  return (
    <ContentGuard>
      <OrdersProvider key={`orders-${businessId}`} businessId={businessId}>
        <SalesSessionsProvider key={`sales-sessions-${businessId}`} businessId={businessId}>
          <SalesProvider key={`sales-${businessId}`} businessId={businessId}>
            <ProvidersProvider key={`providers-${businessId}`} businessId={businessId}>
              <ProductsProvider key={`products-${businessId}`} businessId={businessId}>
                <ProductSettingsProvider key={`product-settings-${businessId}`} businessId={businessId}>
                  <BusinessDataPreloader businessId={businessId} />
                  <NavigationErrorNotice />
                  <PageHeader variant="business" />
                  <TabShell key={`tab-shell-${businessId}`} activeTab={activeTab} />
                  <MobileNav />
                </ProductSettingsProvider>
              </ProductsProvider>
            </ProvidersProvider>
          </SalesProvider>
        </SalesSessionsProvider>
      </OrdersProvider>
    </ContentGuard>
  )
}
