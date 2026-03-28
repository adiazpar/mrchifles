'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useNavbar } from '@/contexts/navbar-context'
import { getUserInitials } from '@/lib/auth'
import { LogOut, ChevronRight, Settings } from 'lucide-react'

interface UserMenuContentProps {
  onAction?: () => void
  showHeader?: boolean
}

/**
 * User menu content - user-level settings only.
 * Business-specific settings (Team, Providers) belong in business settings page.
 */
export function UserMenuContent({ onAction, showHeader = true }: UserMenuContentProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { setPendingHref } = useNavbar()

  const handleLogout = useCallback(() => {
    onAction?.()
    logout()
    router.push('/login')
  }, [logout, router, onAction])

  const handleLinkClick = useCallback((href: string) => {
    setPendingHref(href)
    onAction?.()
  }, [setPendingHref, onAction])

  if (!user) return null

  return (
    <div className="user-menu-content">
      {/* User Info Header */}
      {showHeader && (
        <div className="user-menu-header">
          <div className="user-menu-avatar">
            {getUserInitials(user.name)}
          </div>
          <div className="user-menu-info">
            <div className="user-menu-name">{user.name}</div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="user-menu-items">
        {/* Account Settings */}
        <Link
          href="/account"
          className="user-menu-item"
          onClick={() => handleLinkClick('/account')}
        >
          <Settings size={20} />
          <span>Account Settings</span>
          <ChevronRight size={16} className="user-menu-item-arrow" />
        </Link>
      </div>

      {/* Divider */}
      <div className="user-menu-divider" />

      {/* Logout */}
      <div className="user-menu-items">
        <button
          type="button"
          className="user-menu-item user-menu-item-danger"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  )
}
