'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PlusIcon, JoinIcon } from '@/components/icons'
import { getNavItems, getPrefetchRoutes, getBusinessIdFromPath } from '@/lib/navigation'
import { useNavbar } from '@/contexts/navbar-context'
import { useOptionalBusiness } from '@/contexts/business-context'
import { useJoinBusinessModal } from '@/contexts/join-business-context'
import { useCreateBusinessModal } from '@/contexts/create-business-context'

export function MobileNav() {
  const t = useTranslations('ui.nav')
  const tNav = useTranslations('navigation')
  const pathname = usePathname()
  const router = useRouter()
  const { isVisible, pendingHref, setPendingHref, slideDirection, navOverride: liveNavOverride } = useNavbar()
  const businessContext = useOptionalBusiness()
  const { openJoinModal, isJoinModalOpen } = useJoinBusinessModal()
  const { openCreateModal, isCreateModalOpen } = useCreateBusinessModal()
  const navRef = useRef<HTMLElement>(null)

  // Get businessId from pathname (immediate) for context detection
  // This prevents flicker while waiting for context API to load
  const businessIdFromPath = getBusinessIdFromPath(pathname)
  const businessId = businessContext?.businessId ?? businessIdFromPath

  // Determine if we're in hub context based on pathname
  const isHubContext = !businessIdFromPath

  // Local state to control the hidden class
  const [isHidden, setIsHidden] = useState(false)

  // Snapshot of navOverride that stays frozen during slide transitions so the
  // nav slides out with the previous page's content and slides back in with
  // the new page's content. Without this, updating navOverride mid-slide
  // would cause the new content to flash into the still-visible nav before
  // the slide-down animation begins.
  const [displayNavOverride, setDisplayNavOverride] = useState<typeof liveNavOverride>(liveNavOverride)
  useEffect(() => {
    if (slideDirection === null) {
      setDisplayNavOverride(liveNavOverride)
    }
  }, [liveNavOverride, slideDirection])

  // Map nav path segments to translation keys
  const NAV_LABEL_MAP: Record<string, string> = {
    home: tNav('home'),
    sales: tNav('sales'),
    products: tNav('products'),
    manage: tNav('manage'),
    team: tNav('team'),
    providers: tNav('providers'),
  }

  // Get nav items for current business
  const navItems = useMemo(() => {
    if (!businessId) return []
    return getNavItems(businessId)
  }, [businessId])

  // Prefetch all routes on mount for instant navigation
  useEffect(() => {
    if (!businessId) return
    navItems.forEach((item) => {
      router.prefetch(item.href)
    })
    getPrefetchRoutes(businessId).forEach((route) => {
      router.prefetch(route)
    })
  }, [router, businessId, navItems])

  // Hide the nav when:
  //   • isVisible is false (explicit hide() from drill-down pages like
  //     account / providers / team / provider detail)
  //   • slideDirection is set — any active slide transition (hub<->business,
  //     etc.). The nav slides down during the transition and back up once
  //     the new page mounts with its correct items and slideDirection clears.
  const shouldHide = !isVisible || slideDirection !== null
  useEffect(() => {
    if (shouldHide) {
      const timeout = setTimeout(() => {
        setIsHidden(true)
      }, 0)
      return () => clearTimeout(timeout)
    } else {
      setIsHidden(false)
    }
  }, [shouldHide])

  const handleClick = (href: string) => {
    if (href !== pathname) {
      setPendingHref(href)
    }
  }

  const handleCreateBusiness = () => {
    openCreateModal()
  }

  const handleJoinBusiness = () => {
    openJoinModal()
  }

  const [pressedHubItem, setPressedHubItem] = useState<'create' | 'join' | null>(null)
  const pressHandlers = (key: 'create' | 'join') => ({
    onPointerDown: () => setPressedHubItem(key),
    onPointerUp: () => setPressedHubItem(null),
    onPointerLeave: () => setPressedHubItem(null),
    onPointerCancel: () => setPressedHubItem(null),
  })

  // Fade out during cross-context navigation (hub <-> business)
  const isCrossContextNav = pendingHref && (
    (isHubContext && !pendingHref.startsWith('/account') && !pendingHref.startsWith('/join')) ||
    (!isHubContext && (pendingHref === '/' || pendingHref.startsWith('/account') || pendingHref.startsWith('/join')))
  )

  // Style for fading inner content during cross-context navigation
  const contentFadeStyle = {
    opacity: isCrossContextNav ? 0 : 1,
    transition: 'opacity 150ms ease-out',
  }

  // Hub context: render action items styled like the business navbar
  if (isHubContext) {
    return (
      <nav
        ref={navRef}
        className={`mobile-nav ${isHidden ? 'mobile-nav--hidden' : ''}`}
      >
        <div className="flex w-full" style={contentFadeStyle}>
          <button
            type="button"
            onClick={handleCreateBusiness}
            className={`mobile-nav-item ${isCreateModalOpen ? 'active' : ''}`}
            data-pressed={pressedHubItem === 'create'}
            {...pressHandlers('create')}
          >
            <PlusIcon className="mobile-nav-icon" />
            <span>{t('create_business')}</span>
          </button>
          <button
            type="button"
            onClick={handleJoinBusiness}
            className={`mobile-nav-item ${isJoinModalOpen ? 'active' : ''}`}
            data-pressed={pressedHubItem === 'join'}
            {...pressHandlers('join')}
          >
            <JoinIcon className="mobile-nav-icon" />
            <span>{t('join_a_business')}</span>
          </button>
        </div>
      </nav>
    )
  }

  // Business context: render nav items
  if (!businessId) return null

  // A page can replace the standard nav items with a custom action
  // (e.g. the provider detail page's "New order" CTA) via useNavbar().
  // Using the frozen displayNavOverride (not the live one) ensures the
  // nav slides out with the old content and slides back in with the new.
  if (displayNavOverride !== null) {
    return (
      <nav
        ref={navRef}
        className={`mobile-nav ${isHidden ? 'mobile-nav--hidden' : ''}`}
      >
        <div className="flex w-full items-center px-4" style={contentFadeStyle}>
          {displayNavOverride}
        </div>
      </nav>
    )
  }

  return (
    <nav
      ref={navRef}
      className={`mobile-nav ${isHidden ? 'mobile-nav--hidden' : ''}`}
    >
      <div className="flex w-full" style={contentFadeStyle}>
        {navItems.map((item) => {
          const isCurrentPath = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const isPending = pendingHref === item.href
          // Only show current path as active if there's no pending navigation
          const isActive = isPending || (isCurrentPath && !pendingHref)
          const Icon = item.icon

          const pathSegment = item.href.split('/').pop() ?? ''
          const label = NAV_LABEL_MAP[pathSegment] ?? item.label

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handleClick(item.href)}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="mobile-nav-icon" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
