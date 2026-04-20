'use client'

import { useParams } from 'next/navigation'
import { PageTransition } from '@/components/layout'
import { ContentGuard } from '@/components/auth'
import { OrdersProvider } from '@/contexts/orders-context'
import { ProvidersProvider } from '@/contexts/providers-context'
import { ProductsProvider } from '@/contexts/products-context'

/**
 * Business layout.
 * Shell (header, nav) and BusinessProvider are provided by AppShell in root layout.
 * This layout adds page transition, content guard, and shared orders / providers /
 * products stores keyed on businessId so pages see a single source of truth and
 * navigation between them doesn't trigger duplicate fetches.
 */
export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams<{ businessId: string }>()
  const businessId = params?.businessId ?? ''

  return (
    <PageTransition>
      <ContentGuard>
        <OrdersProvider key={`orders-${businessId}`} businessId={businessId}>
          <ProvidersProvider key={`providers-${businessId}`} businessId={businessId}>
            <ProductsProvider key={`products-${businessId}`} businessId={businessId}>
              {children}
            </ProductsProvider>
          </ProvidersProvider>
        </OrdersProvider>
      </ContentGuard>
    </PageTransition>
  )
}
