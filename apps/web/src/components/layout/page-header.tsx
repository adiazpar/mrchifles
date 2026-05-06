'use client'

import Image from '@/lib/Image'

import { useState, useEffect } from 'react'
import { usePathname } from '@/lib/next-navigation-shim'
import { Building2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getRouteConfig } from '@/lib/navigation'
import { UserMenu } from './user-menu'
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

interface PageHeaderProps {
  variant: 'hub' | 'business'
}

/**
 * Page header for root layers (hub or business). Drill-down layers render
 * their own DrillDownHeader instead. No cross-context fade plumbing —
 * layer transitions move the entire chrome along with their layer.
 */
export function PageHeader({ variant }: PageHeaderProps) {
  const t = useTranslations()
  const tNav = useTranslations('navigation')
  const pathname = usePathname()
  const businessContext = useOptionalBusiness()
  const [isScrolled, setIsScrolled] = useState(false)

  const business = businessContext?.business ?? null

  // Scroll-shadow listens to the active scroll surface for this variant.
  // Business: per-tab .tab-shell-view.is-active (TabShell still owns its
  // own scrollers; the active one changes as the user switches tabs).
  // Hub: window scroll (HubRoot doesn't use a wrapping scroll container).
  useEffect(() => {
    if (variant === 'business') {
      const findContainer = () =>
        document.querySelector<HTMLElement>('.tab-shell-view.is-active')
      let scrollContainer = findContainer()
      const handleScroll = () => {
        const c = scrollContainer ?? findContainer()
        if (!c) return
        scrollContainer = c
        setIsScrolled(c.scrollTop > 0)
      }
      handleScroll()
      const interval = window.setInterval(() => {
        const next = findContainer()
        if (next !== scrollContainer) {
          if (scrollContainer) scrollContainer.removeEventListener('scroll', handleScroll)
          scrollContainer = next
          if (next) next.addEventListener('scroll', handleScroll, { passive: true })
          handleScroll()
        }
      }, 200)
      if (scrollContainer) scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
      return () => {
        window.clearInterval(interval)
        if (scrollContainer) scrollContainer.removeEventListener('scroll', handleScroll)
      }
    }
    const handle = () => setIsScrolled(window.scrollY > 0)
    handle()
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [variant])

  const config = getRouteConfig(pathname)
  const PAGE_TITLE_MAP: Record<string, string> = {
    Home: tNav('home'),
    Sales: tNav('sales'),
    Products: tNav('products'),
    Manage: tNav('manage'),
  }
  const basePageTitle = config.pageTitle
    ? (PAGE_TITLE_MAP[config.pageTitle] ?? config.pageTitle)
    : config.pageTitle

  return (
    <header
      className={`page-header page-header--fixed ${isScrolled ? 'page-header--scrolled' : ''} page-header--two-col`}
    >
      <div className="page-header__content">
        {variant === 'business' ? (
          <div className="page-header__business-id">
            <div className="page-header__business-logo">
              <BusinessLogo business={business} />
            </div>
            <div className="page-header__titles--inline">
              <h1 className="page-title">{business?.name || t('common.loading')}</h1>
              {basePageTitle && <p className="page-subtitle">{basePageTitle}</p>}
            </div>
          </div>
        ) : null}
      </div>
      <div className="page-header__actions">
        <UserMenu />
      </div>
    </header>
  )
}
