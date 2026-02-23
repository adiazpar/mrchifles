import {
  IconHome,
  IconSales,
  IconProducts,
  IconCashDrawer,
  IconReports,
} from '@/components/icons'
import type { ComponentType } from 'react'

export interface NavItem {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
}

/**
 * All navigation items for the sidebar (desktop)
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/inicio', label: 'Inicio', icon: IconHome },
  { href: '/ventas', label: 'Ventas', icon: IconSales },
  { href: '/caja', label: 'Caja', icon: IconCashDrawer },
  { href: '/productos', label: 'Productos', icon: IconProducts },
  { href: '/reportes', label: 'Reportes', icon: IconReports },
]

/**
 * Navigation items for mobile bottom nav
 */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: '/inicio', label: 'Inicio', icon: IconHome },
  { href: '/ventas', label: 'Ventas', icon: IconSales },
  { href: '/caja', label: 'Caja', icon: IconCashDrawer },
  { href: '/productos', label: 'Productos', icon: IconProducts },
  { href: '/reportes', label: 'Reportes', icon: IconReports },
]
