'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/auth-context'
import { useNavbar } from '@/contexts/navbar-context'
import { useIncomingTransferContext } from '@/contexts/incoming-transfer-context'
import { getUserInitials } from '@/lib/auth'
import { ChevronRight, Settings, CircleHelp, LogOut } from 'lucide-react'

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
  const { setPendingHref, setSlideDirection, setSlideTargetPath } = useNavbar()
  const { transfer: incomingTransfer } = useIncomingTransferContext()

  const handleLogout = useCallback(() => {
    onAction?.()
    logout()
    router.push('/login')
  }, [logout, router, onAction])

  const pathname = usePathname()

  const handleLinkClick = useCallback((e: React.MouseEvent, href: string) => {
    if (href === pathname) {
      e.preventDefault()
      onAction?.()
      return
    }
    if (href === '/account') {
      setSlideTargetPath(href)
      setSlideDirection('forward')
    }
    setPendingHref(href)
    onAction?.()
  }, [setPendingHref, setSlideDirection, setSlideTargetPath, onAction, pathname])

  if (!user) return null

  return (
    <div className="user-menu-content">
      {/* User Info Header */}
      {showHeader && (
        <div className="user-menu-header">
          <div className="user-menu-avatar">
            {user.avatar ? (
              // Avatar is a small base64 data URL — Next/Image with its width/
              // height requirements adds no benefit over a plain <img> here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar}
                alt={user.name}
                className="user-menu-avatar-img"
              />
            ) : (
              getUserInitials(user.name)
            )}
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
          onClick={(e) => handleLinkClick(e, '/account')}
        >
          <Settings />
          <span>{t('account_settings')}</span>
          <span className="user-menu-item-trailing">
            {incomingTransfer && (
              <span
                className="w-2.5 h-2.5 rounded-full bg-warning badge-pop-in flex-shrink-0"
                aria-hidden="true"
              />
            )}
            <ChevronRight className="user-menu-item-arrow" />
          </span>
        </Link>

        <Link
          href="/support"
          className="user-menu-item"
          onClick={(e) => handleLinkClick(e, '/support')}
        >
          <CircleHelp />
          <span>{t('support')}</span>
          <ChevronRight className="user-menu-item-arrow" />
        </Link>

        <button
          type="button"
          className="user-menu-item user-menu-item-danger"
          onClick={handleLogout}
        >
          <LogOut />
          <span>{t('log_out')}</span>
        </button>
      </div>
    </div>
  )
}
