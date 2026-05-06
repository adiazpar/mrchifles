'use client'

import { useTranslations } from 'next-intl'
import { BUSINESS_TYPES } from '@/lib/locale-config'
import type { BusinessType } from '@/hooks'
import { BUSINESS_TYPE_ICONS, BUSINESS_TYPE_FALLBACK_EMOJIS } from './businessTypeIcons'

function renderIcon(typeValue: string, isSelected: boolean) {
  const IconComponent = BUSINESS_TYPE_ICONS[typeValue]
  return (
    <div className="product-list-image">
      {IconComponent ? (
        <IconComponent className={`w-6 h-6 ${isSelected ? 'text-brand' : 'text-text-secondary'}`} />
      ) : (
        <span className="text-2xl">{BUSINESS_TYPE_FALLBACK_EMOJIS[typeValue] || '💼'}</span>
      )}
    </div>
  )
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
              ? 'border-brand bg-bg-elevated'
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
