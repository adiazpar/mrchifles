import {
  IconHome,
  IconSales,
  IconProducts,
  IconCashDrawer,
  IconInventory,
  IconSettings,
  IconUsers,
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
  { href: '/productos', label: 'Productos', icon: IconProducts },
  { href: '/caja', label: 'Caja', icon: IconCashDrawer },
  { href: '/inventario', label: 'Inventario', icon: IconInventory },
  { href: '/ajustes/equipo', label: 'Equipo', icon: IconSettings },
]

/**
 * Navigation items for mobile bottom nav (limited space, no Inventario)
 */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: '/inicio', label: 'Inicio', icon: IconHome },
  { href: '/ventas', label: 'Ventas', icon: IconSales },
  { href: '/productos', label: 'Productos', icon: IconProducts },
  { href: '/caja', label: 'Caja', icon: IconCashDrawer },
  { href: '/ajustes/equipo', label: 'Equipo', icon: IconUsers },
]
