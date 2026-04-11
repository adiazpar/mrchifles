'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/auth-context'
import { useNavbar } from '@/contexts/navbar-context'
import { getUserInitials } from '@/lib/auth'
import { ChevronRight } from 'lucide-react'
import { SettingsIcon, HelpIcon, LogoutIcon } from '@/components/icons'

interface UserMenuContentProps {
  onAction?: () => void
  showHeader?: boolean
}

/**
 * User menu content - user-level quick actions.
 * Language and theme preferences now live on the account settings page.
 */
export function UserMenuContent({ onAction, showHeader = true }: UserMenuContentProps) {
  const t = useTranslations('ui.user_menu')
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
            <div className="user-menu-email">{user.email}</div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="user-menu-items">
        <Link
          href="/account"
          className="user-menu-item"
          onClick={() => handleLinkClick('/account')}
        >
          <SettingsIcon />
          <span>{t('account_settings')}</span>
          <ChevronRight size={16} className="user-menu-item-arrow" />
        </Link>

        <Link
          href="/support"
          className="user-menu-item"
          onClick={() => handleLinkClick('/support')}
        >
          <HelpIcon />
          <span>{t('support')}</span>
          <ChevronRight size={16} className="user-menu-item-arrow" />
        </Link>

        <button
          type="button"
          className="user-menu-item"
          onClick={handleLogout}
        >
          <LogoutIcon />
          <span>{t('log_out')}</span>
        </button>
      </div>
    </div>
  )
}
