import { PresetBagSideIcon } from '@/components/icons/presets/PresetBagSideIcon'
import { PresetShoppingBagsIcon } from '@/components/icons/presets/PresetShoppingBagsIcon'
import { PresetPurseIcon } from '@/components/icons/presets/PresetPurseIcon'
import { PresetPurse2Icon } from '@/components/icons/presets/PresetPurse2Icon'
import { PresetMoneyBagIcon } from '@/components/icons/presets/PresetMoneyBagIcon'
import type { ComponentType } from 'react'

export interface PresetIcon {
  id: string
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
}

export const PRESET_ICONS: PresetIcon[] = [
  { id: 'preset:bag-side', label: 'Bag', icon: PresetBagSideIcon },
  { id: 'preset:shopping-bags', label: 'Shopping', icon: PresetShoppingBagsIcon },
  { id: 'preset:purse', label: 'Purse', icon: PresetPurseIcon },
  { id: 'preset:purse-2', label: 'Handbag', icon: PresetPurse2Icon },
  { id: 'preset:money-bag', label: 'Money', icon: PresetMoneyBagIcon },
]

export function getPresetIcon(id: string): PresetIcon | undefined {
  return PRESET_ICONS.find(p => p.id === id)
}

export function isPresetIcon(value: string): boolean {
  return value.startsWith('preset:')
}
