'use client'

import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui'
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
    <Modal.Item>
      <label className="label">{t('invite_duration_label')}</label>
      <div className="grid grid-cols-3 gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            className={`p-3 rounded-xl border-2 text-sm transition-all ${
              selected === d
                ? 'border-border bg-bg-elevated text-text-primary font-semibold'
                : 'border-transparent text-text-secondary font-medium hover:text-text-primary'
            }`}
          >
            {labels[d]}
          </button>
        ))}
      </div>
    </Modal.Item>
  )
}
