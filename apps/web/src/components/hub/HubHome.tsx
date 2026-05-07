'use client'

import { useIntl } from 'react-intl';

import Image from '@/lib/Image'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useRouter } from '@/lib/next-navigation-shim'
import { ChevronRight, Building2, ChefHat, HandHelping, Store, Boxes, Factory, Shapes, Plus, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useAuthGate } from '@/contexts/auth-gate-context'
import { usePageTransition } from '@/contexts/page-transition-context'
import { useCreateBusinessModal } from '@/contexts/create-business-context'
import { useJoinBusinessModal } from '@/contexts/join-business-context'
import { fetchDeduped } from '@/lib/fetch'
import { createSessionCache, CACHE_KEYS } from '@/hooks'
import {
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonSpinner,
} from '@ionic/react'

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
 * Hub page body. Shows the user's businesses or an empty state.
 */
const hubBusinessesCache = createSessionCache<Business[]>(CACHE_KEYS.HUB_BUSINESSES)

function getCachedBusinessList(): Business[] {
  return hubBusinessesCache.get() ?? []
}

export function HubHome() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <HubHomeBody />
    </div>
  )
}

function HubHomeBody() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { markHubReady } = useAuthGate()
  const { navigate, setCachedBusinesses } = usePageTransition()
  const { createdBusiness, openCreateModal } = useCreateBusinessModal()
  const { openJoinModal } = useJoinBusinessModal()
  const [businesses, setBusinesses] = useState<Business[]>(() => getCachedBusinessList())
  const [isLoading, setIsLoading] = useState(() => getCachedBusinessList().length === 0)
  const [searchQuery, setSearchQuery] = useState('')
  const intl = useIntl()

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
      <div className="flex h-full items-center justify-center">
        <IonSpinner name="crescent" />
      </div>
    )
  }

  if (!hasBusinesses) {
    return (
      <>
        <div className="flex flex-col items-center justify-center px-6 pt-12 pb-8 text-center">
          <Building2 className="w-16 h-16 text-text-tertiary mb-5" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            {intl.formatMessage({ id: 'hub.empty_state_title' })}
          </h2>
          <p className="text-sm text-text-secondary mb-6 max-w-xs">
            {intl.formatMessage({ id: 'hub.empty_state_description' })}
          </p>
        </div>
        <div className="px-4">
          <HubActionCards onCreate={openCreateModal} onJoin={openJoinModal} />
        </div>
      </>
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
    <IonItem
      key={business.id}
      button
      detail
      onClick={() => handleEnterBusiness(business.id)}
    >
      <div slot="start" className="w-10 h-10 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0 overflow-hidden">
        {getBusinessIcon(business)}
      </div>
      <IonLabel>
        <h3>{business.name}</h3>
        <p>
          {intl.formatMessage(
            { id: 'hub.member_count' },
            { count: business.memberCount }
          )}
        </p>
      </IonLabel>
    </IonItem>
  )

  return (
    <div className="px-4 py-6 space-y-6">
      <HubActionCards onCreate={openCreateModal} onJoin={openJoinModal} />
      <IonSearchbar
        value={searchQuery}
        onIonInput={(e) => setSearchQuery(e.detail.value ?? '')}
        placeholder={intl.formatMessage({ id: 'hub.search_placeholder' })}
        showClearButton="focus"
        className="px-0"
      />
      {searchQuery && !hasFilteredResults && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-text-secondary">
            {intl.formatMessage({ id: 'hub.no_results' }, { query: searchQuery })}
          </p>
        </div>
      )}
      {ownedBusinesses.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-2 px-1">
            {ownedBusinesses.length === 1
              ? intl.formatMessage({ id: 'hub.section_owned_singular' })
              : intl.formatMessage({ id: 'hub.section_owned_plural' })}
          </h2>
          <IonList lines="full" className="bg-bg-surface rounded-2xl overflow-hidden">
            {ownedBusinesses.map(renderBusinessItem)}
          </IonList>
        </div>
      )}
      {joinedBusinesses.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-2 px-1">
            {joinedBusinesses.length === 1
              ? intl.formatMessage({ id: 'hub.section_joined_singular' })
              : intl.formatMessage({ id: 'hub.section_joined_plural' })}
          </h2>
          <IonList lines="full" className="bg-bg-surface rounded-2xl overflow-hidden">
            {joinedBusinesses.map(renderBusinessItem)}
          </IonList>
        </div>
      )}
    </div>
  )
}

interface HubActionCardsProps {
  onCreate: () => void
  onJoin: () => void
}

function HubActionCards({ onCreate, onJoin }: HubActionCardsProps) {
  const intl = useIntl()
  return (
    <div className="space-y-3">
      <IonCard button onClick={onCreate} className="m-0">
        <IonCardContent className="flex items-start gap-4 py-5">
          <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0">
            <Plus className="w-6 h-6 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-text-primary">
              {intl.formatMessage({ id: 'hub.action_create_title' })}
            </div>
            <div className="text-sm text-text-secondary mt-1">
              {intl.formatMessage({ id: 'hub.action_create_desc' })}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0 mt-1" />
        </IonCardContent>
      </IonCard>
      <IonCard button onClick={onJoin} className="m-0">
        <IonCardContent className="flex items-start gap-4 py-5">
          <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-6 h-6 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold text-text-primary">
              {intl.formatMessage({ id: 'hub.action_join_title' })}
            </div>
            <div className="text-sm text-text-secondary mt-1">
              {intl.formatMessage({ id: 'hub.action_join_desc' })}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0 mt-1" />
        </IonCardContent>
      </IonCard>
    </div>
  )
}
