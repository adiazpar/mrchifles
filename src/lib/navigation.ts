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
  { href: '/home', label: 'Inicio', icon: Home },
  { href: '/sales', label: 'Ventas', icon: ShoppingCart },
  { href: '/cash', label: 'Caja', icon: Banknote },
  { href: '/products', label: 'Productos', icon: Package },
  { href: '/reports', label: 'Reportes', icon: BarChart3 },
]
