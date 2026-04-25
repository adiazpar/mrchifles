'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, UserPlus } from 'lucide-react'
import { getNavItems, getPrefetchRoutes, getBusinessIdFromPath } from '@/lib/navigation'
import { usePageTransition } from '@/contexts/page-transition-context'
import { useOptionalBusiness } from '@/contexts/business-context'
import { useJoinBusinessModal } from '@/contexts/join-business-context'
import { useCreateBusinessModal } from '@/contexts/create-business-context'
import { usePendingTransferContext } from '@/contexts/pending-transfer-context'
import { useIncomingTransferContext } from '@/contexts/incoming-transfer-context'

export function MobileNav() {
  const t = useTranslations('ui.nav')
  const tNav = useTranslations('navigation')
  const pathname = usePathname()
  const router = useRouter()
  const { pendingHref, navigate } = usePageTransition()
  const businessContext = useOptionalBusiness()
  const { openJoinModal, isJoinModalOpen } = useJoinBusinessModal()
  const { openCreateModal, isCreateModalOpen } = useCreateBusinessModal()
  const { transfer: pendingTransfer } = usePendingTransferContext()
  const { transfer: incomingTransfer } = useIncomingTransferContext()

  const businessIdFromPath = getBusinessIdFromPath(pathname)
  const businessId = businessContext?.businessId ?? businessIdFromPath
  const isHubContext = !businessIdFromPath
  // Hide the nav on settings — it's a focused page, the Create/Join
  // shortcuts are out of context. Hidden via CSS class so the transform +
  // opacity transition plays on enter and exit, no DOM unmount.
  const isAccountRoute = pathname === '/account'

  const NAV_LABEL_MAP: Record<string, string> = {
    home: tNav('home'),
    sales: tNav('sales'),
    products: tNav('products'),
    manage: tNav('manage'),
    team: tNav('team'),
    providers: tNav('providers'),
  }

  const navItems = useMemo(() => {
    if (!businessId) return []
    return getNavItems(businessId)
  }, [businessId])

  useEffect(() => {
    if (!businessId) return
    getNavItems(businessId).forEach((item) => {
      router.prefetch(item.href)
    })
    getPrefetchRoutes(businessId).forEach((route) => {
      router.prefetch(route)
    })
  }, [router, businessId])

  const handleClick = (e: React.MouseEvent, href: string) => {
    // Let the browser handle modifier-clicks (open in new tab, etc.).
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (e.button !== 0) return
    e.preventDefault()
    // Same-path tap is a no-op. Calling router.push with the current path
    // is a known stall trigger in App Router and would also leave the
    // pendingHref watchdog as the only thing clearing the UI.
    if (href === pathname) return
    navigate(href)
  }

  // Fade only when the icon group is about to change, i.e. cross-context
  // transitions (hub <-> business). Within-context drill-downs keep the same
  // icon set, so fading there would be motion without a reason.
  const isCrossContextNav = Boolean(pendingHref) && (
    (isHubContext && !pendingHref!.startsWith('/account') && !pendingHref!.startsWith('/join')) ||
    (!isHubContext && (pendingHref === '/' || pendingHref!.startsWith('/account') || pendingHref!.startsWith('/join')))
  )
  const contentFadeStyle = {
    opacity: isCrossContextNav ? 0 : 1,
    transition: isCrossContextNav ? 'none' : 'opacity 100ms ease-out',
  }

  return (
    <nav className={`mobile-nav ${isAccountRoute ? 'mobile-nav--hidden' : ''}`}>
      <div className="flex w-full" style={contentFadeStyle}>
        {isHubContext ? (
          <>
            <button
              type="button"
              onClick={openCreateModal}
              className={`mobile-nav-item ${isCreateModalOpen ? 'active' : ''}`}
            >
              <Plus className="mobile-nav-icon" />
              <span>{t('create_business')}</span>
            </button>
            <button
              type="button"
              onClick={openJoinModal}
              className={`mobile-nav-item ${isJoinModalOpen ? 'active' : ''}`}
            >
              <UserPlus className="mobile-nav-icon" />
              <span>{t('join_a_business')}</span>
            </button>
          </>
        ) : (
          navItems.map((item) => {
            const isCurrentPath = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const isPending = pendingHref === item.href
            const isActive = isPending || (isCurrentPath && !pendingHref)
            const Icon = item.icon

            const pathSegment = item.href.split('/').pop() ?? ''
            const label = NAV_LABEL_MAP[pathSegment] ?? item.label

            // Show the Manage badge in two cases:
            //   1. Owner has initiated a pending outgoing transfer for this
            //      business (waiting for the recipient to accept).
            //   2. Current user is the recipient of an incoming transfer
            //      targeting THIS business (they're already a member and can
            //      accept from the Manage page). If the incoming transfer
            //      targets a different business, the badge doesn't apply here.
            const isIncomingTransferForThisBusiness =
              Boolean(incomingTransfer) &&
              incomingTransfer?.business.id === businessId
            const showTransferBadge =
              pathSegment === 'manage' &&
              ((businessContext?.isOwner === true && Boolean(pendingTransfer)) ||
                isIncomingTransferForThisBusiness)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleClick(e, item.href)}
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="relative inline-flex">
                  <Icon className="mobile-nav-icon" />
                  {showTransferBadge && (
                    <span
                      className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-warning badge-pop-in"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span>{label}</span>
              </Link>
            )
          })
        )}
      </div>
    </nav>
  )
}
