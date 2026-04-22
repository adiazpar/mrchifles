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
  const { pendingHref, setPendingHref, slideDirection } = usePageTransition()
  const businessContext = useOptionalBusiness()
  const { openJoinModal, isJoinModalOpen } = useJoinBusinessModal()
  const { openCreateModal, isCreateModalOpen } = useCreateBusinessModal()
  const { transfer: pendingTransfer } = usePendingTransferContext()
  const { transfer: incomingTransfer } = useIncomingTransferContext()

  const businessIdFromPath = getBusinessIdFromPath(pathname)
  const businessId = businessContext?.businessId ?? businessIdFromPath
  const isHubContext = !businessIdFromPath

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

  const handleClick = (href: string) => {
    if (href !== pathname) {
      setPendingHref(href)
    }
  }

  // Mirror PageHeader's fade: instant hide while a cross-context pending nav
  // or a slide transition is in flight, then fade back in over 100ms when the
  // new context has settled. Keeps the navbar content in sync with the
  // header content fade.
  const isCrossContextNav = pendingHref && (
    (isHubContext && !pendingHref.startsWith('/account') && !pendingHref.startsWith('/join')) ||
    (!isHubContext && (pendingHref === '/' || pendingHref.startsWith('/account') || pendingHref.startsWith('/join')))
  )
  const shouldHide = isCrossContextNav || slideDirection !== null
  const contentFadeStyle = {
    opacity: shouldHide ? 0 : 1,
    transition: shouldHide ? 'none' : 'opacity 100ms ease-out',
  }

  return (
    <nav className="mobile-nav">
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
                onClick={() => handleClick(item.href)}
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
