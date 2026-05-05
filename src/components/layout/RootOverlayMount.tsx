'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { usePageTransition } from '@/contexts/page-transition-context'
import { classifyOverlayRoute } from '@/lib/overlay-routing'
import { RouteOverlay } from './RouteOverlay'

interface Props {
  children: React.ReactNode  // the @overlay slot content from root layout
}

// Mounts RouteOverlay at the AppShell level for hub-style overlay routes
// (/account, /join). Drill-down overlays inside business contexts are
// mounted separately by BusinessLayout. The overlay opens whenever the
// current pathname OR the in-flight pendingHref is a hub overlay route.
//
// Underlay parallax is intentionally not wired here: the underlay is
// the entire AppShell tree (header, navbar, current page content), and
// transforming that risks breaking the position:fixed header / navbar.
// Drill-downs DO get parallax because their underlay is the contained
// TabShell wrapper.
export function RootOverlayMount({ children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { pendingHref } = usePageTransition()
  const t = useTranslations()

  const overlayKind = classifyOverlayRoute(pathname)
  const pendingKind = classifyOverlayRoute(pendingHref)
  const isOpen = overlayKind === 'hub' || pendingKind === 'hub'

  const ariaLabel = (() => {
    const path = pendingHref || pathname || ''
    if (path === '/account' || path.startsWith('/account/')) return t('navigation.account')
    if (path === '/join' || path.startsWith('/join/')) return t('navigation.join')
    return t('common.page')
  })()

  return (
    <RouteOverlay
      isOpen={isOpen}
      onPeelDismiss={() => router.back()}
      ariaLabel={ariaLabel}
    >
      {children}
    </RouteOverlay>
  )
}
