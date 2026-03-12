'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface NavbarContextValue {
  isVisible: boolean
  hide: () => void
  show: () => void
  // Navigation state for return animations
  isReturning: boolean
  setReturning: (value: boolean) => void
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
  const [isVisible, setIsVisible] = useState(true)
  const [isReturning, setIsReturning] = useState(false)

  const hide = useCallback(() => setIsVisible(false), [])
  const show = useCallback(() => setIsVisible(true), [])
  const setReturning = useCallback((value: boolean) => setIsReturning(value), [])

  return (
    <NavbarContext.Provider value={{ isVisible, hide, show, isReturning, setReturning }}>
      {children}
    </NavbarContext.Provider>
  )
}
