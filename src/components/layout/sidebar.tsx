'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/navigation'
import { UserMenu } from './user-menu'

export function Sidebar() {
  const pathname = usePathname()

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
        <UserMenu variant="sidebar" />
      </div>
    </aside>
  )
}
