'use client'

import { PageTransition } from '@/components/layout'

/**
 * Hub layout - Zone 2 navigation
 * Shell (header, nav) is provided by AppShell in root layout.
 * This layout just adds the page transition wrapper.
 */
export default function HubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PageTransition>
      {children}
    </PageTransition>
  )
}
