'use client'

import { PageTransition } from '@/components/layout'
import { ContentGuard } from '@/components/auth'

/**
 * Business layout.
 * Shell (header, nav) and BusinessProvider are provided by AppShell in root layout.
 * This layout just adds page transition and content guard.
 */
export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PageTransition>
      <ContentGuard>
        {children}
      </ContentGuard>
    </PageTransition>
  )
}
