'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, Building2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getRouteConfig, getBusinessIdFromPath } from '@/lib/navigation'
import { UserMenu } from './user-menu'
import { usePageTransition } from '@/contexts/page-transition-context'
import { useOptionalBusiness, type Business } from '@/contexts/business-context'
import {
  BUSINESS_TYPE_ICONS,
  BUSINESS_TYPE_FALLBACK_EMOJIS,
} from '@/components/businesses/shared/businessTypeIcons'

function BusinessLogo({ business }: { business: Business | null }) {
  if (!business) {
    return <Building2 className="w-5 h-5 text-brand" />
  }

  const { icon, type } = business

  if (icon && icon.startsWith('data:')) {
    return (
      <Image
        src={icon}
        alt={business.name}
        width={48}
        height={48}
        className="page-header__business-logo-img"
        unoptimized
      />
    )
  }

  if (icon) {
    return <span className="text-xl leading-none">{icon}</span>
  }

  if (type && BUSINESS_TYPE_ICONS[type]) {
    const IconComponent = BUSINESS_TYPE_ICONS[type]
    return <IconComponent className="w-5 h-5 text-brand" />
  }

  if (type && BUSINESS_TYPE_FALLBACK_EMOJIS[type]) {
    return <span className="text-xl leading-none">{BUSINESS_TYPE_FALLBACK_EMOJIS[type]}</span>
  }

  return <Building2 className="w-5 h-5 text-brand" />
}

/**
 * Page header that works in both hub and business contexts.
 *
 * Hub home (`/`):
 * - Left: empty
 * - Right: User avatar menu
 *
 * Hub sub-page with back button (`/account`):
 * - Left: Back button
 * - Center: Page title
 * - Right: User avatar menu
 *
 * Business context:
 * - Left: Business logo + business name + current page label
 * - Right: User avatar menu
 */
export function PageHeader() {
  const t = useTranslations()
  const tNav = useTranslations('navigation')
  const pathname = usePathname()
  const router = useRouter()
  const { pendingHref, navigate, pageSubtitleSuffix } = usePageTransition()
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

  // Track scroll position to show shadow.
  // After the Tier 4 TabShell refactor, business routes scroll inside per-tab
  // containers (.tab-shell-view) rather than the AppShell's
  // .main-scroll-container. We prefer the active tab view, falling back to
  // .main-scroll-container for hub/auth routes that still scroll the outer
  // container. Re-runs on pathname change so the listener follows the user
  // as they switch tabs (the active view element changes).
  useEffect(() => {
    const scrollContainer =
      document.querySelector('.tab-shell-view.is-active') ??
      document.querySelector('.main-scroll-container')
    if (!scrollContainer) return

    const handleScroll = () => {
      setIsScrolled(scrollContainer.scrollTop > 0)
    }

    handleScroll()
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [pathname])

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

  // During cross-context navigation, use the current pathname to prevent
  // header content from changing while still visible. The header is
  // otherwise covered by the overlay during in-context transitions, so
  // content swap during the slide is invisible.
  const config = getRouteConfig(pendingHref || pathname)

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
      router.back()
    } else if (backTo && businessId) {
      router.back()
    } else {
      navigate('/')
    }
  }


  // Hub-context center (Kasero logo / "Account" back-title) and the /account
  // back button fade for cross-context navigation, when the chrome content
  // in those slots is swapping.
  const shouldHideHubChrome = isCrossContextNav

  // Business identifier (logo + name + page label) only fades when we're
  // leaving the business context entirely (hub, account, or join). It does
  // NOT fade for in-business navigation — slide drill-downs (e.g., providers
  // -> provider detail) and fade nav between top-level business pages keep
  // the identifier visible so only the page label content changes.
  const shouldHideBusinessId = isCrossContextNav

  // The user menu never fades — it's stable across every navigation path.

  // Slide transitions hide instantly (no transition) to prevent content
  // flashing mid-fade. The fade-in transition only applies when revealing.
  const hubChromeFadeStyle = {
    opacity: shouldHideHubChrome ? 0 : 1,
    transition: shouldHideHubChrome ? 'none' : 'opacity 100ms ease-out',
  }
  const businessIdFadeStyle = {
    opacity: shouldHideBusinessId ? 0 : 1,
    transition: shouldHideBusinessId ? 'none' : 'opacity 100ms ease-out',
  }

  return (
    <header
      className={`page-header page-header--fixed ${isScrolled ? 'page-header--scrolled' : ''} ${isHubPageWithBackButton ? 'page-header--three-col' : 'page-header--two-col'}`}
    >
      {/* Left column. The wrapper itself never fades; nested elements fade
          per their own scope so in-business nav doesn't blank the header. */}
      <div className="page-header__content">
        {isHubPageWithBackButton ? (
          <button
            type="button"
            onClick={handleBack}
            data-tap-feedback
            className="btn btn-secondary btn-icon flex-shrink-0"
            aria-label={t('ui.page_header.go_back')}
            style={hubChromeFadeStyle}
          >
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </button>
        ) : !isHubContext ? (
          <div className="page-header__business-id" style={businessIdFadeStyle}>
            <div className="page-header__business-logo">
              <BusinessLogo business={business} />
            </div>
            <div className="page-header__titles--inline">
              <h1 className="page-title">{business?.name || t('common.loading')}</h1>
              {pageTitle && <p className="page-subtitle">{pageTitle}</p>}
            </div>
          </div>
        ) : null}
      </div>

      {/* Center column - only rendered on /account (hub sub-page with back
          button), where the three-col grid centers this title between the
          back button and the user menu. Hub home and business mode use the
          two-col grid: identifier in col 1 (1fr), menu in col 2 (auto), no
          center column needed. */}
      {isHubPageWithBackButton && title && (
        <div className="page-header__titles" style={hubChromeFadeStyle}>
          <h1 className="page-title">{title}</h1>
          {pageTitle && <p className="page-subtitle">{pageTitle}</p>}
        </div>
      )}

      {/* Right column - user menu. Always visible, never fades. */}
      <div className="page-header__actions">
        <UserMenu />
      </div>
    </header>
  )
}
