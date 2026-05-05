'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { usePageTransition } from '@/contexts/page-transition-context'
import { classifyOverlayRoute } from '@/lib/overlay-routing'
import { RouteOverlay } from './RouteOverlay'

interface Props {
  underlay: React.ReactNode
  children: React.ReactNode  // the @overlay slot content
}

// Wires the (hub) layout's children slot (underlay) and @overlay slot
// (children prop) into a RouteOverlay. The overlay opens whenever the
// current pathname OR the in-flight pendingHref is a hub-overlay route.
// underlayRef is intentionally omitted — hub overlay does not parallax
// the underlay in v1.
export function HubOverlayMount({ underlay, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { pendingHref } = usePageTransition()
  const tCommon = useTranslations()

  const overlayKind = classifyOverlayRoute(pathname)
  const pendingKind = classifyOverlayRoute(pendingHref)
  const isOpen = overlayKind === 'hub' || pendingKind === 'hub'

  const ariaLabel = (() => {
    const path = pendingHref || pathname || ''
    if (path === '/account' || path.startsWith('/account/')) return tCommon('navigation.account')
    if (path === '/join' || path.startsWith('/join/')) return tCommon('navigation.join')
    return tCommon('common.page')
  })()

  return (
    <>
      {underlay}
      <RouteOverlay
        isOpen={isOpen}
        onPeelDismiss={() => router.back()}
        ariaLabel={ariaLabel}
      >
        {children}
      </RouteOverlay>
    </>
  )
}
