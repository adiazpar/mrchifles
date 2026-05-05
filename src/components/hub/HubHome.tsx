'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronRight, X, Building2, ChefHat, HandHelping, Store, Boxes, Factory, Shapes } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/auth-context'
import { useAuthGate } from '@/contexts/auth-gate-context'
import { usePageTransition } from '@/contexts/page-transition-context'
import { useCreateBusinessModal } from '@/contexts/create-business-context'
import { Spinner } from '@/components/ui'
import { fetchDeduped } from '@/lib/fetch'
import { createSessionCache, CACHE_KEYS } from '@/hooks'

type BusinessType = 'food' | 'retail' | 'services' | 'wholesale' | 'manufacturing' | 'other'

interface Business {
  id: string
  name: string
  role: string
  isOwner: boolean
  memberCount: number
  type: BusinessType | null
  icon: string | null
  locale: string
  currency: string
}

// Default emojis for each business type (fallback for types without custom icons)
const DEFAULT_TYPE_EMOJIS: Record<BusinessType, string> = {
  food: '🍽️',
  retail: '🛍️',
  services: '✂️',
  wholesale: '📦',
  manufacturing: '🏭',
  other: '💼',
}

// Custom icon components for business types (takes precedence over emojis)
const BUSINESS_TYPE_ICONS: Partial<Record<BusinessType, React.ComponentType<{ className?: string }>>> = {
  food: ChefHat,
  retail: Store,
  services: HandHelping,
  wholesale: Boxes,
  manufacturing: Factory,
  other: Shapes,
}

/**
 * Hub page - Zone 2
 * Shows user's businesses or empty state
 * Action buttons are rendered by MobileNav in hub mode
 */
const hubBusinessesCache = createSessionCache<Business[]>(CACHE_KEYS.HUB_BUSINESSES)

function getCachedBusinessList(): Business[] {
  return hubBusinessesCache.get() ?? []
}

export function HubHome() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { markHubReady } = useAuthGate()
  const { navigate, setSlideDirection, setSlideTargetPath, setCachedBusinesses } = usePageTransition()
  const { createdBusiness } = useCreateBusinessModal()
  const [businesses, setBusinesses] = useState<Business[]>(() => getCachedBusinessList())
  const [isLoading, setIsLoading] = useState(() => getCachedBusinessList().length === 0)
  const [searchQuery, setSearchQuery] = useState('')
  const t = useTranslations('hub')

  // Release the auth-gate's hold phase as soon as the hub has its data.
  // Safe to call repeatedly — markHubReady clears its resolver after the
  // first call, so re-renders during warm navigation are no-ops.
  useEffect(() => {
    if (!authLoading && !isLoading) markHubReady()
  }, [authLoading, isLoading, markHubReady])

  const fetchBusinesses = useCallback(async () => {
    try {
      const res = await fetchDeduped('/api/businesses/list')
      if (res.ok) {
        const data = await res.json()
        const fetchedBusinesses = data.businesses || []
        setBusinesses(fetchedBusinesses)
        setCachedBusinesses(fetchedBusinesses)
        hubBusinessesCache.set(fetchedBusinesses)
      }
    } catch (error) {
      console.error('Failed to fetch businesses:', error)
    } finally {
      setIsLoading(false)
    }
  }, [setCachedBusinesses])

  // Use user?.id to avoid re-fetching when the user object reference changes
  // (e.g. auth revalidation returns a new object with the same identity)
  const userId = user?.id
  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      router.push('/login')
      return
    }
    fetchBusinesses()
  }, [userId, authLoading, router, fetchBusinesses])

  // Refresh the business list as soon as a new business is created, so it
  // appears in the hub without waiting for the modal to close or a manual reload.
  useEffect(() => {
    if (createdBusiness) {
      fetchBusinesses()
    }
  }, [createdBusiness, fetchBusinesses])

  const handleEnterBusiness = (businessId: string) => {
    const href = `/${businessId}/home`
    setSlideTargetPath(href)
    setSlideDirection('forward')
    navigate(href)
  }

  // Filter businesses based on search query (must be before early returns)
  const filteredBusinesses = useMemo(() => {
    if (!searchQuery.trim()) return businesses
    const query = searchQuery.toLowerCase().trim()
    return businesses.filter((b) => b.name.toLowerCase().includes(query))
  }, [businesses, searchQuery])

  const ownedBusinesses = filteredBusinesses.filter((b) => b.isOwner)
  const joinedBusinesses = filteredBusinesses.filter((b) => !b.isOwner)
  const hasBusinesses = businesses.length > 0
  const hasFilteredResults = filteredBusinesses.length > 0

  if (authLoading || isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  if (!hasBusinesses) {
    return (
      <main className="page-loading">
        <div className="empty-state-fill">
          <Building2 className="empty-state-icon" />
          <h3 className="empty-state-title">{t('empty_state_title')}</h3>
          <p className="empty-state-description">
            {t('empty_state_description')}
          </p>
        </div>
      </main>
    )
  }

  const getBusinessIcon = (business: Business) => {
    const { icon, type } = business

    // If icon is a base64 image (uploaded logo)
    if (icon && icon.startsWith('data:')) {
      return (
        <Image
          src={icon}
          alt={business.name}
          width={40}
          height={40}
          className="product-list-image-img"
          unoptimized
        />
      )
    }

    // If icon is an emoji (custom set by user)
    if (icon) {
      return <span className="text-2xl">{icon}</span>
    }

    // Use custom icon component for business type if available
    if (type && BUSINESS_TYPE_ICONS[type]) {
      const IconComponent = BUSINESS_TYPE_ICONS[type]
      return <IconComponent className="w-6 h-6 text-brand" />
    }

    // Fall back to default emoji for business type
    if (type && DEFAULT_TYPE_EMOJIS[type]) {
      return <span className="text-2xl">{DEFAULT_TYPE_EMOJIS[type]}</span>
    }

    // Ultimate fallback
    return <Building2 className="w-5 h-5 text-brand" />
  }

  const renderBusinessItem = (business: Business) => (
    <div
      key={business.id}
      className="list-item-clickable"
      onClick={() => handleEnterBusiness(business.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleEnterBusiness(business.id)
        }
      }}
      tabIndex={0}
      role="button"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          {/* Business Icon */}
          <div className="product-list-image">
            {getBusinessIcon(business)}
          </div>

          {/* Business Info */}
          <div className="flex-1 min-w-0">
            <span className="font-medium truncate block">{business.name}</span>
            <span className="text-xs text-text-tertiary mt-0.5 block">
              {t('member_count', { count: business.memberCount })}
            </span>
          </div>

          {/* Chevron */}
          <div className="text-text-tertiary ml-2 flex-shrink-0">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <main className="hub-content space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder={t('search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input input-search w-full"
          style={{ paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', paddingRight: '2.25rem', fontSize: 'var(--text-sm)', minHeight: 'unset' }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-3 flex items-center text-text-tertiary hover:text-text-secondary transition-colors"
            aria-label={t('search_clear')}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* No search results */}
      {searchQuery && !hasFilteredResults && (
        <div className="text-center py-8 text-text-secondary">
          <p>{t('no_results', { query: searchQuery })}</p>
        </div>
      )}

      {ownedBusinesses.length > 0 && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">
              {ownedBusinesses.length === 1 ? t('section_owned_singular') : t('section_owned_plural')}
            </span>
          </div>
          <hr className="border-border" />
          <div>
            {ownedBusinesses.map(renderBusinessItem)}
          </div>
        </div>
      )}

      {joinedBusinesses.length > 0 && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">
              {joinedBusinesses.length === 1 ? t('section_joined_singular') : t('section_joined_plural')}
            </span>
          </div>
          <hr className="border-border" />
          <div>
            {joinedBusinesses.map(renderBusinessItem)}
          </div>
        </div>
      )}
    </main>
  )
}
