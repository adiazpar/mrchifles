'use client'

import { useTranslations } from 'next-intl'
import { ChefHat, HandHelping, Store, Boxes, Factory, Shapes } from 'lucide-react'
import { BUSINESS_TYPES } from '@/lib/locale-config'
import type { BusinessType } from '@/hooks'

const ICONS: Partial<Record<string, React.ComponentType<{ className?: string }>>> = {
  food: ChefHat,
  retail: Store,
  services: HandHelping,
  wholesale: Boxes,
  manufacturing: Factory,
  other: Shapes,
}

const FALLBACK_EMOJIS: Record<string, string> = {
  food: '🍽️',
  retail: '🛍️',
  services: '✂️',
  wholesale: '📦',
  manufacturing: '🏭',
  other: '💼',
}

function renderIcon(typeValue: string, isSelected: boolean) {
  const IconComponent = ICONS[typeValue]
  if (IconComponent) {
    return <IconComponent className={`w-8 h-8 ${isSelected ? 'text-brand' : 'text-text-secondary'}`} />
  }
  return <span className="text-2xl">{FALLBACK_EMOJIS[typeValue] || '💼'}</span>
}

export interface BusinessTypeGridProps {
  selected: BusinessType | null
  onSelect: (type: BusinessType) => void
}

export function BusinessTypeGrid({ selected, onSelect }: BusinessTypeGridProps) {
  const t = useTranslations('createBusiness')
  const labels: Record<string, string> = {
    food: t('business_type_food'),
    retail: t('business_type_retail'),
    services: t('business_type_services'),
    wholesale: t('business_type_wholesale'),
    manufacturing: t('business_type_manufacturing'),
    other: t('business_type_other'),
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {BUSINESS_TYPES.map((bt) => (
        <button
          key={bt.value}
          type="button"
          onClick={() => onSelect(bt.value as BusinessType)}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
            selected === bt.value
              ? 'border-brand bg-brand-subtle'
              : 'border-border hover:border-brand-300'
          }`}
        >
          {renderIcon(bt.value, selected === bt.value)}
          <span className="text-sm font-medium text-text-primary">
            {labels[bt.value] ?? bt.label}
          </span>
        </button>
      ))}
    </div>
  )
}
