'use client'

import { useTranslations } from 'next-intl'
import type { InviteDuration } from '@/lib/auth'

const DURATIONS: InviteDuration[] = ['24h', '7d', '30d']

export interface DurationPickerProps {
  selected: InviteDuration
  onSelect: (d: InviteDuration) => void
}

export function DurationPicker({ selected, onSelect }: DurationPickerProps) {
  const t = useTranslations('team')
  const labels: Record<InviteDuration, string> = {
    '24h': t('invite_duration_24h'),
    '7d': t('invite_duration_7d'),
    '30d': t('invite_duration_30d'),
  }

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        {t('invite_duration_label')}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
              selected === d
                ? 'border-brand bg-brand-subtle text-brand'
                : 'border-border text-text-secondary hover:border-brand-300'
            }`}
          >
            {labels[d]}
          </button>
        ))}
      </div>
    </div>
  )
}
