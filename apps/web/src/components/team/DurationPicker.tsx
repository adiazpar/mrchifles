'use client'

import { useIntl } from 'react-intl';
import type { InviteDuration } from '@kasero/shared/auth'

const DURATIONS: InviteDuration[] = ['24h', '7d', '30d']

export interface DurationPickerProps {
  selected: InviteDuration
  onSelect: (d: InviteDuration) => void
}

export function DurationPicker({ selected, onSelect }: DurationPickerProps) {
  const t = useIntl()
  const labels: Record<InviteDuration, string> = {
    '24h': t.formatMessage({
      id: 'team.invite_duration_24h'
    }),
    '7d': t.formatMessage({
      id: 'team.invite_duration_7d'
    }),
    '30d': t.formatMessage({
      id: 'team.invite_duration_30d'
    }),
  }

  return (
    <div className="mb-4">
      <label className="label">{t.formatMessage({
        id: 'team.invite_duration_label'
      })}</label>
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
    </div>
  );
}
