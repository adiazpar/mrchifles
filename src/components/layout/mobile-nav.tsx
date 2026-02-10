'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconHome, IconSales, IconProducts, IconCashDrawer, IconReports } from '@/components/icons'

const navItems = [
  { href: '/inicio', label: 'Inicio', icon: IconHome },
  { href: '/ventas', label: 'Ventas', icon: IconSales },
  { href: '/productos', label: 'Productos', icon: IconProducts },
  { href: '/caja', label: 'Caja', icon: IconCashDrawer },
  { href: '/reportes', label: 'Reportes', icon: IconReports },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="mobile-nav">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon className="mobile-nav-icon" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
