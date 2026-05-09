'use client'

import { useIntl } from 'react-intl'
import type { InviteDuration } from '@kasero/shared/auth'

const DURATIONS: InviteDuration[] = ['24h', '7d', '30d']

export interface DurationPickerProps {
  selected: InviteDuration
  onSelect: (d: InviteDuration) => void
}

/**
 * Mercantile chip rail of 3 duration options. Mono uppercase labels;
 * selected chip carries a brand-subtle tint and inset terracotta
 * hairline so it reads like a stamped pick.
 */
export function DurationPicker({ selected, onSelect }: DurationPickerProps) {
  const t = useIntl()
  const labels: Record<InviteDuration, string> = {
    '24h': t.formatMessage({ id: 'team.invite_duration_24h' }),
    '7d': t.formatMessage({ id: 'team.invite_duration_7d' }),
    '30d': t.formatMessage({ id: 'team.invite_duration_30d' }),
  }

  return (
    <div className="tm-invite__duration-rail" role="radiogroup">
      {DURATIONS.map((d) => (
        <button
          key={d}
          type="button"
          role="radio"
          aria-checked={selected === d}
          aria-pressed={selected === d}
          onClick={() => onSelect(d)}
          className="tm-invite__duration-chip"
        >
          {labels[d]}
        </button>
      ))}
    </div>
  )
}
