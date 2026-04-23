'use client'

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './auth-context'

const BUSINESS_CACHE_STORAGE_KEY = 'kasero_business_cache'

interface CachedBusiness {
  name: string
  role: string
  isOwner: boolean
  locale: string
  currency: string
  type: string | null
  icon: string | null
}

export type SlideDirection = 'forward' | 'back' | null

interface PageTransitionContextValue {
  // Slide transition direction for page navigation
  slideDirection: SlideDirection
  setSlideDirection: (dir: SlideDirection) => void
  // Path of the page that is "deeper" in a slide transition. Read by
  // PageTransition to decide which mounted page plays the enter-from-right
  // animation. Set together with slideDirection. Cleared automatically on
  // pathname change.
  slideTargetPath: string | null
  setSlideTargetPath: (path: string | null) => void
  // Optimistic navigation state - shared across nav components and header
  pendingHref: string | null
  setPendingHref: (href: string | null) => void
  // Optional suffix appended to the header's page subtitle (e.g. the
  // provider name on a provider detail page). Cleared by the detail
  // page on unmount.
  pageSubtitleSuffix: string | null
  setPageSubtitleSuffix: (suffix: string | null) => void
  // Business cache for instant display and access validation
  getCachedBusiness: (businessId: string) => CachedBusiness | null
  setCachedBusiness: (businessId: string, data: CachedBusiness) => void
  setCachedBusinesses: (businesses: Array<{ id: string; name: string; role: string; isOwner: boolean; locale: string; currency: string; type: string | null; icon: string | null }>) => void
  clearCachedBusiness: (businessId: string) => void
}

const PageTransitionContext = createContext<PageTransitionContextValue | null>(null)

export function usePageTransition(): PageTransitionContextValue {
  const context = useContext(PageTransitionContext)
  if (!context) {
    throw new Error('usePageTransition must be used within a PageTransitionProvider')
  }
  return context
}

interface PageTransitionProviderProps {
  children: ReactNode
}

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [slideDirection, setSlideDirectionState] = useState<SlideDirection>(null)
  const [slideTargetPath, setSlideTargetPathState] = useState<string | null>(null)
  const [pendingHref, setPendingHrefState] = useState<string | null>(null)
  const [pageSubtitleSuffix, setPageSubtitleSuffixState] = useState<string | null>(null)

  // Business cache - use ref to avoid re-renders, initialize from sessionStorage
  const businessCacheRef = useRef<Record<string, CachedBusiness>>({})

  // Initialize cache from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(BUSINESS_CACHE_STORAGE_KEY)
      if (stored) {
        businessCacheRef.current = JSON.parse(stored)
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Evict the in-memory business cache whenever the authenticated user
  // changes. The cache is keyed by businessId only (no userId), so without
  // this, a new account logging into the same tab would inherit the prior
  // user's cached role — an employee could then see owner/partner-only
  // edit affordances until the access API refreshed the role.
  const lastUserIdRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    const currentUserId = user?.id ?? null
    if (lastUserIdRef.current === undefined) {
      lastUserIdRef.current = currentUserId
      return
    }
    if (lastUserIdRef.current !== currentUserId) {
      businessCacheRef.current = {}
      try {
        sessionStorage.removeItem(BUSINESS_CACHE_STORAGE_KEY)
      } catch {
        // Ignore storage errors
      }
      lastUserIdRef.current = currentUserId
    }
  }, [user?.id])

  const setSlideDirection = useCallback((dir: SlideDirection) => setSlideDirectionState(dir), [])
  const setSlideTargetPath = useCallback((path: string | null) => setSlideTargetPathState(path), [])
  const setPendingHref = useCallback((href: string | null) => setPendingHrefState(href), [])
  const setPageSubtitleSuffix = useCallback((suffix: string | null) => setPageSubtitleSuffixState(suffix), [])

  // Business cache functions
  const getCachedBusiness = useCallback((businessId: string): CachedBusiness | null => {
    return businessCacheRef.current[businessId] || null
  }, [])

  const setCachedBusiness = useCallback((businessId: string, data: CachedBusiness) => {
    businessCacheRef.current[businessId] = data
    try {
      sessionStorage.setItem(BUSINESS_CACHE_STORAGE_KEY, JSON.stringify(businessCacheRef.current))
    } catch {
      // Ignore storage errors
    }
  }, [])

  const setCachedBusinesses = useCallback((businesses: Array<{ id: string; name: string; role: string; isOwner: boolean; locale: string; currency: string; type: string | null; icon: string | null }>) => {
    businesses.forEach(b => {
      businessCacheRef.current[b.id] = {
        name: b.name,
        role: b.role,
        isOwner: b.isOwner,
        locale: b.locale,
        currency: b.currency,
        type: b.type ?? null,
        icon: b.icon ?? null,
      }
    })
    try {
      sessionStorage.setItem(BUSINESS_CACHE_STORAGE_KEY, JSON.stringify(businessCacheRef.current))
    } catch {
      // Ignore storage errors
    }
  }, [])

  const clearCachedBusiness = useCallback((businessId: string) => {
    delete businessCacheRef.current[businessId]
    try {
      sessionStorage.setItem(BUSINESS_CACHE_STORAGE_KEY, JSON.stringify(businessCacheRef.current))
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Clear pendingHref immediately when pathname changes.
  // Delay clearing slideDirection so the entry animation can finish
  // before the header content reappears.
  useEffect(() => {
    setPendingHrefState(null)
    if (slideDirection) {
      const timer = setTimeout(() => {
        setSlideDirectionState(null)
        setSlideTargetPathState(null)
      }, 180)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Memoize to avoid re-rendering the entire business-scoped tree every
  // time this provider re-renders. PageTransition lives in the root
  // layout and is consumed by PageHeader, MobileNav, PageTransition, and
  // every page — the blast radius of an unmemoized value is the whole
  // app shell on every auth/pathname tick.
  const value = useMemo<PageTransitionContextValue>(
    () => ({
      slideDirection, setSlideDirection,
      slideTargetPath, setSlideTargetPath,
      pendingHref, setPendingHref,
      pageSubtitleSuffix, setPageSubtitleSuffix,
      getCachedBusiness, setCachedBusiness, setCachedBusinesses, clearCachedBusiness,
    }),
    [
      slideDirection, setSlideDirection,
      slideTargetPath, setSlideTargetPath,
      pendingHref, setPendingHref,
      pageSubtitleSuffix, setPageSubtitleSuffix,
      getCachedBusiness, setCachedBusiness, setCachedBusinesses, clearCachedBusiness,
    ],
  )

  return (
    <PageTransitionContext.Provider value={value}>
      {children}
    </PageTransitionContext.Provider>
  )
}
