'use client'

import { use } from 'react'
import { MobileNav, PageHeader } from '@/components/layout'
import { ContentGuard } from '@/components/auth'
import { NavbarProvider } from '@/contexts/navbar-context'
import { BusinessProvider } from '@/contexts/business-context'

interface BusinessLayoutProps {
  children: React.ReactNode
  params: Promise<{
    businessId: string
  }>
}

export default function BusinessLayout({
  children,
  params,
}: BusinessLayoutProps) {
  const { businessId } = use(params)

  return (
    <BusinessProvider businessId={businessId}>
      <NavbarProvider>
        <div className="h-full">
          <PageHeader />
          <div className="main-scroll-container flex flex-col h-full overflow-y-auto">
            <ContentGuard>
              {children}
            </ContentGuard>
          </div>
          <MobileNav />
        </div>
      </NavbarProvider>
    </BusinessProvider>
  )
}
