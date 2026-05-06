'use client'

import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useRouter, usePathname } from '@/lib/next-navigation-shim'
import { useParams } from 'react-router'
import { useTranslations } from 'next-intl'
import { getNavItems, getPrefetchRoutes } from '@/lib/navigation'
import { usePageTransition } from '@/contexts/page-transition-context'
import { useOptionalBusiness } from '@/contexts/business-context'
import { usePendingTransferContext } from '@/contexts/pending-transfer-context'
import { useIncomingTransferContext } from '@/contexts/incoming-transfer-context'

export function MobileNav() {
  const tNav = useTranslations('navigation')
  const pathname = usePathname()
  const router = useRouter()
  const params = useParams<{ businessId: string }>()
  const businessId = params?.businessId ?? ''
  const { pendingHref, navigate } = usePageTransition()
  const businessContext = useOptionalBusiness()
  const { transfer: pendingTransfer } = usePendingTransferContext()
  const { transfer: incomingTransfer } = useIncomingTransferContext()

  const NAV_LABEL_MAP: Record<string, string> = {
    home: tNav('home'),
    sales: tNav('sales'),
    products: tNav('products'),
    manage: tNav('manage'),
  }

  const navItems = useMemo(
    () => (businessId ? getNavItems(businessId) : []),
    [businessId],
  )

  useEffect(() => {
    if (!businessId) return
    navItems.forEach((item) => router.prefetch(item.href))
    getPrefetchRoutes(businessId).forEach((r) => router.prefetch(r))
  }, [router, businessId, navItems])

  const handleClick = (e: React.MouseEvent, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (e.button !== 0) return
    e.preventDefault()
    if (href === pathname) return
    navigate(href)
  }

  if (!businessId) return null

  return (
    <nav className="mobile-nav">
      <div className="flex w-full">
        {navItems.map((item) => {
          const isCurrentPath = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const isPending = pendingHref === item.href
          const isActive = isPending || (isCurrentPath && !pendingHref)
          const Icon = item.icon
          const seg = item.href.split('/').pop() ?? ''
          const label = NAV_LABEL_MAP[seg] ?? item.label
          const isIncomingForThisBiz =
            Boolean(incomingTransfer) && incomingTransfer?.business.id === businessId
          const showBadge =
            seg === 'manage' &&
            ((businessContext?.isOwner === true && Boolean(pendingTransfer)) ||
              isIncomingForThisBiz)
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={(e) => handleClick(e, item.href)}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="relative inline-flex">
                <Icon className="mobile-nav-icon" />
                {showBadge && (
                  <span
                    className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-warning badge-pop-in"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
