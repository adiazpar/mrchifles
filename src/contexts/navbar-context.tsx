'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

interface NavbarContextValue {
  isVisible: boolean
  hide: () => void
  show: () => void
  // Navigation state for return animations
  isReturning: boolean
  setReturning: (value: boolean) => void
  // Optimistic navigation state - shared across nav components and header
  pendingHref: string | null
  setPendingHref: (href: string | null) => void
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
  const [isReturning, setIsReturning] = useState(false)
  const [pendingHref, setPendingHrefState] = useState<string | null>(null)

  const hide = useCallback(() => setIsVisible(false), [])
  const show = useCallback(() => setIsVisible(true), [])
  const setReturning = useCallback((value: boolean) => setIsReturning(value), [])
  const setPendingHref = useCallback((href: string | null) => setPendingHrefState(href), [])

  // Clear pending state when pathname changes (navigation completed)
  useEffect(() => {
    setPendingHrefState(null)
  }, [pathname])

  return (
    <NavbarContext.Provider value={{ isVisible, hide, show, isReturning, setReturning, pendingHref, setPendingHref }}>
      {children}
    </NavbarContext.Provider>
  )
}
