'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { IconLogout } from '@/components/icons'
import { useAuth } from '@/contexts/auth-context'
import { getUserInitials, getRoleLabel } from '@/lib/auth'
import { NAV_ITEMS } from '@/lib/navigation'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href="/inicio" className="sidebar-brand">
          <Image
            src="/logo.png"
            alt="Mr. Chifles"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <span className="sidebar-brand-text">Mr. Chifles</span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="sidebar-nav-icon" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        {/* User info */}
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{getUserInitials(user.name)}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{getRoleLabel(user.role)}</div>
            </div>
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="sidebar-nav-item w-full mt-2 text-error"
        >
          <IconLogout className="sidebar-nav-icon" />
          <span>Cerrar sesion</span>
        </button>
      </div>
    </aside>
  )
}
