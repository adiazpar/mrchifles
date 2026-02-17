'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { getUserInitials, getRoleLabel, isPartnerOrOwner } from '@/lib/auth'
import { IconLock, IconUsers, IconLogout, IconChevronRight, IconSettings } from '@/components/icons'

interface UserMenuContentProps {
  onAction?: () => void
  showHeader?: boolean
}

export function UserMenuContent({ onAction, showHeader = true }: UserMenuContentProps) {
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = useCallback(() => {
    onAction?.()
    logout()
    router.push('/login')
  }, [logout, router, onAction])

  const handleNavigation = useCallback((path: string) => {
    onAction?.()
    router.push(path)
  }, [router, onAction])

  if (!user) return null

  const canManageTeam = isPartnerOrOwner(user)

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
            <div className="user-menu-role">{getRoleLabel(user.role)}</div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="user-menu-items">
        {/* Change PIN */}
        <button
          type="button"
          className="user-menu-item"
          onClick={() => handleNavigation('/cambiar-pin')}
        >
          <IconLock width={20} height={20} />
          <span>Cambiar PIN</span>
          <IconChevronRight width={16} height={16} className="user-menu-item-arrow" />
        </button>

        {/* Team Management (owner/partner only) */}
        {canManageTeam && (
          <Link
            href="/ajustes/equipo"
            className="user-menu-item"
            onClick={onAction}
          >
            <IconUsers width={20} height={20} />
            <span>Gestionar Equipo</span>
            <IconChevronRight width={16} height={16} className="user-menu-item-arrow" />
          </Link>
        )}

        {/* Settings */}
        <Link
          href="/ajustes"
          className="user-menu-item"
          onClick={onAction}
        >
          <IconSettings width={20} height={20} />
          <span>Configuracion</span>
          <IconChevronRight width={16} height={16} className="user-menu-item-arrow" />
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
          <IconLogout width={20} height={20} />
          <span>Cerrar Sesion</span>
        </button>
      </div>
    </div>
  )
}
