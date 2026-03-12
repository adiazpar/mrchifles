'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/navigation'
import { useNavbar } from '@/contexts/navbar-context'

export function MobileNav() {
  const pathname = usePathname()
  const { isVisible } = useNavbar()

  return (
    <nav className={`mobile-nav ${isVisible ? '' : 'mobile-nav--hidden'}`}>
      {NAV_ITEMS.map((item) => {
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
