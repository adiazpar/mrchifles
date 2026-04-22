'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getRouteConfig, getBusinessIdFromPath } from '@/lib/navigation'
import { UserMenu } from './user-menu'
import { usePageTransition } from '@/contexts/page-transition-context'
import { useOptionalBusiness } from '@/contexts/business-context'

/**
 * Page header that works in both hub and business contexts.
 *
 * Hub context (no BusinessProvider):
 * - Left: Empty spacer
 * - Center: App name "Kasero"
 * - Right: User avatar menu
 *
 * Business context:
 * - Left: Back button (to hub for top-level pages, to parent for nested pages)
 * - Center: Business name (tappable switcher) + Page name as subtitle
 * - Right: User avatar menu
 */
export function PageHeader() {
  const t = useTranslations()
  const tNav = useTranslations('navigation')
  const pathname = usePathname()
  const router = useRouter()
  const { pendingHref, setPendingHref, slideDirection, setSlideDirection, setSlideTargetPath, pageSubtitleSuffix } = usePageTransition()
  const businessContext = useOptionalBusiness()
  const [isScrolled, setIsScrolled] = useState(false)

  // Get businessId from pathname (immediate) for context detection
  // This prevents flicker while waiting for context API to load
  const businessIdFromPath = getBusinessIdFromPath(pathname)

  // Determine if we're in hub context based on pathname
  const isHubContext = !businessIdFromPath
  const business = businessContext?.business ?? null
  const businessId = businessContext?.businessId ?? businessIdFromPath

  // Some hub pages (like account) should show a back button
  const isHubPageWithBackButton = isHubContext && pathname === '/account'

  // Fade out during cross-context navigation (hub <-> business)
  const isCrossContextNav = pendingHref && (
    (isHubContext && !pendingHref.startsWith('/account') && !pendingHref.startsWith('/join')) ||
    (!isHubContext && (pendingHref === '/' || pendingHref.startsWith('/account') || pendingHref.startsWith('/join')))
  )

  // Track scroll position to show shadow
  useEffect(() => {
    const scrollContainer = document.querySelector('.main-scroll-container')
    if (!scrollContainer) return

    const handleScroll = () => {
      setIsScrolled(scrollContainer.scrollTop > 0)
    }

    // Check initial scroll position
    handleScroll()

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [])

  // Map English page titles/titles from route configs to i18n keys
  const PAGE_TITLE_MAP: Record<string, string> = {
    'Home': tNav('home'),
    'Sales': tNav('sales'),
    'Products': tNav('products'),
    'Manage': tNav('manage'),
    'Team': tNav('team'),
    'Providers': tNav('providers'),
    'Settings': tNav('settings'),
    'Account': tNav('account'),
  }

  // During transitions (slide or cross-context), use current pathname to
  // prevent header content from changing while still visible.
  const config = getRouteConfig(slideDirection || isCrossContextNav ? pathname : (pendingHref || pathname))

  const { title: rawTitle, pageTitle: rawPageTitle, backTo } = config
  const title = rawTitle ? (PAGE_TITLE_MAP[rawTitle] ?? rawTitle) : rawTitle
  const basePageTitle = rawPageTitle ? (PAGE_TITLE_MAP[rawPageTitle] ?? rawPageTitle) : rawPageTitle
  const pageTitle = basePageTitle && pageSubtitleSuffix
    ? `${basePageTitle} · ${pageSubtitleSuffix}`
    : basePageTitle

  // Determine back button behavior:
  // - Hub pages with back button: use browser back
  // - If backTo is set (nested page), go to parent route within business
  // - Otherwise (top-level business page), go to hub
  const handleBack = () => {
    if (isHubPageWithBackButton) {
      setSlideDirection('back')
      setSlideTargetPath(pathname)
      setTimeout(() => router.back(), 280)
    } else if (backTo && businessId) {
      // Drill-down page — return to wherever the user came from via browser
      // history. backTo is a logical fallback but we prefer history so the
      // user lands back where they actually were (e.g. /products orders tab,
      // /manage, or a future entry point). Matches the Account flow.
      setSlideDirection('back')
      setSlideTargetPath(pathname)
      setTimeout(() => router.back(), 280)
    } else {
      // Top-level business page → hub. Slide back so the business page
      // animates out to the right and the hub slides in from the left
      // (parallax peek), matching the Account / drill-down pattern.
      setSlideDirection('back')
      setSlideTargetPath(pathname)
      setPendingHref('/')
      router.push('/')
    }
  }


  // Fade header content during account slide transitions
  const isAccountNav = slideDirection !== null

  // Style for fading inner content during context or account navigation.
  // Slide transitions hide instantly (no transition) to prevent content
  // flashing mid-fade. The fade-in transition only applies when revealing.
  const shouldHide = isCrossContextNav || isAccountNav
  const contentFadeStyle = {
    opacity: shouldHide ? 0 : 1,
    transition: shouldHide ? 'none' : 'opacity 100ms ease-out',
  }

  return (
    <header
      className={`page-header page-header--fixed ${isScrolled ? 'page-header--scrolled' : ''}`}
    >
      {/* Left column */}
      <div className="page-header__content" style={contentFadeStyle}>
        {(!isHubContext || isHubPageWithBackButton) && (
          <button
            type="button"
            onClick={handleBack}
            className="page-header__back"
            aria-label={isHubPageWithBackButton || backTo ? t('ui.page_header.go_back') : t('ui.nav.go_to_hub')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Center column */}
      <div className="page-header__titles" style={contentFadeStyle}>
        {isHubPageWithBackButton && title ? (
          // Hub pages with back button show title instead of logo
          <>
            <h1 className="page-title">{title}</h1>
            {pageTitle && <p className="page-subtitle">{pageTitle}</p>}
          </>
        ) : isHubContext ? (
          <div className="page-header__logo">
            <Image
              src="/kasero-logo.png"
              alt="Kasero"
              width={160}
              height={56}
              style={{ height: 'auto' }}
              priority
            />
          </div>
        ) : (
          <>
            <h1 className="page-title">{business?.name || t('common.loading')}</h1>
            {pageTitle && <p className="page-subtitle">{pageTitle}</p>}
          </>
        )}
      </div>

      {/* Right column - user menu */}
      <div className="page-header__actions" style={contentFadeStyle}>
        <UserMenu />
      </div>
    </header>
  )
}
