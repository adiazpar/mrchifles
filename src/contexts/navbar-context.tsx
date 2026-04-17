'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

const BUSINESS_CACHE_STORAGE_KEY = 'kasero_business_cache'

interface CachedBusiness {
  name: string
  role: string
  isOwner: boolean
  locale: string
  currency: string
}

export type SlideDirection = 'forward' | 'back' | null

interface NavbarContextValue {
  isVisible: boolean
  hide: () => void
  show: () => void
  // Slide transition direction for account page navigation
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
  // Business cache for instant display and access validation
  getCachedBusiness: (businessId: string) => CachedBusiness | null
  setCachedBusiness: (businessId: string, data: CachedBusiness) => void
  setCachedBusinesses: (businesses: Array<{ id: string; name: string; role: string; isOwner: boolean; locale: string; currency: string }>) => void
}

const NavbarContext = createContext<NavbarContextValue | null>(null)

export function useNavbar(): NavbarContextValue {
  const context = useContext(NavbarContext)
  if (!context) {
    throw new Error('useNavbar must be used within a NavbarProvider')
  }
  return context
}

interface NavbarProviderProps {
  children: ReactNode
}

export function NavbarProvider({ children }: NavbarProviderProps) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [slideDirection, setSlideDirectionState] = useState<SlideDirection>(null)
  const [slideTargetPath, setSlideTargetPathState] = useState<string | null>(null)
  const [pendingHref, setPendingHrefState] = useState<string | null>(null)

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

  const hide = useCallback(() => setIsVisible(false), [])
  const show = useCallback(() => setIsVisible(true), [])
  const setSlideDirection = useCallback((dir: SlideDirection) => setSlideDirectionState(dir), [])
  const setSlideTargetPath = useCallback((path: string | null) => setSlideTargetPathState(path), [])
  const setPendingHref = useCallback((href: string | null) => setPendingHrefState(href), [])

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

  const setCachedBusinesses = useCallback((businesses: Array<{ id: string; name: string; role: string; isOwner: boolean; locale: string; currency: string }>) => {
    businesses.forEach(b => {
      businessCacheRef.current[b.id] = {
        name: b.name,
        role: b.role,
        isOwner: b.isOwner,
        locale: b.locale,
        currency: b.currency,
      }
    })
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

  return (
    <NavbarContext.Provider value={{
      isVisible, hide, show,
      slideDirection, setSlideDirection,
      slideTargetPath, setSlideTargetPath,
      pendingHref, setPendingHref,
      getCachedBusiness, setCachedBusiness, setCachedBusinesses,
    }}>
      {children}
    </NavbarContext.Provider>
  )
}
