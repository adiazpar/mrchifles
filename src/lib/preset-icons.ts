import { ShoppingBag, ShoppingBasket, Briefcase, Backpack, Wallet } from 'lucide-react'
import type { ComponentType } from 'react'

export interface PresetIcon {
  id: string
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
}

export const PRESET_ICONS: PresetIcon[] = [
  { id: 'preset:bag-side', label: 'Bag', icon: ShoppingBag },
  { id: 'preset:shopping-bags', label: 'Shopping', icon: ShoppingBasket },
  { id: 'preset:purse', label: 'Purse', icon: Briefcase },
  { id: 'preset:purse-2', label: 'Handbag', icon: Backpack },
  { id: 'preset:money-bag', label: 'Money', icon: Wallet },
]

export function getPresetIcon(id: string): PresetIcon | undefined {
  return PRESET_ICONS.find(p => p.id === id)
}

export function isPresetIcon(value: string): boolean {
  return value.startsWith('preset:')
}
