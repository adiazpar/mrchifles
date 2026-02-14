'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { getUserInitials, getRoleLabel } from '@/lib/auth'

interface UserMenuProps {
  variant: 'sidebar' | 'mobile'
}

export function UserMenu({ variant }: UserMenuProps) {
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = useCallback(() => {
    logout()
    router.push('/login')
  }, [logout, router])

  if (!user) return null

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm"
        aria-label="Cerrar sesion"
      >
        {getUserInitials(user.name)}
      </button>
    )
  }

  // Sidebar variant
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="sidebar-user sidebar-user-interactive w-full text-left"
      aria-label="Cerrar sesion"
    >
      <div className="sidebar-user-avatar">{getUserInitials(user.name)}</div>
      <div className="sidebar-user-info">
        <div className="sidebar-user-name">{user.name}</div>
        <div className="sidebar-user-role">{getRoleLabel(user.role)}</div>
      </div>
    </button>
  )
}
