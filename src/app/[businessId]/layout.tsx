'use client'

import { useParams } from 'next/navigation'
import { PageTransition } from '@/components/layout'
import { ContentGuard } from '@/components/auth'
import { OrdersProvider } from '@/contexts/orders-context'

/**
 * Business layout.
 * Shell (header, nav) and BusinessProvider are provided by AppShell in root layout.
 * This layout adds page transition, content guard, and a shared orders store
 * keyed on businessId so pages see a single source of truth for orders.
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
        <OrdersProvider key={businessId} businessId={businessId}>
          {children}
        </OrdersProvider>
      </ContentGuard>
    </PageTransition>
  )
}
