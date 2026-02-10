'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconHome,
  IconSales,
  IconProducts,
  IconCashDrawer,
  IconReports,
  IconChifle,
} from '@/components/icons'

const navItems = [
  { href: '/inicio', label: 'Inicio', icon: IconHome },
  { href: '/ventas', label: 'Ventas', icon: IconSales },
  { href: '/productos', label: 'Productos', icon: IconProducts },
  { href: '/caja', label: 'Caja', icon: IconCashDrawer },
  { href: '/reportes', label: 'Reportes', icon: IconReports },
]

// Mock user data - will be replaced with auth context
const currentUser = {
  name: 'Arturo Diaz',
  role: 'Dueno',
  initials: 'AD',
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href="/inicio" className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <IconChifle className="w-6 h-6 text-white" />
          </div>
          <div className="sidebar-brand-text">
            <span>Mr.</span>Chifles
          </div>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
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
        {/* User info only */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{currentUser.initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{currentUser.name}</div>
            <div className="sidebar-user-role">{currentUser.role}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
