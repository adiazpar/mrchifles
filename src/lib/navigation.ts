import {
  Home,
  ShoppingCart,
  Package,
  Banknote,
  BarChart3,
} from 'lucide-react'
import type { ComponentType } from 'react'

export interface NavItem {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
}

/**
 * Navigation items for sidebar (desktop) and mobile bottom nav
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/caja', label: 'Caja', icon: Banknote },
  { href: '/productos', label: 'Productos', icon: Package },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
]
