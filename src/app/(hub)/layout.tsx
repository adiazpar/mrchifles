import { PageTransition } from '@/components/layout'

/**
 * Hub layout - Zone 2 navigation
 * Shell (header, nav) is provided by AppShell in root layout.
 * This layout just adds the page transition wrapper.
 *
 * Rendered as a Server Component — PageTransition itself is a client
 * component but RSCs can compose client components as children with no
 * issue. Shipping this file as server-only removes the `'use client'`
 * boundary from the hub route tree.
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
