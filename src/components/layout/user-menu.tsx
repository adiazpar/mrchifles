'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { getUserInitials, getRoleLabel } from '@/lib/auth'
import { Dropdown } from '@/components/ui/dropdown'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { UserMenuContent } from './user-menu-content'

interface UserMenuProps {
  variant: 'sidebar' | 'mobile'
}

export function UserMenu({ variant }: UserMenuProps) {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // Detect screen size changes - close menu when crossing breakpoint
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')

    setIsDesktop(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches)
      setMenuOpen(false) // Close menu on resize
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const handleClose = () => setMenuOpen(false)

  if (!user) return null

  // Mobile variant: avatar button
  if (variant === 'mobile') {
    const avatarStyles = {
      backgroundColor: 'var(--brand-100)',
      color: 'var(--brand-700)',
    }

    // Desktop: show dropdown
    if (isDesktop) {
      return (
        <Dropdown
          trigger={
            <button
              type="button"
              className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
              aria-label="Menu de usuario"
              style={avatarStyles}
            >
              {getUserInitials(user.name)}
            </button>
          }
          position="bottom"
          align="right"
        >
          <UserMenuContent onAction={undefined} />
        </Dropdown>
      )
    }

    // Mobile: show bottom sheet
    return (
      <>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
          aria-label="Menu de usuario"
          style={avatarStyles}
        >
          {getUserInitials(user.name)}
        </button>
        <BottomSheet
          isOpen={menuOpen}
          onClose={handleClose}
          title="Mi Cuenta"
        >
          <UserMenuContent onAction={handleClose} />
        </BottomSheet>
      </>
    )
  }

  // Sidebar variant: user card that opens dropdown upward
  const trigger = (
    <div className="sidebar-user sidebar-user-interactive w-full text-left">
      <div className="sidebar-user-avatar">{getUserInitials(user.name)}</div>
      <div className="sidebar-user-info">
        <div className="sidebar-user-name">{user.name}</div>
        <div className="sidebar-user-role">{getRoleLabel(user.role)}</div>
      </div>
    </div>
  )

  return (
    <Dropdown
      trigger={trigger}
      position="top"
      align="left"
    >
      <UserMenuContent onAction={undefined} showHeader={false} />
    </Dropdown>
  )
}
